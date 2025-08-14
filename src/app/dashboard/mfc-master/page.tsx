// app/admin/mfc-master/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import WindowsToolbar from "@/components/layout/ToolBox";
import MFCMasterForm from "@/components/mfc/MFCMasterForm";
import { IMFCMaster } from "@/models/MFCMaster";

interface MFCFormData {
  mfcNumber: number;
  genericName: string;
  apiId: string;
  departmentId: string;
  testTypeId: string;
  detectorTypeId: string;
  pharmacopoeialId: string;
  columnCode: string;
  mobilePhaseCode1: string;
  mobilePhaseCode2?: string;
  mobilePhaseCode3?: string;
  mobilePhaseCode4?: string;
  sampleInjection: number;
  blankInjection: number;
  bracketingFrequency: number;
  injectionTime: number;
  runTime: number;
  testApplicability: boolean;
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

const MFCMasterPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [mfcRecords, setMfcRecords] = useState<IMFCMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IMFCMaster | null>(null);
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

  // Make audit log entry
  const makeAuditEntry = async (action: string, oldData?: any, newData?: any) => {
    try {
      const { companyId, locationId } = getStorageIds();
      if (!companyId || !locationId || !session?.user) return;

      await fetch("/api/admin/make-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.userId,
          action,
          module: "MFC Master",
          recordId: editingRecord?._id || "new",
          oldData: oldData || null,
          newData: newData || null,
          companyId,
          locationId,
        }),
      });
    } catch (error) {
      console.error("Error making audit entry:", error);
    }
  };

  // Handle form submission (create/update)
  const handleFormSubmit = async (formData: MFCFormData) => {
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

      const payload = {
        ...formData,
        companyId,
        locationId,
        createdBy: session?.user?.userId || "unknown",
      };

      let response;
      if (editingRecord) {
        response = await fetch("/api/admin/mfc", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingRecord._id }),
        });
        await makeAuditEntry("UPDATE", editingRecord, payload);
      } else {
        response = await fetch("/api/admin/mfc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await makeAuditEntry("CREATE", null, payload);
      }

      const data = await response.json();

      if (response.ok) {
        alert(`MFC record ${editingRecord ? "updated" : "created"} successfully!`);
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
        `Are you sure you want to delete MFC record #${record.mfcNumber}?`
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
      });

      const response = await fetch(`/api/admin/mfc?${params}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        await makeAuditEntry("DELETE", record, null);
        alert("MFC record deleted successfully!");
        const newTotal = pagination.total - 1;
        const newTotalPages = Math.ceil(newTotal / pagination.limit);
        const currentPage =
          pagination.page > newTotalPages
            ? Math.max(1, newTotalPages)
            : pagination.page;
        fetchMFCRecords(currentPage, searchTerm);
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

  // Handle edit
  const handleEdit = (record: IMFCMaster) => {
    setEditingRecord(record);
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
    // Trigger form submission programmatically
    // This requires MFCMasterForm to expose a submit method or use a ref
    // For simplicity, we'll rely on the form's onSubmit prop
    if (showForm) {
      // Assuming MFCMasterForm handles its own submission
      // You may need to use a ref to trigger the form submission
      alert("Please submit the form to save.");
    } else {
      alert("No form is open to save.");
    }
  };

  const handleClear = () => {
    setShowForm(false);
    setEditingRecord(null);
    setSearchTerm("");
    setErrorMessage("");
    fetchMFCRecords(1, "");
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (!editingRecord || mfcRecords.length === 0) return;
    const currentIndex = mfcRecords.findIndex(
      (r) => r._id === editingRecord._id
    );
    if (currentIndex > 0) {
      setEditingRecord(mfcRecords[currentIndex - 1]);
      setShowForm(true);
    }
  };

  const handleDown = () => {
    if (!editingRecord || mfcRecords.length === 0) return;
    const currentIndex = mfcRecords.findIndex(
      (r) => r._id === editingRecord._id
    );
    if (currentIndex < mfcRecords.length - 1) {
      setEditingRecord(mfcRecords[currentIndex + 1]);
      setShowForm(true);
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
  };

  const handleAudit = () => {
    if (editingRecord) {
      window.open(
        `/admin/audit-trail?module=MFC Master&recordId=${editingRecord._id}`,
        "_blank"
      );
    } else {
      window.open("/admin/audit-trail?module=MFC Master", "_blank");
    }
  };

  const handlePrint = () => {
    if (!editingRecord) {
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

  // Load data on component mount
  useEffect(() => {
    fetchMFCRecords();
  }, []);

  // Show form view
  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50">
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
          onDelete={() => editingRecord && handleDelete(editingRecord)}
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
                className="flex items-center text-gray-600 hover:text-gray-900"
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
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    MFC Master Help
                  </h2>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="text-gray-400 hover:text-gray-600"
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
                {/* Help content similar to MFCMasterToolbox */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Toolbar Functions
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>F1 - Add New:</strong> Enable form for creating a
                        new MFC record
                      </div>
                      <div>
                        <strong>F2 - Save:</strong> Save current form data to
                        database
                      </div>
                      <div>
                        <strong>F3 - Clear:</strong> Clear form and disable inputs
                      </div>
                      <div>
                        <strong>F4 - Exit:</strong> Return to dashboard
                      </div>
                      <div>
                        <strong>F5 - Up:</strong> Navigate to previous record
                      </div>
                      <div>
                        <strong>F6 - Down:</strong> Navigate to next record
                      </div>
                      <div>
                        <strong>F7 - Search:</strong> Open search modal
                      </div>
                      <div>
                        <strong>F9 - Edit:</strong> Enable editing of selected
                        record
                      </div>
                      <div>
                        <strong>F10 - Delete:</strong> Delete current record
                      </div>
                      <div>
                        <strong>F11 - Audit:</strong> View audit trail
                      </div>
                      <div>
                        <strong>F12 - Print:</strong> Print current record
                      </div>
                      <div>
                        <strong>Ctrl+H - Help:</strong> Show this help dialog
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
            <div className="bg-white p-4 rounded-lg flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-gray-50">
      <WindowsToolbar
        modulePath="/admin/mfc-master"
        onAddNew={handleAddNew}
        onSave={() => alert("Please open the form to save.")}
        onClear={handleClear}
        onExit={handleExit}
        onUp={() => alert("Please select a record first.")}
        onDown={() => alert("Please select a record first.")}
        onSearch={handleSearch}
        onEdit={() => alert("Please select a record to edit.")}
        onDelete={() => alert("Please select a record to delete.")}
        onAudit={handleAudit}
        onPrint={() => alert("Please select a record to print.")}
        onHelp={handleHelp}
      />
      <div className="ml-20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    MFC Master
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage Method File Configuration records
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <form onSubmit={handleSearchSubmit} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by MFC Number, Generic Name, or Column Code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  disabled={isLoading}
                  className="bg-gray-400 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg"
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MFC #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generic Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Column Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile Phase 1
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Run Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test Types
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mfcRecords.length > 0 ? (
                      mfcRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {record.mfcNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="text-sm text-gray-900 max-w-xs truncate"
                              title={record.genericName}
                            >
                              {record.genericName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {record.columnCode}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {record.mobilePhaseCode1}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {record.runTime}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {record.bulk && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Bulk
                                </span>
                              )}
                              {record.fp && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  FP
                                </span>
                              )}
                              {record.stabilityPartial && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Stability
                                </span>
                              )}
                              {record.amv && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  AMV
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                                onClick={() => handleEdit(record)}
                                disabled={isLoading}
                                className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(record)}
                                disabled={isLoading}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
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
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
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
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
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
                      className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-3 py-2 rounded-lg text-sm"
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
                              className={`px-3 py-2 rounded-lg text-sm disabled:cursor-not-allowed ${
                                pageNum === pagination.page
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
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
                      className="bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-3 py-2 rounded-lg text-sm"
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
            <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    Search MFC Records
                  </h2>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="text-gray-400 hover:text-gray-600"
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchTerm(value);
                      fetchMFCRecords(1, value);
                    }}
                  />
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid gap-2">
                    {mfcRecords.map((record, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setEditingRecord(record);
                          setShowForm(true);
                          setShowSearchModal(false);
                        }}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">
                              #{record.mfcNumber} - {record.genericName}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Column: {record.columnCode} | Run Time:{" "}
                              {record.runTime}
                            </div>
                            <div className="flex gap-2 mt-2">
                              {record.bulk && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  Bulk
                                </span>
                              )}
                              {record.fp && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  FP
                                </span>
                              )}
                              {record.stabilityPartial && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                  Stability
                                </span>
                              )}
                              {record.amv && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
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
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    MFC Master Help
                  </h2>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="text-gray-400 hover:text-gray-600"
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
                      Toolbar Functions
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>F1 - Add New:</strong> Enable form for creating a
                        new MFC record
                      </div>
                      <div>
                        <strong>F2 - Save:</strong> Save current form data to
                        database
                      </div>
                      <div>
                        <strong>F3 - Clear:</strong> Clear form and disable inputs
                      </div>
                      <div>
                        <strong>F4 - Exit:</strong> Return to dashboard
                      </div>
                      <div>
                        <strong>F5 - Up:</strong> Navigate to previous record
                      </div>
                      <div>
                        <strong>F6 - Down:</strong> Navigate to next record
                      </div>
                      <div>
                        <strong>F7 - Search:</strong> Open search modal
                      </div>
                      <div>
                        <strong>F9 - Edit:</strong> Enable editing of selected
                        record
                      </div>
                      <div>
                        <strong>F10 - Delete:</strong> Delete current record
                      </div>
                      <div>
                        <strong>F11 - Audit:</strong> View audit trail
                      </div>
                      <div>
                        <strong>F12 - Print:</strong> Print current record
                      </div>
                      <div>
                        <strong>Ctrl+H - Help:</strong> Show this help dialog
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
            <div className="bg-white p-4 rounded-lg flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFCMasterPage;