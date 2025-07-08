'use client';

import { signOut, useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function EmployeeDashboard() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute allowedRoles={['employee']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Welcome, {session?.user?.userId}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* User Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Your Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">User ID:</span>
                  <span className="text-sm text-gray-900">{session?.user?.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Role:</span>
                  <span className="text-sm text-gray-900 capitalize">{session?.user?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Company:</span>
                  <span className="text-sm text-gray-900">{session?.user?.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Company ID:</span>
                  <span className="text-sm text-gray-900">{session?.user?.companyId}</span>
                </div>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Welcome!</h3>
              <p className="text-sm text-green-800">
                You are successfully logged in as an employee of {session?.user?.company}. 
                Your admin has provided you with access to this system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}