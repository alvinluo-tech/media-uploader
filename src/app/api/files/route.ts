import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listFiles } from "@/lib/google-drive";

export async function GET() {
  try {
    // 验证登录状态
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const files = await listFiles(folderId);
    return NextResponse.json({ files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取文件列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
