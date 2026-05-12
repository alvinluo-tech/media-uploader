# 📁 Media Uploader

快速上传媒体资源到 Google Drive 的 Web 应用。

## 技术栈

- **Next.js 16** + TypeScript
- **Tailwind CSS**
- **Google Drive API** (Resumable Upload)
- **Vercel** 部署

## 工作原理

采用 **Resumable Upload** 模式，文件从浏览器**直传 Google Drive**，不经过服务器中转：

```
浏览器 → 获取 upload URL → 直传 Google Drive → 完成
         (你的服务器)        (不经服务器)
```

### 优势

- ✅ 不受 Vercel 4.5MB Serverless 限制
- ✅ 传输速度 = 用户到 Google 的直连速度
- ✅ 支持断点续传
- ✅ 支持大文件 (理论上限 5TB)

## 快速开始

### 1. 创建 Google Cloud 项目

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目 (或选择已有项目)
3. 启用 **Google Drive API**:
   - 左侧菜单 → API 和服务 → 库
   - 搜索 "Google Drive API" → 点击启用

### 2. 创建 Service Account

1. 左侧菜单 → IAM 和管理 → 服务账号
2. 点击 "创建服务账号"
3. 填写名称，点击 "创建并继续"
4. 跳过权限设置，点击 "完成"
5. 点击刚创建的服务账号 → "密钥" 标签
6. "添加密钥" → "创建新密钥" → 选择 **JSON** → 下载

### 3. 设置 Google Drive 共享

1. 创建一个 Google Drive 文件夹 (用于存放上传的文件)
2. 复制文件夹 ID (URL 中 `/folders/` 后面的部分)
3. 将文件夹**共享**给 Service Account 的邮箱地址 (编辑者权限)
   - 邮箱在 JSON 密钥文件的 `client_email` 字段

### 4. 配置项目

```bash
cd media-uploader
cp .env.local.example .env.local
```

编辑 `.env.local`:

```env
# 粘贴整个 JSON 密钥 (单行)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# 目标文件夹 ID
GOOGLE_DRIVE_FOLDER_ID=你的文件夹ID

# JWT 密钥 (随便改个随机字符串)
JWT_SECRET=your-random-secret-here

# 邀请码 (code:username 格式，逗号分隔)
INVITE_CODES=abc123:alice,def456:bob

# 管理员码
ADMIN_CODES=admin-secret
```

### 5. 运行

```bash
npm install
npm run dev
```

访问 http://localhost:3000，输入邀请码即可上传。

### 6. 部署到 Vercel

```bash
npm i -g vercel
vercel
```

在 Vercel 项目设置中添加环境变量 (同 `.env.local`)。

## 邀请码系统

| 类型 | 环境变量 | 说明 |
|------|---------|------|
| 普通用户 | `INVITE_CODES` | 格式: `code:username`，逗号分隔 |
| 管理员 | `ADMIN_CODES` | 简单的 code 格式 |

## 文件结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/login/     # 登录 API
│   │   ├── auth/logout/    # 登出 API
│   │   ├── upload/init/    # 初始化 resumable upload
│   │   └── files/          # 文件列表 API
│   ├── login/              # 登录页面
│   ├── upload/             # 上传页面
│   ├── layout.tsx
│   └── page.tsx            # 自动跳转
├── components/
│   ├── FileUploader.tsx    # 拖拽上传组件
│   └── FileList.tsx        # 文件列表组件
└── lib/
    ├── google-drive.ts     # Google Drive API 封装
    └── auth.ts             # 邀请码 + JWT 认证
```

## License

MIT
