'use client';
import React, { useState, useEffect } from 'react';
import {  Building, User, Save, Edit, AlertCircle } from 'lucide-react';
import type { JSX } from 'react';
import ToolBox from '@/components/layout/ToolBox';

interface Location {
  locationId: string;
  name: string;
  _id?: string;
}

interface Company {
  companyId: string;
  name: string;
  locations: Location[];
}

interface AdminUser {
  userId: string;
  role: 'admin' | 'employee';
  companies: Company[];
  email: string | null;
}

interface ApiResponse {
  user?: {
    userId: string;
    role: 'admin' | 'employee';
    companies: Company[];
    email: string | null;
  };
  error?: string;
}

const AdminDetailsDashboard: React.FC = () => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetchAdminDetails();
  }, []);

  const fetchAdminDetails = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // First, get the session to obtain the userId
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to fetch session');
      }

      const sessionData = await sessionResponse.json();
      const userId = sessionData.user?.userId;

      if (!userId) {
        throw new Error('No user ID found in session');
      }

      // Then fetch user details using the userId
      const response = await fetch(`/api/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Ensure data.user is defined before setting state
      if (data.user) {
        setAdmin({
          userId: data.user.userId,
          role: data.user.role,
          companies: data.user.companies || [],
          email: data.user.email || null,
        });
        setFormData({
          userId: data.user.userId,
          role: data.user.role,
          companies: data.user.companies || [],
          email: data.user.email || null,
        });
      } else {
        setAdmin(null);
        setFormData(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch admin details';
      setError(errorMessage);
      setAdmin(null);
      setFormData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (): Promise<void> => {
  if (!isEditing) {
    setIsEditing(true);
    return;
  }

  try {
    if (!admin || !formData) {
      throw new Error('No admin data to update');
    }

    // Only send fields that are allowed to be updated
    const updatePayload = {
      email: formData.email,
      companies: formData.companies.map(company => ({
        name: company.name,
        locations: company.locations.map(location => ({
          name: location.name,
          ...(location._id && { _id: location._id })
        }))
      }))
    };

    const response = await fetch(`/api/user/${admin.userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (data.user) {
      setAdmin({
        userId: data.user.userId,
        role: data.user.role,
        companies: data.user.companies || [],
        email: data.user.email || null,
      });
      setFormData({
        userId: data.user.userId,
        role: data.user.role,
        companies: data.user.companies || [],
        email: data.user.email || null,
      });
    } else {
      setAdmin(null);
      setFormData(null);
    }
    setIsEditing(false);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update admin details';
    console.error('Update error:', errorMessage); // Add logging
    setError(errorMessage);
  }
};

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    companyIndex?: number,
    locationIndex?: number
  ): void => {
    if (!formData) return;

    if (companyIndex !== undefined && locationIndex !== undefined) {
      // Update location name
      const updatedCompanies = [...formData.companies];
      updatedCompanies[companyIndex].locations[locationIndex].name = e.target.value;
      setFormData({ ...formData, companies: updatedCompanies });
    } else if (companyIndex !== undefined) {
      // Update company name
      const updatedCompanies = [...formData.companies];
      updatedCompanies[companyIndex].name = e.target.value;
      setFormData({ ...formData, companies: updatedCompanies });
    } else {
      // Update email
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const getRoleIcon = (role: AdminUser['role']): JSX.Element => {
    switch (role) {
      case 'admin':
        return <Building className="w-4 h-4 text-blue-700" />;
      default:
        return <User className="w-4 h-4 text-green-700" />;
    }
  };

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'employee':
        return 'Employee';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ 
      background: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <ToolBox/>
      <div className="max-w-4xl mx-auto">
        {/* Windows-style title bar */}
        <div className="rounded-t-lg shadow-lg border-t-2 border-l-2 border-r-2 border-blue-300" style={{
          background: 'linear-gradient(to bottom, #e9f3ff 0%, #d0e7ff 50%, #b0d1ff 100%)'
        }}>
          <div className="flex items-center p-3">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-800" />
              <h1 className="text-lg font-bold text-blue-900">Admin Details</h1>
            </div>
          </div>
        </div>

        {/* Windows-style main content area */}
        <div className="rounded-b-lg shadow-lg border-2 border-t-0 border-gray-400 p-6" style={{
          background: 'linear-gradient(to bottom, #ffffff 0%, #f8f8f8 100%)',
          borderStyle: 'ridge',
          borderWidth: '2px'
        }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-gray-800">Loading admin details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-600" />
              <p className="text-red-800 mb-2">{error}</p>
              <button
                onClick={fetchAdminDetails}
                className="px-4 py-2 border-2 border-gray-400 rounded text-gray-800 text-sm hover:bg-gray-100 active:border-gray-600"
                style={{
                  background: 'linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)',
                  borderStyle: 'outset'
                }}
              >
                Try Again
              </button>
            </div>
          ) : admin && formData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-400" style={{
                    background: 'linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)',
                    borderStyle: 'inset'
                  }}>
                    {getRoleIcon(admin.role)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{admin.userId}</h2>
                    <p className="text-gray-700 text-sm">
                      Role: {getRoleDisplayName(admin.role)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-400 rounded text-gray-900 font-medium hover:bg-gray-100 active:border-gray-600"
                  style={{
                    background: 'linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)',
                    borderStyle: 'outset'
                  }}
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  <span>{isEditing ? 'Save' : 'Edit'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border-2 border-gray-300 rounded" style={{
                  background: 'linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)',
                  borderStyle: 'inset'
                }}>
                  <label className="text-gray-800 font-medium text-sm">User ID</label>
                  <p className="text-gray-900 mt-1">{admin.userId}</p>
                </div>
                <div className="p-3 border-2 border-gray-300 rounded" style={{
                  background: 'linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)',
                  borderStyle: 'inset'
                }}>
                  <label className="text-gray-800 font-medium text-sm">Role</label>
                  <p className="text-gray-900 mt-1">{getRoleDisplayName(admin.role)}</p>
                </div>
                <div className="p-3 border-2 border-gray-300 rounded" style={{
                  background: 'linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)',
                  borderStyle: 'inset'
                }}>
                  <label className="text-gray-800 font-medium text-sm">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2 border-2 border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
                      style={{ borderStyle: 'inset' }}
                    />
                  ) : (
                    <p className="text-gray-900 mt-1">{admin.email || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-2 border-gray-300 rounded" style={{
                background: 'linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)',
                borderStyle: 'inset'
              }}>
                <label className="text-gray-800 font-medium text-sm">Companies</label>
                {admin.companies.length > 0 ? (
                  <div className="mt-2 space-y-4">
                    {admin.companies.map((company, companyIndex) => (
                      <div key={company.companyId} className="border-l-4 pl-4 p-2 bg-white rounded border border-gray-300">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.companies[companyIndex].name}
                            onChange={(e) => handleInputChange(e, companyIndex)}
                            className="text-gray-900 font-semibold w-full p-2 border-2 border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
                            style={{ borderStyle: 'inset' }}
                          />
                        ) : (
                          <p className="text-gray-900 font-semibold">{company.name}</p>
                        )}
                        <div className="mt-2">
                          <label className="text-gray-800 text-sm font-medium">Locations</label>
                          {company.locations.length > 0 ? (
                            <ul className="list-disc list-inside text-gray-700 text-sm">
                              {company.locations.map((location, locationIndex) => (
                                <li key={location.locationId} className="mt-1">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.companies[companyIndex].locations[locationIndex].name}
                                      onChange={(e) => handleInputChange(e, companyIndex, locationIndex)}
                                      className="w-full p-2 border-2 border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
                                      style={{ borderStyle: 'inset' }}
                                    />
                                  ) : (
                                    `${location.name} `
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-700 text-sm">No locations assigned</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-700 mt-1">No companies assigned</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-700">
              <p>No admin details found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDetailsDashboard;