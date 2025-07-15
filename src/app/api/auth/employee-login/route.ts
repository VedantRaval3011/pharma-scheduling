import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import connectDB from '@/lib/db';
import { Employee } from '@/models/employee';
import { User } from '@/models/user';
import { SessionUser } from '@/types/user';

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const { employeeId, password, companyId, locationId } = await req.json();

    if (!employeeId || !password || !companyId || !locationId) {
      console.error('POST /api/auth/employee-login: Missing required credentials');
      return NextResponse.json({ error: 'Missing required credentials' }, { status: 400 });
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      console.error(`POST /api/auth/employee-login: Employee not found for employeeId: ${employeeId}`);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const isValidPassword = await employee.comparePassword(password);
    if (!isValidPassword) {
      console.error(`POST /api/auth/employee-login: Invalid password for employeeId: ${employeeId}`);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const company = employee.companies.find(
      (c: any) => c.companyId === companyId.toUpperCase()
    );
    if (!company) {
      console.error(`POST /api/auth/employee-login: Invalid company details for employeeId: ${employeeId}`);
      return NextResponse.json({ error: 'Invalid company details' }, { status: 400 });
    }

    const location = company.locations.find(
      (l: any) => l.locationId === locationId
    );
    if (!location) {
      console.error(`POST /api/auth/employee-login: Invalid location details for employeeId: ${employeeId}`);
      return NextResponse.json({ error: 'Invalid location details' }, { status: 400 });
    }

    // Check if user exists, if not create one
    let user = await User.findOne({ userId: employee.userId });
    if (!user) {
      user = new User({
        userId: employee.userId,
        password: employee.password,
        role: 'employee',
        email: employee.email || `${employee.userId}@company.com`,
        companies: [{
          companyId: company.companyId,
          name: company.name,
          locations: [{ locationId: location.locationId, name: location.name }],
        }],
      });
      await user.save();
    } else {
      // Update user companies if needed
      const companyExists = user.companies.some(
        (c: any) => c.companyId === company.companyId
      );
      if (!companyExists) {
        user.companies.push({
          companyId: company.companyId,
          name: company.name,
          locations: [{ locationId: location.locationId, name: location.name }],
        });
        await user.save();
      } else {
        const companyInUser = user.companies.find(
          (c: any) => c.companyId === company.companyId
        );
        const locationExists = companyInUser.locations.some(
          (l: any) => l.locationId === location.locationId
        );
        if (!locationExists) {
          companyInUser.locations.push({ locationId: location.locationId, name: location.name });
          await user.save();
        }
      }
    }

    // Create JWT token
    const token = sign(
      {
        id: user._id.toString(),
        userId: user.userId,
        role: user.role,
        companies: user.companies,
        email: user.email,
      } as SessionUser,
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '1h' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        userId: user.userId,
        role: user.role,
        companies: user.companies,
        email: user.email,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('POST /api/auth/employee-login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}