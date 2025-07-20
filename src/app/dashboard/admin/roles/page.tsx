"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";

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
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
  });
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch existing roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/admin/company-roles");
        const data = await response.json();
        if (response.ok) {
          setRoles(data.data || []);
        } else {
          setError(data.error || "Failed to fetch roles");
        }
      } catch (err) {
        setError("An error occurred while fetching roles");
      }
    };
    fetchRoles();
  }, []);

  // Focus on name input when form is enabled
  useEffect(() => {
    if (isFormEnabled && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isFormEnabled]);

  const handleCreateRole = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isFormEnabled) return;

    setIsCreating(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/company-roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Role created successfully!");
        setFormData({ name: "", description: "" });
        setRoles([...roles, data.role]);
        setIsFormEnabled(false); // Disable form after successful creation
      } else {
        setError(data.error || "Failed to create role");
      }
    } catch (err) {
      setError("An error occurred while creating role");
    } finally {
      setIsCreating(false);
    }
  };

  // Toolbar handlers
  const handleAddNew = () => {
    setIsFormEnabled(true);
    setFormData({ name: "", description: "" });
    setMessage("");
    setError("");
  };

  const handleSave = () => {
    if (isFormEnabled && formData.name.trim()) {
      handleCreateRole();
    }
  };

  const handleClear = () => {
    setFormData({ name: "", description: "" });
    setMessage("");
    setError("");
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div
        className="min-h-screen"
        style={{
          background:
            "linear-gradient(180deg, #e4f2ff 0%, #d1e7fe 50%, #b6d6ff 100%)",
          fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        }}>
        <WindowsToolbar
          modulePath="/dashboard/admin/roles"
          onAddNew={handleAddNew}
          onSave={handleSave}
          onClear={handleClear}
          onExit={handleExit}
        />

        {/* Windows XP/7 Style Window */}
        <div className="p-6">
          {/* Main Window Container */}
          <div
            className="mx-auto max-w-4xl"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)",
              border: "1px solid #4a90e2",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}>
            {/* Window Title Bar */}
            <div
              className="px-4 py-3 flex items-center"
              style={{
                background: "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
                borderBottom: "1px solid #2e5cb8",
              }}>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white rounded-sm mr-3 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
                </div>
                <h1 className="text-white font-semibold text-sm">
                  Company Roles Management
                </h1>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-6">
              {/* Company Info */}
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Company: {session?.user?.companies?.[0]?.name}
                </p>
              </div>

              {/* Create Role Section */}
              <div
                className="mb-6 p-4"
                style={{
                  background:
                    "linear-gradient(180deg, #f8fbff 0%, #e8f4fd 100%)",
                  border: "1px solid #c5d7ed",
                  borderRadius: "4px",
                }}>
                <h2 className="text-base font-bold mb-4 text-gray-800">
                  Create Company Role
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Name *
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      disabled={!isFormEnabled}
                      className="w-full px-3 py-2 text-sm"
                      style={{
                        border: "1px solid #a8c8ec",
                        borderRadius: "2px",
                        background: isFormEnabled
                          ? "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)"
                          : "linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)",
                        outline: "none",
                        cursor: isFormEnabled ? "text" : "not-allowed",
                        color: isFormEnabled ? "#000000" : "#666666",
                      }}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      onFocus={(e) => {
                        if (isFormEnabled) {
                          e.target.style.border = "1px solid #4a90e2";
                        }
                      }}
                      onBlur={(e) => {
                        if (isFormEnabled) {
                          e.target.style.border = "1px solid #a8c8ec";
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      disabled={!isFormEnabled}
                      className="w-full px-3 py-2 text-sm resize-none"
                      style={{
                        border: "1px solid #a8c8ec",
                        borderRadius: "2px",
                        background: isFormEnabled
                          ? "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)"
                          : "linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)",
                        outline: "none",
                        height: "60px",
                        cursor: isFormEnabled ? "text" : "not-allowed",
                        color: isFormEnabled ? "#000000" : "#666666",
                      }}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      onFocus={(e) => {
                        if (isFormEnabled) {
                          e.target.style.border = "1px solid #4a90e2";
                        }
                      }}
                      onBlur={(e) => {
                        if (isFormEnabled) {
                          e.target.style.border = "1px solid #a8c8ec";
                        }
                      }}
                    />
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                      {error}
                    </div>
                  )}
                  {message && (
                    <div className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">
                      {message}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isCreating || !isFormEnabled}
                    onClick={handleCreateRole}
                    className="px-6 py-2 text-sm font-medium text-white disabled:opacity-50 transition-all duration-150"
                    style={{
                      background:
                        isCreating || !isFormEnabled
                          ? "linear-gradient(180deg, #cccccc 0%, #999999 100%)"
                          : "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)",
                      border: "1px solid #2e5cb8",
                      borderRadius: "3px",
                      cursor:
                        isCreating || !isFormEnabled
                          ? "not-allowed"
                          : "pointer",
                    }}
                    onMouseDown={(e) => {
                      if (!isCreating && isFormEnabled) {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #2e5cb8 0%, #4a90e2 100%)";
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!isCreating && isFormEnabled) {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCreating && isFormEnabled) {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                      }
                    }}>
                    {isCreating ? "Creating..." : "Create Role"}
                  </button>
                </div>
              </div>

              {/* Existing Roles Section */}
              <div
                className="p-4"
                style={{
                  background:
                    "linear-gradient(180deg, #f8fbff 0%, #e8f4fd 100%)",
                  border: "1px solid #c5d7ed",
                  borderRadius: "4px",
                }}>
                <h2 className="text-base font-bold mb-4 text-gray-800">
                  Existing Roles
                </h2>
                {roles.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No roles found</p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.roleId}
                        className="p-3"
                        style={{
                          background:
                            "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)",
                          border: "1px solid #d1e7fe",
                          borderRadius: "3px",
                        }}>
                        <p className="text-sm font-semibold text-gray-800">
                          {role.name}
                        </p>
                        {role.description && (
                          <p className="text-xs text-gray-600 mt-1">
                            {role.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}