"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { adminEmployeeNavData } from "@/data/navigationData";
import { v4 as uuidv4 } from "uuid";
import WindowsToolbar from "@/components/layout/ToolBox";

// Types
interface FormData {
  employeeId: string;
  userId: string;
  password: string;
  name: string;
  companyRoles: string[];
  companyId: string;
  locationIds: string[];
  moduleAccess: {
    modulePath: string;
    moduleName: string;
    permissions: string[];
  }[];
}

interface CompanyRole {
  roleId: string;
  name: string;
  description?: string;
}

interface Location {
  locationId: string;
  name: string;
}

interface Company {
  companyId: string;
  name: string;
  locations: Location[];
}

interface UserData {
  userId: string;
  companies: Company[];
  role?: string;
  email?: string;
}

interface UserApiResponse {
  user: UserData;
  error?: string;
}

interface EmployeeRecord {
  employeeId: string;
  userId: string;
  name: string;
  companyRoles: string[];
  companyId: string;
  locations: Location[];
  moduleAccess: {
    modulePath: string;
    moduleName: string;
    permissions: string[];
  }[];
}

interface AuditLog {
  action: string;
  timestamp: string;
  userId: string;
  details: string;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [userIdSuggestions, setUserIdSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isEditable, setIsEditable] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    employeeId: "",
    userId: "",
    password: "",
    name: "",
    companyRoles: [],
    companyId: "",
    locationIds: [],
    moduleAccess: [],
  });
  const [availableRoles, setAvailableRoles] = useState<CompanyRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const userIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, employeesRes] = await Promise.all([
          fetch("/api/admin/company-roles"),
          fetch("/api/admin/create-employee"),
        ]);

        const rolesData = await rolesRes.json();
        const employeesData = await employeesRes.json();

        if (rolesRes.ok) {
          setAvailableRoles(rolesData.data || []);
        } else {
          setError(rolesData.error || "Failed to fetch roles");
        }

        if (employeesRes.ok) {
          setEmployees(employeesData.data || []);
        } else {
          setError(employeesData.error || "Failed to fetch employees");
        }

        // Don't pre-populate companies - they will be fetched when user selects a userId
        setCompanies([]);
      } catch {
        setError("An error occurred while fetching data");
      }
    };

    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  const handleAddNew = () => {
    setIsEditable(true);
    setFormData({
      employeeId: "",
      userId: "",
      password: "",
      name: "",
      companyRoles: [],
      companyId: session?.user?.companies?.[0]?.companyId || "",
      locationIds: [],
      moduleAccess: [],
    });
    setError("");
    setMessage("");
    setCurrentEmployeeIndex(-1);
    setCompanies(session?.user?.companies || []);

    // Focus on userId field
    setTimeout(() => {
      if (userIdInputRef.current) {
        userIdInputRef.current.focus();
      }
    }, 100);
  };

  const fetchUserIdSuggestions = async (query: string) => {
    if (query.length < 1) {
      setUserIdSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/employees?userIdQuery=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (res.ok && data.data) {
        // Extract userIds from the response
        const suggestions = data.data.map((emp: any) => emp.userId);
        setUserIdSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error("Error fetching userId suggestions:", error);
    }
  };

  const fetchUserData = async (userId: string) => {
  if (!userId) return;

  try {
    // Reset form and state
    let newFormData: FormData = {
      employeeId: "",
      userId: userId,
      password: "",
      name: "",
      companyRoles: [],
      companyId: "",
      locationIds: [],
      moduleAccess: [],
    };

    // Step 1: Fetch user data to get companies and locations
    const userRes = await fetch(`/api/user/${encodeURIComponent(userId)}`);
    const userData = await userRes.json();

    if (userRes.ok && userData.user) {
      const user = userData.user;

      // Set companies from the fetched user data
      setCompanies(user.companies || []);

      // Set companyId and locationIds from the first company
      const defaultCompany = user.companies[0];
      newFormData = {
        ...newFormData,
        name: user.user || userId, // fallback to userId if name not found
        companyId: defaultCompany?.companyId || "",
        locationIds: defaultCompany?.locations?.map((loc: Location) => loc.locationId) || [],
      };
    } else {
      setError(userData.error || "Failed to fetch user data");
      setCompanies(session?.user?.companies || []);
      newFormData.companyId = session?.user?.companies?.[0]?.companyId || "";
      newFormData.locationIds =
        session?.user?.companies?.[0]?.locations?.map((loc: Location) => loc.locationId) || [];
    }

    // Step 2: Fetch employee data to populate the rest of the form
    const employeeRes = await fetch(`/api/admin/employees?userId=${encodeURIComponent(userId)}`);
    const employeeData = await employeeRes.json();

    if (employeeRes.ok && employeeData.data) {
      const employee = employeeData.data;
      newFormData = {
        ...newFormData,
        employeeId: employee.employeeId || "",
        password: "", // Never populate password
        name: employee.name || newFormData.name,
        companyRoles: employee.companyRoles?.map((role: any) =>
          typeof role === "object" ? role.roleId : role
        ) || [],
        companyId: employee.companyId || newFormData.companyId,
        locationIds: employee.locations?.map((loc: any) => loc.locationId) || newFormData.locationIds,
        moduleAccess: employee.moduleAccess || [],
      };

      const existingIndex = employees.findIndex((emp) => emp.userId === userId);
      if (existingIndex !== -1) {
        setCurrentEmployeeIndex(existingIndex);
      } else {
        setCurrentEmployeeIndex(-1);
      }
    }

    // Update form data and make editable
    setFormData(newFormData);
    setIsEditable(true);
  } catch (error) {
    console.error("Error fetching user data:", error);
    setError("Failed to fetch user data, using session data for companies and locations");
    setCompanies(session?.user?.companies || []);
    setFormData((prev) => ({
      ...prev,
      userId: userId,
      companyId: session?.user?.companies?.[0]?.companyId || "",
      locationIds: session?.user?.companies?.[0]?.locations?.map((loc: Location) => loc.locationId) || [],
    }));
    setIsEditable(true);
  }
};

  const handleUserIdKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === "Enter") {
        e.preventDefault();
        fetchUserData(formData.userId);
        setIsEditable(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < userIdSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : userIdSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedUserId = userIdSuggestions[selectedSuggestionIndex];
          setFormData((prev) => ({ ...prev, userId: selectedUserId }));
          setShowSuggestions(false);
          fetchUserData(selectedUserId);
          setIsEditable(true);
        } else {
          fetchUserData(formData.userId);
          setShowSuggestions(false);
          setIsEditable(true);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSave = async () => {
    if (!isEditable) return;
    const form = document.querySelector("form");
    if (form) {
      setIsCreating(true);
      try {
        const method = currentEmployeeIndex >= 0 ? "PUT" : "POST";
        const newEmployeeId =
          currentEmployeeIndex >= 0 ? formData.employeeId : uuidv4();
        const payload = {
          ...formData,
          employeeId: newEmployeeId,
          companyRoles: formData.companyRoles, // Ensure this is an array of roleId strings
        };

        const res = await fetch("/api/admin/create-employee", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          setMessage(
            currentEmployeeIndex >= 0
              ? "Employee updated successfully!"
              : "Employee created successfully!"
          );
          setEmployees((prev) => {
            const newEmployees = [...prev];
            const employeeData = {
              ...formData,
              employeeId: newEmployeeId,
              locations: availableLocations.filter((loc) =>
                formData.locationIds.includes(loc.locationId)
              ),
            };
            if (currentEmployeeIndex >= 0) {
              newEmployees[currentEmployeeIndex] = employeeData;
            } else {
              newEmployees.push(employeeData);
            }
            return newEmployees;
          });
          handleAddNew();
        } else {
          setError(data.error || "Failed to save employee");
        }
      } catch {
        setError("An error occurred while saving employee");
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleClear = () => {
    setFormData({
      employeeId: "",
      userId: "",
      password: "",
      name: "",
      companyRoles: [],
      companyId: session?.user?.companies?.[0]?.companyId || "",
      locationIds: [],
      moduleAccess: [],
    });
    setError("");
    setMessage("");
    setIsEditable(false);
    setCurrentEmployeeIndex(-1);
    setCompanies(session?.user?.companies || []);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentEmployeeIndex > 0) {
      setCurrentEmployeeIndex(currentEmployeeIndex - 1);
      const employee = employees[currentEmployeeIndex - 1];
      setFormData({
        ...employee,
        password: "",
        locationIds: employee.locations.map((loc) => loc.locationId),
      });
      setIsEditable(true);
    }
  };

  const handleDown = () => {
    if (currentEmployeeIndex < employees.length - 1) {
      setCurrentEmployeeIndex(currentEmployeeIndex + 1);
      const employee = employees[currentEmployeeIndex + 1];
      setFormData({
        ...employee,
        password: "",
        locationIds: employee.locations.map((loc) => loc.locationId),
      });
      setIsEditable(true);
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
  };

  const handleImplementQuery = async () => {
    if (!searchQuery) return;
    try {
      const res = await fetch(
        `/api/admin/employees?query=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (res.ok && data.data?.length > 0) {
        setEmployees(data.data);
        setCurrentEmployeeIndex(0);
        const employee = data.data[0];
        setFormData({
          ...employee,
          password: "",
          locationIds: employee.locations.map(
            (loc: Location) => loc.locationId
          ),
        });
        setIsEditable(true);
        setShowSearchModal(false);
      } else {
        setError(data.error || "No employees found");
      }
    } catch {
      setError("An error occurred while searching");
    }
  };

  const handleEdit = () => {
    if (currentEmployeeIndex >= 0) {
      setIsEditable(true);
      if (userIdInputRef.current) {
        userIdInputRef.current.focus();
      }
    }
  };

  const handleDelete = async () => {
    if (currentEmployeeIndex >= 0) {
      const employee = employees[currentEmployeeIndex];
      try {
        const res = await fetch(`/api/admin/employees/${employee.employeeId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setEmployees((prev) =>
            prev.filter((_, i) => i !== currentEmployeeIndex)
          );
          handleClear();
          setMessage("Employee deleted successfully!");
        } else {
          const data = await res.json();
          setError(data.error || "Failed to delete employee");
        }
      } catch {
        setError("An error occurred while deleting employee");
      }
    }
  };

  const handleAudit = async () => {
    if (currentEmployeeIndex >= 0) {
      try {
        const res = await fetch(
          `/api/admin/audit/${employees[currentEmployeeIndex].employeeId}`
        );
        const data = await res.json();
        if (res.ok) {
          setAuditLogs(data.data || []);
          setShowAuditModal(true);
        } else {
          setError(data.error || "Failed to fetch audit logs");
        }
      } catch {
        setError("An error occurred while fetching audit logs");
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Employee Details</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              .details { margin: 20px 0; }
              .details div { margin: 5px 0; }
            </style>
          </head>
          <body>
            <h1>Employee Details</h1>
            <div class="details">
              <div><strong>User ID:</strong> ${formData.userId}</div>
              <div><strong>Name:</strong> ${formData.name}</div>
              <div><strong>Company:</strong> ${
                companies.find((c) => c.companyId === formData.companyId)
                  ?.name || ""
              }</div>
              <div><strong>Roles:</strong> ${formData.companyRoles
                .map((r) => availableRoles.find((ar) => ar.roleId === r)?.name)
                .join(", ")}</div>
              <div><strong>Locations:</strong> ${formData.locationIds
                .map(
                  (l) =>
                    availableLocations.find((al) => al.locationId === l)?.name
                )
                .join(", ")}</div>
              <div><strong>Modules:</strong> ${formData.moduleAccess
                .map((m) => m.moduleName)
                .join(", ")}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  const checkUserId = async (userId: string) => {
    await fetchUserData(userId);
  };

  const availableModules = adminEmployeeNavData
    .flatMap(
      (item) =>
        item?.children?.flatMap((child) =>
          child?.children
            ? child.children.map((sub) => ({
                path: sub.path ?? "",
                label: sub.label,
              }))
            : child?.path
            ? [{ path: child.path, label: child.label }]
            : []
        ) ?? []
    )
    .filter(
      (item): item is { path: string; label: string } =>
        typeof item.path === "string" &&
        item.path.trim() !== "" &&
        typeof item.label === "string"
    );

  const availableLocations = companies.flatMap((c) => c.locations);

  const toggleRole = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      companyRoles: prev.companyRoles.includes(roleId)
        ? prev.companyRoles.filter((id) => id !== roleId)
        : [...prev.companyRoles, roleId],
    }));
  };

  const toggleLocation = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter((id) => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
  };

  const toggleModule = (modulePath: string, moduleName: string) => {
    setFormData((prev) => ({
      ...prev,
      moduleAccess: prev.moduleAccess.some((m) => m.modulePath === modulePath)
        ? prev.moduleAccess.filter((m) => m.modulePath !== modulePath)
        : [
            ...prev.moduleAccess,
            { modulePath, moduleName, permissions: ["read"] },
          ],
    }));
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(135deg, #f0f0f0 0%, #d8d8d8 100%)",
          fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <div
          className="bg-white shadow-sm border-b"
          style={{
            background:
              "linear-gradient(to bottom, #e9f3ff 0%, #d0e7ff 50%, #b0d1ff 100%)",
            border: "1px outset #c0c0c0",
          }}
        ></div>

        <WindowsToolbar
          onAddNew={handleAddNew}
          onSave={handleSave}
          onClear={handleClear}
          onExit={handleExit}
          onUp={handleUp}
          onDown={handleDown}
          onSearch={handleSearch}
          onImplementQuery={handleImplementQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAudit={handleAudit}
          onPrint={handlePrint}
          onHelp={handleHelp}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            className="rounded-lg shadow p-6"
            style={{
              background:
                "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              border: "1px outset #c0c0c0",
            }}
          >
            <h2 className="text-lg font-semibold mb-6">Employee Management</h2>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  User ID *
                </label>
                <input
                  type="text"
                  ref={userIdInputRef}
                  required
                  disabled={!isEditable}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.userId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, userId: value });
                    fetchUserIdSuggestions(value);
                  }}
                  onKeyDown={handleUserIdKeyDown}
                  onBlur={() => {
                    // Delay hiding suggestions to allow click selection
                    setTimeout(() => {
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }, 200);
                  }}
                  autoComplete="off"
                />

                {/* Suggestions dropdown */}
                {showSuggestions && userIdSuggestions.length > 0 && (
                  <div
                    className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
                    style={{
                      border: "1px solid #c0c0c0",
                      top: "100%",
                      marginTop: "2px",
                    }}
                  >
                    {userIdSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                          index === selectedSuggestionIndex ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            userId: suggestion,
                          }));
                          setShowSuggestions(false);
                          fetchUserData(suggestion);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditable}
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  disabled={!isEditable}
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company *
                </label>
                <select
                  required
                  disabled={!isEditable}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.companyId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      companyId: e.target.value,
                      locationIds: [],
                    }))
                  }
                >
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Roles
                </label>
                <div className="mt-2 space-y-2">
                  {availableRoles.map((role) => (
                    <div key={role.roleId} className="flex items-center">
                      <input
                        type="checkbox"
                        id={role.roleId}
                        disabled={!isEditable}
                        checked={formData.companyRoles.includes(role.roleId)}
                        onChange={() => toggleRole(role.roleId)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:bg-gray-100"
                        style={{ border: "1px inset #c0c0c0" }}
                      />
                      <label
                        htmlFor={role.roleId}
                        className="ml-2 text-sm text-gray-900"
                      >
                        {role.name}{" "}
                        {role.description && (
                          <span className="text-gray-500">
                            ({role.description})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Locations
                </label>
                <div className="mt-2 space-y-2">
                  {availableLocations.map((loc) => (
                    <div key={loc.locationId} className="flex items-center">
                      <input
                        type="checkbox"
                        id={loc.locationId}
                        disabled={!isEditable}
                        checked={formData.locationIds.includes(loc.locationId)}
                        onChange={() => toggleLocation(loc.locationId)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:bg-gray-100"
                        style={{ border: "1px inset #c0c0c0" }}
                      />
                      <label
                        htmlFor={loc.locationId}
                        className="ml-2 text-sm text-gray-900"
                      >
                        {loc.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Module Access
                </label>
                <div className="mt-2 space-y-2">
                  {availableModules.map((mod, id) => (
                    <div key={id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={mod.path}
                        disabled={!isEditable}
                        checked={formData.moduleAccess.some(
                          (m) => m.modulePath === mod.path
                        )}
                        onChange={() => toggleModule(mod.path, mod.label)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:bg-gray-100"
                        style={{ border: "1px inset #c0c0c0" }}
                      />
                      <label
                        htmlFor={mod.path}
                        className="ml-2 text-sm text-gray-900"
                      >
                        {mod.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}
              {message && (
                <div className="text-green-600 text-sm">{message}</div>
              )}
            </form>
          </div>
        </div>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md"
              style={{
                border: "1px outset #c0c0c0",
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              }}
            >
              <h2 className="text-lg font-semibold mb-4">Search Employees</h2>
              <input
                type="text"
                placeholder="Enter user ID or email (use % for wildcard)"
                className="w-full px-3 py-2 border rounded-md mb-4"
                style={{
                  border: "1px inset #c0c0c0",
                  background: "#ffffff",
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleImplementQuery}
                  className="px-4 py-2 rounded-md"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "1px outset #c0c0c0",
                  }}
                >
                  Search
                </button>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="px-4 py-2 rounded-md"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "1px outset #c0c0c0",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-2xl"
              style={{
                border: "1px outset #c0c0c0",
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              }}
            >
              <h2 className="text-lg font-semibold mb-4">Audit Log</h2>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Action</th>
                      <th className="text-left p-2">Timestamp</th>
                      <th className="text-left p-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{log.action}</td>
                        <td className="p-2">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-2">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 rounded-md"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "1px outset #c0c0c0",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md"
              style={{
                border: "1px outset #c0c0c0",
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              }}
            >
              <h2 className="text-lg font-semibold mb-4">Toolbox Help</h2>
              <div className="space-y-2">
                <p>
                  <strong>Add New (F1):</strong> Starts a new employee record
                  and focuses on the user ID field
                </p>
                <p>
                  <strong>Save (F2):</strong> Saves the current form data
                  (creates or updates)
                </p>
                <p>
                  <strong>Clear (F3):</strong> Resets all form fields to empty
                </p>
                <p>
                  <strong>Exit (F4):</strong> Returns to the dashboard
                </p>
                <p>
                  <strong>Up (F5):</strong> Navigates to the previous employee
                  record
                </p>
                <p>
                  <strong>Down (F6):</strong> Navigates to the next employee
                  record
                </p>
                <p>
                  <strong>Search (F7):</strong> Opens the search interface
                </p>
                <p>
                  <strong>Implement Query (F8):</strong> Executes a wildcard
                  search
                </p>
                <p>
                  <strong>Edit (F9):</strong> Enables editing for the current
                  record
                </p>
                <p>
                  <strong>Delete (F10):</strong> Deletes the current employee
                  record
                </p>
                <p>
                  <strong>Audit (F11):</strong> Shows the audit log for the
                  current employee
                </p>
                <p>
                  <strong>Print (F12):</strong> Prints the current form data
                </p>
                <p>
                  <strong>Help (Ctrl+H):</strong> Shows this help information
                </p>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 rounded-md"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "1px outset #c0c0c0",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}