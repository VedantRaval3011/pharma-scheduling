import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { AuditRole } from '@/models/auditRole';
import connectDB from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    await connectDB();

    const query = roleId ? { roleId } : {};
    const auditLogs = await AuditRole.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json({ data: auditLogs }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get audit logs error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}