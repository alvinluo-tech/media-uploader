import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteFile, deleteFiles } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: "没有删除权限" }, { status: 403 });
    }

    const { fileId, fileIds } = await request.json();

    // 批量删除
    if (Array.isArray(fileIds) && fileIds.length > 0) {
      const results = await deleteFiles(fileIds);
      return NextResponse.json({
        success: true,
        deleted: results.deleted,
        failed: results.failed,
      });
    }

    // 单个删除
    if (fileId) {
      await deleteFile(fileId);
      return NextResponse.json({ success: true, deleted: [fileId] });
    }

    return NextResponse.json({ error: "缺少 fileId 或 fileIds" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
