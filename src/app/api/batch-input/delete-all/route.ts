import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    // Get confirmation from query params
    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get("confirm");

    // Safety check - require explicit confirmation
    if (confirm !== "YES_DELETE_ALL_BATCHES") {
      return NextResponse.json(
        {
          success: false,
          message: "Safety check failed. Add ?confirm=YES_DELETE_ALL_BATCHES to URL",
          hint: "Example: DELETE /api/batch-input/delete-all?confirm=YES_DELETE_ALL_BATCHES",
        },
        { status: 400 }
      );
    }

    // Count before deletion
    const countBefore = await BatchInput.countDocuments();
    
    console.log(`⚠️  Deleting ${countBefore} batches...`);

    // Delete all batches
    const result = await BatchInput.deleteMany({});

    console.log(`✅ Deleted ${result.deletedCount} batches`);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully deleted ${result.deletedCount} batches`,
        deletedCount: result.deletedCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("❌ Error deleting batches:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete batches",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to count batches before deletion
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const count = await BatchInput.countDocuments();
    
    // Get sample of batch numbers
    const samples = await BatchInput.find()
      .select("batchNumber typeOfSample priority createdAt")
      .limit(5)
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      totalBatches: count,
      samples,
      warning: "To delete all batches, send DELETE request with ?confirm=YES_DELETE_ALL_BATCHES",
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
    