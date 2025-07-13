import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Update this to the actual path of your NextAuth config
import connectDB from '@/lib/db';
import { User } from '@/models/user';

export async function GET(req: NextRequest) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserId = session.user.id;
  const currentUser = await User.findById(currentUserId).select('role userId companyId company');

  if (!currentUser || !['super_admin', 'admin'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
  }

  try {
    const admins = await User.find({
      role: { $in: ['super_admin', 'admin'] },
      ...(currentUser.role === 'admin' && { companyId: currentUser.companyId }),
    }).select('-password -__v');

    const adminDetails = admins.map(admin => ({
      id: admin._id.toString(),
      userId: admin.userId,
      role: admin.role,
      companyId: admin.companyId,
      company: admin.company,
      email: admin.email,
      name: admin.name,
      department: admin.department,
      status: admin.status || 'active',
      lastLogin: admin.lastLogin,
    }));

    return NextResponse.json({ user: adminDetails[0] }, { status: 200 });
  } catch (error) {
    console.error('GET /api/admin/details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUserId = session.user.id;
  const currentUser = await User.findById(currentUserId).select('role');

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json();
  const { name, email, role, department, company, companyId } = body;

  if (!name && !email && !role && !department && !company && !companyId) {
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
  }

  // Only super_admin can change role
  if (role && currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can change roles' }, { status: 403 });
  }

  if (role && !['super_admin', 'admin', 'employee'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      {
        $set: {
          ...(name && { name }),
          ...(email && { email }),
          ...(role && { role }),
          ...(department && { department }),
          ...(company && { company }),
          ...(companyId && { companyId }),
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: updatedUser._id.toString(),
        userId: updatedUser.userId,
        role: updatedUser.role,
        companyId: updatedUser.companyId,
        company: updatedUser.company,
        email: updatedUser.email,
        name: updatedUser.name,
        department: updatedUser.department,
        status: updatedUser.status || 'active',
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastLogin: updatedUser.lastLogin,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('PUT /api/admin/details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

