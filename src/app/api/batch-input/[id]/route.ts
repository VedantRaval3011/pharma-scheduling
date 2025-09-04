import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";
import MFCMaster from "@/models/MFCMaster";

// ✅ READ Single Batch
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const batch = await BatchInput.findById(params.id);

    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: batch });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ UPDATE Batch or Test status
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const batch = await BatchInput.findById(params.id);

    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 }
      );
    }

    // If updating test status
    if (body.testId && body.status) {
      const test = batch.tests.id(body.testId);
      if (!test) {
        return NextResponse.json(
          { success: false, message: "Test not found in batch" },
          { status: 404 }
        );
      }

      test.status = body.status;

      if (body.status === "In Progress") {
        test.startedAt = new Date();
      } else if (body.status === "Closed") {
        test.endedAt = new Date();
      }

      await batch.save();
      return NextResponse.json({ success: true, data: batch });
    }

    // If updating batch status
    if (body.batchStatus) {
      batch.batchStatus = body.batchStatus;

      if (body.batchStatus === "In Progress") {
        batch.startedAt = new Date();
      } else if (body.batchStatus === "Closed") {
        batch.endedAt = new Date();
      }
    }

    // If updating MFC
    if (body.mfcId) {
      const mfc = await MFCMaster.findById(body.mfcId);
      if (!mfc) {
        return NextResponse.json(
          { success: false, message: "MFC not found" },
          { status: 404 }
        );
      }
      batch.mfcNumber = mfc.mfcNumber;
    }

    // Update other fields
    Object.assign(batch, body);

    await batch.save();

    return NextResponse.json({ success: true, data: batch });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE Batch
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const deleted = await BatchInput.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Batch deleted" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
