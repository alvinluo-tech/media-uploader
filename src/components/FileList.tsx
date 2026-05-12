"use client";

import { useState, useEffect, useCallback } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
}

interface UserPayload {
  username: string;
  isAdmin: boolean;
}

function formatSize(bytes: string | undefined): string {
  if (!bytes) return "-";
  const b = parseInt(bytes, 10);
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  if (b < 1024 * 1024 * 1024)
    return (b / (1024 * 1024)).toFixed(1) + " MB";
  return (b / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦";
  return "📄";
}

function canPreview(mimeType: string): boolean {
  return (
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("image/")
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FileList({
  refreshTrigger,
}: {
  refreshTrigger?: number;
}) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserPayload | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/files");
      if (!res.ok) {
        if (res.status === 401) {
          setError("请先登录");
          return;
        }
        throw new Error("获取失败");
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setError("加载文件列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchFiles();
  }, [fetchUser, fetchFiles, refreshTrigger]);

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  const handleSelectFile = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleDelete = async (fileIds: string[]) => {
    if (!confirm(`确定要删除 ${fileIds.length} 个文件吗？`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: fileIds.length > 1 ? fileIds : undefined,
          fileId: fileIds.length === 1 ? fileIds[0] : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "删除失败");
        return;
      }

      if (data.failed && data.failed.length > 0) {
        alert(`${data.deleted.length} 个文件删除成功，${data.failed.length} 个失败`);
      }

      // 刷新文件列表
      setSelectedFiles(new Set());
      fetchFiles();
    } catch {
      alert("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin text-3xl mb-3">⏳</div>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">{error}</div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">📭</div>
        暂无文件
      </div>
    );
  }

  const isAdmin = user?.isAdmin;

  return (
    <div className="space-y-2">
      {/* 管理员操作栏 */}
      {isAdmin && files.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedFiles.size === files.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">
              全选 ({selectedFiles.size}/{files.length})
            </span>
          </label>

          {selectedFiles.size > 0 && (
            <button
              onClick={() => handleDelete(Array.from(selectedFiles))}
              disabled={deleting}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              {deleting ? "删除中..." : `删除选中 (${selectedFiles.size})`}
            </button>
          )}
        </div>
      )}

      {/* 文件列表 */}
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800/80 rounded-lg border transition-colors group ${
            selectedFiles.has(file.id)
              ? "border-blue-500/50"
              : "border-gray-700/30"
          }`}
        >
          {/* 管理员复选框 */}
          {isAdmin && (
            <label className="flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFiles.has(file.id)}
                onChange={() => handleSelectFile(file.id)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
            </label>
          )}

          <span className="text-xl flex-shrink-0">
            {getFileIcon(file.mimeType)}
          </span>
          <div className="min-w-0 flex-1">
            {file.webViewLink ? (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 truncate block"
              >
                {file.name}
              </a>
            ) : (
              <p className="text-sm text-white truncate">{file.name}</p>
            )}
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatSize(file.size)}
          </span>
          <span className="text-xs text-gray-600 flex-shrink-0">
            {formatDate(file.createdTime)}
          </span>
          {canPreview(file.mimeType) && (
            <a
              href={`/preview?id=${file.id}&name=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.mimeType)}`}
              className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded transition-colors flex-shrink-0"
            >
              播放
            </a>
          )}

          {/* 管理员删除按钮 */}
          {isAdmin && (
            <button
              onClick={() => handleDelete([file.id])}
              disabled={deleting}
              className="text-xs px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded transition-colors flex-shrink-0"
            >
              删除
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
