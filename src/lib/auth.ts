import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default-secret");

export interface UserPayload {
  username: string;
  isAdmin: boolean;
}

// 解析邀请码配置
function getInviteCodes(): Map<string, string> {
  const codes = new Map<string, string>();
  const envCodes = process.env.INVITE_CODES || "";

  envCodes.split(",").forEach((pair) => {
    const [code, username] = pair.split(":");
    if (code && username) {
      codes.set(code.trim(), username.trim());
    }
  });

  return codes;
}

// 解析管理员码配置
function getAdminCodes(): Set<string> {
  const codes = new Set<string>();
  const envCodes = process.env.ADMIN_CODES || "";

  envCodes.split(",").forEach((code) => {
    if (code.trim()) {
      codes.add(code.trim());
    }
  });

  return codes;
}

// 验证邀请码
export function verifyInviteCode(code: string): UserPayload | null {
  const adminCodes = getAdminCodes();
  const inviteCodes = getInviteCodes();

  // 检查是否是管理员码
  if (adminCodes.has(code)) {
    return { username: "admin", isAdmin: true };
  }

  // 检查是否是普通用户邀请码
  const username = inviteCodes.get(code);
  if (username) {
    return { username, isAdmin: false };
  }

  return null;
}

// 创建 JWT Token
export async function createToken(payload: UserPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// 验证 JWT Token
export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserPayload;
  } catch {
    return null;
  }
}

// 从 Cookie 获取当前用户
export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}
