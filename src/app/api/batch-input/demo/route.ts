// app/api/batch-input/route.ts

import { NextRequest, NextResponse } from 'next/server';
import connectMongoDB from '@/lib/db'; // Adjust path as needed
import BatchModel from '@/models/batch/BatchInput'; // Adjust path as needed

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');

    // Validate required parameters
    if (!companyId || !locationId) {
      return NextResponse.json(
        {
          success: false,
          message: 'companyId and locationId are required parameters'
        },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectMongoDB();

    // Update all test statuses to "Not Started"
    const updateResult = await BatchModel.updateMany(
      {
        companyId: companyId,
        locationId: locationId
      },
      {
        $set: {
          'tests.$[].testStatus': 'Not Started',
          'generics.$[].apis.$[].testTypes.$[].testStatus': 'Not Started'
        }
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: 'All test statuses updated to Not Started',
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error updating test statuses:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update test statuses',
        error: error.message
      },
      { status: 500 }
    );
  }
}
