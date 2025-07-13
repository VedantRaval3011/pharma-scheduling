"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Building,
  Shield,
  User,
  Search,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { JSX } from "react";

// Types based on your User model
interface IUser {
  _id: string;
  userId: string;
  password?: string;
  role: "super_admin" | "admin" | "employee";
  companyId?: string;
  company?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  name?: string;
  department?: string;
  status?: "active" | "inactive";
  lastLogin?: string;
}

interface CurrentUser {
  id: string;
  userId: string;
  role: "super_admin" | "admin" | "employee";
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
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users/list", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch users";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers: IUser[] = users.filter(
    (user) =>
      user.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false
  );

  const getRoleIcon = (role: IUser["role"]): JSX.Element => {
    switch (role) {
      case "super_admin":
        return <Shield className="w-4 h-4 text-red-600" />;
      case "admin":
        return <Building className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-green-600" />;
    }
  };

  const getStatusColor = (status: string | undefined): string => {
    return status === "active" ? "text-green-700" : "text-red-700";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "employee":
        return "Employee";
      default:
        return role;
    }
  };

  const getPermissionText = (role: string): string => {
    switch (role) {
      case "super_admin":
        return "Can view all users across all companies";
      case "admin":
        return "Can view employees in your company only";
      case "employee":
        return "Can view your own information only";
      default:
        return "";
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 p-4"
      style={{
        backgroundImage: "linear-gradient(135deg, #f5f5dc 0%, #f0e68c 100%)",
        fontFamily: "Tahoma, Arial, sans-serif",
      }}
    >
      {/* Windows 7/XP Style Window */}
      <div className="max-w-7xl mx-auto">
        {/* Window Header - Classic Windows Style */}
        <div
          className="bg-gradient-to-r from-stone-300 to-stone-400 rounded-t-lg shadow-lg border-2 border-stone-400"
          style={{
            background:
              "linear-gradient(to bottom, #e6ddd4 0%, #d0c7be 50%, #b8a48c 100%)",
            borderColor: "#8b7355",
          }}
        >
          <div className="flex items-center justify-between p-3 border-b border-stone-400">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-stone-700" />
              <h1
                className="text-lg font-bold text-stone-800"
                style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
              >
                Admin Details Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gradient-to-b from-yellow-400 to-yellow-600 border border-yellow-700 rounded-sm flex items-center justify-center text-xs font-bold text-yellow-900">
                _
              </div>
              <div className="w-5 h-5 bg-gradient-to-b from-stone-400 to-stone-600 border border-stone-700 rounded-sm flex items-center justify-center text-xs font-bold text-stone-900">
                □
              </div>
              <div className="w-5 h-5 bg-gradient-to-b from-red-400 to-red-600 border border-red-700 rounded-sm flex items-center justify-center text-xs font-bold text-red-900">
                ✕
              </div>
            </div>
          </div>
        </div>

        {/* Window Content - Classic Windows Panel */}
        <div
          className="bg-stone-100 border-2 border-t-0 border-stone-400 rounded-b-lg shadow-lg"
          style={{
            background: "linear-gradient(to bottom, #f5f5dc 0%, #f0e68c 100%)",
            borderColor: "#8b7355",
          }}
        >
          {/* Current User Info */}
          {currentUser && (
            <div
              className="p-4 border-b border-stone-400 bg-stone-200"
              style={{
                background:
                  "linear-gradient(to bottom, #f0e68c 0%, #ddd8aa 100%)",
                borderColor: "#8b7355",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-12 h-12 bg-gradient-to-br from-stone-300 to-stone-500 rounded border-2 border-stone-600 flex items-center justify-center shadow-inner"
                    style={{
                      background: "linear-gradient(145deg, #e6ddd4, #b8a48c)",
                      borderColor: "#8b7355",
                    }}
                  >
                    {getRoleIcon(currentUser.role)}
                  </div>
                  <div>
                    <h2
                      className="text-lg font-bold text-stone-800"
                      style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
                    >
                      Logged in as: {currentUser.userId}
                    </h2>
                    <p
                      className="text-stone-700 text-sm"
                      style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
                    >
                      Role: {getRoleDisplayName(currentUser.role)} | Company:{" "}
                      {currentUser.company || "N/A"} (
                      {currentUser.companyId || "N/A"})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-xs text-stone-700 bg-stone-300 px-2 py-1 rounded border border-stone-400"
                    style={{
                      background:
                        "linear-gradient(to bottom, #f0e68c, #ddd8aa)",
                      borderColor: "#8b7355",
                      fontFamily: "Tahoma, Arial, sans-serif",
                    }}
                  >
                    {getPermissionText(currentUser.role)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div
            className="p-4 border-b border-stone-400 bg-stone-100"
            style={{
              background:
                "linear-gradient(to bottom, #f5f5dc 0%, #f0e68c 100%)",
              borderColor: "#8b7355",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-600 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border-2 border-stone-400 rounded bg-white shadow-inner focus:outline-none focus:border-stone-600"
                    style={{
                      borderColor: "#8b7355",
                      fontFamily: "Tahoma, Arial, sans-serif",
                    }}
                  />
                </div>
                <div
                  className="text-sm text-stone-700"
                  style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
                >
                  Showing {filteredUsers.length} user(s)
                </div>
              </div>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-b from-stone-300 to-stone-400 hover:from-stone-400 hover:to-stone-500 border-2 border-stone-500 rounded text-stone-800 font-bold disabled:opacity-50 transition-all duration-200 shadow-md active:shadow-inner"
                style={{
                  background: loading
                    ? "linear-gradient(to bottom, #d0c7be, #b8a48c)"
                    : "linear-gradient(to bottom, #e6ddd4, #d0c7be)",
                  borderColor: "#8b7355",
                  fontFamily: "Tahoma, Arial, sans-serif",
                }}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-stone-600" />
                <span
                  className="ml-2 text-stone-700"
                  style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
                >
                  Loading users...
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-600" />
                <p
                  className="text-red-700 mb-2"
                  style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
                >
                  {error}
                </p>
                <button
                  onClick={fetchUsers}
                  className="px-4 py-2 bg-gradient-to-b from-red-300 to-red-400 hover:from-red-400 hover:to-red-500 border-2 border-red-600 rounded text-red-800 font-bold shadow-md active:shadow-inner"
                  style={{
                    background: "linear-gradient(to bottom, #fca5a5, #f87171)",
                    borderColor: "#dc2626",
                    fontFamily: "Tahoma, Arial, sans-serif",
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-stone-700">
                <Users className="w-12 h-12 mx-auto mb-2 text-stone-500" />
                <p style={{ fontFamily: "Tahoma, Arial, sans-serif" }}>
                  No users found
                </p>
                {searchTerm && (
                  <p
                    className="text-sm text-stone-600 mt-1"
                    style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
                  >
                    Try adjusting your search term
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="w-full border-collapse border-2 border-stone-400 bg-white rounded shadow-inner"
                  style={{
                    background:
                      "linear-gradient(to bottom, #ffffff 0%, #f5f5dc 100%)",
                    borderColor: "#8b7355",
                  }}
                >
                  <thead>
                    <tr
                      className="bg-gradient-to-r from-stone-300 to-stone-400"
                      style={{
                        background:
                          "linear-gradient(to bottom, #e6ddd4 0%, #d0c7be 100%)",
                      }}
                    >
                      <th
                        className="border border-stone-400 p-3 text-left text-stone-800 font-bold"
                        style={{
                          borderColor: "#8b7355",
                          fontFamily: "Tahoma, Arial, sans-serif",
                        }}
                      >
                        User ID
                      </th>
                      <th
                        className="border border-stone-400 p-3 text-left text-stone-800 font-bold"
                        style={{
                          borderColor: "#8b7355",
                          fontFamily: "Tahoma, Arial, sans-serif",
                        }}
                      >
                        Role
                      </th>
                      <th
                        className="border border-stone-400 p-3 text-left text-stone-800 font-bold"
                        style={{
                          borderColor: "#8b7355",
                          fontFamily: "Tahoma, Arial, sans-serif",
                        }}
                      >
                        Company
                      </th>
                      <th
                        className="border border-stone-400 p-3 text-left text-stone-800 font-bold"
                        style={{
                          borderColor: "#8b7355",
                          fontFamily: "Tahoma, Arial, sans-serif",
                        }}
                      >
                        Created
                      </th>
                      <th
                        className="border border-stone-400 p-3 text-left text-stone-800 font-bold"
                        style={{
                          borderColor: "#8b7355",
                          fontFamily: "Tahoma, Arial, sans-serif",
                        }}
                      >
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user._id}
                        className={`${
                          index % 2 === 0 ? "bg-stone-50" : "bg-white"
                        } hover:bg-stone-200 transition-colors duration-150`}
                        style={{
                          background:
                            index % 2 === 0
                              ? "linear-gradient(to bottom, #f5f5dc, #f0e68c)"
                              : "#ffffff",
                        }}
                      >
                        <td
                          className="border border-stone-400 p-3"
                          style={{ borderColor: "#8b7355" }}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-8 h-8 bg-gradient-to-br from-stone-300 to-stone-500 rounded border border-stone-600 flex items-center justify-center shadow-inner"
                              style={{
                                background:
                                  "linear-gradient(145deg, #e6ddd4, #b8a48c)",
                                borderColor: "#8b7355",
                              }}
                            >
                              <User className="w-4 h-4 text-stone-700" />
                            </div>
                            <div>
                              <div
                                className="font-bold text-stone-800"
                                style={{
                                  fontFamily: "Tahoma, Arial, sans-serif",
                                }}
                              >
                                {user.userId}
                              </div>
                              <div
                                className="text-xs text-stone-600"
                                style={{
                                  fontFamily: "Tahoma, Arial, sans-serif",
                                }}
                              >
                                ID: {user._id.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td
                          className="border border-stone-400 p-3"
                          style={{ borderColor: "#8b7355" }}
                        >
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span
                              className="text-stone-700 capitalize font-medium"
                              style={{
                                fontFamily: "Tahoma, Arial, sans-serif",
                              }}
                            >
                              {getRoleDisplayName(user.role)}
                            </span>
                          </div>
                        </td>
                        <td
                          className="border border-stone-400 p-3"
                          style={{ borderColor: "#8b7355" }}
                        >
                          <div className="text-stone-700">
                            <div
                              className="font-bold"
                              style={{
                                fontFamily: "Tahoma, Arial, sans-serif",
                              }}
                            >
                              {user.company || "N/A"}
                            </div>
                            <div
                              className="text-xs text-stone-600"
                              style={{
                                fontFamily: "Tahoma, Arial, sans-serif",
                              }}
                            >
                              {user.companyId || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td
                          className="border border-stone-400 p-3 text-stone-700 text-sm"
                          style={{
                            borderColor: "#8b7355",
                            fontFamily: "Tahoma, Arial, sans-serif",
                          }}
                        >
                          {formatDate(user.createdAt)}
                        </td>
                        <td
                          className="border border-stone-400 p-3 text-stone-700 text-sm"
                          style={{
                            borderColor: "#8b7355",
                            fontFamily: "Tahoma, Arial, sans-serif",
                          }}
                        >
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
          <div
            className="p-4 border-t border-stone-400 bg-stone-200"
            style={{
              background:
                "linear-gradient(to bottom, #f0e68c 0%, #ddd8aa 100%)",
              borderColor: "#8b7355",
            }}
          >
            <div
              className="flex items-center justify-between text-sm text-stone-700"
              style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
            >
              <div>
                Company: {currentUser?.company} ({currentUser?.companyId}) |
                Access Level:{" "}
                {currentUser ? getRoleDisplayName(currentUser.role) : "N/A"}
              </div>
              <div>Total Users: {filteredUsers.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDetailsDashboard;
