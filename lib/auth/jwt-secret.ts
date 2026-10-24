/**
 * Shared JWT Secret resolver.
 * Enforces zero-trust credential hygiene:
 * - In production: throws a descriptive error if JWT_SECRET environment variable is missing.
 * - In development / testing: falls back to a development constant if not provided.
 */

export const DEV_JWT_SECRET =
  "laytime_dev_secret_key_minimum_32_characters_long_for_hmac_sha256_security";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION: JWT_SECRET environment variable must be set in production. Refusing to run with insecure fallback."
      );
    }
    return DEV_JWT_SECRET;
  }
  return secret;
}
