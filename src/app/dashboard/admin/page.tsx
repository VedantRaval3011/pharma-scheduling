// app/dashboard/admin/page.tsx
'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    password: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create');

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Employee created successfully!');
        setFormData({ userId: '', password: '' });
      } else {
        setError(data.error || 'Failed to create employee');
      }
    } catch  {
      setError('An error occurred while creating employee');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '' });
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch {
      setError('An error occurred while changing password');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">
                  {session?.user?.companies?.[0]?.name} ({session?.user?.companies?.[0]?.companyId})
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
          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Create Employee
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'password'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Change Password
                </button>
              </nav>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Employee Form */}
            {activeTab === 'create' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-6">Create Employee</h2>
                
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User ID *</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600">
                      <strong>Company:</strong> {session?.user?.companies?.[0]?.name}<br />
                      <strong>Company ID:</strong> {session?.user?.companies?.[0]?.companyId}
                    </p>
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                  )}

                  {message && (
                    <div className="text-green-600 text-sm">{message}</div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Employee'}
                  </button>
                </form>
              </div>
            )}

            {/* Change Password Form */}
            {activeTab === 'password' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-6">Change Password</h2>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Password *</label>
                    <input
                      type="password"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                  )}

                  {message && (
                    <div className="text-green-600 text-sm">{message}</div>
                  )}

                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Change Password
                  </button>
                </form>
              </div>
            )}

            {/* Info Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Company:</strong> {session?.user?.companies?.[0]?.name}</p>
                  <p className="text-sm"><strong>Company ID:</strong> {session?.user?.companies?.[0]?.companyId}</p>
                  <p className="text-sm"><strong>User ID:</strong> {session?.user?.id}</p>
                  <p className="text-sm"><strong>Role:</strong> Admin</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Admin Privileges</h3>
                <div className="space-y-1">
                  <p className="text-sm text-blue-800">• Create employee accounts</p>
                  <p className="text-sm text-blue-800">• Manage company users</p>
                  <p className="text-sm text-blue-800">• Change your password</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}