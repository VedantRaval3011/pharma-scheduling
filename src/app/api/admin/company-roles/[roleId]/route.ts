import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CompanyRole } from '@/models/employee';
import { AuditRole } from '@/models/auditRole';
import connectDB from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Interface for request body
interface UpdateRoleRequest {
  name: string;
  description?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roleId } = await params;
    const { name, description } = await request.json() as UpdateRoleRequest;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    await connectDB();

    const existingRole = await CompanyRole.findOne({ 
      name: name.toLowerCase(),
      roleId: { $ne: roleId }
    });
    
    if (existingRole) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    const previousRole = await CompanyRole.findOne({ roleId });
    if (!previousRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const role = await CompanyRole.findOneAndUpdate(
      { roleId },
      { name, description, updatedBy: session.user.userId },
      { new: true }
    );

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Create audit log
    const auditLog = new AuditRole({
      auditId: uuidv4(),
      roleId,
      action: 'UPDATE',
      changedData: {
        previous: { name: previousRole.name, description: previousRole.description },
        new: { name, description }
      },
      performedBy: session.user.userId,
    });
    await auditLog.save();

    return NextResponse.json({
      message: 'Role updated successfully',
      role: {
        roleId: role.roleId,
        name: role.name,
        description: role.description,
      }
    });
  } catch (error: unknown) {
    console.error('Update role error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}