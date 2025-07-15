// app/api/company-roles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CompanyRole } from '@/models/employee';
import connectDB from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Interface for request body
interface CreateRoleRequest {
  name: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json() as CreateRoleRequest;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    await connectDB();

    const existingRole = await CompanyRole.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      return NextResponse.json({ error: 'Role already exists' }, { status: 400 });
    }

    const newRole = new CompanyRole({
      roleId:uuidv4(),
      name,
      description,
      createdBy: session.user.userId,
    });

    await newRole.save();

    return NextResponse.json({
      message: 'Role created successfully',
      role: {
        roleId: newRole.roleId,
        name: newRole.name,
        description: newRole.description,
      }
    });
  } catch (error: unknown) {
    console.error('Create role error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const roles = await CompanyRole.find().select('roleId name description');
    return NextResponse.json({ data: roles });
  } catch (error: unknown) {
    console.error('Get roles error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}