"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";

interface Department {
  _id: string;
  department: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function DepartmentMaster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ department: "", description: "" });
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDepartmentIndex, setCurrentDepartmentIndex] = useState(-1);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(-1);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const auditSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      const storedCompanyId = localStorage.getItem("companyId");
      const storedLocationId = localStorage.getItem("locationId");
      if (storedCompanyId && storedLocationId) {
        setCompanyId(storedCompanyId);
        setLocationId(storedLocationId);
      } else {
        setError("Company ID or Location ID not found in localStorage");
        setLoading(false);
      }
    }
  }, [status, router]);

  const fetchDepartments = async () => {
    if (!companyId || !locationId) {
      setError("Please ensure company and location are set in localStorage");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = `/api/admin/department?companyId=${companyId}&locationId=${locationId}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-cache",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const validDepartments = data.data
          .filter((department: Department) => {
            const isValid =
              department &&
              typeof department.department === "string" &&
              department.department.trim().length > 0 &&
              department.companyId === companyId &&
              department.locationId === locationId;
            return isValid;
          })
          .sort((a: Department, b: Department) =>
            a.department.toLowerCase().localeCompare(b.department.toLowerCase())
          );

        setDepartments(validDepartments);

        if (validDepartments.length < data.data.length) {
          const filteredCount = data.data.length - validDepartments.length;
          setError(
            `Warning: ${filteredCount} invalid departments were filtered out. Please check your database.`
          );
        } else if (validDepartments.length === 0) {
          setError("No departments found for the selected company and location.");
        }
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err: any) {
      if (err.message.includes("401")) {
        setError("Unauthorized access. Please log in again.");
      } else {
        setError(`Failed to fetch departments: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (action: string, data: any, previousData?: any) => {
    try {
      if (!companyId || !locationId) {
        return;
      }

      const response = await fetch("/api/admin/department/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id || "system",
          action,
          data,
          previousData,
          companyId,
          locationId,
          timestamp: new Date().toISOString(),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to log audit action:", await response.json());
      }
    } catch (err) {
      console.error("Failed to log audit action:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      if (!companyId || !locationId) {
        return;
      }

      const queryParams = new URLSearchParams({
        companyId,
        locationId,
      });

      if (selectedDepartment) {
        queryParams.append("department", selectedDepartment.department);
      }
      if (auditSearchTerm) {
        queryParams.append("searchTerm", auditSearchTerm);
      }
      if (auditActionFilter) {
        queryParams.append("action", auditActionFilter);
      }
      if (auditStartDate) {
        queryParams.append("startDate", auditStartDate);
      }
      if (auditEndDate) {
        queryParams.append("endDate", auditEndDate);
      }

      const response = await fetch(`/api/admin/department/audit?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data);
      } else {
        setError(data.error || "Failed to fetch audit logs");
      }
    } catch (err) {
      setError("Failed to fetch audit logs");
    }
  };

  useEffect(() => {
    if (companyId && locationId) {
      fetchDepartments();
    }
  }, [companyId, locationId]);

  const filteredDepartments = departments.filter((department) =>
    department.department.toLowerCase().startsWith(formData.department.toLowerCase())
  );

  const handleAddNew = () => {
    setIsFormEnabled(true);
    setIsEditMode(false);
    setFormData({ department: "", description: "" });
    setSelectedDepartment(null);
    setCurrentDepartmentIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!isFormEnabled || !formData.department.trim()) {
      setError("Department name is required");
      return;
    }

    try {
      if (!companyId || !locationId) {
        setError("Company ID or Location ID not found in localStorage");
        return;
      }

      const url = "/api/admin/department";
      const method = isEditMode && selectedDepartment ? "PUT" : "POST";
      const body = {
        id: isEditMode && selectedDepartment ? selectedDepartment._id : undefined,
        department: formData.department,
        description: formData.description,
        companyId,
        locationId,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await logAuditAction(
          isEditMode && selectedDepartment ? "UPDATE" : "CREATE",
          {
            department: formData.department,
            description: formData.description,
            companyId,
            locationId,
          },
          isEditMode && selectedDepartment
            ? {
                department: selectedDepartment.department,
                description: selectedDepartment.description,
                companyId: selectedDepartment.companyId,
                locationId: selectedDepartment.locationId,
              }
            : null
        );

        setFormData({ department: "", description: "" });
        setIsFormEnabled(false);
        setIsEditMode(false);
        setSelectedDepartment(null);
        setCurrentDepartmentIndex(-1);
        await fetchDepartments();
      } else {
        setError(data.error || "Failed to save department");
      }
    } catch (err: any) {
      setError(`Failed to save department: ${err.message}`);
    }
  };

  const handleClear = () => {
    setFormData({ department: "", description: "" });
    setIsFormEnabled(false);
    setIsEditMode(false);
    setSelectedDepartment(null);
    setCurrentDepartmentIndex(-1);
    setShowDropdown(false);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentDepartmentIndex > 0) {
      const newIndex = currentDepartmentIndex - 1;
      setCurrentDepartmentIndex(newIndex);
      const department = departments[newIndex];
      setSelectedDepartment(department);
      setFormData({
        department: department.department,
        description: department.description || "",
      });
    }
  };

  const handleDown = () => {
    if (currentDepartmentIndex < departments.length - 1) {
      const newIndex = currentDepartmentIndex + 1;
      setCurrentDepartmentIndex(newIndex);
      const department = departments[newIndex];
      setSelectedDepartment(department);
      setFormData({
        department: department.department,
        description: department.description || "",
      });
    } else if (currentDepartmentIndex === -1 && departments.length > 0) {
      setCurrentDepartmentIndex(0);
      const department = departments[0];
      setSelectedDepartment(department);
      setFormData({
        department: department.department,
        description: department.description || "",
      });
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
    setSearchTerm("");
    setDropdownSelectedIndex(-1);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleEdit = () => {
    if (selectedDepartment) {
      setIsFormEnabled(true);
      setIsEditMode(true);
      setFormData({
        department: selectedDepartment.department,
        description: selectedDepartment.description || "",
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDelete = async () => {
    if (!selectedDepartment) return;

    if (!confirm(`Are you sure you want to delete "${selectedDepartment.department}"?`)) return;

    try {
      const response = await fetch(`/api/admin/department?id=${selectedDepartment._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await logAuditAction("DELETE", {
          department: selectedDepartment.department,
          description: selectedDepartment.description,
          companyId: selectedDepartment.companyId,
          locationId: selectedDepartment.locationId,
        });

        await fetchDepartments();
        setFormData({ department: "", description: "" });
        setSelectedDepartment(null);
        setCurrentDepartmentIndex(-1);
        setIsFormEnabled(false);
        setIsEditMode(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete department");
    }
  };

  const handleAudit = async () => {
    await fetchAuditLogs();
    setShowAuditModal(true);
    setTimeout(() => auditSearchInputRef.current?.focus(), 100);
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Department Database Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5faff; }
            h1 { text-align: center; color: #0055a4; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #a6c8ff; }
            th, td { border: 1px solid #a6c8ff; padding: 8px; text-align: left; }
            th { background: linear-gradient(to bottom, #f0f0f0, #ffffff); color: #333; }
            .date { margin-bottom: 20px; color: #333; }
          </style>
        </head>
        <body>
          <h1>Department Database Report</h1>
          <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <tr><th>Department Name</th><th>Description</th><th>Created Date</th></tr>
            ${departments
              .map(
                (department) =>
                  `<tr><td>${department.department}</td><td>${department.description || ""}</td><td>${new Date(
                    department.createdAt
                  ).toLocaleDateString()}</td></tr>`
              )
              .join("")}
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropdownSelectedIndex((prev) =>
          prev < filteredDepartments.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (dropdownSelectedIndex >= 0 && filteredDepartments[dropdownSelectedIndex]) {
          const department = filteredDepartments[dropdownSelectedIndex];
          setFormData({
            department: department.department,
            description: department.description || "",
          });
          setSelectedDepartment(department);
          setCurrentDepartmentIndex(departments.findIndex((c) => c._id === department._id));
          setShowDropdown(false);
          setDropdownSelectedIndex(-1);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setDropdownSelectedIndex(-1);
        break;
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const searchResults = departments.filter(
      (department) =>
        department.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (department.description && department.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropdownSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (dropdownSelectedIndex >= 0 && searchResults[dropdownSelectedIndex]) {
          const department = searchResults[dropdownSelectedIndex];
          setFormData({
            department: department.department,
            description: department.description || "",
          });
          setSelectedDepartment(department);
          setCurrentDepartmentIndex(departments.findIndex((c) => c._id === department._id));
          setShowSearchModal(false);
          setDropdownSelectedIndex(-1);
          setSearchTerm("");
        }
        break;
      case "Escape":
        setShowSearchModal(false);
        setDropdownSelectedIndex(-1);
        setSearchTerm("");
        break;
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#c0dcff] flex items-center justify-center">
        <div className="text-lg font-segoe text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#c0dcff] font-segoe"
      style={{
        backgroundImage: "linear-gradient(to bottom, #e6f0fa, #c0dcff)",
      }}
    >
      <WindowsToolbar
        modulePath="/dashboard/department-master"
        onAddNew={handleAddNew}
        onSave={handleSave}
        onClear={handleClear}
        onExit={handleExit}
        onUp={handleUp}
        onDown={handleDown}
        onSearch={handleSearch}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAudit={handleAudit}
        onPrint={handlePrint}
        onHelp={handleHelp}
      />

      <div>
        <div
          className="bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white px-4 py-2 flex items-center shadow-md"
          style={{ border: "1px solid #004080" }}
        >
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 bg-white rounded-sm flex items-center justify-center"
              style={{ border: "1px solid #004080" }}
            >
              <span className="text-[#0055a4] text-xs font-bold">D</span>
            </div>
            <span className="font-semibold text-sm">Department Master</span>
          </div>
        </div>

        <div className="container mx-auto p-6 px-2 max-w-7xl">
          {error && (
            <div
              className="bg-[#ffe6e6] border border-[#cc0000] text-[#cc0000] px-4 py-3 rounded mb-4 shadow-inner"
              style={{ borderStyle: "inset" }}
            >
              {error}
            </div>
          )}
          <div
            className="bg-white rounded-lg shadow-md p-6 mb-6"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Department Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={formData.department}
                  disabled={!isFormEnabled}
                  onChange={(e) => {
                    setFormData({ ...formData, department: e.target.value });
                    if (e.target.value && isFormEnabled && !isEditMode) {
                      setShowDropdown(true);
                      setDropdownSelectedIndex(-1);
                    } else {
                      setShowDropdown(false);
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => {
                    if (formData.department && isFormEnabled && !isEditMode) {
                      setShowDropdown(true);
                    }
                  }}
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                  placeholder="Enter department name"
                />

                {showDropdown && filteredDepartments.length > 0 && isFormEnabled && !isEditMode && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border border-[#a6c8ff] rounded-md shadow-lg max-h-48 overflow-y-auto"
                    style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
                  >
                    {filteredDepartments.map((department, index) => (
                      <div
                        key={department._id}
                        className={`px-3 py-2 cursor-pointer ${
                          index === dropdownSelectedIndex
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          setFormData({
                            department: department.department,
                            description: department.description || "",
                          });
                          setSelectedDepartment(department);
                          setCurrentDepartmentIndex(departments.findIndex((c) => c._id === department._id));
                          setShowDropdown(false);
                          setDropdownSelectedIndex(-1);
                        }}
                      >
                        <div className="font-medium text-gray-800">{department.department}</div>
                        {department.description && (
                          <div className="text-sm text-gray-500">{department.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  disabled={!isFormEnabled}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                  placeholder="Enter description (optional)"
                />
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {selectedDepartment && (
                <div>
                  <span className="font-medium">Selected:</span>{" "}
                  {selectedDepartment.department}
                  <span className="ml-4 font-medium">Index:</span>{" "}
                  {currentDepartmentIndex + 1} of {departments.length}
                </div>
              )}
              {isFormEnabled && (
                <div className="text-[#008800] font-medium">
                  {isEditMode
                    ? "Edit Mode - Modify the selected department"
                    : "Add Mode - Enter new department details"}
                </div>
              )}
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-md"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <div
              className="p-4 border-b border-[#a6c8ff]"
              style={{ backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)" }}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                Departments ({departments.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0055a4] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading departments...</p>
              </div>
            ) : departments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No departments found. Add your first department!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff]"
                    style={{ borderBottom: "1px solid #a6c8ff" }}
                  >
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Department Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a6c8ff]">
                    {departments.map((department, index) => (
                      <tr
                        key={department._id}
                        className={`cursor-pointer ${
                          selectedDepartment?._id === department._id
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          if (!isFormEnabled) {
                            setSelectedDepartment(department);
                            setCurrentDepartmentIndex(index);
                            setFormData({
                              department: department.department,
                              description: department.description || "",
                            });
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-800">
                            {department.department}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {department.description || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(department.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSearchModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-96 max-h-96"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Search Departments
            </h3>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownSelectedIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
              style={{
                borderStyle: "inset",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
              }}
              placeholder="Type to search..."
            />

            <div
              className="max-h-48 overflow-y-auto border border-[#a6c8ff] rounded mt-2"
              style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
            >
              {departments
                .filter(
                  (department) =>
                    department.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (department.description &&
                      department.description.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((department, index) => (
                  <div
                    key={department._id}
                    className={`px-3 py-2 cursor-pointer ${
                      index === dropdownSelectedIndex
                        ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                        : "hover:bg-[#e6f0fa]"
                    }`}
                    onClick={() => {
                      setFormData({
                        department: department.department,
                        description: department.description || "",
                      });
                      setSelectedDepartment(department);
                      setCurrentDepartmentIndex(
                        departments.findIndex((c) => c._id === department._id)
                      );
                      setShowSearchModal(false);
                      setDropdownSelectedIndex(-1);
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium text-gray-800">{department.department}</div>
                    {department.description && (
                      <div className="text-sm text-gray-500">{department.description}</div>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setDropdownSelectedIndex(-1);
                  setSearchTerm("");
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] active:bg-gradient-to-b active:from-[#b3b3b3] active:to-[#999999]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <div
          className="fixed inset-0  bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-4/5 max-w-4xl max-h-[80vh] overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Audit Trail {selectedDepartment ? `for ${selectedDepartment.department}` : "(All Departments)"}
            </h3>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  ref={auditSearchInputRef}
                  type="text"
                  value={auditSearchTerm}
                  onChange={(e) => {
                    setAuditSearchTerm(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                  placeholder="Search department name or description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={auditStartDate}
                  onChange={(e) => {
                    setAuditStartDate(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={auditEndDate}
                  onChange={(e) => {
                    setAuditEndDate(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
            </div>

            <div
              className="max-h-64 overflow-y-auto border border-[#a6c8ff] rounded"
              style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
            >
              <table className="w-full text-sm">
                <thead
                  className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] sticky top-0"
                  style={{ borderBottom: "1px solid #a6c8ff" }}
                >
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700">Timestamp</th>
                    <th className="px-3 py-2 text-left text-gray-700">User</th>
                    <th className="px-3 py-2 text-left text-gray-700">Action</th>
                    <th className="px-3 py-2 text-left text-gray-700">Department Name</th>
                    <th className="px-3 py-2 text-left text-gray-700">Description</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Department Name</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a6c8ff]">
                  {auditLogs.map((log: any, index) => (
                    <tr
                      key={index}
                      className="hover:bg-[#e6f0fa]"
                    >
                      <td className="px-3 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">{log.userId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.action === "CREATE"
                              ? "bg-[#ccffcc] text-[#008800]"
                              : log.action === "UPDATE"
                              ? "bg-[#ffffcc] text-[#666600]"
                              : log.action === "DELETE"
                              ? "bg-[#ffe6e6] text-[#cc0000]"
                              : "bg-[#f0f0f0]"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.department || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.description || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.department || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.description || "—"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setAuditSearchTerm("");
                  setAuditActionFilter("");
                  setAuditStartDate("");
                  setAuditEndDate("");
                  setAuditLogs([]);
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] active:bg-gradient-to-b active:from-[#b3b3b3] active:to-[#999999]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-4/5 max-w-2xl max-h-96 overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Department Master - Help
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-[#0055a4]">Keyboard Shortcuts:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F1</kbd> - Add New Department
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F2</kbd> - Save Current Entry
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F3</kbd> - Clear Form
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F4</kbd> - Exit to Dashboard
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F5</kbd> - Navigate Up
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F6</kbd> - Navigate Down
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F7</kbd> - Search Departments
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F9</kbd> - Edit Selected Department
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F10</kbd> - Delete Selected Department
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F11</kbd> - View Audit Trail
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F12</kbd> - Print Report
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">Ctrl+H</kbd> - Show Help
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">How to Use:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Use <b>Add (F1)</b> to enable form for new department entry</li>
                  <li>• Use <b>Edit (F9)</b> to modify selected department</li>
                  <li>• Use <b>Save (F2)</b> to save new or edited department</li>
                  <li>• Use <b>Clear (F3)</b> to reset form and disable inputs</li>
                  <li>• Use <b>Up (F5)/Down (F6)</b> to navigate departments alphabetically</li>
                  <li>• Use <b>Search (F7)</b> for full-text search with keyboard navigation</li>
                  <li>• Use <b>Delete (F10)</b> to remove selected department</li>
                  <li>• Use <b>Audit (F11)</b> to view all changes</li>
                  <li>• Use <b>Print (F12)</b> to generate department report</li>
                  <li>• Use <b>Exit (F4)</b> to return to dashboard</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Status Indicators:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • <span className="text-[#008800]">Green text</span> - Form is enabled for input
                  </li>
                  <li>
                    • <span className="text-[#0055a4]">Blue background</span> - Selected department in list
                  </li>
                  <li>
                    • <span className="text-gray-500">Gray fields</span> - Read-only mode
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Tips:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• All fields are disabled by default until Add/Edit</li>
                  <li>• Department name is required for saving</li>
                  <li>• Use arrow keys in search modal for quick navigation</li>
                  <li>• All actions are logged in audit trail</li>
                  <li>• Contact support at support@company.com for issues</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] active:bg-gradient-to-b active:from-[#004080] active:to-[#0066b3]"
                style={{
                  border: "1px solid #004080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedDepartmentMaster() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <DepartmentMaster />
    </ProtectedRoute>
  );
}