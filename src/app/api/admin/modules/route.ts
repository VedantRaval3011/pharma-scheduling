import { NextResponse } from 'next/server';
import { Employee } from '@/models/employee';
import connectDB from '@/lib/db';

export async function GET() {
  try {
    await connectDB();

    // Aggregate unique modules from employee.moduleAccess
    const modules = await Employee.aggregate([
      { $unwind: '$moduleAccess' },
      {
        $group: {
          _id: '$moduleAccess.modulePath',
          moduleId: { $first: '$moduleAccess.moduleId' },
          moduleName: { $first: '$moduleAccess.moduleName' },
          modulePath: { $first: '$moduleAccess.modulePath' },
        },
      },
      {
        $project: {
          _id: 0,
          moduleId: 1,
          moduleName: 1,
          modulePath: 1,
        },
      },
      { $sort: { moduleName: 1 } },
    ]);

    return NextResponse.json({ modules });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}