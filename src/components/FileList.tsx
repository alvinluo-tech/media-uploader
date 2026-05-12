"use client";

import { useState, useEffect } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
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

  useEffect(() => {
    async function fetchFiles() {
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
    }
    fetchFiles();
  }, [refreshTrigger]);

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

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800/80 rounded-lg border border-gray-700/30 transition-colors group"
        >
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
        </div>
      ))}
    </div>
  );
}
