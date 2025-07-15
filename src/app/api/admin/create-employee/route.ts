import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { signIn } from 'next-auth/react';
import { authOptions } from '@/lib/auth';
import { Employee, CompanyRole, ILocation, IModuleAccess } from '@/models/employee';
import { User, Company } from '@/models/user';
import connectDB from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { adminEmployeeNavData } from '@/data/navigationData';

// Interface for request body
interface CreateEmployeeRequest {
  employeeId: string;
  userId: string;
  password?: string;
  name: string;
  companyRoles: string[];
  companyId: string;
  locationIds: string[];
  moduleAccess: { moduleId?: string; modulePath: string; moduleName: string; permissions: string[] }[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const companies = session.user.companies;
    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: 'No companies associated with user' }, { status: 400 });
    }

    const allEmployees = await Promise.all(
      companies.map(async (company) => {
        const employees = await Employee.find({ 'companies.companyId': company.companyId });
        return employees;
      })
    );

    const flatEmployees = allEmployees.flat();

    return NextResponse.json({ data: flatEmployees }, { status: 200 });
  } catch (error: unknown) {
    console.error('Fetch employees error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, userId, password, name, companyRoles, companyId, locationIds, moduleAccess } = await request.json() as CreateEmployeeRequest;

    if (!employeeId || !userId || !password || !name || !companyId) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    await connectDB();

    // Check if employeeId or userId already exists
    const existingEmployee = await Employee.findOne({ $or: [
      { employeeId: employeeId.toUpperCase() },
      { userId: userId.toLowerCase() }
    ]});
    if (existingEmployee) {
      return NextResponse.json({ error: 'Employee ID or User ID already exists' }, { status: 400 });
    }

    // Check if userId already exists in User collection
    const existingUser = await User.findOne({ userId: userId.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User ID already exists in User collection' }, { status: 400 });
    }

    // Validate company roles
    const validRoles = await CompanyRole.find({ roleId: { $in: companyRoles } });
    if (validRoles.length !== companyRoles.length) {
      return NextResponse.json({ error: 'Invalid company roles provided' }, { status: 400 });
    }

    // Validate company and locations
    const company = await Company.findOne({ companyId: companyId.toUpperCase() });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyLocations = company.locations.filter((loc: ILocation) => locationIds.includes(loc.locationId));
    if (companyLocations.length !== locationIds.length) {
      return NextResponse.json({ error: 'Invalid location IDs provided' }, { status: 400 });
    }

    // Validate and process module access
    const validModules = adminEmployeeNavData
      .flatMap(item => 
        item.children?.flatMap(child => 
          child.children ? child.children.map(sub => sub.path) : [child.path]
        ).filter((path): path is string => Boolean(path))
      );

    const processedModuleAccess: IModuleAccess[] = moduleAccess.map((access) => {
      if (!validModules.includes(access.modulePath)) {
        throw new Error(`Invalid module path: ${access.modulePath}`);
      }
      return {
        moduleId: uuidv4(),
        modulePath: access.modulePath,
        moduleName: access.moduleName,
        permissions: access.permissions.length > 0 ? access.permissions : ['read'],
      };
    });

    // Create new employee
    const newEmployee = new Employee({
      employeeId: employeeId.toUpperCase(),
      userId: userId.toLowerCase(),
      name,
      password,
      role: 'employee',
      companyRoles,
      companies: [{
        companyId: company.companyId,
        name: company.name,
        locations: companyLocations,
      }],
      moduleAccess: processedModuleAccess,
    });

    await newEmployee.save();

    // Create or update User document
    let user = await User.findOne({ userId: userId.toLowerCase() });
    if (!user) {
      user = new User({
        userId: userId.toLowerCase(),
        password, // Password will be hashed by the User schema's pre-save hook
        role: 'employee',
        email: `${userId.toLowerCase()}@company.com`, // Default email if not provided
        companies: [{
          companyId: company.companyId,
          name: company.name,
          locations: companyLocations,
        }],
      });
      await user.save();
    } else {
      // Update existing user if necessary
      const companyExists = user.companies.some((c: any) => c.companyId === company.companyId);
      if (!companyExists) {
        user.companies.push({
          companyId: company.companyId,
          name: company.name,
          locations: companyLocations,
        });
        await user.save();
      } else {
        const companyInUser = user.companies.find((c: any) => c.companyId === company.companyId);
        for (const loc of companyLocations) {
          const locationExists = companyInUser.locations.some((l: any) => l.locationId === loc.locationId);
          if (!locationExists) {
            companyInUser.locations.push(loc);
          }
        }
        await user.save();
      }
    }

    // Programmatically sign in the new employee to create a session
    try {
      await signIn('credentials', {
        redirect: false,
        userId: userId.toLowerCase(),
        password,
        companyId: company.companyId,
        company: company.name,
        locationId: companyLocations[0]?.locationId || '',
        location: companyLocations[0]?.name || '',
        loginType: 'employee',
      });
    } catch (signInError) {
      console.error('Sign-in error:', signInError);
      // Note: We don't fail the entire request if sign-in fails, as the employee and user are already created
    }

    return NextResponse.json({ 
      message: 'Employee created successfully and user registered',
      employee: {
        employeeId: newEmployee.employeeId,
        userId: newEmployee.userId,
        name: newEmployee.name,
        companyRoles: newEmployee.companyRoles,
        companyId: newEmployee.companies[0].companyId,
        company: newEmployee.companies[0].name,
        locations: newEmployee.companies[0].locations,
        moduleAccess: newEmployee.moduleAccess,
        role: newEmployee.role,
      }
    });

  } catch (error: unknown) {
    console.error('Create employee error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, userId, password, name, companyRoles, companyId, locationIds, moduleAccess } = await request.json() as CreateEmployeeRequest;

    if (!employeeId || !userId || !name || !companyId) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    await connectDB();

    // Find the employee to update
    const employee = await Employee.findOne({ employeeId: employeeId.toUpperCase() });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Validate userId
    if (employee.userId !== userId.toLowerCase()) {
      const existingUser = await Employee.findOne({ userId: userId.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ error: 'User ID already exists for another employee' }, { status: 400 });
      }
    }

    // Validate company roles
    const validRoles = await CompanyRole.find({ roleId: { $in: companyRoles } });
    if (validRoles.length !== companyRoles.length) {
      return NextResponse.json({ error: 'Invalid company roles provided' }, { status: 400 });
    }

    // Validate company and locations
    const company = await Company.findOne({ companyId: companyId.toUpperCase() });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyLocations = company.locations.filter((loc: ILocation) => locationIds.includes(loc.locationId));
    if (companyLocations.length !== locationIds.length) {
      return NextResponse.json({ error: 'Invalid location IDs provided' }, { status: 400 });
    }

    // Validate and process module access
    const validModules = adminEmployeeNavData
      .flatMap(item => 
        item.children?.flatMap(child => 
          child.children ? child.children.map(sub => sub.path) : [child.path]
        ).filter((path): path is string => Boolean(path))
      );

    const processedModuleAccess: IModuleAccess[] = moduleAccess.map((access) => {
      if (!validModules.includes(access.modulePath)) {
        throw new Error(`Invalid module path: ${access.modulePath}`);
      }
      return {
        moduleId: access.moduleId || uuidv4(),
        modulePath: access.modulePath,
        moduleName: access.moduleName,
        permissions: access.permissions.length > 0 ? access.permissions : ['read'],
      };
    });

    // Update employee details
    employee.userId = userId.toLowerCase();
    employee.name = name;
    if (password) {
      employee.password = password; // Password will be hashed by the schema's pre-save hook
    }
    employee.companyRoles = companyRoles;
    employee.companies = [{
      companyId: company.companyId,
      name: company.name,
      locations: companyLocations,
    }];
    employee.moduleAccess = processedModuleAccess;

    await employee.save();

    // Update User document
    let user = await User.findOne({ userId: userId.toLowerCase() });
    if (!user) {
      user = new User({
        userId: userId.toLowerCase(),
        password: password || employee.password, // Use provided password or keep existing
        role: 'employee',
        email: `${userId.toLowerCase()}@company.com`,
        companies: [{
          companyId: company.companyId,
          name: company.name,
          locations: companyLocations,
        }],
      });
      await user.save();
    } else {
      const companyExists = user.companies.some((c: any) => c.companyId === company.companyId);
      if (!companyExists) {
        user.companies.push({
          companyId: company.companyId,
          name: company.name,
          locations: companyLocations,
        });
      } else {
        const companyInUser = user.companies.find((c: any) => c.companyId === company.companyId);
        companyInUser.locations = companyLocations;
      }
      if (password) {
        user.password = password; // Update password if provided
      }
      await user.save();
    }

    return NextResponse.json({ 
      message: 'Employee updated successfully',
      employee: {
        employeeId: employee.employeeId,
        userId: employee.userId,
        name: employee.name,
        companyRoles: employee.companyRoles,
        companyId: employee.companies[0].companyId,
        company: employee.companies[0].name,
        locations: employee.companies[0].locations,
        moduleAccess: employee.moduleAccess,
        role: employee.role,
      }
    });

  } catch (error: unknown) {
    console.error('Update employee error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}