import { NextRequest, NextResponse } from 'next/server';
import { Employee, CompanyRole } from '@/models/employee';
import connectDB from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userIdQuery = searchParams.get('userIdQuery');
    const query = searchParams.get('query');
    const userId = searchParams.get('userId');

    const companyRolePopulateOptions = {
      path: 'companyRoles',
      localField: 'companyRoles',
      foreignField: 'roleId',
      justOne: false,
      select: 'roleId name description',
    };

    // Handle exact userId match
    if (userId) {
      const employee = await Employee.findOne({ userId })
        .populate(companyRolePopulateOptions)
        .lean();

      if (!employee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: employee,
        message: 'Employee fetched successfully',
      });
    }

    // Handle userIdQuery for suggestions
    if (userIdQuery) {
      const employees = await Employee.find({
        userId: {
          $regex: `^${userIdQuery}`,
          $options: 'i',
        },
      })
        .select('userId name')
        .limit(10)
        .lean();

      return NextResponse.json({
        data: employees,
        message: 'User ID suggestions fetched successfully',
      });
    }

    // Handle general query
    if (query) {
      const employees = await Employee.find({
        $or: [
          { userId: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
        .populate(companyRolePopulateOptions)
        .lean();

      return NextResponse.json({
        data: employees,
        message: 'Employee search completed successfully',
      });
    }

    // Fetch all employees
    const employees = await Employee.find({})
      .populate(companyRolePopulateOptions)
      .lean();

    return NextResponse.json({
      data: employees,
      message: 'All employees fetched successfully',
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    const { employeeId, userId, name, password, companyRoles, companyId, locationIds, moduleAccess } = data;
    if (!employeeId || !userId || !name || !password || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate companyRoles exist in CompanyRole collection
    if (companyRoles && companyRoles.length > 0) {
      const roles = await CompanyRole.find({ roleId: { $in: companyRoles } }).lean();
      if (roles.length !== companyRoles.length) {
        return NextResponse.json(
          { error: 'One or more company roles are invalid' },
          { status: 400 }
        );
      }
    }

    // Check if userId already exists
    const existingEmployee = await Employee.findOne({ userId }).lean();
    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Employee with this userId already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new employee
    const employee = new Employee({
      employeeId: employeeId || uuidv4(),
      userId,
      name,
      password: hashedPassword,
      role: data.role || 'employee', // Default to 'employee' if not provided
      companyRoles: companyRoles || [],
      companies: companyId ? [{ companyId, locations: locationIds || [] }] : [],
      moduleAccess: moduleAccess || [],
      email: data.email,
    });

    await employee.save();

    // Populate companyRoles for response
    const populatedEmployee = await Employee.findOne({ userId })
      .populate({
        path: 'companyRoles',
        localField: 'companyRoles',
        foreignField: 'roleId',
        justOne: false,
        select: 'roleId name description',
      })
      .lean();

    return NextResponse.json({
      data: populatedEmployee,
      message: 'Employee created successfully',
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // Validate required fields
    const { employeeId, userId, name, password, companyRoles, companyId, locationIds, moduleAccess } = data;
    if (!employeeId || !userId || !name || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate companyRoles exist in CompanyRole collection
    if (companyRoles && companyRoles.length > 0) {
      const roles = await CompanyRole.find({ roleId: { $in: companyRoles } }).lean();
      if (roles.length !== companyRoles.length) {
        return NextResponse.json(
          { error: 'One or more company roles are invalid' },
          { status: 400 }
        );
      }
    }

    // Find existing employee
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Update employee fields
    employee.userId = userId;
    employee.name = name;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(password, salt);
    }
    employee.companyRoles = companyRoles || [];
    employee.companies = companyId ? [{ companyId, locations: locationIds || [] }] : [];
    employee.moduleAccess = moduleAccess || [];
    employee.email = data.email || employee.email;
    employee.updatedAt = new Date();

    await employee.save();

    // Populate companyRoles for response
    const populatedEmployee = await Employee.findOne({ employeeId })
      .populate({
        path: 'companyRoles',
        localField: 'companyRoles',
        foreignField: 'roleId',
        justOne: false,
        select: 'roleId name description',
      })
      .lean();

    return NextResponse.json({
      data: populatedEmployee,
      message: 'Employee updated successfully',
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}