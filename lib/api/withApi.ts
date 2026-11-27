import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ScopedUser } from "@/lib/auth/session";
import { UserRole } from "@/lib/types";
import { AppRole, Permission, can, normalizeRole } from "@/lib/auth/accessMatrix";
import { getClaimById } from "@/lib/db/queries";

/**
 * Verifies same-origin for browser state-changing requests (Origin first, Referer fallback).
 * Returns a 403 NextResponse on cross-origin mismatch, or null if allowed.
 */
export function verifySameOriginRequest(req: NextRequest): NextResponse | null {
  const allowedHosts = new Set<string>();
  const hostHeader = req.headers.get("host");
  const xfHost = req.headers.get("x-forwarded-host");
  if (hostHeader) allowedHosts.add(hostHeader.toLowerCase());
  if (xfHost) {
    for (const h of xfHost.split(",")) {
      const cleaned = h.trim().toLowerCase();
      if (cleaned) allowedHosts.add(cleaned);
    }
  }
  if (req.nextUrl?.host) allowedHosts.add(req.nextUrl.host.toLowerCase());

  if (allowedHosts.size === 0) return null;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (!allowedHosts.has(originHost)) {
        return NextResponse.json(
          { error: "Forbidden: Cross-origin request rejected" },
          { status: 403 }
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { error: "Forbidden: Invalid origin header" },
        { status: 403 }
      );
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refHost = new URL(referer).host.toLowerCase();
      if (!allowedHosts.has(refHost)) {
        return NextResponse.json(
          { error: "Forbidden: Cross-origin referer rejected" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Forbidden: Invalid referer header" },
        { status: 403 }
      );
    }
  }

  return null;
}

export interface WithApiConfig<T = any> {
  roles?: (UserRole | AppRole | string)[];
  permission?: Permission;
  checkClaimOwnership?: boolean;
  schema?: z.ZodType<T>;
  skipCsrf?: boolean;
  handler: (ctx: {
    req: NextRequest;
    user: ScopedUser;
    body: T;
    params: any;
  }) => Promise<NextResponse | Response>;
}

export function isClaimAssignedToUser(claim: any, user: ScopedUser): boolean {
  const assignedLower = String(claim?.assignedTo ?? claim?.assigned_to ?? "").trim().toLowerCase();
  if (!assignedLower) return false;
  const emailLower = (user.email || "").trim().toLowerCase();
  const nameLower = (user.name || "").trim().toLowerCase();
  const idLower = (user.id || "").trim().toLowerCase();
  return (
    (emailLower !== "" && assignedLower === emailLower) ||
    (nameLower !== "" && assignedLower === nameLower) ||
    (idLower !== "" && assignedLower === idLower)
  );
}

export function isClaimOwnedByClient(claim: any, user: ScopedUser): boolean {
  const userClientId = user.assignedClientId || user.clientId || user.client_id;
  if (!userClientId) return false;
  const claimClientId = claim?.clientId ?? claim?.client_id;
  return Boolean(claimClientId && claimClientId === userClientId);
}

export function withApi<T = any>(config: WithApiConfig<T>) {
  return async (req: NextRequest, { params }: { params?: any } = { params: {} }) => {
    try {
      const method = req.method.toUpperCase();

      // 1. Origin verification on state mutations (CSRF protection)
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !config.skipCsrf) {
        const originBlock = verifySameOriginRequest(req);
        if (originBlock) return originBlock;
      }

      // 2. Authentication and User Loading
      const auth = await requireUser(req);
      if (auth.error) {
        return auth.error;
      }
      const user = auth.user;
      const isClient = Boolean(user.clientId || user.assignedClientId);
      const userNorm = normalizeRole(user.role, isClient);

      // 3. Permission-Based Access Control check via single accessMatrix
      if (config.permission) {
        if (!can(user.role, config.permission, isClient)) {
          return NextResponse.json(
            { error: `Forbidden: Role '${userNorm}' lacks permission '${config.permission}'` },
            { status: 403 }
          );
        }
      }

      // 4. Optional Role-Based Access Control check
      if (config.roles && config.roles.length > 0) {
        const isAllowed = config.roles.some((r) => normalizeRole(r) === userNorm);
        if (!isAllowed) {
          return NextResponse.json(
            { error: `Forbidden: Role '${userNorm}' is not authorized for this action` },
            { status: 403 }
          );
        }
      }

      // 5. Claim ownership / client scope re-check on claim-scoped endpoints
      const claimId = params?.id;
      if (claimId && (config.checkClaimOwnership || ["POST", "PUT", "PATCH", "DELETE"].includes(method))) {
        const existingClaim = getClaimById(claimId);
        if (existingClaim) {
          if (userNorm === "CLAIM_PROCESSOR" && !isClaimAssignedToUser(existingClaim, user)) {
            return NextResponse.json(
              { error: "Forbidden: Claim Processors may only access or modify claims assigned to them." },
              { status: 403 }
            );
          }
          if (userNorm === "CLIENT" && !isClaimOwnedByClient(existingClaim, user)) {
            return NextResponse.json(
              { error: "Forbidden: Clients may only access their own company claims." },
              { status: 403 }
            );
          }
        }
      }

      // 6. Request Body Parsing and Zod Schema Validation
      let parsedBody = undefined as any;
      if (["POST", "PUT", "PATCH"].includes(method)) {
        let rawBody: any = null;
        try {
          const text = await req.text();
          if (text && text.trim() !== "") {
            rawBody = JSON.parse(text);
          }
        } catch {
          return NextResponse.json(
            { error: "Invalid JSON in request body" },
            { status: 400 }
          );
        }

        if (config.schema) {
          const parseResult = config.schema.safeParse(rawBody);
          if (!parseResult.success) {
            const errorMessages = parseResult.error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message
            }));
            return NextResponse.json(
              {
                error: "Validation failed",
                details: errorMessages
              },
              { status: 400 }
            );
          }
          parsedBody = parseResult.data;
        } else {
          parsedBody = rawBody;
        }
      }

      // 7. Execute API Handler
      return await config.handler({
        req,
        user,
        body: parsedBody,
        params: params || {}
      });
    } catch (error: any) {
      const correlationId = crypto.randomUUID().slice(0, 12);
      console.error(`[API ${correlationId}] handler error:`, error);
      const status = error.statusCode || error.status || 500;
      return NextResponse.json(
        {
          error: status >= 500 ? "Internal server error" : error.message || "Request failed",
          correlationId
        },
        { status }
      );
    }
  };
}
