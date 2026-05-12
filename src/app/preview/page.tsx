"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Player() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get("id");
  const name = searchParams.get("name") || "文件";
  const mimeType = searchParams.get("type") || "";

  if (!fileId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">缺少文件参数</p>
      </div>
    );
  }

  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isImage = mimeType.startsWith("image/");

  const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <a href="/upload" className="text-gray-400 hover:text-white transition-colors">
            ← 返回
          </a>
          <h1 className="text-white text-sm truncate flex-1">{name}</h1>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            在 Drive 中打开
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {(isVideo || isAudio) && (
          <div className="w-full rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://drive.google.com/file/d/${fileId}/preview`}
              className="w-full"
              style={{ height: isAudio ? "200px" : "80vh", border: "none" }}
              allow="autoplay"
              allowFullScreen
            />
          </div>
        )}

        {isImage && (
          <div className="w-full rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://drive.google.com/file/d/${fileId}/preview`}
              className="w-full"
              style={{ height: "80vh", border: "none" }}
              allow="autoplay"
            />
          </div>
        )}

        {!isVideo && !isAudio && !isImage && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="text-6xl">📄</div>
            <p className="text-gray-400">此文件类型不支持在线预览</p>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              在 Drive 中打开
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-3xl animate-spin">⏳</div>
        </div>
      }
    >
      <Player />
    </Suspense>
  );
}
