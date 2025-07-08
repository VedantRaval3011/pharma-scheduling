// app/api/users/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/user';
import connectDB from '@/lib/db';


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const currentUser = session.user;
    let users;

    // Role-based filtering
    if (currentUser.role === 'super_admin') {
      // Super admin can see all users
      users = await User.find({})
        .select('-password')
        .sort({ createdAt: -1 });
    } else if (currentUser.role === 'admin') {
      // Admin can only see employees in their company
      users = await User.find({
        companyId: currentUser.companyId,
        role: 'employee'
      })
      .select('-password')
      .sort({ createdAt: -1 });
    } else {
      // Employee can only see their own data
      users = await User.find({
        userId: currentUser.userId
      })
      .select('-password')
      .sort({ createdAt: -1 });
    }

    return NextResponse.json({
      users,
      currentUser: {
        id: currentUser.id,
        userId: currentUser.userId,
        role: currentUser.role,
        companyId: currentUser.companyId,
        company: currentUser.company
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}