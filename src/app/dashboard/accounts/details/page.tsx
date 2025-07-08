'use client';
import React, { useState, useEffect } from 'react';
import { Users, Building, Shield, User, Search, RefreshCw, AlertCircle } from 'lucide-react';
import type { JSX } from 'react';

// Types based on your User model
interface IUser {
  _id: string;
  userId: string;
  password?: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: string;
  company?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  name?: string;
  department?: string;
  status?: 'active' | 'inactive';
  lastLogin?: string;
}

interface CurrentUser {
  id: string;
  userId: string;
  role: 'super_admin' | 'admin' | 'employee';
  companyId?: string;
  company?: string;
}

interface ApiResponse {
  users: IUser[];
  currentUser: CurrentUser;
  error?: string;
}

const AdminDetailsDashboard: React.FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users/list', {
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

      setUsers(data.users);
      setCurrentUser(data.currentUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers: IUser[] = users.filter(user =>
    (user.userId?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (user.company?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const getRoleIcon = (role: IUser['role']): JSX.Element => {
    switch (role) {
      case 'super_admin': return <Shield className="w-4 h-4 text-red-600" />;
      case 'admin': return <Building className="w-4 h-4 text-blue-600" />;
      default: return <User className="w-4 h-4 text-green-600" />;
    }
  };

  const getStatusColor = (status: string | undefined): string => {
    return status === 'active' ? 'text-green-700' : 'text-red-700';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  const getPermissionText = (role: string): string => {
    switch (role) {
      case 'super_admin': return 'Can view all users across all companies';
      case 'admin': return 'Can view employees in your company only';
      case 'employee': return 'Can view your own information only';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      {/* Windows 7 Style Window */}
      <div className="max-w-7xl mx-auto">
        {/* Window Header */}
        <div className="bg-gradient-to-r from-amber-200 to-orange-200 border-2 border-amber-300 rounded-t-lg shadow-lg">
          <div className="flex items-center justify-between p-3 border-b border-amber-300">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-800" />
              <h1 className="text-lg font-bold text-amber-900">Admin Details Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Window Content */}
        <div className="bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-t-0 border-amber-300 rounded-b-lg shadow-lg">
          {/* Current User Info */}
          {currentUser && (
            <div className="p-4 border-b border-amber-200 bg-gradient-to-r from-amber-100 to-orange-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center border-2 border-amber-400">
                    {getRoleIcon(currentUser.role)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-amber-900">
                      Logged in as: {currentUser.userId}
                    </h2>
                    <p className="text-amber-700 text-sm">
                      Role: {getRoleDisplayName(currentUser.role)} | 
                      Company: {currentUser.company || 'N/A'} ({currentUser.companyId || 'N/A'})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-amber-600 bg-amber-200 px-2 py-1 rounded">
                    {getPermissionText(currentUser.role)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-b border-amber-200 bg-gradient-to-r from-amber-75 to-orange-75">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-600 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border-2 border-amber-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>
                <div className="text-sm text-amber-700">
                  Showing {filteredUsers.length} user(s)
                </div>
              </div>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-300 to-orange-300 hover:from-amber-400 hover:to-orange-400 border-2 border-amber-400 rounded-md text-amber-900 font-medium disabled:opacity-50 transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
                <span className="ml-2 text-amber-800">Loading users...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                <p className="text-red-700 mb-2">{error}</p>
                <button
                  onClick={fetchUsers}
                  className="px-4 py-2 bg-red-200 hover:bg-red-300 border border-red-400 rounded text-red-800 text-sm"
                >
                  Try Again
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-amber-700">
                <Users className="w-12 h-12 mx-auto mb-2 text-amber-400" />
                <p>No users found</p>
                {searchTerm && (
                  <p className="text-sm text-amber-600 mt-1">
                    Try adjusting your search term
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-amber-300 bg-white rounded-lg shadow-inner">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-200 to-orange-200">
                      <th className="border border-amber-300 p-3 text-left text-amber-900 font-semibold">User ID</th>
                      <th className="border border-amber-300 p-3 text-left text-amber-900 font-semibold">Role</th>
                      <th className="border border-amber-300 p-3 text-left text-amber-900 font-semibold">Company</th>
                      <th className="border border-amber-300 p-3 text-left text-amber-900 font-semibold">Email</th>
                      <th className="border border-amber-300 p-3 text-left text-amber-900 font-semibold">Created</th>
                      <th className="border border-amber-300 p-3 text-left text-amber-900 font-semibold">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr 
                        key={user._id} 
                        className={`${index % 2 === 0 ? 'bg-amber-25' : 'bg-white'} hover:bg-amber-100 transition-colors duration-150`}
                      >
                        <td className="border border-amber-300 p-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center border border-amber-400">
                              <User className="w-4 h-4 text-amber-800" />
                            </div>
                            <div>
                              <div className="font-medium text-amber-900">{user.userId}</div>
                              <div className="text-xs text-amber-600">ID: {user._id.slice(-8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border border-amber-300 p-3">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span className="text-amber-800 capitalize">
                              {getRoleDisplayName(user.role)}
                            </span>
                          </div>
                        </td>
                        <td className="border border-amber-300 p-3">
                          <div className="text-amber-800">
                            <div className="font-medium">{user.company || 'N/A'}</div>
                            <div className="text-xs text-amber-600">{user.companyId || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="border border-amber-300 p-3 text-amber-800">
                          {user.email || 'No email'}
                        </td>
                        <td className="border border-amber-300 p-3 text-amber-800 text-sm">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="border border-amber-300 p-3 text-amber-800 text-sm">
                          {formatDate(user.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-amber-200 bg-gradient-to-r from-amber-100 to-orange-100">
            <div className="flex items-center justify-between text-sm text-amber-700">
              <div>
                Company: {currentUser?.company} ({currentUser?.companyId}) | 
                Access Level: {currentUser ? getRoleDisplayName(currentUser.role) : 'N/A'}
              </div>
              <div>
                Total Users: {filteredUsers.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDetailsDashboard;