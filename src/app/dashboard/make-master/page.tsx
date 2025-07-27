"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";

interface Make {
  _id: string;
  make: string;
  description?: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ToolbarProps {
  modulePath: string;
  onAddNew?: () => void;
  onSave?: () => void;
  onClear?: () => void;
  onExit?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onSearch?: () => void;
  onImplementQuery?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAudit?: () => void;
  onPrint?: () => void;
  onHelp?: () => void;
}

function MakeMaster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ make: "", description: "" });
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMakeIndex, setCurrentMakeIndex] = useState(-1);
  const [selectedMake, setSelectedMake] = useState<Make | null>(null);
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const auditSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.companies?.length) {
      console.log('🔍 Session data:', session?.user?.companies);
      setSelectedCompanyId(session.user.companies[0].companyId);
      setSelectedLocationId(
        session.user.companies[0].locations[0]?.locationId || null
      );
    }
  }, [status, session, router]);

  const fetchMakes = async () => {
    if (!selectedCompanyId || !selectedLocationId) {
      setError('Please select a company and location');
      setLoading(false);
      return;
    }

    console.log('🔄 Starting fetchMakes...');
    setLoading(true);
    setError('');

    try {
      const apiUrl = `/api/admin/column/make?companyId=${selectedCompanyId}&locationId=${selectedLocationId}`;
      console.log('📡 Fetching from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
        credentials: 'include',
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success) {
        console.log(`✅ Successfully fetched ${data.data.length} makes`);

        const validMakes = data.data
          .filter((make: Make) => {
            const isValid =
              make &&
              typeof make.make === 'string' &&
              make.make.trim().length > 0 &&
              make.companyId === selectedCompanyId &&
              make.locationId === selectedLocationId;
            if (!isValid) {
              console.warn('⚠️ Filtering out invalid make:', make);
            }
            return isValid;
          })
          .sort((a: Make, b: Make) => {
            const makeA = (a.make || '').toString().trim();
            const makeB = (b.make || '').toString().trim();
            return makeA.localeCompare(makeB);
          });

        console.log(`📋 Valid makes after filtering: ${validMakes.length}`);
        setMakes(validMakes);

        if (validMakes.length < data.data.length) {
          const filteredCount = data.data.length - validMakes.length;
          console.warn(`⚠️ ${filteredCount} invalid makes were filtered out`);
          setError(
            `Warning: ${filteredCount} invalid makes were filtered out. Please check your database.`
          );
        } else if (validMakes.length === 0) {
          setError('No makes found for the selected company and location.');
        }
      } else {
        console.error('❌ API returned success: false');
        console.error('📝 Error details:', data.error);
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      console.error('💥 Fetch error:', err);
      console.error('📋 Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      if (err.message.includes('401')) {
        setError('Unauthorized access. Please log in again.');
      } else {
        setError(`Failed to fetch makes: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (action: string, data: any, previousData?: any) => {
    try {
      if (!selectedCompanyId || !selectedLocationId) {
        console.error('No companyId or locationId selected');
        return;
      }

      const response = await fetch('/api/admin/column/make/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id || 'system',
          action,
          data,
          previousData,
          companyId: selectedCompanyId,
          locationId: selectedLocationId,
          timestamp: new Date().toISOString(),
        }),
        credentials: 'include',
      });

      const responseData = await response.json();
      console.log('📝 Audit log response:', responseData);

      if (!response.ok) {
        console.error('❌ Failed to log audit action:', responseData.error);
      }
    } catch (err) {
      console.error("Failed to log audit action:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      if (!selectedCompanyId || !selectedLocationId) {
        console.error("No companyId or locationId selected");
        return;
      }

      const queryParams = new URLSearchParams({
        companyId: selectedCompanyId,
        locationId: selectedLocationId,
      });

      if (selectedMake) {
        queryParams.append('make', selectedMake.make);
      }
      if (auditSearchTerm) {
        queryParams.append('searchTerm', auditSearchTerm);
      }
      if (auditActionFilter) {
        queryParams.append('action', auditActionFilter);
      }
      if (auditStartDate) {
        queryParams.append('startDate', auditStartDate);
      }
      if (auditEndDate) {
        queryParams.append('endDate', auditEndDate);
      }

      const response = await fetch(
        `/api/admin/column/make/audit?${queryParams.toString()}`
      );
      const data = await response.json();
      console.log('📋 Audit logs fetched:', data);

      if (data.success) {
        setAuditLogs(data.data);
      } else {
        setError(data.error || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setError('Failed to fetch audit logs');
    }
  };

  useEffect(() => {
    if (selectedCompanyId && selectedLocationId) {
      fetchMakes();
    }
  }, [selectedCompanyId, selectedLocationId]);

  const filteredMakes = makes.filter((make) =>
    make.make.toLowerCase().startsWith(formData.make.toLowerCase())
  );

  const handleAddNew = () => {
    setIsFormEnabled(true);
    setIsEditMode(false);
    setFormData({ make: "", description: "" });
    setSelectedMake(null);
    setCurrentMakeIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!isFormEnabled || !formData.make.trim()) {
      setError('Make name is required');
      return;
    }

    try {
      if (!selectedCompanyId || !selectedLocationId) {
        console.error('❌ Missing companyId or locationId:', { selectedCompanyId, selectedLocationId });
        setError('Please select a company and location');
        return;
      }

      console.log('📤 Preparing to save make:', {
        make: formData.make,
        description: formData.description,
        companyId: selectedCompanyId,
        locationId: selectedLocationId,
        isEditMode,
        selectedMakeId: selectedMake?._id,
      });

      const url = '/api/admin/column/make';
      const method = isEditMode && selectedMake ? 'PUT' : 'POST';
      const body = {
        id: isEditMode && selectedMake ? selectedMake._id : undefined,
        make: formData.make,
        description: formData.description,
        companyId: selectedCompanyId,
        locationId: selectedLocationId,
      };

      console.log('📤 Sending save request:', { method, body });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await response.json();
      console.log('📥 Save response:', data);

      if (data.success) {
        await logAuditAction(
          isEditMode && selectedMake ? 'UPDATE' : 'CREATE',
          {
            make: formData.make,
            description: formData.description,
            companyId: selectedCompanyId,
            locationId: selectedLocationId,
          },
          isEditMode && selectedMake
            ? {
                make: selectedMake.make,
                description: selectedMake.description,
                companyId: selectedMake.companyId,
                locationId: selectedMake.locationId,
              }
            : null
        );

        setFormData({ make: '', description: '' });
        setIsFormEnabled(false);
        setIsEditMode(false);
        setSelectedMake(null);
        setCurrentMakeIndex(-1);
        await fetchMakes();
      } else {
        setError(data.error || 'Failed to save make');
      }
    } catch (err: any) {
      console.error('💥 Save error:', err);
      setError(`Failed to save make: ${err.message}`);
    }
  };

  const handleClear = () => {
    setFormData({ make: "", description: "" });
    setIsFormEnabled(false);
    setIsEditMode(false);
    setSelectedMake(null);
    setCurrentMakeIndex(-1);
    setShowDropdown(false);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentMakeIndex > 0) {
      const newIndex = currentMakeIndex - 1;
      setCurrentMakeIndex(newIndex);
      const make = makes[newIndex];
      setSelectedMake(make);
      setFormData({
        make: make.make,
        description: make.description || "",
      });
    }
  };

  const handleDown = () => {
    if (currentMakeIndex < makes.length - 1) {
      const newIndex = currentMakeIndex + 1;
      setCurrentMakeIndex(newIndex);
      const make = makes[newIndex];
      setSelectedMake(make);
      setFormData({
        make: make.make,
        description: make.description || "",
      });
    } else if (currentMakeIndex === -1 && makes.length > 0) {
      setCurrentMakeIndex(0);
      const make = makes[0];
      setSelectedMake(make);
      setFormData({
        make: make.make,
        description: make.description || "",
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
    if (selectedMake) {
      setIsFormEnabled(true);
      setIsEditMode(true);
      setFormData({
        make: selectedMake.make,
        description: selectedMake.description || "",
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDelete = async () => {
    if (!selectedMake) return;

    if (!confirm(`Are you sure you want to delete "${selectedMake.make}"?`))
      return;

    try {
      const response = await fetch(
        `/api/admin/column/make?id=${selectedMake._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        await logAuditAction("DELETE", {
          make: selectedMake.make,
          description: selectedMake.description,
          companyId: selectedMake.companyId,
          locationId: selectedMake.locationId,
        });

        await fetchMakes();
        setFormData({ make: "", description: "" });
        setSelectedMake(null);
        setCurrentMakeIndex(-1);
        setIsFormEnabled(false);
        setIsEditMode(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete make");
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
          <title>Make Database Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .date { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Make Database Report</h1>
          <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <tr><th>Make Name</th><th>Description</th><th>Created Date</th></tr>
            ${makes
              .map(
                (make) =>
                  `<tr><td>${make.make}</td><td>${
                    make.description || ""
                  }</td><td>${new Date(
                    make.createdAt
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
          prev < filteredMakes.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (
          dropdownSelectedIndex >= 0 &&
          filteredMakes[dropdownSelectedIndex]
        ) {
          const make = filteredMakes[dropdownSelectedIndex];
          setFormData({
            make: make.make,
            description: make.description || "",
          });
          setSelectedMake(make);
          setCurrentMakeIndex(makes.findIndex((c) => c._id === make._id));
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
    const searchResults = makes.filter(
      (make) =>
        make.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (make.description &&
          make.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
        if (
          dropdownSelectedIndex >= 0 &&
          searchResults[dropdownSelectedIndex]
        ) {
          const make = searchResults[dropdownSelectedIndex];
          setFormData({
            make: make.make,
            description: make.description || "",
          });
          setSelectedMake(make);
          setCurrentMakeIndex(makes.findIndex((c) => c._id === make._id));
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
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <WindowsToolbar
        modulePath="/column/make"
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

      <div className="ml-20">
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
              <span className="text-blue-600 text-xs font-bold">M</span>
            </div>
            <span className="font-semibold">Make Master</span>
          </div>
        </div>

        <div className="container mx-auto p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          {session?.user?.role === "admin" ? (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Company
                  </label>
                  <select
                    value={selectedCompanyId || ""}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      const selectedCompany = session?.user?.companies.find(
                        (c: any) => c.companyId === e.target.value
                      );
                      setSelectedLocationId(
                        selectedCompany?.locations[0]?.locationId || null
                      );
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select a company
                    </option>
                    {session?.user?.companies.map((company: any) => (
                      <option key={company.companyId} value={company.companyId}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Location
                  </label>
                  <select
                    value={selectedLocationId || ""}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    disabled={!selectedCompanyId}
                  >
                    <option value="" disabled>
                      Select a location
                    </option>
                    {selectedCompanyId &&
                      session?.user?.companies
                        .find((c: any) => c.companyId === selectedCompanyId)
                        ?.locations.map((location: any) => (
                          <option
                            key={location.locationId}
                            value={location.locationId}
                          >
                            {location.name}
                          </option>
                        ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={session?.user?.companies[0]?.name || ""}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={
                      session?.user?.companies[0]?.locations[0]?.name || ""
                    }
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Make Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Make Name *
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={formData.make}
                  disabled={!isFormEnabled}
                  onChange={(e) => {
                    setFormData({ ...formData, make: e.target.value });
                    if (e.target.value && isFormEnabled && !isEditMode) {
                      setShowDropdown(true);
                      setDropdownSelectedIndex(-1);
                    } else {
                      setShowDropdown(false);
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => {
                    if (formData.make && isFormEnabled && !isEditMode) {
                      setShowDropdown(true);
                    }
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded ${
                    isFormEnabled ? "bg-white" : "bg-gray-100"
                  } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                  placeholder="Enter make name"
                />

                {showDropdown &&
                  filteredMakes.length > 0 &&
                  isFormEnabled &&
                  !isEditMode && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredMakes.map((make, index) => (
                        <div
                          key={make._id}
                          className={`px-3 py-2 cursor-pointer ${
                            index === dropdownSelectedIndex
                              ? "bg-blue-100"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => {
                            setFormData({
                              make: make.make,
                              description: make.description || "",
                            });
                            setSelectedMake(make);
                            setCurrentMakeIndex(
                              makes.findIndex((c) => c._id === make._id)
                            );
                            setShowDropdown(false);
                            setDropdownSelectedIndex(-1);
                          }}
                        >
                          <div className="font-medium">{make.make}</div>
                          {make.description && (
                            <div className="text-sm text-gray-500">
                              {make.description}
                            </div>
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
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full px-3 py-2 border border-gray-300 rounded ${
                    isFormEnabled ? "bg-white" : "bg-gray-100"
                  } focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                  placeholder="Enter description (optional)"
                />
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {selectedMake && (
                <div>
                  <span className="font-medium">Selected:</span>{" "}
                  {selectedMake.make}
                  <span className="ml-4 font-medium">Index:</span>{" "}
                  {currentMakeIndex + 1} of {makes.length}
                </div>
              )}
              {isFormEnabled && (
                <div className="text-green-600 font-medium">
                  {isEditMode
                    ? "Edit Mode - Modify the selected make"
                    : "Add Mode - Enter new make details"}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Makes ({makes.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading makes...</p>
              </div>
            ) : makes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No makes found. Add your first make!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Make Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {makes.map((make, index) => (
                      <tr
                        key={make._id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedMake?._id === make._id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          if (!isFormEnabled) {
                            setSelectedMake(make);
                            setCurrentMakeIndex(index);
                            setFormData({
                              make: make.make,
                              description: make.description || "",
                            });
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {make.make}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {make.description || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(make.createdAt).toLocaleDateString()}
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
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96">
            <h3 className="text-lg font-semibold mb-4">Search Makes</h3>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownSelectedIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Type to search..."
            />

            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
              {makes
                .filter(
                  (make) =>
                    make.make
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    (make.description &&
                      make.description
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()))
                )
                .map((make, index) => (
                  <div
                    key={make._id}
                    className={`px-3 py-2 cursor-pointer ${
                      index === dropdownSelectedIndex
                        ? "bg-blue-100"
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => {
                      setFormData({
                        make: make.make,
                        description: make.description || "",
                      });
                      setSelectedMake(make);
                      setCurrentMakeIndex(
                        makes.findIndex((c) => c._id === make._id)
                      );
                      setShowSearchModal(false);
                      setDropdownSelectedIndex(-1);
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium">{make.make}</div>
                    {make.description && (
                      <div className="text-sm text-gray-500">
                        {make.description}
                      </div>
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
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Audit Trail {selectedMake ? `for ${selectedMake.make}` : '(All Makes)'}</h3>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Search make or description..."
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
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Timestamp</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Make</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-left">Previous Make</th>
                    <th className="px-3 py-2 text-left">Previous Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.map((log: any, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{log.userId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.action === "CREATE"
                              ? "bg-green-100 text-green-800"
                              : log.action === "UPDATE"
                              ? "bg-yellow-100 text-yellow-800"
                              : log.action === "DELETE"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.make || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.description || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.previousData?.make || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.previousData?.description || '—'}
                        </div>
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
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Make Master - Help</h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-blue-600">
                  Keyboard Shortcuts:
                </h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F1</kbd> -
                    Add New Make
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F2</kbd> -
                    Save Current Entry
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F3</kbd> -
                    Clear Form
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F4</kbd> -
                    Exit to Dashboard
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F5</kbd> -
                    Navigate Up
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F6</kbd> -
                    Navigate Down
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F7</kbd> -
                    Search Makes
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F9</kbd> -
                    Edit Selected Make
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F10</kbd> -
                    Delete Selected Make
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F11</kbd> -
                    View Audit Trail
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">F12</kbd> -
                    Print Report
                  </li>
                  <li>
                    <kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl+H</kbd>{" "}
                    - Show Help
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600">How to Use:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • Use <b>Add (F1)</b> to enable form for new make entry
                  </li>
                  <li>
                    • Use <b>Edit (F9)</b> to modify selected make
                  </li>
                  <li>
                    • Use <b>Save (F2)</b> to save new or edited make
                  </li>
                  <li>
                    • Use <b>Clear (F3)</b> to reset form and disable inputs
                  </li>
                  <li>
                    • Use <b>Up (F5)/Down (F6)</b> to navigate makes
                    alphabetically
                  </li>
                  <li>
                    • Use <b>Search (F7)</b> for full-text search with keyboard
                    navigation
                  </li>
                  <li>
                    • Use <b>Delete (F10)</b> to remove selected make
                  </li>
                  <li>
                    • Use <b>Audit (F11)</b> to view all changes
                  </li>
                  <li>
                    • Use <b>Print (F12)</b> to generate make report
                  </li>
                  <li>
                    • Use <b>Exit (F4)</b> to return to dashboard
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600">
                  Status Indicators:
                </h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • <span className="text-green-600">Green text</span> - Form
                    is enabled for input
                  </li>
                  <li>
                    • <span className="text-blue-600">Blue background</span> -
                    Selected make in list
                  </li>
                  <li>
                    • <span className="text-gray-500">Gray fields</span> -
                    Read-only mode
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600">Tips:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• All fields are disabled by default until Add/Edit</li>
                  <li>• Make name is required for saving</li>
                  <li>• Use arrow keys in search modal for quick navigation</li>
                  <li>• All actions are logged in audit trail</li>
                  <li>• Contact support at support@company.com for issues</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

export default function ProtectedMakeMaster() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <MakeMaster />
    </ProtectedRoute>
  );
}