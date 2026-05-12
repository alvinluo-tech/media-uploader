import { NextRequest, NextResponse } from "next/server";
import { initiateResumableUpload } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    const { name, mimeType, size } = await request.json();

    if (!name || !mimeType || !size) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    if (size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: "文件不能超过 500MB" }, { status: 400 });
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
    const uploadUrl = await initiateResumableUpload(name, mimeType, size, folderId);

    return NextResponse.json({ uploadUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取上传地址失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
