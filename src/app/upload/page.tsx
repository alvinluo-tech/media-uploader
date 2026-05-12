"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import FileList from "@/components/FileList";

export default function UploadPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<"upload" | "files">("upload");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">📁</span>
          <h1 className="text-xl font-bold text-white">Media Uploader</h1>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-800/50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "upload"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            ☁️ 上传文件
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "files"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📋 文件列表
          </button>
        </div>

        {/* Content */}
        {activeTab === "upload" ? (
          <FileUploader
            onUploadComplete={() => {
              setRefreshTrigger((prev) => prev + 1);
              setActiveTab("files");
            }}
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">已上传文件</h2>
              <button
                onClick={() => setRefreshTrigger((prev) => prev + 1)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                🔄 刷新
              </button>
            </div>
            <FileList refreshTrigger={refreshTrigger} />
          </div>
        )}
      </main>
    </div>
  );
}
