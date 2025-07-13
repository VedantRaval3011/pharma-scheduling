'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Building, User, Save, Edit, AlertCircle } from 'lucide-react';
import type { JSX } from 'react';

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
        return <Building className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-green-600" />;
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-amber-200 to-orange-200 border-2 border-amber-300 rounded-t-lg shadow-lg">
          <div className="flex items-center justify-between p-3 border-b border-amber-300">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-amber-800" />
              <h1 className="text-lg font-bold text-amber-900">Admin Details</h1>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-t-0 border-amber-300 rounded-b-lg shadow-lg p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="ml-2 text-amber-800">Loading admin details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
              <p className="text-red-700 mb-2">{error}</p>
              <button
                onClick={fetchAdminDetails}
                className="px-4 py-2 bg-red-200 hover:bg-red-300 border border-red-400 rounded text-red-800 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : admin && formData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center border-2 border-amber-400">
                    {getRoleIcon(admin.role)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-amber-900">{admin.userId}</h2>
                    <p className="text-amber-700 text-sm">
                      Role: {getRoleDisplayName(admin.role)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-300 to-orange-300 hover:from-amber-400 hover:to-orange-400 border-2 border-amber-400 rounded-md text-amber-900 font-medium"
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  <span>{isEditing ? 'Save' : 'Edit'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-amber-800 font-medium">User ID</label>
                  <p className="text-amber-700 mt-1">{admin.userId}</p>
                </div>
                <div>
                  <label className="text-amber-800 font-medium">Role</label>
                  <p className="text-amber-700 mt-1">{getRoleDisplayName(admin.role)}</p>
                </div>
                <div>
                  <label className="text-amber-800 font-medium">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="w-full mt-1 p-2 border-2 border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  ) : (
                    <p className="text-amber-700 mt-1">{admin.email || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-amber-800 font-medium">Companies</label>
                {admin.companies.length > 0 ? (
                  <div className="mt-2 space-y-4">
                    {admin.companies.map((company, companyIndex) => (
                      <div key={company.companyId} className="border-l-4 border-amber-400 pl-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.companies[companyIndex].name}
                            onChange={(e) => handleInputChange(e, companyIndex)}
                            className="text-amber-900 font-semibold w-full p-2 border-2 border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        ) : (
                          <p className="text-amber-900 font-semibold">{company.name}</p>
                        )}
                        <p className="text-amber-700 text-sm">Company ID: {company.companyId}</p>
                        <div className="mt-2">
                          <label className="text-amber-800 text-sm font-medium">Locations</label>
                          {company.locations.length > 0 ? (
                            <ul className="list-disc list-inside text-amber-700 text-sm">
                              {company.locations.map((location, locationIndex) => (
                                <li key={location.locationId}>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.companies[companyIndex].locations[locationIndex].name}
                                      onChange={(e) => handleInputChange(e, companyIndex, locationIndex)}
                                      className="w-full p-2 border-2 border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                  ) : (
                                    `${location.name} (ID: ${location.locationId})`
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-amber-700 text-sm">No locations assigned</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-amber-700 mt-1">No companies assigned</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-amber-700">
              <p>No admin details found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDetailsDashboard;