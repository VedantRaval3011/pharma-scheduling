"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";

interface Chemical {
  _id: string;
  chemicalName: string;
  isSolvent: boolean;
  isBuffer: boolean;
  desc: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function ChemicalMaster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ chemicalName: "", isSolvent: false, isBuffer: false, desc: "" });
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentChemicalIndex, setCurrentChemicalIndex] = useState(-1);
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
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
  const [filterSolvent, setFilterSolvent] = useState(false);
  const [filterBuffer, setFilterBuffer] = useState(false);

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

  const fetchChemicals = async () => {
    if (!companyId || !locationId) {
      setError("Please ensure company and location are set in localStorage");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
     const chemicalUrl = `/api/admin/chemical?companyId=${companyId}&locationId=${locationId}`;

      const response = await fetch(chemicalUrl, {
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
        const validChemicals = data.data
          .filter((chemical: Chemical) => {
            const isValid =
              chemical &&
              typeof chemical.chemicalName === "string" &&
              chemical.companyId === companyId &&
              chemical.locationId === locationId;
            return isValid;
          })
          .sort((a: Chemical, b: Chemical) =>
            a.chemicalName.toLowerCase().localeCompare(b.chemicalName.toLowerCase())
          );

        setChemicals(validChemicals);

        if (validChemicals.length < data.data.length) {
          const filteredCount = data.data.length - validChemicals.length;
          setError(
            `Warning: ${filteredCount} invalid chemicals were filtered out. Please check your database.`
          );
        } else if (validChemicals.length === 0) {
          setError("No chemicals found for the selected company and location.");
        }
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err: any) {
      if (err.message.includes("401")) {
        setError("Unauthorized access. Please log in again.");
      } else {
        setError(`Failed to fetch chemicals: ${err.message}`);
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

      const response = await fetch("/api/admin/chemical/audit", {
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

      if (selectedChemical) {
        queryParams.append("chemicalName", selectedChemical.chemicalName);
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

      const response = await fetch(`/api/admin/chemical/audit?${queryParams.toString()}`);
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
      fetchChemicals();
    }
  }, [companyId, locationId]);

  // Filter chemicals for general chemical input dropdown (when neither checkbox is selected)
  const filteredChemicals = chemicals.filter((chemical) =>
    chemical.chemicalName.toLowerCase().startsWith(formData.chemicalName.toLowerCase())
  );

  const displayedChemicals = chemicals.filter((chemical) => {
    if (!filterSolvent && !filterBuffer) return true;
    if (filterSolvent && filterBuffer) return chemical.isSolvent || chemical.isBuffer;
    if (filterSolvent) return chemical.isSolvent;
    if (filterBuffer) return chemical.isBuffer;
    return false;
  });

  const handleAddNew = () => {
    setIsFormEnabled(true);
    setIsEditMode(false);
    setFormData({ chemicalName: "", isSolvent: false, isBuffer: false, desc: "" });
    setSelectedChemical(null);
    setCurrentChemicalIndex(-1);
    setShowDropdown(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSave = async () => {
    if (!isFormEnabled) {
      setError("Form is not enabled");
      return;
    }

    try {
      if (!companyId || !locationId) {
        setError("Company ID or Location ID not found in localStorage");
        return;
      }

      const url = "/api/admin/chemical";
      const method = isEditMode && selectedChemical ? "PUT" : "POST";
      const body = {
        id: isEditMode && selectedChemical ? selectedChemical._id : undefined,
        chemicalName: formData.chemicalName,
        isSolvent: formData.isSolvent,
        isBuffer: formData.isBuffer,
        desc: formData.desc,
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
          isEditMode && selectedChemical ? "UPDATE" : "CREATE",
          {
            chemicalName: formData.chemicalName,
            isSolvent: formData.isSolvent,
            isBuffer: formData.isBuffer,
            desc: formData.desc,
            companyId,
            locationId,
          },
          isEditMode && selectedChemical
            ? {
                chemicalName: selectedChemical.chemicalName,
                isSolvent: selectedChemical.isSolvent,
                isBuffer: selectedChemical.isBuffer,
                desc: selectedChemical.desc,
                companyId: selectedChemical.companyId,
                locationId: selectedChemical.locationId,
              }
            : null
        );

        setFormData({ chemicalName: "", isSolvent: false, isBuffer: false, desc: "" });
        setIsFormEnabled(false);
        setIsEditMode(false);
        setSelectedChemical(null);
        setCurrentChemicalIndex(-1);
        setShowDropdown(false);
        await fetchChemicals();
      } else {
        setError(data.error || "Failed to save chemical");
      }
    } catch (err: any) {
      setError(`Failed to save chemical: ${err.message}`);
    }
  };

  const handleClear = () => {
    setFormData({ chemicalName: "", isSolvent: false, isBuffer: false, desc: "" });
    setIsFormEnabled(false);
    setIsEditMode(false);
    setSelectedChemical(null);
    setCurrentChemicalIndex(-1);
    setShowDropdown(false);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentChemicalIndex > 0) {
      const newIndex = currentChemicalIndex - 1;
      setCurrentChemicalIndex(newIndex);
      const chemical = displayedChemicals[newIndex];
      setSelectedChemical(chemical);
      setFormData({
        chemicalName: chemical.chemicalName,
        isSolvent: chemical.isSolvent,
        isBuffer: chemical.isBuffer,
        desc: chemical.desc || "",
      });
    }
  };

  const handleDown = () => {
    if (currentChemicalIndex < displayedChemicals.length - 1) {
      const newIndex = currentChemicalIndex + 1;
      setCurrentChemicalIndex(newIndex);
      const chemical = displayedChemicals[newIndex];
      setSelectedChemical(chemical);
      setFormData({
        chemicalName: chemical.chemicalName,
        isSolvent: chemical.isSolvent,
        isBuffer: chemical.isBuffer,
        desc: chemical.desc || "",
      });
    } else if (currentChemicalIndex === -1 && displayedChemicals.length > 0) {
      setCurrentChemicalIndex(0);
      const chemical = displayedChemicals[0];
      setSelectedChemical(chemical);
      setFormData({
        chemicalName: chemical.chemicalName,
        isSolvent: chemical.isSolvent,
        isBuffer: chemical.isBuffer,
        desc: chemical.desc || "",
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
    if (selectedChemical) {
      setIsFormEnabled(true);
      setIsEditMode(true);
      setFormData({
        chemicalName: selectedChemical.chemicalName,
        isSolvent: selectedChemical.isSolvent,
        isBuffer: selectedChemical.isBuffer,
        desc: selectedChemical.desc || "",
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDelete = async () => {
    if (!selectedChemical) return;

    if (!confirm(`Are you sure you want to delete "${selectedChemical.chemicalName}"?`)) return;

    try {
      const response = await fetch(`/api/admin/chemical?id=${selectedChemical._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await logAuditAction("DELETE", {
          chemicalName: selectedChemical.chemicalName,
          isSolvent: selectedChemical.isSolvent,
          isBuffer: selectedChemical.isBuffer,
          desc: selectedChemical.desc,
          companyId: selectedChemical.companyId,
          locationId: selectedChemical.locationId,
        });

        await fetchChemicals();
        setFormData({ chemicalName: "", isSolvent: false, isBuffer: false, desc: "" });
        setSelectedChemical(null);
        setCurrentChemicalIndex(-1);
        setIsFormEnabled(false);
        setIsEditMode(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete chemical");
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
          <title>Chemical Database Report</title>
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
          <h1>Chemical Database Report</h1>
          <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <tr><th>Chemical Name</th><th>Solvent</th><th>Buffer</th><th>Description</th><th>Created Date</th></tr>
            ${displayedChemicals
              .map(
                (chemical) =>
                  `<tr><td>${chemical.chemicalName}</td><td>${chemical.isSolvent ? 'Yes' : 'No'}</td><td>${chemical.isBuffer ? 'Yes' : 'No'}</td><td>${chemical.desc || ""}</td><td>${new Date(
                    chemical.createdAt
                  ).toLocaleDateString("en-GB")}</td></tr>`
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

  // Handle keyboard navigation for main input
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropdownSelectedIndex((prev) =>
          prev < filteredChemicals.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (dropdownSelectedIndex >= 0 && filteredChemicals[dropdownSelectedIndex]) {
          const chemical = filteredChemicals[dropdownSelectedIndex];
          setFormData({
            chemicalName: chemical.chemicalName,
            isSolvent: chemical.isSolvent,
            isBuffer: chemical.isBuffer,
            desc: chemical.desc || "",
          });
          setSelectedChemical(chemical);
          setCurrentChemicalIndex(chemicals.findIndex((c) => c._id === chemical._id));
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
    const searchResults = displayedChemicals.filter(
      (chemical) =>
        chemical.chemicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chemical.desc && chemical.desc.toLowerCase().includes(searchTerm.toLowerCase()))
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
          const chemical = searchResults[dropdownSelectedIndex];
          setFormData({
            chemicalName: chemical.chemicalName,
            isSolvent: chemical.isSolvent,
            isBuffer: chemical.isBuffer,
            desc: chemical.desc || "",
          });
          setSelectedChemical(chemical);
          setCurrentChemicalIndex(displayedChemicals.findIndex((c) => c._id === chemical._id));
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
        modulePath="/dashboard/chemical"
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
              <span className="text-[#0055a4] text-xs font-bold">C</span>
            </div>
            <span className="font-semibold text-sm">Chemical Master</span>
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
              Chemical Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.isBuffer ? "Buffer Name" : formData.isSolvent ? "Solvent Name" : "Chemical Name"}
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={formData.chemicalName}
                  disabled={!isFormEnabled}
                  onChange={(e) => {
                    setFormData({ ...formData, chemicalName: e.target.value });
                    if (e.target.value && isFormEnabled && !isEditMode) {
                      setShowDropdown(true);
                      setDropdownSelectedIndex(-1);
                    } else {
                      setShowDropdown(false);
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => {
                    if (formData.chemicalName && isFormEnabled && !isEditMode) {
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
                  placeholder={
                    formData.isBuffer ? "Enter or select buffer name" : 
                    formData.isSolvent ? "Enter or select solvent name" : 
                    "Enter chemical name"
                  }
                />

                {/* Dynamic dropdown based on checkbox state */}
                {showDropdown && filteredChemicals.length > 0 && isFormEnabled && !isEditMode && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border border-[#a6c8ff] rounded-md shadow-lg max-h-48 overflow-y-auto"
                    style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
                  >
                    {filteredChemicals.map((chemical, index) => (
                      <div
                        key={chemical._id}
                        className={`px-3 py-2 cursor-pointer ${
                          index === dropdownSelectedIndex
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          setFormData({
                            chemicalName: chemical.chemicalName,
                            isSolvent: chemical.isSolvent,
                            isBuffer: chemical.isBuffer,
                            desc: chemical.desc || "",
                          });
                          setSelectedChemical(chemical);
                          setCurrentChemicalIndex(chemicals.findIndex((c) => c._id === chemical._id));
                          setShowDropdown(false);
                          setDropdownSelectedIndex(-1);
                        }}
                      >
                        <div className="font-medium text-gray-800">{chemical.chemicalName}</div>
                        <div className="text-xs text-gray-500">
                          {chemical.isSolvent && <span className="bg-blue-100 text-blue-800 px-1 rounded mr-1">Solvent</span>}
                          {chemical.isBuffer && <span className="bg-green-100 text-green-800 px-1 rounded mr-1">Buffer</span>}
                        </div>
                        {chemical.desc && (
                          <div className="text-sm text-gray-500">{chemical.desc}</div>
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
                  value={formData.desc}
                  disabled={!isFormEnabled}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
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

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isSolvent}
                  disabled={!isFormEnabled}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFormData({ 
                      ...formData, 
                      isSolvent: isChecked,
                      chemicalName: (!isChecked && formData.isSolvent && !formData.isBuffer) ? "" : formData.chemicalName
                    });
                    setShowDropdown(false);
                    if (isChecked) {
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }
                  }}
                  className="h-5 w-5 text-[#0055a4] border-[#a6c8ff] rounded focus:ring-[#66a3ff]"
                />
                <label className="block text-sm font-medium text-gray-700 mb-1 mt-1">
                  Is Solvent
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isBuffer}
                  disabled={!isFormEnabled}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFormData({ 
                      ...formData, 
                      isBuffer: isChecked,
                      chemicalName: (!isChecked && formData.isBuffer && !formData.isSolvent) ? "" : formData.chemicalName
                    });
                    setShowDropdown(false);
                    if (isChecked) {
                      setTimeout(() => inputRef.current?.focus(), 100);
                    }
                  }}
                  className="h-5 w-5 text-[#0055a4] border-[#a6c8ff] rounded focus:ring-[#66a3ff]"
                />
                <label className="block text-sm font-medium text-gray-700 mb-1 mt-1">
                  Is Buffer
                </label>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {selectedChemical && (
                <div>
                  <span className="font-medium">Selected:</span>{" "}
                  {selectedChemical.chemicalName}
                  <span className="ml-4 font-medium">Index:</span>{" "}
                  {currentChemicalIndex + 1} of {displayedChemicals.length}
                </div>
              )}
              {isFormEnabled && (
                <div className="text-[#008800] font-medium">
                  {isEditMode
                    ? "Edit Mode - Modify the selected chemical"
                    : "Add Mode - Enter new chemical details"}
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  Chemicals ({displayedChemicals.length})
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filterSolvent}
                      onChange={(e) => setFilterSolvent(e.target.checked)}
                      className="h-5 w-5 text-[#0055a4] border-[#a6c8ff] rounded focus:ring-[#66a3ff]"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Show Solvents
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filterBuffer}
                      onChange={(e) => setFilterBuffer(e.target.checked)}
                      className="h-5 w-5 text-[#0055a4] border-[#a6c8ff] rounded focus:ring-[#66a3ff]"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Show Buffers
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0055a4] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading chemicals...</p>
              </div>
            ) : displayedChemicals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No chemicals found. Add your first chemical or adjust filters!
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
                        Chemical Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Solvent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Buffer
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
                    {displayedChemicals.map((chemical, index) => (
                      <tr
                        key={chemical._id}
                        className={`cursor-pointer ${
                          selectedChemical?._id === chemical._id
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          if (!isFormEnabled) {
                            setSelectedChemical(chemical);
                            setCurrentChemicalIndex(index);
                            setFormData({
                              chemicalName: chemical.chemicalName,
                              isSolvent: chemical.isSolvent,
                              isBuffer: chemical.isBuffer,
                              desc: chemical.desc || "",
                            });
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-800">
                            {chemical.chemicalName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">{chemical.isSolvent ? "Yes" : "No"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">{chemical.isBuffer ? "Yes" : "No"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {chemical.desc || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(chemical.createdAt).toLocaleDateString("en-GB")}
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
              Search Chemicals
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
              {displayedChemicals
                .filter(
                  (chemical) =>
                    chemical.chemicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (chemical.desc &&
                      chemical.desc.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((chemical, index) => (
                  <div
                    key={chemical._id}
                    className={`px-3 py-2 cursor-pointer ${
                      index === dropdownSelectedIndex
                        ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                        : "hover:bg-[#e6f0fa]"
                    }`}
                    onClick={() => {
                      setFormData({
                        chemicalName: chemical.chemicalName,
                        isSolvent: chemical.isSolvent,
                        isBuffer: chemical.isBuffer,
                        desc: chemical.desc || "",
                      });
                      setSelectedChemical(chemical);
                      setCurrentChemicalIndex(
                        displayedChemicals.findIndex((c) => c._id === chemical._id)
                      );
                      setShowSearchModal(false);
                      setDropdownSelectedIndex(-1);
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium text-gray-800">{chemical.chemicalName}</div>
                    <div className="text-xs">
                      {chemical.isSolvent && <span className="bg-blue-100 text-blue-800 px-1 rounded mr-1">Solvent</span>}
                      {chemical.isBuffer && <span className="bg-green-100 text-green-800 px-1 rounded mr-1">Buffer</span>}
                    </div>
                    {chemical.desc && (
                      <div className="text-sm text-gray-500">{chemical.desc}</div>
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
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
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
              Audit Trail {selectedChemical ? `for ${selectedChemical.chemicalName}` : "(All Chemicals)"}
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
                  placeholder="Search chemical name or description..."
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
                    <th className="px-3 py-2 text-left text-gray-700">Chemical Name</th>
                    <th className="px-3 py-2 text-left text-gray-700">Solvent</th>
                    <th className="px-3 py-2 text-left text-gray-700">Buffer</th>
                    <th className="px-3 py-2 text-left text-gray-700">Description</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Chemical Name</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Solvent</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Buffer</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a6c8ff]">
                  {auditLogs.map((log: any, index) => (
                    <tr
                      key={index}
                      className="hover:bg-[#e6f0fa]"
                    >
                      <td className="px-3 py-2">{new Date(log.timestamp).toLocaleString("en-GB")}</td>
                      <td className="px-3 py-2">{log.username}</td>
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
                        <div className="max-w-xs truncate">{log.data.chemicalName || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.isSolvent ? "Yes" : "No"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.isBuffer ? "Yes" : "No"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.desc || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.chemicalName || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.isSolvent ? "Yes" : "No"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.isBuffer ? "Yes" : "No"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.desc || "—"}</div>
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
              Chemical Master - Help
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-[#0055a4]">Keyboard Shortcuts:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F1</kbd> - Add New Chemical
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
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F7</kbd> - Search Chemicals
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F9</kbd> - Edit Selected Chemical
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F10</kbd> - Delete Selected Chemical
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
                  <li>• Use <b>Add (F1)</b> to enable form for new chemical entry</li>
                  <li>• Use <b>Edit (F9)</b> to modify selected chemical</li>
                  <li>• Use <b>Save (F2)</b> to save new or edited chemical</li>
                  <li>• Use <b>Clear (F3)</b> to reset form and disable inputs</li>
                  <li>• Use <b>Up (F5)/Down (F6)</b> to navigate chemicals alphabetically</li>
                  <li>• Use <b>Search (F7)</b> for full-text search with keyboard navigation</li>
                  <li>• Use <b>Delete (F10)</b> to remove selected chemical</li>
                  <li>• Use <b>Audit (F11)</b> to view all changes</li>
                  <li>• Use <b>Print (F12)</b> to generate chemical report</li>
                  <li>• Use <b>Exit (F4)</b> to return to dashboard</li>
                  <li>• Use <b>Filter Checkboxes</b> to show only Solvents, Buffers, or both</li>
                  <li>• <b>Dynamic Field Label</b> - Changes to "Buffer Name" or "Solvent Name" based on checkboxes</li>
                  <li>• <b>Smart Dropdown</b> - Shows filtered chemicals based on selected type</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Field Behavior:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• <b>Chemical Name</b> - Shows all chemicals when neither checkbox is selected</li>
                  <li>• <b>Solvent Name</b> - When "Is Solvent" is checked, shows only solvent chemicals</li>
                  <li>• <b>Buffer Name</b> - When "Is Buffer" is checked, shows only buffer chemicals</li>
                  <li>• <b>Smart Focus</b> - Cursor automatically moves to name field when checking boxes</li>
                  <li>• <b>Contextual Dropdown</b> - Dropdown content changes based on selected chemical type</li>
                  <li>• <b>Auto-selection</b> - Selecting from dropdown automatically sets all properties</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Status Indicators:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • <span className="text-[#008800]">Green text</span> - Form is enabled for input
                  </li>
                  <li>
                    • <span className="text-[#0055a4]">Blue background</span> - Selected chemical in list
                  </li>
                  <li>
                    • <span className="text-gray-500">Gray fields</span> - Read-only mode
                  </li>
                  <li>
                    • <span className="bg-blue-100 text-blue-800 px-1 rounded">Blue tags</span> - Solvent chemicals
                  </li>
                  <li>
                    • <span className="bg-green-100 text-green-800 px-1 rounded">Green tags</span> - Buffer chemicals
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Tips:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• All fields are disabled by default until Add/Edit</li>
                  <li>• Use arrow keys in dropdowns for quick navigation</li>
                  <li>• Type to filter dropdown options in real-time</li>
                  <li>• Escape key closes any open dropdown</li>
                  <li>• Field label changes dynamically based on chemical type</li>
                  <li>• Dropdown shows only relevant chemicals for selected type</li>
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

export default function ProtectedChemicalMaster() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <ChemicalMaster />
    </ProtectedRoute>
  );
}