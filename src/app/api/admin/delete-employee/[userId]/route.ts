import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog, IDetailsObject } from '@/models/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Employee, ILocation } from '@/models/employee';
import { User } from '@/models/user';
import { Company } from '@/models/company';

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Get session without res (App Router style)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid or missing userId' }, { status: 400 });
    }

    // Start a MongoDB transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
      // 1. Find the employee record
      const employee = await Employee.findOne({ userId }).session(dbSession);
      if (!employee) {
        console.log('No employee found');
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      // 2. Find the user record
      const user = await User.findOne({ userId }).session(dbSession);
      if (!user) {
        console.log('No user found');
        await dbSession.abortTransaction();
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 3. Prepare audit log details
      const deletedData: IDetailsObject = {
        message: `Employee and associated records deleted by ${session.user.userId}`,
        deletedEmployeeId: employee.employeeId,
        deletedUserId: user.userId,
        name: employee.name || 'Unknown',
        deletedData: {
          company: employee.companyId || 'None',
          roles: employee.companyRoles || [],
          locations: employee.locations?.map((loc: ILocation) => loc.name) || [],
          email: user.email || 'None',
        },
        performedBy: session.user.userId,
        performedByName: session.user.userId || 'Unknown User',
        timestamp: new Date().toISOString(),
      };

      // 4. Create audit log entry
      const auditLog = new AuditLog({
        auditId: uuidv4(),
        employeeId: employee.employeeId,
        userId: user.userId,
        action: 'DELETE',
        performedBy: session.user.userId,
        timestamp: new Date(),
        details: deletedData,
      });

      await auditLog.save({ session: dbSession });

      // 5. Delete related records
      await AuditLog.deleteMany({ employeeId: employee.employeeId }).session(dbSession);
      await Employee.deleteOne({ userId }).session(dbSession);
      await User.deleteOne({ userId }).session(dbSession);

      // 6. Update Company collection - remove userId from userIds array
      await Company.updateMany(
        { userIds: userId },
        { $pull: { userIds: userId } }
      ).session(dbSession);

      // Commit the transaction
      await dbSession.commitTransaction();
      return NextResponse.json({ message: 'Employee, user, and audit logs deleted successfully' }, { status: 200 });
    } catch (error) {
      await dbSession.abortTransaction();
      throw error;
    } finally {
      dbSession.endSession();
    }
  } catch (error) {
    console.error('Error in DELETE /api/admin/delete-employee/[userId]:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while deleting the employee records',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}