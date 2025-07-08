// app/api/admin/create-admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/user';
import { Company } from '@/models/company';
import connectDB from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, password, companyId, company } = await request.json();

    if (!userId || !password || !companyId || !company) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ userId: userId.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User ID already exists' }, { status: 400 });
    }

    // Check if company exists, if not create it
    let existingCompany = await Company.findOne({ companyId: companyId.toUpperCase() });
    if (!existingCompany) {
      existingCompany = new Company({
        companyId: companyId.toUpperCase(),
        name: company,
        createdBy: session.user.userId
      });
      await existingCompany.save();
    }

    // Create admin user
    const newAdmin = new User({
      userId: userId.toLowerCase(),
      password,
      role: 'admin',
      companyId: companyId.toUpperCase(),
      company
    });

    await newAdmin.save();

    return NextResponse.json({ 
      message: 'Admin created successfully',
      admin: {
        userId: newAdmin.userId,
        companyId: newAdmin.companyId,
        company: newAdmin.company,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
