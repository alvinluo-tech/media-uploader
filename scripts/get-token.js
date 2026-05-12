const { google } = require("googleapis");
const { readFileSync } = require("fs");

const envContent = readFileSync(".env.local", "utf8");
function getEnv(name) {
  const match = envContent.match(new RegExp(`^${name}=(.+)`, "m"));
  return (match && match[1]) || "";
}

const clientId = getEnv("GOOGLE_CLIENT_ID");
const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");

if (!clientId || !clientSecret) {
  console.error("❌ 请先在 .env.local 中设置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  "http://localhost:3000/api/oauth2/callback"
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/drive.file"],
  prompt: "consent",
  include_granted_scopes: false,
});

console.log("\n🔗 复制这个链接到浏览器打开：\n");
console.log(authUrl);
console.log("\n授权后浏览器会跳转，把地址栏里 code= 后面的内容复制出来");
console.log("然后运行：node scripts/exchange-code.js <你的code>\n");
