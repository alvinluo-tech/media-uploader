"use client";

import { useState, useCallback, useRef } from "react";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  link?: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

export default function FileUploader({
  onUploadComplete,
}: {
  onUploadComplete?: () => void;
}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const additions: UploadFile[] = Array.from(newFiles).map((file) => ({
      id: generateId(),
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...additions]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const uploadFile = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: "uploading", progress: 0 } : f
      )
    );

    try {
      const initRes = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadFile.file.name,
          mimeType: uploadFile.file.type,
          size: uploadFile.file.size,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error || `获取上传地址失败 (${initRes.status})`);
      }

      const { uploadUrl } = await initRes.json();

      const fileId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, progress: pct } : f
              )
            );
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve(data.id);
          } else {
            reject(new Error(`上传到 Drive 失败 (${xhr.status})`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("网络错误")));
        xhr.addEventListener("abort", () => reject(new Error("已取消")));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", uploadFile.file.type);
        xhr.send(uploadFile.file);
      });

      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      if (!completeRes.ok) {
        const err = await completeRes.json();
        throw new Error(err.error || "设置权限失败");
      }

      const { file } = await completeRes.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "done", progress: 100, link: file.viewLink }
            : f
        )
      );
    } catch (err: unknown) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "error",
                error: err instanceof Error ? err.message : "上传失败",
              }
            : f
        )
      );
    }
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    const concurrency = 3;
    let idx = 0;

    const workers = Array.from({ length: concurrency }, async () => {
      while (idx < pending.length) {
        const current = pending[idx++];
        await uploadFile(current);
      }
    });

    await Promise.all(workers);
    onUploadComplete?.();
  };

  const cancelUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "error", error: "已取消" } : f
      )
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "done"));
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
          ${
            isDragging
              ? "border-blue-400 bg-blue-500/10 scale-[1.02]"
              : "border-gray-600 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800/80"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="text-5xl mb-4">{isDragging ? "📥" : "☁️"}</div>
        <p className="text-lg text-gray-300">
          {isDragging ? "松开即可添加文件" : "拖拽文件到这里，或点击选择"}
        </p>
      </div>

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={uploadAll}
            disabled={pendingCount === 0 || uploadingCount > 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {uploadingCount > 0
              ? `上传中 (${uploadingCount})...`
              : `上传全部 (${pendingCount})`}
          </button>
          {doneCount > 0 && (
            <button
              onClick={clearCompleted}
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            >
              清除已完成
            </button>
          )}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((f) => (
            <div
              key={f.id}
              className="bg-gray-800/80 rounded-xl p-4 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">
                    {f.file.type.startsWith("video/")
                      ? "🎬"
                      : f.file.type.startsWith("image/")
                      ? "🖼️"
                      : f.file.type.startsWith("audio/")
                      ? "🎵"
                      : "📄"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">{f.file.name}</p>
                    <p className="text-gray-500 text-xs">{formatSize(f.file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {f.status === "uploading" && (
                    <button
                      onClick={() => cancelUpload(f.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      取消
                    </button>
                  )}
                  {f.status === "done" && f.link && (
                    <a
                      href={f.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      查看
                    </a>
                  )}
                  {(f.status === "done" || f.status === "error" || f.status === "pending") && (
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-gray-500 hover:text-gray-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      f.status === "done"
                        ? "bg-green-500/20 text-green-400"
                        : f.status === "error"
                        ? "bg-red-500/20 text-red-400"
                        : f.status === "uploading"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {f.status === "done"
                      ? "✓ 完成"
                      : f.status === "error"
                      ? f.error
                      : f.status === "uploading"
                      ? `${f.progress}%`
                      : "等待中"}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {(f.status === "uploading" || f.status === "done") && (
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      f.status === "done" ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
