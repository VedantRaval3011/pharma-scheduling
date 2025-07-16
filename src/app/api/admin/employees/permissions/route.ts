import { NextResponse } from 'next/server';
import { Employee } from '@/models/employee';
import connectDB from '@/lib/db';
import { IModuleAccess } from '@/models/employee';
import { v4 as uuidv4 } from 'uuid';

export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { employeeId, permissions } = await request.json();

    if (!employeeId || !permissions) {
      return NextResponse.json({ error: 'Missing employeeId or permissions' }, { status: 400 });
    }

    // Transform permissions object into moduleAccess array
    const moduleAccess: IModuleAccess[] = Object.entries(permissions).map(([modulePath, perms]) => ({
      moduleId: uuidv4(),
      modulePath,
      moduleName: modulePath.split('/').pop() || modulePath,
      permissions: perms as string[],
    }));

    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      { $set: { moduleAccess } },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Permissions updated successfully', employee });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}