import { NextResponse } from "next/server";
import { triggerClient } from "@/lib/trigger";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const handle = await triggerClient.triggerAndWait(
      "calculate-customer-health",
      {
        triggeredAt: new Date().toISOString(),
      },
    );

    return NextResponse.json({
      success: true,
      result: handle.output,
    });
  } catch (error) {
    console.error("Customer health cron failed:", error);
    return NextResponse.json(
      { error: "Failed to trigger customer health calculation" },
      { status: 500 },
    );
  }
}
