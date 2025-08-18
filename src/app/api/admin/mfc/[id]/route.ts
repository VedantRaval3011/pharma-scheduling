// app/api/admin/mfc/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import  connectDB from '@/lib/db';
import MFCMaster from '@/models/MFCMaster';
import APIMaster from '@/models/apiMaster';
import Department from '@/models/department';
import TestType from '@/models/test-type';
import DetectorType from '@/models/detectorType';
import Pharmacopoeial from '@/models/pharmacopeial';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const populate = searchParams.get('populate') === 'true';

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    // Find the MFC record
    const mfcRecord = await MFCMaster.findOne({
      _id: params.id,
      companyId,
      locationId,
      isDeleted: false
    });

    if (!mfcRecord) {
      return NextResponse.json(
        { error: 'MFC record not found' },
        { status: 404 }
      );
    }

    // If populate is requested, fetch related data
    if (populate) {
      const [apiData, departmentData, testTypeData, detectorTypeData, pharmacopoeialData] = await Promise.allSettled([
        // Fetch API Master data
        mfcRecord.apiId ? APIMaster.findOne({
          _id: mfcRecord.apiId,
          companyId,
          locationId,
          isDeleted: false
        }) : Promise.resolve(null),

        // Fetch Department data
        mfcRecord.departmentId ? Department.findOne({
          _id: mfcRecord.departmentId,
          companyId,
          locationId,
          isDeleted: false
        }) : Promise.resolve(null),

        // Fetch Test Type data
        mfcRecord.testTypeId ? TestType.findOne({
          _id: mfcRecord.testTypeId,
          companyId,
          locationId,
          isDeleted: false
        }) : Promise.resolve(null),

        // Fetch Detector Type data
        mfcRecord.detectorTypeId ? DetectorType.findOne({
          _id: mfcRecord.detectorTypeId,
          companyId,
          locationId,
          isDeleted: false
        }) : Promise.resolve(null),

        // Fetch Pharmacopoeial data
        mfcRecord.pharmacopoeialId ? Pharmacopoeial.findOne({
          _id: mfcRecord.pharmacopoeialId,
          companyId,
          locationId,
          isDeleted: false
        }) : Promise.resolve(null)
      ]);

      // Convert to plain object and add related data
      const enrichedRecord = mfcRecord.toObject();

      if (apiData.status === 'fulfilled' && apiData.value) {
        enrichedRecord.apiDetails = apiData.value.toObject();
      }

      if (departmentData.status === 'fulfilled' && departmentData.value) {
        enrichedRecord.departmentDetails = departmentData.value.toObject();
      }

      if (testTypeData.status === 'fulfilled' && testTypeData.value) {
        enrichedRecord.testTypeDetails = testTypeData.value.toObject();
      }

      if (detectorTypeData.status === 'fulfilled' && detectorTypeData.value) {
        enrichedRecord.detectorTypeDetails = detectorTypeData.value.toObject();
      }

      if (pharmacopoeialData.status === 'fulfilled' && pharmacopoeialData.value) {
        enrichedRecord.pharmacopoeialDetails = pharmacopoeialData.value.toObject();
      }

      return NextResponse.json({
        success: true,
        data: enrichedRecord
      });
    }

    return NextResponse.json({
      success: true,
      data: mfcRecord
    });

  } catch (error) {
    console.error('Error fetching MFC record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add PUT method for updating single record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      mfcNumber,
      genericName,
      apiId,
      departmentId,
      testTypeId,
      detectorTypeId,
      pharmacopoeialId,
      columnCode,
      mobilePhaseCode1,
      mobilePhaseCode2,
      mobilePhaseCode3,
      mobilePhaseCode4,
      sampleInjection,
      blankInjection,
      bracketingFrequency,
      injectionTime,
      runTime,
      testApplicability,
      bulk,
      fp,
      stabilityPartial,
      stabilityFinal,
      amv,
      pv,
      cv,
      updatedBy
    } = body;

    // Check if MFC number already exists for other records
    const existingMFC = await MFCMaster.findOne({
      _id: { $ne: params.id },
      mfcNumber,
      companyId,
      locationId,
      isDeleted: false
    });

    if (existingMFC) {
      return NextResponse.json(
        { error: 'MFC Number already exists' },
        { status: 400 }
      );
    }

    // Find and update the record
    const updatedRecord = await MFCMaster.findOneAndUpdate(
      {
        _id: params.id,
        companyId,
        locationId,
        isDeleted: false
      },
      {
        mfcNumber,
        genericName,
        apiId,
        departmentId,
        testTypeId,
        detectorTypeId,
        pharmacopoeialId,
        columnCode,
        mobilePhaseCode1,
        mobilePhaseCode2,
        mobilePhaseCode3,
        mobilePhaseCode4,
        sampleInjection,
        blankInjection,
        bracketingFrequency,
        injectionTime,
        runTime,
        testApplicability,
        bulk,
        fp,
        stabilityPartial,
        stabilityFinal,
        amv,
        pv,
        cv,
        updatedBy,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedRecord) {
      return NextResponse.json(
        { error: 'MFC record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'MFC record updated successfully',
      data: updatedRecord
    });

  } catch (error) {
    console.error('Error updating MFC record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add DELETE method for single record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const deletedBy = searchParams.get('deletedBy');

    if (!companyId || !locationId) {
      return NextResponse.json(
        { error: 'Company ID and Location ID are required' },
        { status: 400 }
      );
    }

    const deletedRecord = await MFCMaster.findOneAndUpdate(
      {
        _id: params.id,
        companyId,
        locationId,
        isDeleted: false
      },
      {
        isDeleted: true,
        deletedBy,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!deletedRecord) {
      return NextResponse.json(
        { error: 'MFC record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'MFC record deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting MFC record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}