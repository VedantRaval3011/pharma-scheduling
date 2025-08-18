// app/admin/mfc-master/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import WindowsToolbar from "@/components/layout/ToolBox";
import MFCMasterForm from "@/components/mfc/MFCMasterForm";
import { IMFCMaster } from "@/models/MFCMaster";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Updated interface to match new nested structure
interface MFCFormData {
  mfcNumber: string;
  productCodes: { code: string }[];
  generics: {
    genericName: string;
    apis: {
      apiName: string;
      testTypes: {
        testTypeId: string;
        columnCode: string;
        mobilePhaseCodes: string[];
        detectorTypeId: string;
        pharmacopoeialId: string;
        sampleInjection: number;
        standardInjection: number;
        blankInjection: number;
        bracketingFrequency: number;
        injectionTime: number;
        runTime: number;
        testApplicability: boolean;
      }[];
    }[];
  }[];
  departmentId: string;
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AuditRecord {
  _id: string;
  mfcId: string;
  mfcNumber: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  performedBy: string;
  performedAt: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  reason?: string;
}

const MFCMasterPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [mfcRecords, setMfcRecords] = useState<IMFCMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IMFCMaster | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<IMFCMaster | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Get company and location IDs from localStorage
  const getStorageIds = () => {
    if (typeof window === "undefined")
      return { companyId: null, locationId: null };
    const companyId = localStorage.getItem("companyId");
    const locationId = localStorage.getItem("locationId");
    return { companyId, locationId };
  };

  // Fetch MFC records
  const fetchMFCRecords = async (page = 1, search = "") => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const { companyId, locationId } = getStorageIds();

      if (!companyId || !locationId) {
        setErrorMessage(
          "Company ID and Location ID not found. Please login again."
        );
        return;
      }

      const params = new URLSearchParams({
        companyId,
        locationId,
        page: page.toString(),
        limit: "10",
        search: search.trim(),
      });

      const response = await fetch(`/api/admin/mfc?${params}`);
      const data = await response.json();

      if (response.ok) {
        setMfcRecords(data.data || []);
        setPagination(
          data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 1,
          }
        );
      } else {
        setErrorMessage(data.error || "Failed to fetch MFC records");
        setMfcRecords([]);
      }
    } catch (error) {
      console.error("Error fetching MFC records:", error);
      setErrorMessage("Network error. Please try again.");
      setMfcRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch audit records
  const fetchAuditRecords = async (mfcId?: string) => {
    try {
      setAuditLoading(true);
      const { companyId, locationId } = getStorageIds();

      if (!companyId || !locationId) {
        setErrorMessage("Company ID and Location ID not found. Please login again.");
        return;
      }

      const params = new URLSearchParams({
        companyId,
        locationId,
        limit: "50",
      });

      if (mfcId) {
        params.append('mfcId', mfcId);
      }

      const response = await fetch(`/api/admin/mfc/audit?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAuditRecords(data.data || []);
      } else {
        console.error('Failed to fetch audit records:', data.error);
        setAuditRecords([]);
      }
    } catch (error) {
      console.error('Error fetching audit records:', error);
      setAuditRecords([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Handle form submission (create/update)
 // Update the handleFormSubmit function in your page component
const handleFormSubmit = async (formData: any) => { // Change from MFCFormData to any temporarily
  try {
    setIsLoading(true);
    setErrorMessage("");

    const trimmedMFCNumber = formData.mfcNumber.trim();
    
    if (!trimmedMFCNumber) {
      setErrorMessage("MFC Number is required");
      setIsLoading(false);
      return;
    }

    const { companyId, locationId } = getStorageIds();

    if (!companyId || !locationId) {
      setErrorMessage(
        "Company ID and Location ID not found. Please login again."
      );
      return;
    }

    // Transform the flat form data to the nested structure expected by the API
    const transformedPayload = {
      mfcNumber: trimmedMFCNumber,
      productCodes: formData.productCodes,
      generics: [{  // Wrap in generics array
        genericName: formData.genericName,
        apis: formData.apis
      }],
      departmentId: formData.departmentId,
      bulk: formData.bulk,
      fp: formData.fp,
      stabilityPartial: formData.stabilityPartial,
      stabilityFinal: formData.stabilityFinal,
      amv: formData.amv,
      pv: formData.pv,
      cv: formData.cv,
      companyId,
      locationId,
      createdBy: session?.user?.userId || "unknown",
    };

    let response;
    if (editingRecord) {
      response = await fetch("/api/admin/mfc", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...transformedPayload, id: editingRecord._id }),
      });
    } else {
      response = await fetch("/api/admin/mfc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedPayload),
      });
    }

    const data = await response.json();

    if (response.ok) {
      alert(
        `MFC record ${editingRecord ? "updated" : "created"} successfully!`
      );
      setShowForm(false);
      setEditingRecord(null);
      setErrorMessage("");
      fetchMFCRecords(pagination.page, searchTerm);
    } else {
      setErrorMessage(
        data.error ||
          `Failed to ${editingRecord ? "update" : "create"} MFC record`
      );
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    setErrorMessage("Network error. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

  // Handle delete
  const handleDelete = async (record: IMFCMaster) => {
    if (
      !confirm(
        `Are you sure you want to delete MFC record "${record.mfcNumber}"?`
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const { companyId, locationId } = getStorageIds();

      if (!companyId || !locationId) {
        setErrorMessage(
          "Company ID and Location ID not found. Please login again."
        );
        return;
      }

      const params = new URLSearchParams({
        id: record._id as string,
        companyId,
        locationId,
        deletedBy: session?.user?.userId || "unknown",
      });

      const response = await fetch(`/api/admin/mfc?${params}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("MFC record deleted successfully!");
        const newTotal = pagination.total - 1;
        const newTotalPages = Math.ceil(newTotal / pagination.limit);
        const currentPage =
          pagination.page > newTotalPages
            ? Math.max(1, newTotalPages)
            : pagination.page;
        fetchMFCRecords(currentPage, searchTerm);
        setSelectedRecord(null);
      } else {
        setErrorMessage(data.error || "Failed to delete MFC record");
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle row selection
  const handleRowSelect = (record: IMFCMaster) => {
    setSelectedRecord(record);
    setEditingRecord(null);
    setErrorMessage("");
  };

  // Handle edit
  const handleEdit = (record?: IMFCMaster) => {
    const recordToEdit = record || selectedRecord;
    if (!recordToEdit) {
      alert("Please select a record to edit.");
      return;
    }
    setEditingRecord(recordToEdit);
    setShowForm(true);
    setErrorMessage("");
  };

  // Toolbar Handlers
  const handleAddNew = () => {
    setEditingRecord(null);
    setShowForm(true);
    setErrorMessage("");
  };

  const handleSave = () => {
    if (showForm) {
      alert("Please submit the form to save.");
    } else {
      alert("No form is open to save.");
    }
  };

  const handleClear = () => {
    setShowForm(false);
    setEditingRecord(null);
    setSelectedRecord(null);
    setSearchTerm("");
    setErrorMessage("");
    fetchMFCRecords(1, "");
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (!selectedRecord || mfcRecords.length === 0) return;
    const currentIndex = mfcRecords.findIndex(
      (r) => r._id === selectedRecord._id
    );
    if (currentIndex > 0) {
      setSelectedRecord(mfcRecords[currentIndex - 1]);
      if (showForm) {
        setEditingRecord(mfcRecords[currentIndex - 1]);
      }
    }
  };

  const handleDown = () => {
    if (!selectedRecord || mfcRecords.length === 0) return;
    const currentIndex = mfcRecords.findIndex(
      (r) => r._id === selectedRecord._id
    );
    if (currentIndex < mfcRecords.length - 1) {
      setSelectedRecord(mfcRecords[currentIndex + 1]);
      if (showForm) {
        setEditingRecord(mfcRecords[currentIndex + 1]);
      }
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
  };

  const handleAudit = () => {
    const recordForAudit = editingRecord || selectedRecord;
    setShowAuditModal(true);
    fetchAuditRecords(recordForAudit?._id as string | undefined);
  };

  const handlePrint = () => {
    const recordToPrint = editingRecord || selectedRecord;
    if (!recordToPrint) {
      alert("Please select a record to print.");
      return;
    }
    window.print();
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  // Handle search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMFCRecords(1, searchTerm);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    fetchMFCRecords(1, "");
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchMFCRecords(newPage, searchTerm);
    }
  };

  // Format audit change display
  const formatChangeValue = (value: any) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Helper function to get summary display for nested data
  const getRecordSummary = (record: IMFCMaster) => {
    const genericCount = record.generics?.length || 0;
    const apiCount = record.generics?.reduce((total, generic) => total + (generic.apis?.length || 0), 0) || 0;
    const testTypeCount = record.generics?.reduce((total, generic) => 
      total + (generic.apis?.reduce((apiTotal, api) => apiTotal + (api.testTypes?.length || 0), 0) || 0), 0) || 0;
    
    return { genericCount, apiCount, testTypeCount };
  };

  // Load data on component mount
  useEffect(() => {
    fetchMFCRecords();
  }, []);

  // Show form view
  if (showForm) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#b9d7ff' }}>
        <WindowsToolbar
          modulePath="/admin/mfc-master"
          onAddNew={handleAddNew}
          onSave={handleSave}
          onClear={handleClear}
          onExit={handleExit}
          onUp={handleUp}
          onDown={handleDown}
          onSearch={handleSearch}
          onEdit={() => alert("Already in edit mode or select a record first.")}
          onDelete={() => selectedRecord && handleDelete(selectedRecord)}
          onAudit={handleAudit}
          onPrint={handlePrint}
          onHelp={handleHelp}
        />
        <div className="ml-20 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingRecord(null);
                  setErrorMessage("");
                }}
                className="flex items-center text-gray-700 hover:text-gray-900 bg-white bg-opacity-80 px-3 py-2 rounded-lg border border-gray-300 hover:bg-opacity-100 transition-all"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to List
              </button>
            </div>

            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg bg-opacity-95">
                {errorMessage}
              </div>
            )}

            <MFCMasterForm
              onSubmit={handleFormSubmit}
              initialData={editingRecord}
              onCancel={() => { 
                setShowForm(false);
                setEditingRecord(null);
                setErrorMessage("");
              }}
            />
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-opacity-25 flex items-center justify-center z-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <span>Processing...</span>
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#b9d7ff' }}>
      <WindowsToolbar
        modulePath="/admin/mfc-master"
        onAddNew={handleAddNew}
        onSave={() => alert("Please open the form to save.")}
        onClear={handleClear}
        onExit={handleExit}
        onUp={() => selectedRecord ? handleUp() : alert("Please select a record first.")}
        onDown={() => selectedRecord ? handleDown() : alert("Please select a record first.")}
        onSearch={handleSearch}
        onEdit={() => handleEdit()}
        onDelete={() => selectedRecord ? handleDelete(selectedRecord) : alert("Please select a record to delete.")}
        onAudit={handleAudit}
        onPrint={() => handlePrint()}
        onHelp={handleHelp}
      />
      <div className="ml-20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white bg-opacity-95 shadow-lg rounded border border-gray-300 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-300 bg-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    MFC Master
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage Method File Configuration records with nested Generic/API/Test Type structure
                  </p>
                </div>
                {selectedRecord && (
                  <div className="text-sm text-gray-600">
                    Selected: <span className="font-mono font-bold">{selectedRecord.mfcNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Search and Controls */}
            <div className="px-6 py-4 border-b border-gray-300 bg-gray-50">
              <form onSubmit={handleSearchSubmit} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by MFC Number, Generic Name, API Name, Product Code, or Column Code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded border border-gray-500"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  disabled={isLoading}
                  className="bg-gray-400 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded border border-gray-400"
                >
                  Clear
                </button>
              </form>

              {/* Results Summary */}
              {!isLoading && !errorMessage && (
                <div className="mt-3 text-sm text-gray-600">
                  {searchTerm ? (
                    <span>
                      Found {pagination.total} results for "{searchTerm}"
                    </span>
                  ) : (
                    <span>Showing {pagination.total} total records</span>
                  )}
                </div>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="px-6 py-12">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">
                    Loading MFC records...
                  </span>
                </div>
              </div>
            )}

            {/* Table */}
            {!isLoading && !errorMessage && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        MFC Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Product Codes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Configuration Summary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Test Types
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mfcRecords.length > 0 ? (
                      mfcRecords.map((record, index) => {
                        const summary = getRecordSummary(record);
                        return (
                          <tr 
                            key={index} 
                            onClick={() => handleRowSelect(record)}
                            className={`cursor-pointer transition-colors border-b border-gray-200 ${
                              selectedRecord?._id === record._id 
                                ? 'bg-blue-100 hover:bg-blue-150' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              <div className="text-sm font-medium text-gray-900 font-mono">
                                {record.mfcNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 border-r border-gray-200">
                              <div className="text-sm text-gray-900">
                                {record.productCodes?.map((pc, i) => (
                                  <span key={i} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-1 mb-1">
                                    {pc.code}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 border-r border-gray-200">
                              <div className="text-xs text-gray-600">
                                <div>{summary.genericCount} Generics</div>
                                <div>{summary.apiCount} APIs</div>
                                <div>{summary.testTypeCount} Test Types</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                              <div className="text-sm text-gray-900">
                                {/* You'll need to resolve department name from departmentId */}
                                {record.departmentId}
                              </div>
                            </td>
                            <td className="px-6 py-4 border-r border-gray-200">
                              <div className="flex flex-wrap gap-1">
                                {record.bulk && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                                    Bulk
                                  </span>
                                )}
                                {record.fp && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                                    FP
                                  </span>
                                )}
                                {record.stabilityPartial && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                    Stability
                                  </span>
                                )}
                                {record.amv && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                    AMV
                                  </span>
                                )}
                                {record.pv && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                                    PV
                                  </span>
                                )}
                                {record.cv && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800 border border-pink-300">
                                    CV
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                              <div>
                                {new Date(record.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-400">
                                by {record.createdBy}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(record);
                                  }}
                                  disabled={isLoading}
                                  className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(record);
                                  }}
                                  disabled={isLoading}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400 mb-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">
                              No MFC records found
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                              {searchTerm
                                ? "Try adjusting your search terms"
                                : "Get started by creating your first MFC record"}
                            </p>
                            {!searchTerm && (
                              <button
                                onClick={handleAddNew}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium border border-blue-500"
                              >
                                Create First MFC
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !errorMessage && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-300 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing{" "}
                    {Math.min(
                      (pagination.page - 1) * pagination.limit + 1,
                      pagination.total
                    )}{" "}
                    to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    of {pagination.total} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1 || isLoading}
                      className="bg-white border border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-3 py-2 rounded text-sm"
                    >
                      Previous
                    </button>
                    <div className="flex space-x-1">
                      {Array.from(
                        { length: Math.min(5, pagination.totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (
                            pagination.page >
                            pagination.totalPages - 3
                          ) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              disabled={isLoading}
                              className={`px-3 py-2 rounded text-sm disabled:cursor-not-allowed border ${
                                pageNum === pagination.page
                                  ? "bg-blue-600 text-white border-blue-500"
                                  : "bg-white border-gray-400 hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={
                        pagination.page === pagination.totalPages || isLoading
                      }
                      className="bg-white border border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-3 py-2 rounded text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded border border-gray-400 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-300 bg-gray-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    Search MFC Records
                  </h2>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search MFC records..."
                    className="w-full p-3 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchTerm(value);
                      fetchMFCRecords(1, value);
                    }}
                  />
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid gap-2">
                    {mfcRecords.map((record, index) => {
                      const summary = getRecordSummary(record);
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            setSelectedRecord(record);
                            setEditingRecord(record);
                            setShowForm(true);
                            setShowSearchModal(false);
                          }}
                          className="p-4 border border-gray-300 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900 font-mono">
                                {record.mfcNumber}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {summary.genericCount} Generics, {summary.apiCount} APIs, {summary.testTypeCount} Test Types
                              </div>
                              <div className="flex gap-2 mt-2">
                                {record.bulk && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded border border-blue-300">
                                    Bulk
                                  </span>
                                )}
                                {record.fp && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded border border-green-300">
                                    FP
                                  </span>
                                )}
                                {record.stabilityPartial && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-300">
                                    Stability
                                  </span>
                                )}
                                {record.amv && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded border border-purple-300">
                                    AMV
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded border border-gray-400 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-gray-300 bg-gray-100">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    MFC Master Help
                  </h2>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      New Nested Structure
                    </h3>
                    <div className="bg-blue-50 border border-blue-300 p-4 rounded mb-4">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>MFC Records</strong> now support a nested hierarchy:
                      </p>
                      <ul className="text-sm text-blue-700 space-y-1 ml-4">
                        <li>• <strong>Product Codes:</strong> Multiple product codes per MFC</li>
                        <li>• <strong>Generics:</strong> Multiple generic configurations</li>
                        <li>• <strong>APIs:</strong> Multiple APIs per generic</li>
                        <li>• <strong>Test Types:</strong> Multiple test configurations per API</li>
                      </ul>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Key Changes
                    </h3>
                    <div className="bg-gray-50 border border-gray-300 p-4 rounded mb-4">
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• <strong>Mobile Phase Codes:</strong> Now stored as arrays per test type</li>
                        <li>• <strong>Detector & Pharmacopoeial:</strong> Moved to test type level</li>
                        <li>• <strong>Standard Injection:</strong> New field added alongside sample injection</li>
                        <li>• <strong>Department:</strong> Remains at MFC level</li>
                      </ul>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Using the Form
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>Adding Sections:</strong> Use the "Add" buttons to create new product codes, generics, APIs, or test types
                      </div>
                      <div>
                        <strong>Removing Sections:</strong> Use "Remove" buttons (available when there are multiple items)
                      </div>
                      <div>
                        <strong>Mobile Phase Codes:</strong> Add multiple mobile phase codes per test type using the "Add Phase" button
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
            <div className="bg-white p-4 rounded border border-gray-400 flex items-center shadow-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ProtectedMFCMasterPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <MFCMasterPage />
    </ProtectedRoute>
  );
}