import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrefixSuffix, Audit } from '@/models/PrefixSuffix';
import connectToDatabase from '@/lib/db';

// Helper function to validate companyId and locationId against session
function validateCompanyAndLocation(session: any, companyId: string, locationId: string) {
  const company = session?.user?.companies?.find((c: any) => c.companyId === companyId);
  if (!company) {
    return false;
  }
  return company.locations?.some((l: any) => l.locationId === locationId);
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    console.log('Session data:', JSON.stringify(session, null, 2));
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');

    console.log('Query params:', { type, search, companyId, locationId });

    if (!companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Company ID and location ID are required' },
        { status: 400 }
      );
    }

    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    console.log('Company/location validation result:', isValidCompanyLocation);
    if (!isValidCompanyLocation) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    const query: any = { companyId, locationId };
    if (type) query.type = type;
    if (search) query.name = { $regex: `^${search}`, $options: 'i' };

    console.log('MongoDB query:', JSON.stringify(query, null, 2));
    const items = await PrefixSuffix.find(query).sort({ name: 1 }).lean();
    
    console.log(`Fetched items: count=${items.length}`);
    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (error: any) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    console.log('Session data:', JSON.stringify(session, null, 2));
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { name, type, companyId, locationId } = body;
    console.log('POST Request Data:', { name, type, companyId, locationId });

    if (!name || !type || !companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Name, type, company ID, and location ID are required' },
        { status: 400 }
      );
    }

    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    console.log('Company/location validation result:', isValidCompanyLocation);
    if (!isValidCompanyLocation) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    const existing = await PrefixSuffix.findOne({ 
      name: name.trim(), 
      type, 
      companyId, 
      locationId 
    });
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Item already exists for this company and location' },
        { status: 400 }
      );
    }

    const itemData = {
      name: name.trim(),
      type,
      companyId,
      locationId,
      createdBy: session.user.userId || session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating item with data:', itemData);
    const item = await PrefixSuffix.create(itemData);
    console.log('Item created successfully:', item);

    const auditData = {
      action: 'CREATE',
      userId: session.user.id,
      userName: session.user.userId || session.user.id,
      companyId,
      locationId,
      moduleName: 'PrefixSuffix',
      itemId: item._id,
      newValue: item,
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '::1',
      userAgent: request.headers.get('user-agent') || 'Unknown'
    };
    console.log('Attempting to create audit record:', auditData);
    const audit = await Audit.create(auditData);
    console.log('Audit record created successfully:', audit);

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error: any) {
    console.error('POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    console.log('Session data:', JSON.stringify(session, null, 2));
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { id, name, companyId, locationId } = body;
    console.log('PUT Request Data:', { id, name, companyId, locationId });

    if (!id || !name || !companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'ID, name, company ID, and location ID are required' },
        { status: 400 }
      );
    }

    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    console.log('Company/location validation result:', isValidCompanyLocation);
    if (!isValidCompanyLocation) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    const existing = await PrefixSuffix.findOne({ _id: id, companyId, locationId });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    const oldValue = { name: existing.name };

    const duplicate = await PrefixSuffix.findOne({
      name: name.trim(),
      type: existing.type,
      companyId,
      locationId,
      _id: { $ne: id }
    });
    
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'Item already exists for this company and location' },
        { status: 400 }
      );
    }

    existing.name = name.trim();
    existing.updatedAt = new Date();
    const updatedItem = await existing.save();
    console.log('Item updated successfully:', updatedItem);

    const auditData = {
      action: 'UPDATE',
      userId: session.user.id,
      userName: session.user.userId || session.user.id,
      companyId,
      locationId,
      moduleName: 'PrefixSuffix',
      itemId: id,
      oldValue,
      newValue: { name: name.trim() },
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '::1',
      userAgent: request.headers.get('user-agent') || 'Unknown'
    };
    console.log('Attempting to create audit record:', auditData);
    const audit = await Audit.create(auditData);
    console.log('Audit record created successfully:', audit);

    return NextResponse.json({ success: true, data: updatedItem }, { status: 200 });
  } catch (error: any) {
    console.error('PUT Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    console.log('Session data:', JSON.stringify(session, null, 2));
    if (!session || !session.user || !session.user.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or no company assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');

    console.log('DELETE Request Data:', { id, companyId, locationId });

    if (!id || !companyId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'ID, company ID, and location ID are required' },
        { status: 400 }
      );
    }

    const isValidCompanyLocation = validateCompanyAndLocation(session, companyId, locationId);
    console.log('Company/location validation result:', isValidCompanyLocation);
    if (!isValidCompanyLocation) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized company or location access' },
        { status: 403 }
      );
    }

    const item = await PrefixSuffix.findOne({ _id: id, companyId, locationId });
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    const auditData = {
      action: 'DELETE',
      userId: session.user.id,
      userName: session.user.userId || session.user.id,
      companyId,
      locationId,
      moduleName: 'PrefixSuffix',
      itemId: id,
      oldValue: item,
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '::1',
      userAgent: request.headers.get('user-agent') || 'Unknown'
    };
    console.log('Attempting to create audit record:', auditData);
    const audit = await Audit.create(auditData);
    console.log('Audit record created successfully:', audit);

    await PrefixSuffix.deleteOne({ _id: id });
    console.log('Item deleted successfully:', { id, name: item.name });

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
      deletedItem: { id: item._id, name: item.name }
    }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}