import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: "缺少 fileId" }, { status: 400 });
    }

    // 获取文件信息
    const file = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, createdTime, shared, webViewLink, webContentLink",
    });

    // 获取权限列表
    const perms = await drive.permissions.list({
      fileId,
      fields: "permissions(id, role, type, emailAddress)",
    });

    return NextResponse.json({
      file: file.data,
      permissions: perms.data.permissions,
      hasPublicPermission: perms.data.permissions?.some(
        (p) => p.type === "anyone" && p.role === "reader"
      ),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "调试失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
