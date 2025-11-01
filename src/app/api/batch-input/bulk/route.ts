import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    console.log("📦 Received bulk batch request with", body.length, "batches");

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Request body must be an array" },
        { status: 400 }
      );
    }

    // Insert all batches with better error handling
    try {
      console.log("isArray:", Array.isArray(body), "len:", body.length);
      if (!Array.isArray(body) || body.length === 0) {
        return NextResponse.json(
          { success: false, message: "Body must be a non-empty JSON array" },
          { status: 400 }
        );
      }

      // Quick spot-check one doc
      const sample = body[0];
      console.log("sample keys:", Object.keys(sample || {}));

      const result = await BatchInput.insertMany(body, {
        ordered: false,
        rawResult: true,
      });
      // rawResult:true returns the MongoDB bulkWrite result

      console.log("raw insert result:", result);
      const insertedCount = Array.isArray(result)
        ? result.length
        : result?.insertedCount ?? 0;

      // Build summary from actually inserted docs if result is array
      const insertedDocs = Array.isArray(result) ? result : [];
      const summary = {
        total: insertedCount,
        byType: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
      };
      for (const doc of insertedDocs) {
        summary.byType[doc.typeOfSample] =
          (summary.byType[doc.typeOfSample] || 0) + 1;
        summary.byPriority[doc.priority] =
          (summary.byPriority[doc.priority] || 0) + 1;
      }

      return NextResponse.json(
        {
          success: true,
          message: `Successfully inserted ${insertedCount} batches`,
          summary,
        },
        { status: 201 }
      );
    } catch (insertError: any) {
      console.error("bulk write error keys:", Object.keys(insertError || {}));
      const inserted = insertError?.insertedDocs?.length || 0;
      const failed = insertError?.writeErrors?.length || 0;
      const errors = (insertError?.writeErrors || [])
        .slice(0, 5)
        .map((e: any) => ({
          index: e.index,
          code: e?.code || e?.err?.code,
          message: e?.errmsg || e?.err?.errmsg,
        }));
      return NextResponse.json(
        {
          success: false,
          message: "Bulk write had errors",
          inserted,
          failed,
          errors,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("❌ Bulk insert error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to insert batches",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
