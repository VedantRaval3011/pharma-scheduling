import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/user';
import { Company } from '@/models/company';
import { Location } from '@/models/location';
import connectDB from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, password, companies } = await request.json();

    if (!userId || !password || !companies || !Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json({ error: 'All fields are required, including at least one company' }, { status: 400 });
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ userId: userId.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'User ID already exists' }, { status: 400 });
    }

    // Validate and create/update companies and locations
    const validatedCompanies = [];
    for (const companyData of companies) {
      const { companyId, name, locations } = companyData;

      if (!name || !locations || !Array.isArray(locations)) {
        return NextResponse.json({ error: 'Invalid company or location data' }, { status: 400 });
      }

      // Generate UUID for company ID if not provided
      const finalCompanyId = companyId || uuidv4();

      let existingCompany = await Company.findOne({ companyId: finalCompanyId });
      if (!existingCompany) {
        existingCompany = new Company({
          companyId: finalCompanyId,
          name,
          locations: [],
          createdBy: session.user.userId,
          userIds: [] // Initialize userIds array
        });
      }

      // Validate and create/update locations
      const validatedLocations = [];
      for (const locationData of locations) {
        const { locationId, name: locationName } = locationData;
        if (!locationName) {
          return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
        }

        // Generate UUID for location ID if not provided
        const finalLocationId = locationId || uuidv4();

        let existingLocation = await Location.findOne({ locationId: finalLocationId });
        if (!existingLocation) {
          existingLocation = new Location({
            locationId: finalLocationId,
            name: locationName,
            companyId: finalCompanyId,
            createdBy: session.user.userId
          });
          await existingLocation.save();
        }
        validatedLocations.push({ locationId: finalLocationId, name: locationName });
      }

      existingCompany.locations = validatedLocations;
      
      // Add user to company's userIds if not already present
      if (!existingCompany.userIds.includes(userId.toLowerCase())) {
        existingCompany.userIds.push(userId.toLowerCase());
      }
      
      await existingCompany.save();
      validatedCompanies.push({ companyId: finalCompanyId, name, locations: validatedLocations });
    }

    // Create admin user with companies data
    const newAdmin = new User({
      userId: userId.toLowerCase(),
      password,
      role: 'admin',
      companies: validatedCompanies // This will store the complete company data in the user document
    });

    await newAdmin.save();

    // Verify the data was saved correctly
    

    return NextResponse.json({ 
      message: 'Admin created successfully',
      admin: {
        userId: newAdmin.userId,
        companies: newAdmin.companies,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}