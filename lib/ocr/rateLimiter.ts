const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_OCR_REQUESTS_PER_WINDOW = 10;

const userTimestamps = new Map<string, number[]>();

export function checkAndRecordOcrRateLimit(
  userId: string,
  nowMs: number = Date.now()
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const key = String(userId || "anonymous");
  const cutoff = nowMs - RATE_WINDOW_MS;
  const recent = (userTimestamps.get(key) || []).filter((ts) => ts > cutoff);

  if (recent.length >= MAX_OCR_REQUESTS_PER_WINDOW) {
    const oldestInWindow = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + RATE_WINDOW_MS - nowMs) / 1000));
    userTimestamps.set(key, recent);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  recent.push(nowMs);
  userTimestamps.set(key, recent);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, MAX_OCR_REQUESTS_PER_WINDOW - recent.length)
  };
}
