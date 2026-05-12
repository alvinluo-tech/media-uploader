const { google } = require("googleapis");
const { readFileSync } = require("fs");

const code = process.argv[2];
if (!code) {
  console.log("用法: node scripts/exchange-code.js <code>");
  process.exit(1);
}

const envContent = readFileSync(".env.local", "utf8");
function getEnv(name) {
  const match = envContent.match(new RegExp(`^${name}=(.+)`, "m"));
  return (match && match[1]) || "";
}

const clientId = getEnv("GOOGLE_CLIENT_ID");
const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  "http://localhost:3000/api/oauth2/callback"
);

oauth2Client.getToken(code).then(function (result) {
  console.log("\n返回的 tokens:", JSON.stringify(result.tokens, null, 2));
  console.log("\nrefresh_token:", result.tokens.refresh_token);
}).catch(function (err) {
  console.error("❌ 失败:", err.message);
});
