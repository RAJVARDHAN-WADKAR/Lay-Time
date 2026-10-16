import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import { isUserInActorSubtree, logAudit } from "@/lib/auth/userHierarchy";
import { getUserById, updateUser } from "@/lib/db/queries";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6).optional()
});

export const POST = withApi({
  roles: ["Admin", "Supervisor", "Claim Processor", "Processor"],
  schema: ResetPasswordSchema,
  handler: async ({ user, params, body, req }) => {
    const targetId = params.id;
    const inSubtree = isUserInActorSubtree(user, targetId);

    if (!inSubtree) {
      return NextResponse.json(
        { error: "Forbidden: You may only reset passwords for users in your own created_by subtree" },
        { status: 403 }
      );
    }

    const target = getUserById(targetId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tempPassword = body?.newPassword || "TempReset@123";
    const passwordHash = await hashPassword(tempPassword);

    updateUser(targetId, {
      passwordHash,
      bumpToken: true
    });

    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: "USER_RESET_PASSWORD",
      targetType: "user",
      targetId,
      details: { targetEmail: target.email },
      ipAddress: req.headers.get("x-forwarded-for") || undefined
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully and existing sessions revoked.",
      temporaryPassword: tempPassword
    });
  }
});
