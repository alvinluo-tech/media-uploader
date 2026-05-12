import { NextResponse } from "next/server";
import { listFiles } from "@/lib/google-drive";

export async function GET() {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const files = await listFiles(folderId);
    return NextResponse.json({ files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取文件列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
