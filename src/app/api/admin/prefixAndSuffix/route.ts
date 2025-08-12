
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrefixSuffix, Audit } from '@/models/PrefixSuffix';
import connectToDatabase from '@/lib/db';
import Pusher from 'pusher';

// Initialize Pusher client - optimized for performance
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Types for better TypeScript support
interface PusherEventData {
  action: 'create' | 'update' | 'delete';
  type: 'prefix' | 'suffix';
  data: {
    id: string;
    name: string;
    oldName?: string;
  };
  timestamp: string;
  companyId: string;
  locationId: string;
}

// Helper function to send Pusher notification - optimized for minimal latency
async function sendPusherNotification(
  action: 'create' | 'update' | 'delete',
  type: 'prefix' | 'suffix',
  data: any,
  companyId: string,
  locationId: string
): Promise<void> {
  try {
    // Use specific channel per company-location for better performance
    const channelName = `master-updates-${companyId}-${locationId}`;
    const eventData: PusherEventData = {
      action,
      type,
      data,
      timestamp: new Date().toISOString(),
      companyId,
      locationId
    };

    // Non-blocking async call for minimal latency impact
    pusher.trigger(channelName, 'master-data-update', eventData).catch(error => {
      console.error('Pusher notification failed:', error);
      // Don't throw error to avoid breaking the main operation
    });
    
    console.log(`Pusher notification sent: ${action} ${type}`, data);
  } catch (error) {
    console.error('Failed to send Pusher notification:', error);
    // Don't throw error here to avoid breaking the main operation
  }
}

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

    // Send Pusher notification for CREATE
    await sendPusherNotification('create', type.toLowerCase() as 'prefix' | 'suffix', {
      id: item._id.toString(),
      name: item.name
    }, companyId, locationId);

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
    
    // Send Pusher notification for UPDATE
    await sendPusherNotification('update', existing.type.toLowerCase() as 'prefix' | 'suffix', {
      id: existing._id.toString(),
      name: existing.name,
      oldName: oldValue.name
    }, companyId, locationId);
    
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

    // Send Pusher notification for DELETE
    await sendPusherNotification('delete', item.type.toLowerCase() as 'prefix' | 'suffix', {
      id: item._id.toString(),
      name: item.name
    }, companyId, locationId);

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
        // Create audit log
    const audit = await Audit.create(auditData);
    console.log('Audit record created successfully:', audit);

    // Delete the item from the DB
    await PrefixSuffix.deleteOne({ _id: id, companyId, locationId });
    console.log(`Item deleted successfully: ${id}`);

    return NextResponse.json(
      { success: true, message: 'Item deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
