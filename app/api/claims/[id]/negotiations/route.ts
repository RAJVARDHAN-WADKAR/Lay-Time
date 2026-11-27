export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/withApi";
import {
  canAccessNegotiations,
  getOrCreateThread,
  getThreadMessages
} from "@/lib/db/negotiations";

export const GET = withApi({
  permission: "negotiations:view",
  handler: async ({ user, params }) => {
    const access = canAccessNegotiations(user, params.id);
    if (!access.allowed) {
      return NextResponse.json(
        { error: "Claim negotiation room not found or access denied" },
        { status: 404 }
      );
    }

    const thread = getOrCreateThread(params.id);
    const messages = getThreadMessages(thread.id);

    return NextResponse.json({
      thread,
      messages,
      roleType: access.roleType
    });
  }
});
