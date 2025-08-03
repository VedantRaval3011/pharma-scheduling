import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Series } from '@/models/Series';
import { getServerSession } from 'next-auth';
import { getCurrentCompanyAndLocation } from '@/lib/session';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!params?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Series ID is required' 
      }, { status: 400 });
    }

    // Get session
    const session = await getServerSession();
    if (!session?.user?.companies?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Find the series
    const series = await Series.findById(params.id);
    if (!series) {
      return NextResponse.json({ 
        success: false, 
        error: 'Series not found' 
      }, { status: 404 });
    }

    // Verify access
    const company = session.user.companies.find(c => c.companyId === series.companyId);
    if (!company || !company.locations.find(l => l.locationId === series.locationId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      data: series 
    }, { status: 200 });
  } catch (error) {
    console.error('GET /api/admin/series/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch series',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!params?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Series ID is required' 
      }, { status: 400 });
    }

    const data = await request.json();

    // Get session
    const session = await getServerSession();
    if (!session?.user?.companies?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Find the series
    const series = await Series.findById(params.id);
    if (!series) {
      return NextResponse.json({ 
        success: false, 
        error: 'Series not found' 
      }, { status: 404 });
    }

    // Verify access
    const company = session.user.companies.find(c => c.companyId === series.companyId);
    if (!company || !company.locations.find(l => l.locationId === series.locationId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // Check for name conflicts
    if (data.name && data.name !== series.name) {
      const existingSeries = await Series.findOne({ 
        name: data.name, 
        companyId: series.companyId, 
        locationId: series.locationId,
        _id: { $ne: params.id }
      });
      if (existingSeries) {
        return NextResponse.json({ 
          success: false, 
          error: 'Series with this name already exists' 
        }, { status: 409 });
      }
    }

    // Update the series
    const updatedSeries = await Series.findByIdAndUpdate(
      params.id,
      { $set: { ...data, updatedAt: new Date() } },
      { new: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Series updated', 
      series: updatedSeries 
    }, { status: 200 });
  } catch (error) {
    console.error('PUT /api/admin/series/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update series',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    if (!params?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Series ID is required' 
      }, { status: 400 });
    }

    // Get session
    const session = await getServerSession();
    if (!session?.user?.companies?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Find the series
    const series = await Series.findById(params.id);
    if (!series) {
      return NextResponse.json({ 
        success: false, 
        error: 'Series not found' 
      }, { status: 404 });
    }

    // Verify access
    const company = session.user.companies.find(c => c.companyId === series.companyId);
    if (!company || !company.locations.find(l => l.locationId === series.locationId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // Delete the series
    await Series.findByIdAndDelete(params.id);
    return NextResponse.json({ 
      success: true, 
      message: 'Series deleted' 
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/admin/series/[id] error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete series',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}