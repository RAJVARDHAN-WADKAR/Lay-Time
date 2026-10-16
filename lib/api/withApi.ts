import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ScopedUser } from "@/lib/auth/session";
import { UserRole } from "@/lib/types";
import { normalizeRole, RoleName } from "@/app/access/roles";

export interface WithApiConfig<T = any> {
  roles?: (UserRole | RoleName | string)[];
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

      // 3. Role-Based Access Control check
      if (config.roles && config.roles.length > 0) {
        const userNorm = normalizeRole(user.role);
        const isClient = Boolean(user.clientId || user.assignedClientId);

        const isAllowed = config.roles.some((r) => {
          const rUpper = String(r).trim().toUpperCase().replace(/[\s-]+/g, "_");
          if (rUpper === "CLIENT") {
            return userNorm === "REVIEWER_CLIENT" && isClient;
          }
          if (rUpper === "REVIEWER") {
            return userNorm === "REVIEWER_CLIENT" && !isClient;
          }
          return normalizeRole(r) === userNorm;
        });

        if (!isAllowed) {
          return NextResponse.json(
            { error: `Forbidden: Role '${user.role}' is not authorized for this action` },
            { status: 403 }
          );
        }
      }

      // 4. Request Body Parsing and Zod Schema Validation
      let parsedBody = undefined as any;
      if (["POST", "PUT", "PATCH"].includes(method)) {
        let rawBody: any = null;
        try {
          const text = await req.text();
          if (text && text.trim() !== "") {
            rawBody = JSON.parse(text);
          }
        } catch (parseErr) {
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

      // 5. Execute API Handler
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
