'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { v4 as uuidv4 } from 'uuid';

export default function SuperAdminDashboard() {
  const { data: session } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    companies: [{ companyId: uuidv4(), name: '', locations: [{ locationId: uuidv4(), name: '' }] }],
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Initialize form with UUIDs on component mount
  useEffect(() => {
    setFormData({
      userId: '',
      password: '',
      companies: [{ companyId: uuidv4(), name: '', locations: [{ locationId: uuidv4(), name: '' }] }],
    });
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: formData.userId,
          password: formData.password,
          companies: formData.companies.map(company => ({
            companyId: company.companyId,
            name: company.name,
            locations: company.locations.map(location => ({
              locationId: location.locationId,
              name: location.name
            })),
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Admin created successfully!');
        setFormData({ 
          userId: '', 
          password: '', 
          companies: [{ companyId: uuidv4(), name: '', locations: [{ locationId: uuidv4(), name: '' }] }] 
        });
      } else {
        setError(data.error || 'Failed to create admin');
      }
    } catch {
      setError('An error occurred while creating admin');
    } finally {
      setIsCreating(false);
    }
  };

  const addCompany = () => {
    setFormData((prev) => ({
      ...prev,
      companies: [...prev.companies, { companyId: uuidv4(), name: '', locations: [{ locationId: uuidv4(), name: '' }] }],
    }));
  };

  const addLocation = (companyIndex: number) => {
    setFormData((prev) => {
      const updatedCompanies = [...prev.companies];
      updatedCompanies[companyIndex].locations.push({ locationId: uuidv4(), name: '' });
      return { ...prev, companies: updatedCompanies };
    });
  };

  const removeCompany = (companyIndex: number) => {
    setFormData((prev) => {
      const updatedCompanies = prev.companies.filter((_, index) => index !== companyIndex);
      return { 
        ...prev, 
        companies: updatedCompanies.length > 0 ? updatedCompanies : [{ companyId: uuidv4(), name: '', locations: [{ locationId: uuidv4(), name: '' }] }] 
      };
    });
  };

  const removeLocation = (companyIndex: number, locationIndex: number) => {
    setFormData((prev) => {
      const updatedCompanies = [...prev.companies];
      updatedCompanies[companyIndex].locations = updatedCompanies[companyIndex].locations.filter(
        (_, index) => index !== locationIndex
      );
      if (updatedCompanies[companyIndex].locations.length === 0) {
        updatedCompanies[companyIndex].locations = [{ locationId: uuidv4(), name: '' }];
      }
      return { ...prev, companies: updatedCompanies };
    });
  };

  const handleCompanyChange = (companyIndex: number, field: 'name', value: string) => {
    setFormData((prev) => {
      const updatedCompanies = [...prev.companies];
      updatedCompanies[companyIndex] = {
        ...updatedCompanies[companyIndex],
        [field]: value,
      };
      return { ...prev, companies: updatedCompanies };
    });
  };

  const handleLocationChange = (companyIndex: number, locationIndex: number, field: 'name', value: string) => {
    setFormData((prev) => {
      const updatedCompanies = [...prev.companies];
      updatedCompanies[companyIndex].locations[locationIndex] = {
        ...updatedCompanies[companyIndex].locations[locationIndex],
        [field]: value,
      };
      return { ...prev, companies: updatedCompanies };
    });
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome, {session?.user?.email}</p>
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
            {/* Create Admin Form */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-6">Create Company Admin</h2>
              
              <form onSubmit={handleCreateAdmin} className="space-y-4">
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

                {formData.companies.map((company, companyIndex) => (
                  <div key={company.companyId} className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-gray-700">Company {companyIndex + 1}</h3>
                      {formData.companies.length > 1 && (
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 text-sm"
                          onClick={() => removeCompany(companyIndex)}
                        >
                          Remove Company
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company ID *</label>
                        <input
                          type="text"
                          required
                          readOnly
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                          value={company.companyId}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                        <input
                          type="text"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={company.name}
                          onChange={(e) => handleCompanyChange(companyIndex, 'name', e.target.value)}
                        />
                      </div>

                      {company.locations.map((location, locationIndex) => (
                        <div key={location.locationId} className="ml-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-600">Location {locationIndex + 1}</h4>
                            {company.locations.length > 1 && (
                              <button
                                type="button"
                                className="text-red-600 hover:text-red-800 text-sm"
                                onClick={() => removeLocation(companyIndex, locationIndex)}
                              >
                                Remove Location
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Location ID *</label>
                            <input
                              type="text"
                              required
                              readOnly
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                              value={location.locationId}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Location Name *</label>
                            <input
                              type="text"
                              required
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              value={location.name}
                              onChange={(e) => handleLocationChange(companyIndex, locationIndex, 'name', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        onClick={() => addLocation(companyIndex)}
                      >
                        Add Location
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
                  onClick={addCompany}
                >
                  Add Company
                </button>

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
                  {isCreating ? 'Creating...' : 'Create Admin'}
                </button>
              </form>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">• Create company admins</p>
                  <p className="text-sm text-gray-600">• Manage company access</p>
                  <p className="text-sm text-gray-600">• View all users</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Note</h3>
                <p className="text-sm text-blue-800">
                  Company admins can change their passwords after first login and create employees for their company.
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  Company and Location IDs are auto-generated with UUIDs and are non-editable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}