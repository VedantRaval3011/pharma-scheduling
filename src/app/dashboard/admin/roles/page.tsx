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

// Interface for audit log
interface AuditLog {
  auditId: string;
  roleId: string;
  action: "CREATE" | "UPDATE";
  changedData: {
    previous?: { name: string; description?: string };
    new?: { name: string; description?: string };
  };
  performedBy: string;
  timestamp: string;
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
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    description: "",
  });
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<CompanyRole[]>(
    []
  );
  const [isAuditPopupOpen, setIsAuditPopupOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get sorted roles for navigation
  const sortedRoles = [...roles].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setFilteredSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Filter suggestions based on input
  useEffect(() => {
    if (formData.name.trim()) {
      const suggestions = roles.filter((role) =>
        role.name.toLowerCase().startsWith(formData.name.toLowerCase())
      );
      setFilteredSuggestions(suggestions);
    } else {
      setFilteredSuggestions([]);
    }
  }, [formData.name, roles]);

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
        setIsFormEnabled(false);
        setFilteredSuggestions([]);
      } else {
        setError(data.error || "Failed to create role");
      }
    } catch (err) {
      setError("An error occurred while creating role");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRoleId || !isFormEnabled) return;

    try {
      const response = await fetch(
        `/api/admin/company-roles/${selectedRoleId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Role updated successfully!");
        setRoles(
          roles.map((role) =>
            role.roleId === selectedRoleId ? { ...role, ...formData } : role
          )
        );
        setFormData({ name: "", description: "" });
        setIsFormEnabled(false);
        setIsEditing(false);
        setSelectedRoleId(null);
        setFilteredSuggestions([]);
      } else {
        setError(data.error || "Failed to update role");
      }
    } catch (err) {
      setError("An error occurred while updating role");
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRoleId) {
      setError("Please select a role to delete");
      return;
    }
    if (!confirm("Are you sure you want to delete this role")) return;

    try {
      const response = await fetch(`/api/admin/company-roles`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Role deleted successfully!");
        setRoles(roles.filter((role) => role.roleId !== selectedRoleId));
        setSelectedRoleId(null);
        setFormData({ name: "", description: "" });
        setIsFormEnabled(false);
      } else {
        setError(data.error || "Failed to delete role");
      }
    } catch (err) {
      setError("An error occurred while deleting role");
    }
  };

  const handleSelectSuggestion = (role: CompanyRole) => {
    setFormData({
      name: role.name,
      description: role.description || "",
    });
    setSelectedRoleId(role.roleId);
    setIsEditing(true);
    setIsFormEnabled(true);
    setFilteredSuggestions([]);
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 0);
  };

  const handleSearchSelect = (role: CompanyRole) => {
    setSelectedRoleId(role.roleId);
    setFormData({
      name: role.name,
      description: role.description || "",
    });
    setIsSearchPopupOpen(false);
    setSearchQuery("");
    setIsFormEnabled(true);
    setIsEditing(true);
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 0);
  };

  const handleAudit = async () => {
    if (!selectedRoleId) {
      setError("Please select a role to view audit logs");
      return;
    }

    setError(""); // Clear previous errors
    setIsAuditPopupOpen(false); // Reset popup state
    setAuditLogs([]); // Reset audit logs

    try {
      console.log("Fetching audit logs for roleId:", selectedRoleId); // Debug log
      const response = await fetch(
        `/api/admin/company-roles/audit?roleId=${encodeURIComponent(
          selectedRoleId
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      console.log("Audit API response:", data); // Debug log

      if (response.ok) {
        setAuditLogs(data.data || []);
        setIsAuditPopupOpen(true); // Open the popup
      } else {
        setError(data.error || "Failed to fetch audit logs");
        console.warn("API error:", data.error);
      }
    } catch (err) {
      setError("An error occurred while fetching audit logs");
      console.error("Audit fetch error:", err); // Enhanced error logging
    }
  };

  const handleAddNew = () => {
    setIsFormEnabled(true);
    setIsEditing(false);
    setSelectedRoleId(null);
    setFormData({ name: "", description: "" });
    setMessage("");
    setError("");
    setFilteredSuggestions([]);
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 0);
  };

  const handleSave = () => {
    if (isFormEnabled && formData.name.trim()) {
      if (isEditing) {
        handleUpdateRole();
      } else {
        handleCreateRole();
      }
    }
  };

  const handleEdit = () => {
    if (selectedRoleId) {
      const roleToEdit = roles.find((role) => role.roleId === selectedRoleId);
      if (roleToEdit) {
        setFormData({
          name: roleToEdit.name,
          description: roleToEdit.description || "",
        });
        setIsFormEnabled(true);
        setIsEditing(true);
        setMessage("");
        setError("");
        setTimeout(() => {
          if (nameInputRef.current) {
            nameInputRef.current.focus();
          }
        }, 0);
      }
    } else {
      setError("Please select a role to edit");
    }
  };

  const handleClear = () => {
    setFormData({ name: "", description: "" });
    setMessage("");
    setError("");
    setIsEditing(false);
    setSelectedRoleId(null);
    setIsFormEnabled(false);
    setFilteredSuggestions([]);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (sortedRoles.length === 0) return;

    let currentIndex = -1;
    if (selectedRoleId) {
      currentIndex = sortedRoles.findIndex(
        (role) => role.roleId === selectedRoleId
      );
    }

    const newIndex =
      currentIndex <= 0 ? sortedRoles.length - 1 : currentIndex - 1;
    const selectedRole = sortedRoles[newIndex];

    setSelectedRoleId(selectedRole.roleId);
    setFormData({
      name: selectedRole.name,
      description: selectedRole.description || "",
    });

    if (isFormEnabled) {
      setIsEditing(true);
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 0);
    }

    setError("");
  };

  const handleDown = () => {
    if (sortedRoles.length === 0) return;

    let currentIndex = -1;
    if (selectedRoleId) {
      currentIndex = sortedRoles.findIndex(
        (role) => role.roleId === selectedRoleId
      );
    }

    const newIndex =
      currentIndex >= sortedRoles.length - 1 ? 0 : currentIndex + 1;
    const selectedRole = sortedRoles[newIndex];

    setSelectedRoleId(selectedRole.roleId);
    setFormData({
      name: selectedRole.name,
      description: selectedRole.description || "",
    });

    if (isFormEnabled) {
      setIsEditing(true);
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 0);
    }

    setError("");
  };

  const handleSearch = () => {
    setIsSearchPopupOpen(true);
    setSearchQuery("");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleHelp = () => {
    window.open("/help/roles", "_blank");
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description &&
        role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
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
          onUp={handleUp}
          onDown={handleDown}
          onSearch={handleSearch}
          onEdit={handleEdit}
          onDelete={handleDeleteRole}
          onAudit={handleAudit}
          onPrint={handlePrint}
          onHelp={handleHelp}
        />

        <div className="p-6">
          <div
            className="mx-auto max-w-4xl shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] rounded-lg"
            style={{
              background: "linear-gradient(180deg, #f5f6f5 0%, #e0e1e0 100%)",
              border: "2px solid #8c8c8c",
            }}>
            <div
              className="px-4 py-3 flex items-center bg-gradient-to-r from-[#4a90e2] to-[#2e5cb8] text-white"
              style={{
                borderTopLeftRadius: "6px",
                borderTopRightRadius: "6px",
                borderBottom: "2px solid #2e5cb8",
                boxShadow:
                  "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8",
              }}>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white rounded-sm mr-3 flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#003087] rounded-sm"></div>
                </div>
                <h1 className="text-base font-semibold">
                  Company Roles Management
                </h1>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-[#003087]">
                  Company: {session?.user?.companies?.[0]?.name}
                </p>
              </div>

              <div
                className="mb-6 p-4 rounded"
                style={{
                  background:
                    "linear-gradient(180deg, #f5f6f5 0%, #e0e1e0 100%)",
                  border: "2px solid #8c8c8c",
                  boxShadow:
                    "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                }}>
                <h2 className="text-base font-bold mb-4 text-[#003087]">
                  {isEditing ? "Edit Company Role" : "Create Company Role"}
                </h2>
                <div className="space-y-4 relative">
                  <div>
                    <label className="block text-sm font-bold text-[#003087] mb-1">
                      Role Name *
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      disabled={!isFormEnabled}
                      className="w-full px-3 py-2 text-sm bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#0052cc] disabled:bg-[#d8d8d8]"
                      style={{
                        border: "2px solid #8c8c8c",
                        boxShadow:
                          "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff",
                        cursor: isFormEnabled ? "text" : "not-allowed",
                        color: isFormEnabled ? "#000000" : "#666666",
                      }}
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                      }}
                    />
                    {filteredSuggestions.length > 0 && (
                      <div
                        ref={dropdownRef}
                        className="absolute z-10 w-full mt-1 bg-[#f5f6f5] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] rounded max-h-60 overflow-y-auto"
                        style={{
                          border: "2px solid #8c8c8c",
                        }}>
                        {filteredSuggestions.map((role) => (
                          <div
                            key={role.roleId}
                            className="px-3 py-2 text-sm hover:bg-[#c6d8f0] cursor-pointer"
                            onClick={() => handleSelectSuggestion(role)}>
                            {role.name}
                            {role.description && (
                              <p className="text-xs text-[#003087]">
                                {role.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#003087] mb-1">
                      Description
                    </label>
                    <textarea
                      disabled={!isFormEnabled}
                      className="w-full px-3 py-2 text-sm bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#0052cc] disabled:bg-[#d8d8d8] resize-none"
                      style={{
                        border: "2px solid #8c8c8c",
                        boxShadow:
                          "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff",
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
                    />
                  </div>

                  {error && (
                    <div
                      className="p-3 text-sm text-[#a40000] rounded"
                      style={{
                        background:
                          "linear-gradient(180deg, #ffe6e6 0%, #ffd1d1 100%)",
                        border: "2px solid #8c8c8c",
                        boxShadow:
                          "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                      }}>
                      {error}
                    </div>
                  )}
                  {message && (
                    <div
                      className="p-3 text-sm text-[#006600] rounded"
                      style={{
                        background:
                          "linear-gradient(180deg, #e6ffe6 0%, #d1ffd1 100%)",
                        border: "2px solid #8c8c8c",
                        boxShadow:
                          "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                      }}>
                      {message}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isCreating || !isFormEnabled}
                    onClick={isEditing ? handleUpdateRole : handleCreateRole}
                    className="px-6 py-2 text-sm font-medium text-white rounded transition-all duration-150"
                    style={{
                      background:
                        isCreating || !isFormEnabled
                          ? "linear-gradient(180deg, #cccccc 0%, #999999 100%)"
                          : "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)",
                      border: "2px solid #2e5cb8",
                      boxShadow:
                        "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8",
                      cursor:
                        isCreating || !isFormEnabled
                          ? "not-allowed"
                          : "pointer",
                    }}
                    onMouseDown={(e) => {
                      if (!isCreating && isFormEnabled) {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #2e5cb8 0%, #4a90e2 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff";
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!isCreating && isFormEnabled) {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCreating && isFormEnabled) {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                      }
                    }}>
                    {isCreating
                      ? "Creating..."
                      : isEditing
                      ? "Update Role"
                      : "Create Role"}
                  </button>
                </div>
              </div>

              {isSearchPopupOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div
                    className="p-6 rounded-lg max-w-md w-full shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563]"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5f6f5 0%, #e0e1e0 100%)",
                      border: "2px solid #8c8c8c",
                    }}>
                    <h2 className="text-base font-bold mb-4 text-[#003087]">
                      Search Roles
                    </h2>
                    <input
                      type="text"
                      placeholder="Search roles..."
                      className="w-full px-3 py-2 text-sm bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#0052cc]"
                      style={{
                        border: "2px solid #8c8c8c",
                        boxShadow:
                          "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff",
                      }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="max-h-60 overflow-y-auto mt-4">
                      {filteredRoles.length === 0 ? (
                        <p className="text-sm text-[#003087] italic">
                          No roles found
                        </p>
                      ) : (
                        filteredRoles.map((role) => (
                          <div
                            key={role.roleId}
                            className="px-3 py-2 text-sm hover:bg-[#c6d8f0] cursor-pointer"
                            onClick={() => handleSearchSelect(role)}>
                            <p className="font-semibold text-[#003087]">
                              {role.name}
                            </p>
                            {role.description && (
                              <p className="text-xs text-[#003087]">
                                {role.description}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => setIsSearchPopupOpen(false)}
                      className="mt-4 px-4 py-2 text-sm font-medium text-white rounded"
                      style={{
                        background:
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)",
                        border: "2px solid #2e5cb8",
                        boxShadow:
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8",
                      }}
                      onMouseDown={(e) => {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #2e5cb8 0%, #4a90e2 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff";
                      }}
                      onMouseUp={(e) => {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                      }}>
                      Close
                    </button>
                  </div>
                </div>
              )}

              {isAuditPopupOpen && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  onClick={() => setIsAuditPopupOpen(false)} // Close on backdrop click
                >
                  <div
                    className="p-6 rounded-lg max-w-lg w-full shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563]"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5f6f5 0%, #e0e1e0 100%)",
                      border: "2px solid #8c8c8c",
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                  >
                    <h2 className="text-base font-bold mb-4 text-[#003087]">
                      Audit Logs for Role
                    </h2>
                    <div className="max-h-60 overflow-y-auto">
                      {auditLogs.length === 0 ? (
                        <p className="text-sm text-[#003087] italic">
                          No audit logs found
                        </p>
                      ) : (
                        auditLogs.map((log) => (
                          <div
                            key={log.auditId}
                            className="p-3 mb-2 border rounded"
                            style={{
                              border: "2px solid #8c8c8c",
                              background:
                                "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)",
                              boxShadow:
                                "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #4b5563",
                            }}>
                            <p className="text-sm font-semibold text-[#003087]">
                              Action: {log.action}
                            </p>
                            <p className="text-xs text-[#003087]">
                              By: {log.performedBy}
                            </p>
                            <p className="text-xs text-[#003087]">
                              When: {new Date(log.timestamp).toLocaleString()}
                            </p>
                            <p className="text-xs text-[#003087]">
                              Changes:
                              {log.action === "CREATE" ? (
                                <ul className="list-disc ml-4">
                                  <li>Name: {log.changedData.new?.name}</li>
                                  {log.changedData.new?.description && (
                                    <li>
                                      Description:{" "}
                                      {log.changedData.new.description}
                                    </li>
                                  )}
                                </ul>
                              ) : (
                                <ul className="list-disc ml-4">
                                  {log.changedData.previous?.name !==
                                    log.changedData.new?.name && (
                                    <li>
                                      Name: {log.changedData.previous?.name} →{" "}
                                      {log.changedData.new?.name}
                                    </li>
                                  )}
                                  {log.changedData.previous?.description !==
                                    log.changedData.new?.description && (
                                    <li>
                                      Description:{" "}
                                      {log.changedData.previous?.description ||
                                        "None"}{" "}
                                      →{" "}
                                      {log.changedData.new?.description ||
                                        "None"}
                                    </li>
                                  )}
                                </ul>
                              )}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => setIsAuditPopupOpen(false)}
                      className="mt-4 px-4 py-2 text-sm font-medium text-white rounded"
                      style={{
                        background:
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)",
                        border: "2px solid #2e5cb8",
                        boxShadow:
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8",
                      }}
                      onMouseDown={(e) => {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #2e5cb8 0%, #4a90e2 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff";
                      }}
                      onMouseUp={(e) => {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background =
                          "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                        (e.target as HTMLButtonElement).style.boxShadow =
                          "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                      }}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
