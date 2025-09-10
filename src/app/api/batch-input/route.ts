import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";
import MFCMaster from "@/models/MFCMaster";

// ✅ CREATE Batch
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { companyId, locationId, mfcId, typeOfSample } = body;

    if (!companyId || !locationId || !mfcId || !typeOfSample || !Array.isArray(typeOfSample) || typeOfSample.length === 0) {
      return NextResponse.json(
        { success: false, message: "companyId, locationId, mfcId, and at least one typeOfSample are required" },
        { status: 400 }
      );
    }

    const mfc = await MFCMaster.findById(mfcId);
    if (!mfc) {
      return NextResponse.json({ success: false, message: "MFC not found" }, { status: 404 });
    }

    const batch = new BatchInput({
      ...body,
      mfcNumber: mfc.mfcNumber,
    });

    await batch.save();
    return NextResponse.json({ success: true, data: batch }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ READ (Get all batches for company + location)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, message: "companyId and locationId are required" },
        { status: 400 }
      );
    }

    const batches = await BatchInput.find({ companyId, locationId });

    return NextResponse.json({ success: true, data: batches });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}