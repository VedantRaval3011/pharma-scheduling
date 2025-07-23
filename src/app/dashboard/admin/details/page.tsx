"use client";
import React, { useState, useEffect } from "react";
import { Building, User, Save, Edit, AlertCircle, X } from "lucide-react";
import type { JSX } from "react";
import WindowsToolbar from "@/components/layout/ToolBox";

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
  role: "admin" | "employee";
  companies: Company[];
  email: string | null;
}

interface ApiResponse {
  user?: {
    userId: string;
    role: "admin" | "employee";
    companies: Company[];
    email: string | null;
  };
  error?: string;
}

interface IFieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  dataType: string;
}

interface IAdminAuditLog {
  auditId: string;
  adminId: string;
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  performedBy: string;
  timestamp: Date;
  details: {
    message?: string;
    changes?: IFieldChange[];
    [key: string]: any;
  };
}

const AdminDetailsDashboard: React.FC = () => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<AdminUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<IAdminAuditLog[]>([]);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  useEffect(() => {
    fetchAdminDetails();
  }, []);

  const fetchAdminDetails = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const sessionResponse = await fetch("/api/auth/session", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to fetch session: ${sessionResponse.status}`);
      }

      const sessionData = await sessionResponse.json();
      const userId = sessionData.user?.userId;

      if (!userId) {
        throw new Error("No user ID found in session");
      }

      const response = await fetch(`/api/user/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
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
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch admin details";
      setError(errorMessage);
      console.error("Error in fetchAdminDetails:", errorMessage);
      setAdmin(null);
      setFormData(null);
    } finally {
      setLoading(false);
    }
  };

  const createAuditLog = async (
    action: "CREATE" | "UPDATE" | "DELETE",
    changes: IFieldChange[]
  ): Promise<void> => {
    try {
      const sessionResponse = await fetch("/api/auth/session", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!sessionResponse.ok) {
        throw new Error(
          `Failed to fetch session for audit: ${sessionResponse.status}`
        );
      }

      const sessionData = await sessionResponse.json();
      const performedBy = sessionData.user?.userId;

      if (!admin || !performedBy) {
        throw new Error("Missing admin or session user data for audit log");
      }

      const auditLog = {
        adminId: admin.userId,
        userId: admin.userId,
        action,
        performedBy,
        details: {
          message: `${action} operation on admin data`,
          changes,
        },
      };

      const response = await fetch("/api/admin/admin-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auditLog),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create audit log: ${errorData.error || response.status}`
        );
      }

      console.log("Audit log created successfully:", await response.json());
    } catch (err) {
      console.error("Error creating audit log:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create audit log"
      );
    }
  };

  const compareAdminData = (
    oldData: AdminUser,
    newData: AdminUser
  ): IFieldChange[] => {
    const changes: IFieldChange[] = [];

    if (oldData.email !== newData.email) {
      changes.push({
        field: "email",
        oldValue: oldData.email || "null",
        newValue: newData.email || "null",
        dataType: "string",
      });
    }

    const maxCompanies = Math.max(
      oldData.companies.length,
      newData.companies.length
    );
    for (let i = 0; i < maxCompanies; i++) {
      const oldCompany = oldData.companies[i] || { name: "", locations: [] };
      const newCompany = newData.companies[i] || { name: "", locations: [] };

      if (oldCompany.name !== newCompany.name) {
        changes.push({
          field: `company[${i}].name`,
          oldValue: oldCompany.name || "null",
          newValue: newCompany.name || "null",
          dataType: "string",
        });
      }

      const maxLocations = Math.max(
        oldCompany.locations.length,
        newCompany.locations.length
      );
      for (let j = 0; j < maxLocations; j++) {
        const oldLocation = oldCompany.locations[j] || { name: "" };
        const newLocation = newCompany.locations[j] || { name: "" };

        if (oldLocation.name !== newLocation.name) {
          changes.push({
            field: `company[${i}].locations[${j}].name`,
            oldValue: oldLocation.name || "null",
            newValue: newLocation.name || "null",
            dataType: "string",
          });
        }
      }
    }

    return changes;
  };

  const handleAddNew = async (): Promise<void> => {
    if (!formData) return;

    try {
      const newCompany: Company = {
        companyId: `comp-${Date.now()}`,
        name: "New Company",
        locations: [{ locationId: `loc-${Date.now()}`, name: "New Location" }],
      };

      const updatedCompanies = [...formData.companies, newCompany];
      const newFormData = { ...formData, companies: updatedCompanies };
      setFormData(newFormData);
      setIsEditing(true);

      await createAuditLog("CREATE", [
        {
          field: `company[${formData.companies.length}].name`,
          oldValue: null,
          newValue: newCompany.name,
          dataType: "string",
        },
        {
          field: `company[${formData.companies.length}].locations[0].name`,
          oldValue: null,
          newValue: newCompany.locations[0].name,
          dataType: "string",
        },
      ]);
    } catch (err) {
      setError("Failed to add new company");
      console.error("Error in handleAddNew:", err);
    }
  };

  const handleSave = async (): Promise<void> => {
    try {
      if (!admin || !formData) {
        throw new Error("No admin data to update");
      }

      const changes = compareAdminData(admin, formData);

      const updatePayload = {
        email: formData.email,
        companies: formData.companies.map((company) => ({
          name: company.name,
          locations: company.locations.map((location) => ({
            name: location.name,
            ...(location._id && { _id: location._id }),
          })),
        })),
      };

      const response = await fetch(`/api/user/${admin.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data: ApiResponse = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.user) {
        const updatedAdmin = {
          userId: data.user.userId,
          role: data.user.role,
          companies: data.user.companies || [],
          email: data.user.email || null,
        };
        setAdmin(updatedAdmin);
        setFormData(updatedAdmin);
        setIsEditing(false);

        if (changes.length > 0) {
          await createAuditLog("UPDATE", changes);
        }
      } else {
        setAdmin(null);
        setFormData(null);
        throw new Error("No user data returned after save");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update admin details";
      setError(errorMessage);
      console.error("Error in handleSave:", errorMessage);
    }
  };

  const handleClear = (): void => {
    if (admin) {
      setFormData({ ...admin });
      setIsEditing(false);
      setError(null);
    }
  };

  const handleExit = (): void => {
    window.location.href = "/dashboard";
  };

  const handleEdit = (): void => {
    setIsEditing(!isEditing);
  };

  const handleAudit = async (): Promise<void> => {
    try {
      if (!admin) {
        throw new Error("No admin data available");
      }

      const response = await fetch(`/api/admin/admin-audit/${admin.userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const auditData: IAdminAuditLog[] = await response.json();
      setAuditLogs(auditData);
      setShowAuditModal(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch audit logs";
      setError(errorMessage);
      console.error("Error in handleAudit:", errorMessage);
    }
  };

  const handleHelp = (): void => {
    window.open("/help", "_blank");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    companyIndex?: number,
    locationIndex?: number
  ): void => {
    if (!formData) return;

    if (companyIndex !== undefined && locationIndex !== undefined) {
      const updatedCompanies = [...formData.companies];
      updatedCompanies[companyIndex].locations[locationIndex].name =
        e.target.value;
      setFormData({ ...formData, companies: updatedCompanies });
    } else if (companyIndex !== undefined) {
      const updatedCompanies = [...formData.companies];
      updatedCompanies[companyIndex].name = e.target.value;
      setFormData({ ...formData, companies: updatedCompanies });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const getRoleIcon = (role: AdminUser["role"]): JSX.Element => {
    switch (role) {
      case "admin":
        return <Building className="w-4 h-4 text-blue-700" />;
      default:
        return <User className="w-4 h-4 text-green-700" />;
    }
  };

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case "admin":
        return "Admin";
      case "employee":
        return "Employee";
      default:
        return role;
    }
  };

  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <WindowsToolbar
        modulePath="/admin-details"
        onAddNew={handleAddNew}
        onSave={handleSave}
        onClear={handleClear}
        onExit={handleExit}
        onEdit={handleEdit}
        onAudit={handleAudit}
        onHelp={handleHelp}
      />
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-t-lg shadow-lg border-t-2 border-l-2 border-r-2 border-blue-300"
          style={{
            background:
              "linear-gradient(to bottom, #e9f3ff 0%, #d0e7ff 50%, #b0d1ff 100%)",
          }}
        >
          <div className="flex items-center p-3">
            <User className="w-5 h-5 text-blue-800 mr-2" />
            <h1 className="text-lg font-bold text-blue-900">Admin Details</h1>
          </div>
        </div>

        <div
          className="rounded-b-lg shadow-lg border-2 border-t-0 border-gray-400 p-6"
          style={{
            background: "linear-gradient(to bottom, #ffffff 0%, #f8f8f8 100%)",
            borderStyle: "ridge",
            borderWidth: "2px",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-gray-800">Loading admin details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-600" />
              <p className="text-red-800 mb-4">{error}</p>
              <button
                onClick={fetchAdminDetails}
                className="px-4 py-2 border-2 border-gray-400 rounded text-gray-800 text-sm hover:bg-gray-100 active:border-gray-600"
                style={{
                  background:
                    "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                  borderStyle: "outset",
                }}
              >
                Try Again
              </button>
            </div>
          ) : admin && formData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-400"
                    style={{
                      background:
                        "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                      borderStyle: "inset",
                    }}
                  >
                    {getRoleIcon(admin.role)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {admin.userId}
                    </h2>
                    <p className="text-gray-700 text-sm">
                      Role: {getRoleDisplayName(admin.role)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="p-4 border-2 border-gray-300 rounded"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)",
                    borderStyle: "inset",
                  }}
                >
                  <label className="text-gray-800 font-medium text-sm block mb-1">
                    User ID
                  </label>
                  <p className="text-gray-900">{admin.userId}</p>
                </div>
                <div
                  className="p-4 border-2 border-gray-300 rounded"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)",
                    borderStyle: "inset",
                  }}
                >
                  <label className="text-gray-800 font-medium text-sm block mb-1">
                    Role
                  </label>
                  <p className="text-gray-900">
                    {getRoleDisplayName(admin.role)}
                  </p>
                </div>
                <div
                  className="p-4 border-2 border-gray-300 rounded"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)",
                    borderStyle: "inset",
                  }}
                >
                  <label className="text-gray-800 font-medium text-sm block mb-1">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleInputChange}
                      className="w-full p-2 border-2 border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
                      style={{ borderStyle: "inset" }}
                    />
                  ) : (
                    <p className="text-gray-900">{admin.email || "Not set"}</p>
                  )}
                </div>
              </div>

              <div
                className="p-4 border-2 border-gray-300 rounded"
                style={{
                  background:
                    "linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)",
                  borderStyle: "inset",
                }}
              >
                <label className="text-gray-800 font-medium text-sm block mb-2">
                  Companies
                </label>
                {admin.companies.length > 0 ? (
                  <div className="space-y-4">
                    {admin.companies.map((company, companyIndex) => (
                      <div
                        key={company.companyId}
                        className="border-l-4 border-gray-300 pl-4 p-3 bg-white rounded"
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.companies[companyIndex].name}
                            onChange={(e) => handleInputChange(e, companyIndex)}
                            className="text-gray-900 font-semibold w-full p-2 border-2 border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
                            style={{ borderStyle: "inset" }}
                          />
                        ) : (
                          <p className="text-gray-900 font-semibold">
                            {company.name}
                          </p>
                        )}
                        <div className="mt-2">
                          <label className="text-gray-800 text-sm font-medium block mb-1">
                            Locations
                          </label>
                          {company.locations.length > 0 ? (
                            <ul className="text-gray-700 text-sm space-y-1">
                              {company.locations.map(
                                (location, locationIndex) => (
                                  <li key={location.locationId}>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={
                                          formData.companies[companyIndex]
                                            .locations[locationIndex].name
                                        }
                                        onChange={(e) =>
                                          handleInputChange(
                                            e,
                                            companyIndex,
                                            locationIndex
                                          )
                                        }
                                        className="w-full p-2 border-2 border-gray-400 rounded bg-white focus:outline-none focus:border-blue-500"
                                        style={{ borderStyle: "inset" }}
                                      />
                                    ) : (
                                      <span>{location.name}</span>
                                    )}
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="text-gray-700 text-sm">
                              No locations assigned
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-700 text-sm">No companies assigned</p>
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

      {showAuditModal && (
        <div
          className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowAuditModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg border-2 border-gray-400 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            style={{
              background:
                "linear-gradient(to bottom, #ffffff 0%, #f8f8f8 100%)",
              borderStyle: "ridge",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between p-3 border-b-2 border-gray-400"
              style={{
                background:
                  "linear-gradient(to bottom, #e9f3ff 0%, #d0e7ff 50%, #b0d1ff 100%)",
              }}
            >
              <h2 className="text-lg font-bold text-blue-900">Audit Logs</h2>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 text-gray-700 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {auditLogs.length > 0 ? (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div
                      key={log.auditId}
                      className="p-3 border-2 border-gray-300 rounded"
                      style={{
                        background:
                          "linear-gradient(to bottom, #fdfdfd 0%, #f5f5f5 100%)",
                      }}
                    >
                      <p className="text-gray-800 text-sm">
                        <strong>Admin ID:</strong> {log.adminId}
                      </p>
                      <p className="text-gray-800 text-sm">
                        <strong>User ID:</strong> {log.userId}
                      </p>
                      <p className="text-gray-800 text-sm">
                        <strong>Action:</strong> {log.action}
                      </p>
                      <p className="text-gray-800 text-sm">
                        <strong>Performed By:</strong> {log.performedBy}
                      </p>
                      <p className="text-gray-800 text-sm">
                        <strong>Timestamp:</strong>{" "}
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                      <p className="text-gray-800 text-sm">
                        <strong>Details:</strong>
                      </p>
                      <ul className="text-gray-700 text-sm ml-4 space-y-1">
                        {log.details.changes?.map((change, index) => (
                          <li key={index}>
                            <strong>{change.field}:</strong>{" "}
                            {String(change.oldValue)} →{" "}
                            {String(change.newValue)}
                          </li>
                        ))}
                        {log.details.message && (
                          <li>
                            <strong>Message:</strong> {log.details.message}
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-700 text-sm">No audit logs found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDetailsDashboard;