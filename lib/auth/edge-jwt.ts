import { UserRole } from "@/lib/types";

export const JWT_SECRET = process.env.JWT_SECRET || "laytime_secure_jwt_secret_key_2024_shipping_demurrage";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64Url(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

/**
 * Edge-compatible JWT verification using standard Web Crypto API.
 * Works seamlessly in Next.js Edge Middleware and Node.js environments.
 */
export async function verifyEdgeToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    // Decode and parse payload
    const payloadJson = decodeBase64Url(payloadB64);
    const payload = JSON.parse(payloadJson) as SessionPayload;

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBytes = base64UrlToUint8Array(sigB64);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes as unknown as BufferSource, data);

    if (!isValid) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}
