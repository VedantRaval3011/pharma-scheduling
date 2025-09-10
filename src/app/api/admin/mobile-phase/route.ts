import { NextRequest, NextResponse } from 'next/server';
import MobilePhase from '@/models/mobile-phase/mobilePhase'; // Adjust import path as needed
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const id = searchParams.get('id');

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    let query: any = { companyId, locationId };

    if (id) {
      query._id = id;
      const mobilePhase = await MobilePhase.findOne(query);
      if (!mobilePhase) {
        return NextResponse.json({ success: false, error: 'Mobile Phase not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: mobilePhase });
    } else {
      const mobilePhases = await MobilePhase.find(query).sort({ mobilePhaseCode: 1 });
      return NextResponse.json({ success: true, data: mobilePhases });
    }
  } catch (error: any) {
    console.error('Error fetching mobile phases:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mobilePhaseId, mobilePhaseCode, isSolvent, isBuffer, bufferName, solventName, chemicals, dilutionFactor, pHValue, description, companyId, locationId } = body;

    if (!mobilePhaseId || !mobilePhaseCode || !companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Required fields are missing' }, { status: 400 });
    }

    const newMobilePhase = new MobilePhase({
      mobilePhaseId,
      mobilePhaseCode,
      isSolvent,
      isBuffer,
      bufferName,
      solventName,
      chemicals,
      dilutionFactor,
      pHValue,
      description,
      companyId,
      locationId,
      createdBy: session.user.id,
    });

    await newMobilePhase.save();

    return NextResponse.json({ success: true, data: newMobilePhase }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating mobile phase:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required for update' }, { status: 400 });
    }

    const mobilePhase = await MobilePhase.findById(id);

    if (!mobilePhase) {
      return NextResponse.json({ success: false, error: 'Mobile Phase not found' }, { status: 404 });
    }

    // Check if companyId and locationId match
    if (mobilePhase.companyId !== updateData.companyId || mobilePhase.locationId !== updateData.locationId) {
      return NextResponse.json({ success: false, error: 'Company ID or Location ID mismatch' }, { status: 403 });
    }

    Object.assign(mobilePhase, updateData);
    await mobilePhase.save();

    return NextResponse.json({ success: true, data: mobilePhase });
  } catch (error: any) {
    console.error('Error updating mobile phase:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required for deletion' }, { status: 400 });
    }

    const mobilePhase = await MobilePhase.findByIdAndDelete(id);

    if (!mobilePhase) {
      return NextResponse.json({ success: false, error: 'Mobile Phase not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    console.error('Error deleting mobile phase:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}