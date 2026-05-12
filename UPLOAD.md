# Media Uploader 上传方案

## 架构概览

```
步骤1: 浏览器 ──(JSON: 文件名/类型/大小)──> Vercel ──> Google Drive
        返回 Resumable Upload session URL（<1s 完成）

步骤2: 浏览器 ──(PUT, 原始文件数据)──> Google Drive 直传
        真实 onprogress 进度条，无中间人

步骤3: 浏览器 ──(POST: fileId)──> Vercel ──> Google Drive
        设置公开分享权限（<1s 完成）
```

**Vercel 只做两件轻量的事**：获取上传 URL + 设置权限。文件数据**永远不经过 Vercel**。

## 上传流程

### 步骤 1：获取上传地址

**前端**: `POST /api/upload/init`，只传 `{ name, mimeType, size }`

**服务端**: `src/app/api/upload/init/route.ts`
- 调用 `initiateResumableUpload()` 向 Google Drive API 发起 Resumable Upload 会话
- Google 返回一个临时 `session URI`
- 立即返回给前端（<1s）

### 步骤 2：直传 Google Drive

**前端**: `FileUploader.tsx`
- 使用 XHR 将文件 PUT 到 Google Drive 的 session URI
- `xhr.upload.onprogress` 提供**真实的浏览器上传进度**
- 上传完成后 Google 返回文件 ID

### 步骤 3：设置权限

**前端**: `POST /api/upload/complete`，传 `{ fileId }`

**服务端**: `src/app/api/upload/complete/route.ts`
- 调用 `completeUpload()` 设置公开分享权限
- 返回 `viewLink`（预览链接）和 `downloadLink`（下载链接）

## 文件结构

| 文件 | 作用 |
|------|------|
| `src/components/FileUploader.tsx` | 前端拖拽/选择文件，三步上传流程 |
| `src/components/FileList.tsx` | 文件列表，调用 `GET /api/files` |
| `src/app/api/upload/init/route.ts` | 获取 Resumable Upload session URL |
| `src/app/api/upload/complete/route.ts` | 上传完成后设置公开分享权限 |
| `src/app/api/files/route.ts` | 文件列表接口 |
| `src/lib/google-drive.ts` | Google Drive API 封装 |
| `src/app/preview/page.tsx` | 预览页，嵌入 Google Drive iframe |
| `.env.local` | Google OAuth2 凭据 + 目标文件夹 ID |

## 环境变量

```env
GOOGLE_CLIENT_ID=...          # Google Cloud Console OAuth2 客户端 ID
GOOGLE_CLIENT_SECRET=...      # Google Cloud Console OAuth2 客户端密钥
GOOGLE_REFRESH_TOKEN=...      # OAuth2 刷新令牌
GOOGLE_DRIVE_FOLDER_ID=...   # Google Drive 目标文件夹 ID（可选）
```

## 依赖

| 包 | 用途 |
|----|------|
| `next` 16.2.6 | 框架 |
| `react` 19.2.4 | UI |
| `googleapis` | Google Drive API（用于 OAuth2 认证和权限管理） |

## 优势对比

| | 旧方案 (中转上传) | 新方案 (Resumable 直传) |
|---|---|---|
| 大文件支持 | Vercel 超时 (10s/60s) | 无限制 |
| 进度准确性 | Vercel→Drive 段的伪进度 | 浏览器真实上传进度 |
| Vercel 消耗 | 带宽 + 内存 + 长时间函数 | 仅两个极小的 JSON 请求 |
| 断点续传 | 不支持 | 可扩展支持 |
| 代码复杂度 | 简单 | 中等 |

## Vercel 部署注意事项

1. **超时已解决**: Vercel 函数只处理元数据请求（<1s），不再传输文件数据
2. **内存已解决**: 文件不经过 Vercel 内存
3. **环境变量**: `.env.local` 不会自动部署到 Vercel，需在项目设置中手动配置
4. **Region**: 选择离用户近的区域，Vercel API 响应更快

## 已知限制

1. **预览清晰度**: 通过 `drive.google.com/file/d/{id}/preview` 嵌入，Google 会转码压缩，非原画质量
2. **无认证系统**: README 中描述的 invite code + JWT 认证未实现
3. **并发上传**: 前端限制 3 个并发上传任务
4. **断点续传**: 可通过查询 Resumable Upload 状态扩展支持（Google API 支持）
