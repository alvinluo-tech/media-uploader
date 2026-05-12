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

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(fileSize),
      },
      body: JSON.stringify({
        name: fileName,
        ...(folderId ? { parents: [folderId] } : {}),
      }),
    }
  );

  const uploadUrl = res.headers.get("location");
  if (!uploadUrl) {
    throw new Error("无法获取上传地址");
  }

  return uploadUrl;
}

export async function completeUpload(fileId: string) {
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

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

export function getEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
