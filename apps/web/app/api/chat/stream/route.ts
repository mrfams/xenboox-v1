import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, chatMessages, bankAccounts } from "@xenboox/db/schema";
import { eq, and, sum } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, conversationId, entityId } = await req.json();

  if (!message || !entityId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Create or get conversation
  let convId = conversationId;
  if (!convId) {
    const [conv] = await db
      .insert(conversations)
      .values({
        entityId,
        userId: session.user.id!,
        title: message.slice(0, 80),
      })
      .returning();
    convId = conv.id;
  }

  // Save user message
  await db.insert(chatMessages).values({
    conversationId: convId,
    role: "user",
    content: message,
    status: "completed",
  });

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send conversation ID first
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "conversation", conversationId: convId })}\n\n`,
          ),
        );

        // Generate streaming response
        const response = await generateStreamingResponse(
          message,
          entityId,
          (chunk) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`,
              ),
            );
          },
        );

        // Save complete AI response
        await db.insert(chatMessages).values({
          conversationId: convId,
          role: "assistant",
          content: response,
          status: "completed",
          confidence: 0.95,
          agentModel: "cfo-pipeline-v1",
        });

        // Send completion signal
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
        );

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Failed to generate response" })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function generateStreamingResponse(
  message: string,
  entityId: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const lowerMessage = message.toLowerCase();
  let response = "";

  if (lowerMessage.includes("cash position") || lowerMessage.includes("cash")) {
    const cashBalance = await db
      .select({ total: sum(bankAccounts.currentBalance) })
      .from(bankAccounts)
      .where(eq(bankAccounts.entityId, entityId));

    const totalCash = parseFloat(cashBalance[0]?.total ?? "0");
    response = `Your cash position as of today is GMD ${totalCash.toLocaleString()}. ${
      totalCash > 100000
        ? "This is a healthy cash balance."
        : "Consider reviewing your cash flow to ensure adequate reserves."
    }`;

    // Stream word by word
    const words = response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  } else if (
    lowerMessage.includes("revenue") ||
    lowerMessage.includes("sales")
  ) {
    response =
      "I can help you analyze your revenue. Would you like me to generate a revenue report for this month, compare it to last month, or break it down by customer?";
    const words = response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  } else if (
    lowerMessage.includes("expense") ||
    lowerMessage.includes("cost")
  ) {
    response =
      "I can analyze your expenses. Would you like me to categorize recent transactions, identify spending trends, or compare against your budget?";
    const words = response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  } else if (
    lowerMessage.includes("reconcile") ||
    lowerMessage.includes("bank")
  ) {
    response =
      "I can help with bank reconciliation. I'll compare your bank statements with your book records and highlight any discrepancies for your review.";
    const words = response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  } else if (lowerMessage.includes("payroll")) {
    response =
      "I can help you run payroll. Would you like me to calculate salaries, deductions, and generate payslips for your employees?";
    const words = response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  } else {
    response = `I understand your question about "${message}". I'm your AI accounting assistant and I can help with:\n\n• Cash position and flow analysis\n• Revenue and expense tracking\n• Bank reconciliation\n• Payroll processing\n• Financial reporting\n• Tax compliance\n\nWhat specific task would you like me to help with?`;
    const words = response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  return response;
}
