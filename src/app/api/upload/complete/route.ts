import { NextRequest, NextResponse } from "next/server";
import { completeUpload } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: "缺少 fileId" }, { status: 400 });
    }

    const file = await completeUpload(fileId);

    return NextResponse.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        viewLink: file.webViewLink,
        downloadLink: file.webContentLink,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "设置权限失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
