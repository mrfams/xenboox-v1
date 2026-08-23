import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { users } from "@xenboox/db/schema/auth";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { score, category, comment } = body as {
      score: number;
      category: string;
      comment?: string;
    };

    // Validate score
    if (
      typeof score !== "number" ||
      score < 0 ||
      score > 10 ||
      !Number.isInteger(score)
    ) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    // Rate limit: one submission per user per quarter
    const existing = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { npsSubmittedAt: true },
    });

    if (existing?.npsSubmittedAt) {
      const daysSince =
        (Date.now() - existing.npsSubmittedAt.getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSince < 90) {
        return NextResponse.json(
          { error: "Already submitted recently" },
          { status: 429 },
        );
      }
    }

    // Store NPS response
    await db
      .update(users)
      .set({
        npsScore: score,
        npsComment: comment || null,
        npsSubmittedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("NPS submission error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
