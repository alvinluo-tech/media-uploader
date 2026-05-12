import { NextRequest, NextResponse } from "next/server";
import { verifyInviteCode, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    const user = verifyInviteCode(code);

    if (!user) {
      return NextResponse.json({ error: "邀请码无效" }, { status: 401 });
    }

    const token = await createToken(user);

    const response = NextResponse.json({
      success: true,
      user: {
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });

    // 设置 HTTP-only Cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 天
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "登录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
