"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";
import FileList from "@/components/FileList";

interface UserPayload {
  username: string;
  isAdmin: boolean;
}

export default function UploadPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<"upload" | "files">("upload");
  const [user, setUser] = useState<UserPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!data.user) {
          router.push("/login");
          return;
        }

        setUser(data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      alert("登出失败");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-3xl animate-spin">⏳</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📁</span>
            <h1 className="text-xl font-bold text-white">Media Uploader</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {user.username}
              {user.isAdmin && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                  管理员
                </span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              退出
            </button>
          </div>
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
