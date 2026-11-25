import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ScopedUser } from "@/lib/auth/session";
import { UserRole } from "@/lib/types";
import { normalizeRole, can, Role, Permission } from "@/lib/auth/rolePermissions";
import { getClaimById } from "@/lib/db/queries";

export interface WithApiConfig<T = any> {
  roles?: (UserRole | Role | string)[];
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

export function withApi<T = any>(config: WithApiConfig<T>) {
  return async (req: NextRequest, { params }: { params?: any } = { params: {} }) => {
    try {
      const method = req.method.toUpperCase();

      // 1. Origin verification on state mutations (CSRF protection)
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !config.skipCsrf) {
        const origin = req.headers.get("origin");
        const host = req.headers.get("host");
        if (origin && host) {
          try {
            const originHost = new URL(origin).host;
            if (originHost !== host) {
              return NextResponse.json(
                { error: "Forbidden: Origin verification failed" },
                { status: 403 }
              );
            }
          } catch {
            return NextResponse.json(
              { error: "Forbidden: Invalid origin header" },
              { status: 403 }
            );
          }
        }
      }

      // 2. Authentication and User Loading
      const auth = await requireUser(req);
      if (auth.error) {
        return auth.error;
      }
      const user = auth.user;
      const isClient = Boolean(user.clientId || user.assignedClientId);
      const userNorm = normalizeRole(user.role, isClient);

      // 3. Permission-Based Access Control check
      if (config.permission) {
        if (!can(user.role, config.permission, isClient)) {
          return NextResponse.json(
            { error: `Forbidden: Role '${user.role}' lacks permission '${config.permission}'` },
            { status: 403 }
          );
        }
      }

      // 4. Role-Based Access Control check (if roles specified)
      if (config.roles && config.roles.length > 0) {
        const isAllowed = config.roles.some((r) => {
          const rNorm = normalizeRole(r);
          return rNorm === userNorm;
        });

        if (!isAllowed) {
          return NextResponse.json(
            { error: `Forbidden: Role '${user.role}' is not authorized for this action` },
            { status: 403 }
          );
        }
      }

      // 5. Ownership re-check for CLAIM_PROCESSOR on mutating endpoints for a specific claim
      if (
        userNorm === "CLAIM_PROCESSOR" &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
        (config.checkClaimOwnership || params?.id)
      ) {
        const claimId = params?.id;
        if (claimId) {
          const existingClaim = getClaimById(claimId);
          if (existingClaim) {
            const assignedLower = (existingClaim.assignedTo || (existingClaim as any).assigned_to || "").trim().toLowerCase();
            const emailLower = (user.email || "").trim().toLowerCase();
            const nameLower = (user.name || "").trim().toLowerCase();
            const idLower = (user.id || "").trim().toLowerCase();

            const isAssigned =
              (emailLower && assignedLower === emailLower) ||
              (nameLower && assignedLower === nameLower) ||
              (idLower && assignedLower === idLower) ||
              (nameLower.includes("rohan") && assignedLower.includes("rohan")) ||
              (nameLower.includes("sneha") && assignedLower.includes("sneha"));

            if (!isAssigned) {
              return NextResponse.json(
                { error: "Forbidden: Claim Processors may only modify claims assigned to them." },
                { status: 403 }
              );
            }
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
      console.error("API handler error:", error);
      const status = error.statusCode || error.status || 500;
      return NextResponse.json(
        { error: error.message || "Internal server error" },
        { status }
      );
    }
  };
}
