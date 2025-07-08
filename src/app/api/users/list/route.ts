// app/api/users/list/route.ts
import {  NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/user';
import connectDB from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    let users;
    
    if (session.user.role === 'super_admin') {
      // Super admin can see all users
      users = await User.find({}, '-password').sort({ createdAt: -1 });
    } else if (session.user.role === 'admin') {
      // Admin can see employees in their company
      users = await User.find({ 
        companyId: session.user.companyId,
        role: 'employee' 
      }, '-password').sort({ createdAt: -1 });
    } else {
      // Employees can only see their own data
      users = await User.find({ 
        userId: session.user.userId 
      }, '-password');
    }

    return NextResponse.json({ users });

  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}