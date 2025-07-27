import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Column from '@/models/column';
import Audit from '@/models/columnAudit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const companyParam = req.nextUrl.searchParams.get('companyId');
    const locationParam = req.nextUrl.searchParams.get('locationId');
    const { companyId, locationId } = companyParam && locationParam
      ? { companyId: companyParam, locationId: locationParam }
      : { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId };

    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const columns = await Column.find({ companyId, locationId }).sort({ columnCode: 1 });

    return NextResponse.json({ success: true, data: columns });
  } catch (error: any) {
    console.error('GET /api/admin/column error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const { companyId } = session.user.companies[0];
    const locationId = session.user.companies[0].locations[0].locationId;
    
    if (!companyId || !locationId) {
      return NextResponse.json({ success: false, error: 'Company ID and Location ID are required' }, { status: 400 });
    }

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.columnCode || !body.descriptions || !Array.isArray(body.descriptions)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Column code and descriptions are required' 
      }, { status: 400 });
    }

    // Check if column code already exists
    await mongoose.connect(process.env.MONGODB_URI!);
    const existingColumn = await Column.findOne({ 
      columnCode: body.columnCode, 
      companyId, 
      locationId 
    });
    
    if (existingColumn) {
      return NextResponse.json({ 
        success: false, 
        error: 'Column code already exists' 
      }, { status: 400 });
    }

    const formattedBody = {
      columnCode: body.columnCode.trim(),
      descriptions: body.descriptions.map((desc: any) => ({
        prefix: desc.prefix?.trim() || '', // Always include prefix, default to empty string
        carbonType: desc.carbonType?.trim() || '',
        innerDiameter: desc.innerDiameter === '' || desc.innerDiameter == null ? 0 : Number(desc.innerDiameter),
        length: desc.length === '' || desc.length == null ? 0 : Number(desc.length),
        particleSize: desc.particleSize === '' || desc.particleSize == null ? 0 : Number(desc.particleSize),
        suffix: desc.suffix?.trim() || '',
        make: desc.make?.trim() || '',
      })),
      companyId,
      locationId,
    };

    console.log('Formatted body:', JSON.stringify(formattedBody, null, 2));

    // Validate formatted descriptions
    for (let i = 0; i < formattedBody.descriptions.length; i++) {
      const desc = formattedBody.descriptions[i];
      if (!desc.carbonType) {
        return NextResponse.json({ 
          success: false, 
          error: `Carbon Type is required for description ${i + 1}` 
        }, { status: 400 });
      }
      if (isNaN(desc.innerDiameter) || desc.innerDiameter < 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid inner diameter for description ${i + 1}` 
        }, { status: 400 });
      }
      if (isNaN(desc.length) || desc.length < 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid length for description ${i + 1}` 
        }, { status: 400 });
      }
      if (isNaN(desc.particleSize) || desc.particleSize < 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid particle size for description ${i + 1}` 
        }, { status: 400 });
      }
    }

    const column = new Column(formattedBody);
    console.log('Column before save:', JSON.stringify(column, null, 2));
    
    const savedColumn = await column.save();
    console.log('Column saved successfully:', JSON.stringify(savedColumn, null, 2));

    // Create audit log
    try {
      const audit = new Audit({
        action: 'create',
        userId: session.user.userId,
        module: 'column',
        companyId,
        locationId,
        changes: { new: savedColumn },
      });
      await audit.save();
      console.log('Audit log created successfully');
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({ success: true, data: savedColumn }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/column error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        error: 'Column code already exists' 
      }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ 
        success: false, 
        error: `Validation error: ${validationErrors.join(', ')}` 
      }, { status: 400 });
    }
    
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const companyParam = req.nextUrl.searchParams.get('companyId');
    const locationParam = req.nextUrl.searchParams.get('locationId');
    const { companyId, locationId } = companyParam && locationParam
      ? { companyId: companyParam, locationId: locationParam }
      : { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId };
    const { id, ...body } = await req.json();
    
    const formattedBody = {
      columnCode: body.columnCode.trim(),
      descriptions: body.descriptions.map((desc: any) => ({
        // Handle empty strings for optional fields - don't include them if empty
        ...(desc.prefix && desc.prefix.trim() ? { prefix: desc.prefix.trim() } : {}),
        carbonType: desc.carbonType?.trim() || '',
        innerDiameter: desc.innerDiameter === '' || desc.innerDiameter == null ? 0 : Number(desc.innerDiameter),
        length: desc.length === '' || desc.length == null ? 0 : Number(desc.length),
        particleSize: desc.particleSize === '' || desc.particleSize == null ? 0 : Number(desc.particleSize),
        ...(desc.suffix && desc.suffix.trim() ? { suffix: desc.suffix.trim() } : {}),
        ...(desc.make && desc.make.trim() ? { make: desc.make.trim() } : {}),
      })),
      companyId,
      locationId,
    };

    if (!companyId || !locationId || !id) {
      return NextResponse.json({ success: false, error: 'Company ID, Location ID, and Column ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const oldColumn = await Column.findOne({ _id: id, companyId, locationId });
    if (!oldColumn) {
      return NextResponse.json({ success: false, error: 'Column not found' }, { status: 404 });
    }

    const updatedColumn = await Column.findOneAndUpdate(
      { _id: id, companyId, locationId },
      formattedBody,
      { new: true, runValidators: true }
    );

    // Create audit log
    try {
      const audit = new Audit({
        action: 'update',
        userId: session.user.userId,
        module: 'column',
        companyId,
        locationId,
        changes: { old: oldColumn, new: updatedColumn },
      });
      await audit.save();
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({ success: true, data: updatedColumn });
  } catch (error: any) {
    console.error('PUT /api/admin/column error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.companies || session.user.companies.length === 0) {
      return NextResponse.json({ success: false, error: 'No companies associated with user' }, { status: 400 });
    }

    const companyParam = req.nextUrl.searchParams.get('companyId');
    const locationParam = req.nextUrl.searchParams.get('locationId');
    const { companyId, locationId } = companyParam && locationParam
      ? { companyId: companyParam, locationId: locationParam }
      : { companyId: session.user.companies[0].companyId, locationId: session.user.companies[0].locations[0].locationId };
    const { id } = await req.json();

    if (!companyId || !locationId || !id) {
      return NextResponse.json({ success: false, error: 'Company ID, Location ID, and Column ID are required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    const column = await Column.findOneAndDelete({ _id: id, companyId, locationId });
    if (!column) {
      return NextResponse.json({ success: false, error: 'Column not found' }, { status: 404 });
    }

    // Create audit log
    try {
      const audit = new Audit({
        action: 'delete',
        userId: session.user.userId,
        module: 'column',
        companyId,
        locationId,
        changes: { deleted: column },
      });
      await audit.save();
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/admin/column error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}