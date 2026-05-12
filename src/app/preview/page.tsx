"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function Player() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get("id");
  const name = searchParams.get("name") || "文件";
  const mimeType = searchParams.get("type") || "";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!fileId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">缺少文件参数</p>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-3xl animate-spin">⏳</div>
      </div>
    );
  }

  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isImage = mimeType.startsWith("image/");

  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
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
        {isVideo && (
          <div className="w-full rounded-lg overflow-hidden bg-black">
            <video
              src={directUrl}
              controls
              autoPlay
              className="w-full max-h-[80vh]"
            >
              <track kind="captions" />
              您的浏览器不支持视频播放
            </video>
          </div>
        )}

        {isAudio && (
          <div className="w-full rounded-lg overflow-hidden bg-gray-800 p-8 flex items-center justify-center">
            <audio src={directUrl} controls autoPlay className="w-full max-w-lg">
              您的浏览器不支持音频播放
            </audio>
          </div>
        )}

        {isImage && (
          <div className="w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://drive.google.com/uc?export=view&id=${fileId}`}
              alt={name}
              className="max-w-full max-h-[80vh] object-contain"
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
