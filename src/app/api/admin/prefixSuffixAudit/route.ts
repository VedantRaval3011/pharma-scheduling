import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Audit } from '@/models/PrefixSuffix';
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
    const companyId = searchParams.get('companyId');
    const locationId = searchParams.get('locationId');
    const moduleName = searchParams.get('moduleName');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    console.log('Received query params:', { companyId, locationId, moduleName, limit });

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
    if (moduleName) {
      query.moduleName = { $regex: `^${moduleName}$`, $options: 'i' };
    }

    console.log('Executing MongoDB query:', JSON.stringify(query, null, 2));
    const audits = await Audit.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    console.log('Fetched audit records:', {
      count: audits.length,
      records: audits.slice(0, 5) // Log first 5 for brevity
    });
    
    return NextResponse.json({ success: true, data: audits }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching audit records:', error);
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

    const { action, companyId, locationId, oldValue, newValue, itemId, moduleName } = await request.json();
    console.log('POST Request Data:', { action, companyId, locationId, oldValue, newValue, itemId, moduleName });

    if (!action || !companyId || !locationId || !moduleName) {
      return NextResponse.json(
        { success: false, error: 'Action, company ID, location ID, and module name are required' },
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

    const auditData = {
      action,
      userId: session.user.id,
      userName: session.user.userId || session.user.id,
      companyId,
      locationId,
      moduleName,
      itemId: itemId || null,
      oldValue: oldValue || null,
      newValue: newValue || null,
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '::1',
      userAgent: request.headers.get('user-agent') || 'Unknown'
    };

    console.log('Attempting to create audit record:', auditData);
    const audit = await Audit.create(auditData);
    console.log('Audit record created successfully:', audit);
    
    return NextResponse.json({ success: true, data: audit }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating audit record:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}