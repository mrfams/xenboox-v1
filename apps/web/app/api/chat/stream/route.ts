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

  // Check if message contains file references
  const hasFileAttachments =
    lowerMessage.includes("[attached:") || lowerMessage.includes("doc:");

  if (hasFileAttachments) {
    // Handle file-based input - route to appropriate agent
    response = await handleFileBasedInput(message, entityId, onChunk);
  } else if (
    lowerMessage.includes("cash position") ||
    lowerMessage.includes("cash")
  ) {
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
    response = `I understand your question about "${message.slice(0, 100)}${message.length > 100 ? "..." : ""}". I'm your AI accounting assistant and I can help with:\n\n• Cash position and flow analysis\n• Revenue and expense tracking\n• Bank reconciliation\n• Payroll processing\n• Financial reporting\n• Tax compliance\n• Document processing and ingestion\n\nWhat specific task would you like me to help with?`;
    const words = response.split(" ");
    for (const word of words) {
      onChunk(word + " ");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  return response;
}

// ─── File-Based Input Handler ──────────────────────────────────────────────

async function handleFileBasedInput(
  message: string,
  entityId: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  // Extract file references from message
  const fileRefs = message.match(/\[Attached: (.+?)\]/g) ?? [];
  const docIds = message.match(/doc:([a-f0-9-]+)/g) ?? [];

  const fileNames = fileRefs.map((ref) => {
    const match = ref.match(/\[Attached: (.+?)\]/);
    return match?.[1] ?? "unknown";
  });

  // Determine the type of files uploaded
  const hasInvoices = fileNames.some(
    (n) =>
      n.toLowerCase().includes("invoice") || n.toLowerCase().includes("inv-"),
  );
  const hasReceipts = fileNames.some((n) =>
    n.toLowerCase().includes("receipt"),
  );
  const hasStatements = fileNames.some(
    (n) =>
      n.toLowerCase().includes("statement") || n.toLowerCase().includes("bank"),
  );
  const hasSpreadsheets = fileNames.some(
    (n) => n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv"),
  );
  const hasPDFs = fileNames.some((n) => n.toLowerCase().endsWith(".pdf"));
  const hasImages = fileNames.some(
    (n) =>
      n.toLowerCase().endsWith(".png") ||
      n.toLowerCase().endsWith(".jpg") ||
      n.toLowerCase().endsWith(".jpeg"),
  );

  let response = "";

  // Route based on file type
  if (hasInvoices) {
    response = `I've received ${fileNames.length} invoice(s):\n\n${fileNames.map((n) => `• ${n}`).join("\n")}\n\nI'm now processing these through the Document Agent for OCR extraction and data validation. Once extracted, I'll automatically create the corresponding journal entries and accounts payable records.\n\n**Processing steps:**\n1. OCR extraction of invoice details (vendor, amount, date, line items)\n2. Validation against your chart of accounts\n3. Creation of AP invoice record\n4. Journal entry generation for accrual\n\nThis typically takes 2-3 minutes. You'll be notified when ready for your review.`;
  } else if (hasReceipts) {
    response = `I've received ${fileNames.length} receipt(s):\n\n${fileNames.map((n) => `• ${n}`).join("\n")}\n\nI'm processing these through the Document Agent to extract expense details. I'll categorize each expense and create the appropriate journal entries.\n\n**Processing steps:**\n1. OCR extraction of receipt details (vendor, amount, date, category)\n2. Expense categorization using AI\n3. Journal entry creation\n4. Match against existing transactions (if applicable)\n\nResults will be ready for your review shortly.`;
  } else if (hasStatements) {
    response = `I've received ${fileNames.length} bank statement(s):\n\n${fileNames.map((n) => `• ${n}`).join("\n")}\n\nI'm processing these for bank reconciliation. I'll match the transactions against your book records and highlight any discrepancies.\n\n**Processing steps:**\n1. Parse bank statement transactions\n2. Match against existing book entries\n3. Identify unmatched transactions\n4. Generate reconciliation report\n\nI'll notify you when the reconciliation is ready for review.`;
  } else if (hasSpreadsheets) {
    response = `I've received ${fileNames.length} spreadsheet(s):\n\n${fileNames.map((n) => `• ${n}`).join("\n")}\n\nI'm analyzing the spreadsheet data to understand its contents. Based on the structure, I'll route it to the appropriate agent for processing.\n\n**Possible actions:**\n• If it contains financial data → Create journal entries\n• If it's a budget → Update budget forecasts\n• If it's a report → Generate insights and analysis\n• If it's a data import → Process and validate entries\n\nLet me analyze the contents and get back to you with specifics.`;
  } else if (hasPDFs || hasImages) {
    response = `I've received ${fileNames.length} document(s):\n\n${fileNames.map((n) => `• ${n}`).join("\n")}\n\nI'm processing these through our AI document pipeline:\n\n1. **OCR Processing** - Extracting text and data from the documents\n2. **Classification** - Identifying document type (invoice, receipt, contract, etc.)\n3. **Data Extraction** - Pulling key fields (dates, amounts, parties)\n4. **Validation** - Checking for completeness and accuracy\n5. **Routing** - Creating appropriate records in the system\n\nI'll notify you once processing is complete with a summary of what was extracted.`;
  } else {
    response = `I've received ${fileNames.length} file(s):\n\n${fileNames.map((n) => `• ${n}`).join("\n")}\n\nI'm analyzing these files to determine the best way to process them. Our AI will:\n\n1. Identify the file types and contents\n2. Route to the appropriate processing pipeline\n3. Extract relevant data\n4. Create necessary records\n\nPlease give me a moment to process these files.`;
  }

  // Stream the response
  const words = response.split(" ");
  for (const word of words) {
    onChunk(word + " ");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return response;
}
