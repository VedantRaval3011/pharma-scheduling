// app/api/admin/create-employee/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/user';
import connectDB from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, password } = await request.json();

    if (!userId || !password) {
      return NextResponse.json({ error: 'User ID and password are required' }, { status: 400 });
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ userId: userId.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User ID already exists' }, { status: 400 });
    }

    // Create employee user with admin's company details
    const newEmployee = new User({
      userId: userId.toLowerCase(),
      password,
      role: 'employee',
      companyId: session.user.companyId,
      company: session.user.company
    });

    await newEmployee.save();

    return NextResponse.json({ 
      message: 'Employee created successfully',
      employee: {
        userId: newEmployee.userId,
        companyId: newEmployee.companyId,
        company: newEmployee.company,
        role: newEmployee.role
      }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
