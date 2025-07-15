'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Interface for company role
interface CompanyRole {
  roleId: string;
  name: string;
  description?: string;
}

// Interface for form data
interface RoleFormData {
  name: string;
  description: string;
}

export default function CompanyRolesDashboard() {
  const { data: session } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '' });
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch existing roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/admin/company-roles');
        const data = await response.json();
        if (response.ok) {
          setRoles(data.data || []);
        } else {
          setError(data.error || 'Failed to fetch roles');
        }
      } catch (err) {
        setError('An error occurred while fetching roles');
      }
    };
    fetchRoles();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/company-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Role created successfully!');
        setFormData({ name: '', description: '' });
        setRoles([...roles, data.role]);
      } else {
        setError(data.error || 'Failed to create role');
      }
    } catch (err) {
      setError('An error occurred while creating role');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Company Roles Management</h1>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Create Company Role</h2>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}
              {message && <div className="text-green-600 text-sm">{message}</div>}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Role'}
              </button>
            </form>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Existing Roles</h2>
            {roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles found</p>
            ) : (
              <ul className="space-y-2">
                {roles.map((role) => (
                  <li key={role.roleId} className="border-b py-2">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    {role.description && (
                      <p className="text-sm text-gray-500">{role.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}