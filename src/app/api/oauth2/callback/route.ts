import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><h1>❌ 授权失败</h1><p>${error}</p></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return new Response(
    `<html><body>
      <h1>✅ 授权成功！</h1>
      <p>请回到终端运行：</p>
      <code>npx tsx scripts/exchange-code.ts ${code}</code>
      <p>或者直接复制下面的 code：</p>
      <textarea rows="3" cols="60">${code}</textarea>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
