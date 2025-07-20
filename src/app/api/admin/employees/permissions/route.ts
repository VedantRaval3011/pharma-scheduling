import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import { Employee, ICompany } from '@/models/employee';
import { IModuleAccess } from '@/models/employee';

type LeanEmployee = {
  employeeId: string;
  moduleAccess?: IModuleAccess[];
  companies: ICompany[];
};

// GET: Fetch permissions for a specific employee
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user ||
      !['employee','admin', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch employee and ensure it matches the required shape
    const employeeData = await Employee.findOne({ employeeId }).lean();

    if (!employeeData) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const rawData = await Employee.findOne({ employeeId }).lean();

if (!rawData) {
  return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
}

// Safely cast through `unknown` after null check
const employee = rawData as unknown as LeanEmployee;

    if (session.user.role === 'admin') {
      const userCompanies = session.user.companies.map((c) => c.companyId);
      const employeeCompanies = employee.companies.map(
        (c: ICompany) => c.companyId
      );
      const hasCommonCompany = userCompanies.some((companyId) =>
        employeeCompanies.includes(companyId)
      );

      if (!hasCommonCompany) {
        return NextResponse.json(
          { error: 'Unauthorized: No access to this employee' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      employeeId: employee.employeeId,
      moduleAccess: employee.moduleAccess || [],
    });
  } catch (error) {
    console.error('Error fetching employee permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update permissions for a specific employee
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user ||
      !['employee','admin', 'super_admin'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, permissions } = await request.json();

    if (!employeeId || !permissions) {
      return NextResponse.json(
        { error: 'Employee ID and permissions are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const employee = await Employee.findOne({ employeeId });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (session.user.role === 'admin') {
      const userCompanies = session.user.companies.map((c) => c.companyId);
      const employeeCompanies = employee.companies.map(
        (c: ICompany) => c.companyId
      );
      const hasCommonCompany = userCompanies.some((companyId) =>
        employeeCompanies.includes(companyId)
      );

      if (!hasCommonCompany) {
        return NextResponse.json(
          { error: 'Unauthorized: No access to this employee' },
          { status: 403 }
        );
      }
    }

    // Validate permissions before saving
    const validPermissions = ['read', 'write', 'edit', 'delete', 'audit'];
    
    // Convert permission object into moduleAccess array with validation
    const updatedModuleAccess: IModuleAccess[] = Object.entries(
      permissions
    ).map(([modulePath, perms]) => {
      // Validate that all permissions are valid
      const permissionsArray = perms as string[];
      const invalidPermissions = permissionsArray.filter(
        perm => !validPermissions.includes(perm)
      );
      
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }

      const existingModule = employee.moduleAccess?.find(
        (m: IModuleAccess) => m.modulePath === modulePath
      );

      return {
        moduleId: existingModule?.moduleId || modulePath,
        modulePath,
        moduleName:
          existingModule?.moduleName ||
          modulePath.replace(/^\//, '').replace(/-/g, ' '),
        permissions: permissionsArray,
      };
    });

    // Clear existing moduleAccess and set new ones
    employee.moduleAccess = updatedModuleAccess;
    employee.updatedAt = new Date();

    // Use markModified to ensure Mongoose recognizes the change
    employee.markModified('moduleAccess');

    await employee.save();

    return NextResponse.json({
      message: 'Permissions updated successfully',
      moduleAccess: employee.moduleAccess,
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    
    // Handle Mongoose validation errors specifically
    if (error instanceof Error) {
      if (error.message.includes('validation failed')) {
        return NextResponse.json(
          { error: `Validation error: ${error.message}` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

}
