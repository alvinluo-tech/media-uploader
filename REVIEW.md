# 上传与预览功能代码审查文档

## 目录

1. [架构概述](#架构概述)
2. [上传流程](#上传流程)
3. [并发上传逻辑](#并发上传逻辑)
4. [错误处理与验证机制](#错误处理与验证机制)
5. [在线预览逻辑](#在线预览逻辑)
6. [已修复的问题](#已修复的问题)

---

## 架构概述

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   浏览器     │────▶│  Next.js API │────▶│ Google Drive │
│  (前端)      │◀────│  (后端)      │◀────│   (存储)     │
└─────────────┘     └─────────────┘     └─────────────┘

上传流程（三步直传模式）：
1. 浏览器 → 后端：创建文件占位 + 获取 Resumable Upload URL + fileId
2. 浏览器 → Google Drive：直传文件数据
3. 浏览器 → 后端：设置公开权限
```

**关键点**：
- 文件数据不经过服务器中转，浏览器直接上传到 Google Drive
- **fileId 在上传前就确定**，即使上传过程中出现网络错误，也能用 fileId 验证文件是否上传成功

---

## 上传流程

### 步骤 1：初始化上传（创建文件占位 + 获取 upload URL）

**前端调用** `FileUploader.tsx:74-89`
```typescript
const initRes = await fetch("/api/upload/init", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: fileItem.file.name,
    mimeType: fileItem.file.type,
    size: fileItem.file.size,
  }),
});
const { uploadUrl, fileId } = await initRes.json();
```

**后端处理** `api/upload/init/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const { name, mimeType, size } = await request.json();
  
  // 参数校验
  if (!name || !mimeType || !size) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }
  
  // 文件大小限制：500MB
  if (size > 500 * 1024 * 1024) {
    return NextResponse.json({ error: "文件不能超过 500MB" }, { status: 400 });
  }
  
  const { uploadUrl, fileId } = await initiateResumableUpload(name, mimeType, size, folderId);
  return NextResponse.json({ uploadUrl, fileId });
}
```

**Google Drive API 调用** `lib/google-drive.ts:19-64`

采用两步走策略：
1. 先用 `POST /drive/v3/files` 创建文件占位，获取 `fileId`
2. 再用 `PATCH /upload/drive/v3/files/{fileId}?uploadType=resumable` 获取上传 URL

```typescript
export async function initiateResumableUpload(fileName, mimeType, fileSize, folderId) {
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
  return { uploadUrl, fileId };
}
```

### 步骤 2：直传文件到 Google Drive

**前端实现** `FileUploader.tsx:100-138`
```typescript
await new Promise<void>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  let settled = false;  // 防止重复 resolve/reject

  // 进度监听
  xhr.upload.addEventListener("progress", (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, progress: pct } : f
        )
      );
    }
  });

  // 上传完成
  xhr.addEventListener("load", () => {
    if (settled) return;
    settled = true;
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve();
    } else {
      reject(new Error(`上传到 Drive 失败 (${xhr.status})`));
    }
  });

  // 网络错误
  xhr.addEventListener("error", () => {
    if (settled) return;
    settled = true;
    reject(new Error("网络错误"));
  });

  // 取消上传
  xhr.addEventListener("abort", () => {
    if (settled) return;
    settled = true;
    reject(new Error("已取消"));
  });

  xhr.open("PUT", uploadUrl);
  xhr.setRequestHeader("Content-Type", fileItem.file.type);
  xhr.send(fileItem.file);
});
```

### 步骤 3：设置公开权限

**前端调用** `FileUploader.tsx:140-151`
```typescript
const completeRes = await fetch("/api/upload/complete", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fileId }),
});
const { file } = await completeRes.json();
```

**后端处理** `api/upload/complete/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const { fileId } = await request.json();
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
}
```

**设置权限** `lib/google-drive.ts:66-78`
```typescript
export async function completeUpload(fileId: string) {
  // 设置为任何人可读
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // 获取文件信息
  const file = await drive.files.get({
    fileId,
    fields: "id, name, webViewLink, webContentLink, mimeType",
  });

  return file.data;
}
```

---

## 并发上传逻辑

**实现位置** `FileUploader.tsx:185-199`

```typescript
const uploadAll = async () => {
  const pending = files.filter((f) => f.status === "pending");
  const concurrency = 2;  // 并发数
  let idx = 0;

  // Worker Pool 模式
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < pending.length) {
      const current = pending[idx++];  // 共享索引（JS 单线程安全）
      await uploadFile(current);       // 串行执行单个文件上传
    }
  });

  await Promise.all(workers);  // 等待所有 worker 完成
  onUploadComplete?.();         // 回调通知上传完成
};
```

**并发策略说明**：
- 创建 2 个异步 worker
- 每个 worker 从共享队列中取出文件，串行上传
- `idx++` 是共享可变索引，在 JS 单线程模型下是安全的
- 全部完成后触发 `onUploadComplete` 回调

---

## 错误处理与验证机制

### 核心改进：fileId 前置获取

**问题**：之前 fileId 依赖 XHR 响应体获取，当出现网络错误时拿不到 fileId，无法验证文件是否上传成功。

**解决方案**：在 init 阶段就创建文件占位，提前获取 fileId。

### 网络错误时的验证逻辑

**实现位置** `FileUploader.tsx:155-175`

```typescript
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : "";

  // 网络错误时，文件可能已上传成功，尝试用 fileId 验证
  if (msg === "网络错误" && fileId) {
    try {
      const verifyRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      });

      if (verifyRes.ok) {
        const { file } = await verifyRes.json();
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "done", progress: 100, link: file.viewLink }
              : f
          )
        );
        return;  // 验证成功，标记为完成
      }
    } catch {
      // 验证也失败了，才是真正的失败
    }
  }

  // 真正的失败
  setFiles((prev) =>
    prev.map((f) =>
      f.id === fileItem.id
        ? { ...f, status: "error", error: msg || "上传失败" }
        : f
    )
  );
}
```

### 防止重复触发

**实现位置** `FileUploader.tsx:107-108,118-119,125-126`

```typescript
let settled = false;

xhr.addEventListener("load", () => {
  if (settled) return;  // 已经触发过，忽略
  settled = true;
  // ... 处理逻辑
});

xhr.addEventListener("error", () => {
  if (settled) return;  // 已经触发过，忽略
  settled = true;
  // ... 处理逻辑
});
```

### 错误类型汇总

| 阶段 | 错误类型 | 错误消息 | 处理方式 |
|------|----------|----------|----------|
| 获取 upload URL | HTTP 错误 | `获取上传地址失败 (status)` | 标记失败 |
| 获取 upload URL | 参数错误 | `缺少参数` / `文件不能超过 500MB` | 标记失败 |
| 直传 Drive | HTTP 错误 | `上传到 Drive 失败 (status)` | 标记失败 |
| 直传 Drive | 网络错误 | `网络错误` | **尝试验证** |
| 直传 Drive | 取消 | `已取消` | 标记失败 |
| 设置权限 | HTTP 错误 | `设置权限失败` | 标记失败 |

---

## 在线预览逻辑

**实现位置** `app/preview/page.tsx`

### 预览页面架构

```typescript
export default function PreviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Player />
    </Suspense>
  );
}
```

使用 `Suspense` 包裹是因为 `useSearchParams()` 需要在 Suspense 边界内使用。

### 文件类型判断

```typescript
const searchParams = useSearchParams();
const fileId = searchParams.get("id");
const mimeType = searchParams.get("type") || "";

const isVideo = mimeType.startsWith("video/");
const isAudio = mimeType.startsWith("audio/");
const isImage = mimeType.startsWith("image/");
```

### 不同类型的预览实现

**视频/音频预览** - 使用 iframe 嵌入 Drive 预览页

```typescript
{(isVideo || isAudio) && (
  <div className="w-full rounded-lg overflow-hidden bg-black">
    <iframe
      src={`https://drive.google.com/file/d/${fileId}/preview`}
      className="w-full"
      style={{ height: isAudio ? "200px" : "80vh", border: "none" }}
      allow="autoplay"
      allowFullScreen
    />
  </div>
)}
```

**为什么用 iframe 而不是 `<video>` 标签**：
- Google Drive 对大文件下载会弹出"病毒扫描警告"中间页
- `export=download` 返回的不是流式响应，浏览器的 `<video>` 标签需要支持 Range 请求
- iframe 嵌入 Drive 预览页是最稳定的方式，无需额外的后端代理

**图片预览**

```typescript
{isImage && (
  <div className="w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
    <img
      src={`https://drive.google.com/uc?export=view&id=${fileId}`}
      alt={name}
      className="max-w-full max-h-[80vh] object-contain"
    />
  </div>
)}
```

**不支持的文件类型**

```typescript
{!isVideo && !isAudio && !isImage && (
  <div>
    <p>此文件类型不支持在线预览</p>
    <a href={viewUrl} target="_blank">在 Drive 中打开</a>
  </div>
)}
```

---

## 已修复的问题

### 1. 网络错误误报

**根因**：
- 浏览器并发连接限制导致 XHR error 事件被误触发
- CORS 头不完整导致拿不到响应，但文件实际已上传

**修复方案**：
- 在 init 阶段创建文件占位，提前获取 fileId
- 网络错误时，用 fileId 调 `/api/upload/complete` 验证文件是否真的存在
- 只有验证也失败时，才标记为上传失败

### 2. 视频预览失败

**根因**：
- `export=download` URL 对大文件会弹出病毒扫描警告
- 返回的不是流式响应，`<video>` 标签无法正常播放

**修复方案**：
- 视频/音频改用 `<iframe>` 嵌入 Drive 预览页
- 图片继续使用 `export=view` URL（这个是可靠的）

---

## 相关文件清单

| 文件 | 作用 |
|------|------|
| `src/components/FileUploader.tsx` | 上传组件（前端核心） |
| `src/app/preview/page.tsx` | 预览页面 |
| `src/app/api/upload/init/route.ts` | 创建文件占位 + 获取 upload URL API |
| `src/app/api/upload/complete/route.ts` | 设置权限 API |
| `src/lib/google-drive.ts` | Google Drive API 封装 |
