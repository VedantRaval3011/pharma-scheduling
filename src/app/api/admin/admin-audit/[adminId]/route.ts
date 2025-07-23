import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { AdminAuditLog } from '@/models/adminAudit';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      console.error('Unauthorized: No session user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adminId } = await params; // Fix: Await params
    if (!adminId) {
      console.error('Admin ID is required');
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    await mongoose.connect(process.env.MONGODB_URI!);

    const auditLogs = await AdminAuditLog.find({ adminId })
      .sort({ timestamp: -1 })
      .limit(50);

    console.log(`Fetched ${auditLogs.length} audit logs for adminId: ${adminId}`);
    return NextResponse.json(auditLogs, { status: 200 }); // Return logs directly as an array
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}