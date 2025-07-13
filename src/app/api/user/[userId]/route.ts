import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import { User } from '@/models/user';

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  await connectDB();

  const { userId } = await context.params;

  if (!userId) {
    console.error('GET /api/user/[userId]: User ID is required');
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // Check for session to determine if the request is authenticated
    const session = await getServerSession(authOptions);

    // Select fields based on authentication status
    const selectFields = session && session.user ? '-password -__v' : 'userId companies';

    const user = await User.findOne({ userId }).select(selectFields);

    if (!user) {
      console.error(`GET /api/user/${userId}: User not found for userId: ${userId}`);
      return NextResponse.json({ error: `User not found for userId: ${userId}` }, { status: 404 });
    }

    // For authenticated requests, verify permissions
    if (session && session.user) {
      const currentUser = await User.findById(session.user.id).select('role companyId');
      if (!currentUser) {
        console.error(`GET /api/user/${userId}: Current user not found for id: ${session.user.id}`);
        return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
      }
      if (currentUser.role === 'admin' && currentUser.companyId !== user.companyId) {
        console.error(`GET /api/user/${userId}: Access denied - Admin ${session.user.id} cannot access user ${userId} from different company`);
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Prepare response based on authentication status
    const responseUser = {
      user: {
        userId: user.userId,
        companies: user.companies || [],
        ...(session && session.user ? { role: user.role, email: user.email } : {}),
      },
    };

    return NextResponse.json(responseUser, { status: 200 });
  } catch (error) {
    console.error(`GET /api/user/${userId} error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    console.error('PUT /api/user/[userId]: Unauthorized - No session or user');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await context.params;

  if (!userId) {
    console.error('PUT /api/user/[userId]: User ID is required');
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const body = await req.json();
  const { email, role, companies } = body;

  // Prevent updates to restricted fields
  if (body.userId) {
    console.error(`PUT /api/user/${userId}: Attempted to update restricted field (userId)`);
    return NextResponse.json({ error: 'Cannot update userId' }, { status: 400 });
  }

  if (!email && !role && !companies) {
    console.error(`PUT /api/user/${userId}: No valid fields provided for update`);
    return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
  }

  const currentUser = await User.findById(session.user.id).select('role companyId userId');
  if (!currentUser) {
    console.error(`PUT /api/user/${userId}: Current user not found for id: ${session.user.id}`);
    return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
  }

  // Only super_admin can change roles, unless admin is updating their own role
  if (role && currentUser.role !== 'super_admin' && currentUser.userId !== userId) {
    console.error(`PUT /api/user/${userId}: Access denied - User ${session.user.id} (role: ${currentUser.role}) attempted to change role`);
    return NextResponse.json({ error: 'Only super admins can change roles for other users' }, { status: 403 });
  }

  if (role && !['super_admin', 'admin', 'employee'].includes(role)) {
    console.error(`PUT /api/user/${userId}: Invalid role: ${role}`);
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    const targetUser = await User.findOne({ userId }).select('companyId userId companies');
    if (!targetUser) {
      console.error(`PUT /api/user/${userId}: User not found for userId: ${userId}`);
      return NextResponse.json({ error: `User not found for userId: ${userId}` }, { status: 404 });
    }

    // Verify permissions: super_admin can update anyone, admin can update self or same company
    if (currentUser.role !== 'super_admin' && currentUser.userId !== userId && currentUser.companyId !== targetUser.companyId) {
      console.error(`PUT /api/user/${userId}: Access denied - Admin ${session.user.id} cannot update user ${userId} from different company`);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update object
    const updateFields: { [key: string]: any } = {
      updatedAt: new Date(),
    };
    if (email) updateFields.email = email;
    if (role && (currentUser.role === 'super_admin' || currentUser.userId === userId)) {
      updateFields.role = role;
    }

    if (companies) {
      // Validate that companyId and locationId are not included in the payload
      for (const company of companies) {
        if (company.companyId) {
          console.error(`PUT /api/user/${userId}: Attempted to update restricted field (companyId)`);
          return NextResponse.json({ error: 'Cannot update companyId' }, { status: 400 });
        }
        if (company.locations?.some((loc: any) => loc.locationId)) {
          console.error(`PUT /api/user/${userId}: Attempted to update restricted field (locationId)`);
          return NextResponse.json({ error: 'Cannot update locationId' }, { status: 400 });
        }
      }

      // Create a map of existing companies by companyId for easier lookup
      const existingCompaniesMap = new Map(
        targetUser.companies.map((c: any) => [c.companyId, c.toObject()])
      );

      // Merge incoming companies with existing ones, matching by index or companyId
      const updatedCompanies = targetUser.companies.map((existingCompany: any) => {
        // Find matching company in the incoming payload by index
        const updatedCompany = companies.find(
          (c: any, index: number) => index < targetUser.companies.length && targetUser.companies[index].companyId === existingCompany.companyId
        ) || {};

        // Create a map of existing locations by locationId
        const existingLocationsMap = new Map(
          existingCompany.locations.map((loc: any) => [loc.locationId, loc.toObject()])
        );

        // Merge locations
        const updatedLocations = existingCompany.locations.map((existingLocation: any) => {
          // Find matching location in the incoming payload by index
          const updatedLocation = updatedCompany.locations?.find(
            (loc: any, locIndex: number) => 
              locIndex < existingCompany.locations.length && 
              existingCompany.locations[locIndex].locationId === existingLocation.locationId
          ) || {};

          return {
            locationId: existingLocation.locationId, // Preserve locationId
            name: updatedLocation.name || existingLocation.name, // Update name if provided
          };
        });

        return {
          companyId: existingCompany.companyId, // Preserve companyId
          name: updatedCompany.name || existingCompany.name, // Update name if provided
          locations: updatedLocations,
        };
      });

      updateFields.companies = updatedCompanies;
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!updatedUser) {
      console.error(`PUT /api/user/${userId}: User not found for userId: ${userId}`);
      return NextResponse.json({ error: `User not found for userId: ${userId}` }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        userId: updatedUser.userId,
        role: updatedUser.role,
        companies: updatedUser.companies || [],
        email: updatedUser.email,
      },
    }, { status: 200 });
  } catch (error) {
    console.error(`PUT /api/user/${userId} error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}