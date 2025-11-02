// app/api/batch-input/[id]/api-status/route.ts

import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import BatchInput from "@/models/batch/BatchInput";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const { apiName, testStatus, startedAt, endedAt } = await req.json();

    const batch = await BatchInput.findById(params.id);
    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 }
      );
    }

    // Update the API test status
    let updated = false;
    batch.generics.forEach((generic: any) => {
      generic.apis.forEach((api: any) => {
        if (api.apiName === apiName) {
          api.testStatus = testStatus;
          if (startedAt) api.startedAt = new Date(startedAt);
          if (endedAt) api.endedAt = new Date(endedAt);
          updated = true;
        }
      });
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "API not found in batch" },
        { status: 404 }
      );
    }

    batch.updatedAt = new Date();
    await batch.save();

    return NextResponse.json({ success: true, data: batch });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
