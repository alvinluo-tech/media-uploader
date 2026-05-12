/**
 * 获取 Google OAuth2 Refresh Token
 *
 * 运行: node get-refresh-token.js
 *
 * 1. 会给你一个 URL，打开后用你的 Google 账号登录授权
 * 2. 授权后会跳转到一个 localhost 地址，复制地址栏中的 code 参数
 * 3. 粘贴到终端，回车
 * 4. 会输出 refresh_token，复制到 .env.local
 */

const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const fs = require("fs");

// 从 .env.local 读取 client_id 和 client_secret
const envContent = fs.readFileSync(".env.local", "utf8");
const idMatch = envContent.match(/GOOGLE_CLIENT_ID=(.+)/);
const secretMatch = envContent.match(/GOOGLE_CLIENT_SECRET=(.+)/);

if (!idMatch || !secretMatch) {
  console.error("请先在 .env.local 中设置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET");
  process.exit(1);
}

const CLIENT_ID = idMatch[1].trim();
const CLIENT_SECRET = secretMatch[1].trim();
const REDIRECT_URI = "http://localhost:3333/oauth/callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/drive"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("\n========================================");
console.log("1. 在浏览器中打开以下链接并登录授权:");
console.log("\n" + authUrl + "\n");
console.log("2. 授权后浏览器会跳转，复制地址栏中的 code 参数");
console.log("========================================\n");

// Start a temporary local server to catch the callback
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  if (parsedUrl.pathname === "/oauth/callback") {
    const code = parsedUrl.query.code;
    if (code) {
      try {
        const { tokens } = await oauth2Client.getToken(code);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>✅ 授权成功！</h1><p>请回到终端查看 refresh_token。</p>");

        console.log("\n✅ 授权成功！\n");
        console.log("Access Token:", tokens.access_token ? "已获取" : "未获取");
        console.log("Refresh Token:", tokens.refresh_token);
        console.log("\n请将以下内容复制到 .env.local:");
        console.log("GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token);

        server.close();
        process.exit(0);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>❌ 授权失败</h1><p>" + e.message + "</p>");
        console.error("授权失败:", e.message);
      }
    } else {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>❌ 未收到 code 参数</h1>");
    }
  }
});

server.listen(3333, () => {
  console.log("等待授权回调 (http://localhost:3333)...\n");
});
