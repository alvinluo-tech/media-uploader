import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

export async function getAccessToken() {
  const { token } = await oauth2Client.getAccessToken();
  return token;
}

export async function initiateResumableUpload(
  fileName: string,
  mimeType: string,
  fileSize: number,
  folderId?: string
) {
  const token = await getAccessToken();

  // 步骤 1：先创建文件占位，获取 fileId
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: fileName,
      mimeType,
      ...(folderId ? { parents: [folderId] } : {}),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "创建文件失败");
  }

  const { id: fileId } = await createRes.json();

  // 步骤 2：用 PATCH resumable 方式上传内容到已知 fileId
  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify({ name: fileName }),
    }
  );

  const uploadUrl = uploadRes.headers.get("location");
  if (!uploadUrl) {
    throw new Error("无法获取上传地址");
  }

  return { uploadUrl, fileId };
}

export async function completeUpload(fileId: string) {
  try {
    // 设置为任何人可读
    const permResult = await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });
    console.log("权限设置成功:", fileId, permResult.data);
  } catch (err: unknown) {
    console.error("权限设置失败:", fileId, err);
    // 检查是否是 Workspace 账号限制
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("sharingRateLimitExceeded") || message.includes("insufficientPermissions")) {
      throw new Error("权限设置失败：可能是 Google Workspace 账号限制，无法公开分享文件");
    }
    throw new Error(`权限设置失败: ${message}`);
  }

  const file = await drive.files.get({
    fileId,
    fields: "id, name, webViewLink, webContentLink, mimeType",
  });

  return file.data;
}

export async function listFiles(folderId?: string) {
  const response = await drive.files.list({
    q: folderId ? `'${folderId}' in parents` : undefined,
    pageSize: 100,
    fields: "files(id, name, size, createdTime, mimeType)",
    orderBy: "createdTime desc",
  });

  return response.data.files || [];
}

// 删除单个文件
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`删除文件失败: ${message}`);
  }
}

// 批量删除文件
export async function deleteFiles(fileIds: string[]): Promise<{
  deleted: string[];
  failed: { fileId: string; error: string }[];
}> {
  const deleted: string[] = [];
  const failed: { fileId: string; error: string }[] = [];

  await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        await deleteFile(fileId);
        deleted.push(fileId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "删除失败";
        failed.push({ fileId, error: message });
      }
    })
  );

  return { deleted, failed };
}

export function getEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
