"use client";

import React, { useState, useEffect, JSX } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import WindowsToolbar from "@/components/layout/ToolBox";
import MFCMasterForm from "@/components/mfc/MFCMasterForm";
import { IMFCMaster } from "@/models/MFCMaster";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Interface to match the updated nested structure
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
  action: "CREATE" | "UPDATE" | "DELETE";
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

interface MasterItem {
  value: string;
  label: string;
  _id?: string;
  code?: string;
  name?: string;
  columnCode?: string;
}

interface TestType extends MasterItem {}
interface DetectorType extends MasterItem {}
interface Pharmacopoeial extends MasterItem {}
interface Department extends MasterItem {}
interface Column extends MasterItem {}
interface MobilePhase extends MasterItem {}

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

  // Lookup data states
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [detectorTypes, setDetectorTypes] = useState<DetectorType[]>([]);
  const [pharmacopoeials, setPharmacopoeials] = useState<Pharmacopoeial[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [mobilePhases, setMobilePhases] = useState<MobilePhase[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Get company and location IDs from localStorage
  const getStorageIds = () => {
    if (typeof window === "undefined")
      return { companyId: null, locationId: null };
    const companyId = localStorage.getItem("companyId");
    const locationId = localStorage.getItem("locationId");
    return { companyId, locationId };
  };

  // Normalize API response to {value, label} format
  const normalizeToMasterFormat = (data: any[]): MasterItem[] => {
    return data.map((item) => ({
      value: item._id || item.value || item.id,
      label:
        item.detectorType ||
        item.testType ||
        item.api ||
        item.department ||
        item.columnCode ||
        item.pharmacopeial ||
        item.name ||
        item.label ||
        item.code ||
        item.description ||
        item.value,
      ...item,
    }));
  };

  // Fetch lookup data
  const fetchLookupData = async () => {
    try {
      setLookupLoading(true);
      const { companyId, locationId } = getStorageIds();

      if (!companyId || !locationId) {
        console.error("Company ID and Location ID not found");
        return;
      }

      const params = new URLSearchParams({ companyId, locationId });

      const [
        testTypesRes,
        detectorTypesRes,
        pharmacopoeialsRes,
        departmentsRes,
        columnsRes,
        mobilePhasesRes,
      ] = await Promise.all([
        fetch(`/api/admin/test-type?${params}`),
        fetch(`/api/admin/detector-type?${params}`),
        fetch(`/api/admin/pharmacopeial?${params}`),
        fetch(`/api/admin/department?${params}`),
        fetch(`/api/admin/column/getAll?${params}`),
        fetch(`/api/admin/mobile-phase?${params}`),
      ]);

      if (testTypesRes.ok) {
        const testTypesData = await testTypesRes.json();
        setTestTypes(normalizeToMasterFormat(testTypesData.data || []));
      }

      if (detectorTypesRes.ok) {
        const detectorTypesData = await detectorTypesRes.json();
        setDetectorTypes(normalizeToMasterFormat(detectorTypesData.data || []));
      }

      if (pharmacopoeialsRes.ok) {
        const pharmacopoeialsData = await pharmacopoeialsRes.json();
        setPharmacopoeials(
          normalizeToMasterFormat(pharmacopoeialsData.data || [])
        );
      }

      if (departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        setDepartments(normalizeToMasterFormat(departmentsData.data || []));
      }

      if (columnsRes.ok) {
        const columnsData = await columnsRes.json();
        setColumns(normalizeToMasterFormat(columnsData.data || []));
      }

      if (mobilePhasesRes.ok) {
        const mobilePhasesData = await mobilePhasesRes.json();
        setMobilePhases(normalizeToMasterFormat(mobilePhasesData.data || []));
      }
    } catch (error) {
      console.error("Error fetching lookup data:", error);
    } finally {
      setLookupLoading(false);
    }
  };

  const getLabel = (id: string, master: MasterItem[]): string => {
    if (!id) return "";
    const found = master.find((item) => item.value === id || item._id === id);
    return found ? found.label : id;
  };

  const getTestTypeName = (id: string) => getLabel(id, testTypes);
  const getDetectorTypeName = (id: string) => getLabel(id, detectorTypes);
  const getPharmacopoeialsName = (id: string) => getLabel(id, pharmacopoeials);
  const getDepartmentName = (id: string) => getLabel(id, departments);
  const getColumnName = (columnId: string) => {
    if (!columnId) return "";
    const found = columns.find(
      (item) => item.value === columnId || item._id === columnId
    );
    return found ? found.columnCode || found.label || columnId : columnId;
  };
  const getMobilePhaseName = (id: string) => getLabel(id, mobilePhases);

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
        setErrorMessage(
          "Company ID and Location ID not found. Please login again."
        );
        return;
      }

      const params = new URLSearchParams({
        companyId,
        locationId,
        limit: "50",
      });

      if (mfcId) {
        params.append("mfcId", mfcId);
      }

      const response = await fetch(`/api/admin/mfc/audit?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAuditRecords(data.data || []);
      } else {
        console.error("Failed to fetch audit records:", data.error);
        setAuditRecords([]);
      }
    } catch (error) {
      console.error("Error fetching audit records:", error);
      setAuditRecords([]);
    } finally {
      setAuditLoading(false);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (formData: any) => {
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

      const transformedPayload = {
        mfcNumber: trimmedMFCNumber,
        productIds: formData.productIds,
        generics: [
          {
            genericName: formData.genericName,
            apis: formData.apis,
          },
        ],
        departmentId: formData.departmentId,
        wash: formData.wash,
        companyId,
        locationId,
        createdBy: session?.user?.userId || "unknown",
      };

      let response;
      if (editingRecord) {
        response = await fetch("/api/admin/mfc", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...transformedPayload,
            id: editingRecord._id,
          }),
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
    setShowSearchModal(false);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm("");
    fetchMFCRecords(1, "");
    setShowSearchModal(false);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchMFCRecords(newPage, searchTerm);
    }
  };

  // Format audit change display
  const formatChangeValue = (value: any) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);

    const valueStr = String(value);

    if (valueStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(valueStr)) {
      const testTypeName = getTestTypeName(valueStr);
      const detectorTypeName = getDetectorTypeName(valueStr);
      const pharmacopoeialsName = getPharmacopoeialsName(valueStr);
      const departmentName = getDepartmentName(valueStr);
      const columnName = getColumnName(valueStr);
      const mobilePhaseName = getMobilePhaseName(valueStr);

      if (testTypeName !== valueStr) return `${testTypeName} (${valueStr})`;
      if (detectorTypeName !== valueStr)
        return `${detectorTypeName} (${valueStr})`;
      if (pharmacopoeialsName !== valueStr)
        return `${pharmacopoeialsName} (${valueStr})`;
      if (departmentName !== valueStr) return `${departmentName} (${valueStr})`;
      if (columnName !== valueStr) return `${columnName} (${valueStr})`;
      if (mobilePhaseName !== valueStr)
        return `${mobilePhaseName} (${valueStr})`;
    }

    return valueStr;
  };

  // Get summary display for nested data
  const getRecordSummary = (record: IMFCMaster) => {
    const genericCount = record.generics?.length || 0;
    const apiCount =
      record.generics?.reduce(
        (total, generic) => total + (generic.apis?.length || 0),
        0
      ) || 0;
    const testTypeCount =
      record.generics?.reduce(
        (total, generic) =>
          total +
          (generic.apis?.reduce(
            (apiTotal, api) => apiTotal + (api.testTypes?.length || 0),
            0
          ) || 0),
        0
      ) || 0;

    return { genericCount, apiCount, testTypeCount };
  };

  // Get test type flags summary
  const getTestTypeFlags = (testType: any) => {
    const flags = [];
    if (testType.bulk) flags.push("Bulk");
    if (testType.fp) flags.push("FP");
    if (testType.stabilityPartial) flags.push("SP");
    if (testType.stabilityFinal) flags.push("SF");
    if (testType.amv) flags.push("AMV");
    if (testType.pv) flags.push("PV");
    if (testType.cv) flags.push("CV");
    if (testType.isLinked) flags.push("Linked");
    return flags.length > 0 ? flags.join(", ") : "-";
  };

  // Load data on component mount
  useEffect(() => {
    fetchLookupData();
    fetchMFCRecords();
  }, []);

  // Show form view
  if (showForm) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#b9d7ff" }}>
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
    <div className="min-h-screen" style={{ backgroundColor: "#b9d7ff" }}>
      <WindowsToolbar
        modulePath="/admin/mfc-master"
        onAddNew={handleAddNew}
        onSave={() => alert("Please open the form to save.")}
        onClear={handleClear}
        onExit={handleExit}
        onUp={() =>
          selectedRecord ? handleUp() : alert("Please select a record first.")
        }
        onDown={() =>
          selectedRecord ? handleDown() : alert("Please select a record first.")
        }
        onSearch={handleSearch}
        onEdit={() => handleEdit()}
        onDelete={() =>
          selectedRecord
            ? handleDelete(selectedRecord)
            : alert("Please select a record to delete.")
        }
        onAudit={handleAudit}
        onPrint={() => handlePrint()}
        onHelp={handleHelp}
      />
      <div className="ml-20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white bg-opacity-95 shadow-lg rounded border border-gray-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-300 bg-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    MFC Master
                  </h1>
                </div>
                {selectedRecord && (
                  <div className="text-sm text-gray-600">
                    Selected:{" "}
                    <span className="font-mono font-bold">
                      {selectedRecord.mfcNumber}
                    </span>
                    <div className="text-xs mt-1">
                      Department:{" "}
                      <span className="font-medium">
                        {getDepartmentName(selectedRecord.departmentId)}
                      </span>
                    </div>
                    <div className="text-xs">
                      Summary: {getRecordSummary(selectedRecord).genericCount}{" "}
                      Generic(s), {getRecordSummary(selectedRecord).apiCount}{" "}
                      API(s), {getRecordSummary(selectedRecord).testTypeCount}{" "}
                      Test Type(s)
                    </div>
                  </div>
                )}
              </div>
            </div>

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

            <div className="px-6 py-4 border-b border-gray-300 bg-gray-50">
              <form onSubmit={handleSearchSubmit} className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by MFC Number, Generic Name, API Name, Product ID, or Column Code..."
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

              {!isLoading && !errorMessage && (
                <div className="mt-3 text-sm text-gray-600">
                  {searchTerm ? (
                    <span>
                      Found {pagination.total} results for "{searchTerm}"
                    </span>
                  ) : (
                    <span>Showing {pagination.total} total records</span>
                  )}
                  {lookupLoading && (
                    <span className="ml-4 text-orange-600">
                      • Loading lookup data...
                    </span>
                  )}
                </div>
              )}
            </div>

            {(isLoading || lookupLoading) && (
              <div className="px-6 py-12">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">
                    {lookupLoading
                      ? "Loading lookup data..."
                      : "Loading MFC records..."}
                  </span>
                </div>
              </div>
            )}

            {!isLoading && !lookupLoading && !errorMessage && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 text-xs">
                  <thead className="bg-gray-200">
                    <tr>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        MFC Number
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Product IDs
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Generic Name
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        API Name
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Test Type
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Column
                      </th>
                      <th
                        colSpan={4}
                        className="px-2 py-2 text-center font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Mobile Phase
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Detector
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Pharmacopoeial
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Sample Inj
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Std Inj
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Blank
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Run Time
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Flags
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Actions
                      </th>
                    </tr>
                    <tr>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-gray-50">
                        MP1
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-gray-50">
                        MP2
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-gray-50">
                        MP3
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-gray-50">
                        MP4
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mfcRecords.length > 0 ? (
                      (() => {
                        let tableRows: JSX.Element[] = [];

                        mfcRecords.forEach((record, recordIndex) => {
                          record.generics?.forEach((generic, genericIndex) => {
                            generic.apis?.forEach((api, apiIndex) => {
                              api.testTypes?.forEach(
                                (testType, testTypeIndex) => {
                                  const isFirstRowForRecord =
                                    genericIndex === 0 &&
                                    apiIndex === 0 &&
                                    testTypeIndex === 0;
                                  const isFirstRowForGeneric =
                                    apiIndex === 0 && testTypeIndex === 0;
                                  const isFirstRowForApi = testTypeIndex === 0;

                                  const totalTestTypesInRecord =
                                    record.generics?.reduce(
                                      (total, g) =>
                                        total +
                                        (g.apis?.reduce(
                                          (apiTotal, a) =>
                                            apiTotal +
                                            (a.testTypes?.length || 0),
                                          0
                                        ) || 0),
                                      0
                                    ) || 1;
                                  const totalTestTypesInGeneric =
                                    generic.apis?.reduce(
                                      (total, a) =>
                                        total + (a.testTypes?.length || 0),
                                      0
                                    ) || 1;
                                  const testTypesInApi =
                                    api.testTypes?.length || 1;

                                  tableRows.push(
                                    <tr
                                      key={`${recordIndex}-${genericIndex}-${apiIndex}-${testTypeIndex}`}
                                      onClick={() => handleRowSelect(record)}
                                      className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                                        selectedRecord?._id === record._id
                                          ? "bg-blue-100"
                                          : ""
                                      }`}
                                    >
                                      {isFirstRowForRecord && (
                                        <>
                                          <td
                                            rowSpan={totalTestTypesInRecord}
                                            className="px-2 py-2 border border-gray-300 font-mono text-xs font-medium bg-blue-50"
                                          >
                                            {record.mfcNumber}
                                          </td>
                                          <td
                                            rowSpan={totalTestTypesInRecord}
                                            className="px-2 py-2 border border-gray-300 text-xs font-mono"
                                          >
                                            {record.productIds
                                              ?.map((pi) => pi.id)
                                              .join(", ") || "-"}
                                          </td>
                                        </>
                                      )}

                                      {isFirstRowForGeneric && (
                                        <td
                                          rowSpan={totalTestTypesInGeneric}
                                          className="px-2 py-2 border border-gray-300 text-xs bg-green-50"
                                        >
                                          {generic.genericName}
                                        </td>
                                      )}

                                      {isFirstRowForApi && (
                                        <td
                                          rowSpan={testTypesInApi}
                                          className="px-2 py-2 border border-gray-300 text-xs bg-yellow-50"
                                        >
                                          {api.apiName}
                                        </td>
                                      )}

                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        <div className="font-medium text-gray-900">
                                          {getTestTypeName(testType.testTypeId)}
                                        </div>
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        <div className="font-medium text-gray-900">
                                          {getColumnName(testType.columnCode) ||
                                            testType.columnCode}
                                        </div>
                                        {getColumnName(testType.columnCode) !==
                                          testType.columnCode && (
                                          <div className="text-gray-400 text-xs font-mono">
                                            {testType.columnCode}
                                          </div>
                                        )}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.mobilePhaseCodes?.[0] ? (
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {getMobilePhaseName(
                                                testType.mobilePhaseCodes[0]
                                              )}
                                            </div>
                                            {getMobilePhaseName(
                                              testType.mobilePhaseCodes[0]
                                            ) !==
                                              testType.mobilePhaseCodes[0] && (
                                              <div className="text-gray-400 text-xs font-mono">
                                                {testType.mobilePhaseCodes[0]}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.mobilePhaseCodes?.[1] ? (
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {getMobilePhaseName(
                                                testType.mobilePhaseCodes[1]
                                              )}
                                            </div>
                                            {getMobilePhaseName(
                                              testType.mobilePhaseCodes[1]
                                            ) !==
                                              testType.mobilePhaseCodes[1] && (
                                              <div className="text-gray-400 text-xs font-mono">
                                                {testType.mobilePhaseCodes[1]}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.mobilePhaseCodes?.[2] ? (
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {getMobilePhaseName(
                                                testType.mobilePhaseCodes[2]
                                              )}
                                            </div>
                                            {getMobilePhaseName(
                                              testType.mobilePhaseCodes[2]
                                            ) !==
                                              testType.mobilePhaseCodes[2] && (
                                              <div className="text-gray-400 text-xs font-mono">
                                                {testType.mobilePhaseCodes[2]}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.mobilePhaseCodes?.[3] ? (
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {getMobilePhaseName(
                                                testType.mobilePhaseCodes[3]
                                              )}
                                            </div>
                                            {getMobilePhaseName(
                                              testType.mobilePhaseCodes[3]
                                            ) !==
                                              testType.mobilePhaseCodes[3] && (
                                              <div className="text-gray-400 text-xs font-mono">
                                                {testType.mobilePhaseCodes[3]}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        <div className="font-medium text-gray-900">
                                          {getDetectorTypeName(
                                            testType.detectorTypeId
                                          )}
                                        </div>
                                        {getDetectorTypeName(
                                          testType.detectorTypeId
                                        ) !== testType.detectorTypeId && (
                                          <div className="text-gray-400 text-xs font-mono">
                                            {testType.detectorTypeId}
                                          </div>
                                        )}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        <div className="font-medium text-gray-900">
                                          {getPharmacopoeialsName(
                                            testType.pharmacopoeialId
                                          )}
                                        </div>
                                        {getPharmacopoeialsName(
                                          testType.pharmacopoeialId
                                        ) !== testType.pharmacopoeialId && (
                                          <div className="text-gray-400 text-xs font-mono">
                                            {testType.pharmacopoeialId}
                                          </div>
                                        )}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.sampleInjection}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.standardInjection}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.blankInjection}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.runTime}
                                      </td>

                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        {getTestTypeFlags(testType)}
                                      </td>

                                      {isFirstRowForRecord && (
                                        <td
                                          rowSpan={totalTestTypesInRecord}
                                          className="px-2 py-2 border border-gray-300 text-xs"
                                        >
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleEdit(record)}
                                              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDelete(record)
                                              }
                                              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  );
                                }
                              );
                            });
                          });
                        });

                        return tableRows;
                      })()
                    ) : (
                      <tr>
                        <td
                          colSpan={18}
                          className="px-6 py-4 text-center text-gray-500 border border-gray-300"
                        >
                          No MFC records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && !lookupLoading && pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Search MFC Records
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSearchSubmit} className="mb-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Search by MFC Number, Generic Name, API Name, Product ID, or Column Code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSearchModal(false)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Close
                  </button>
                </div>
              </form>

              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          MFC Number
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Product IDs
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Generic Name
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          API Count
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Test Type Count
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Department
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mfcRecords.length > 0 ? (
                        mfcRecords.map((record, index) => (
                          <tr
                            key={index}
                            onClick={() => handleRowSelect(record)}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              selectedRecord?._id === record._id
                                ? "bg-blue-100"
                                : ""
                            }`}
                          >
                            <td className="px-2 py-2 border border-gray-300 font-mono text-xs">
                              {record.mfcNumber}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs font-mono">
                              {record.productIds
                                ?.map((pi) => pi.id)
                                .join(", ") || "-"}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              {record.generics?.[0]?.genericName || "-"}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              {getRecordSummary(record).apiCount}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              {getRecordSummary(record).testTypeCount}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              {getDepartmentName(record.departmentId)}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(record)}
                                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(record)}
                                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-4 text-center text-gray-500 border border-gray-300"
                          >
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Audit Trail</h2>
            </div>
            <div className="p-6">
              {auditLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">
                    Loading audit records...
                  </span>
                </div>
              ) : auditRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          MFC Number
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Action
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Performed By
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Performed At
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Field
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Old Value
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          New Value
                        </th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-300">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auditRecords.map((audit) =>
                        audit.changes.map((change, index) => (
                          <tr key={`${audit._id}-${index}`}>
                            {index === 0 && (
                              <>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-2 py-2 border border-gray-300 font-mono text-xs"
                                >
                                  {audit.mfcNumber}
                                </td>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-2 py-2 border border-gray-300 text-xs"
                                >
                                  {audit.action}
                                </td>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-2 py-2 border border-gray-300 text-xs"
                                >
                                  {audit.performedBy}
                                </td>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-2 py-2 border border-gray-300 text-xs"
                                >
                                  {new Date(audit.performedAt).toLocaleString()}
                                </td>
                              </>
                            )}
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              {change.field}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              {formatChangeValue(change.oldValue)}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-xs">
                              {formatChangeValue(change.newValue)}
                            </td>
                            {index === 0 && (
                              <td
                                rowSpan={audit.changes.length}
                                className="px-2 py-2 border border-gray-300 text-xs"
                              >
                                {audit.reason || "-"}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No audit records found
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Help - MFC Master
              </h2>
            </div>
            <div className="p-6">
              <h3 className="text-md font-semibold mb-2">Overview</h3>
              <p className="text-sm text-gray-600 mb-4">
                The MFC Master module allows you to manage Method Flow Chart
                (MFC) records. You can create, edit, delete, and view records,
                as well as perform searches and view audit trails.
              </p>
              <h3 className="text-md font-semibold mb-2">Toolbar Actions</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-4">
                <li>
                  <strong>Add New:</strong> Open a form to create a new MFC
                  record.
                </li>
                <li>
                  <strong>Save:</strong> Save the currently open form (available
                  when editing).
                </li>
                <li>
                  <strong>Clear:</strong> Reset the form or clear the selected
                  record.
                </li>
                <li>
                  <strong>Exit:</strong> Return to the dashboard.
                </li>
                <li>
                  <strong>Up/Down:</strong> Navigate through records in the
                  table.
                </li>
                <li>
                  <strong>Search:</strong> Open the search modal to find
                  records.
                </li>
                <li>
                  <strong>Edit:</strong> Edit the selected record.
                </li>
                <li>
                  <strong>Delete:</strong> Delete the selected record.
                </li>
                <li>
                  <strong>Audit:</strong> View the audit trail for the selected
                  record.
                </li>
                <li>
                  <strong>Print:</strong> Print the selected record.
                </li>
                <li>
                  <strong>Help:</strong> Open this help modal.
                </li>
              </ul>
              <h3 className="text-md font-semibold mb-2">Form Fields</h3>
              <p className="text-sm text-gray-600 mb-4">
                The form includes fields for MFC Number, Generic Name,
                Department, APIs, Test Types, and Product IDs. Ensure all
                required fields are filled, especially for APIs and Test Types,
                which include nested configurations for test parameters and
                flags (Bulk, FP, Stability Partial, Stability Final, AMV, PV,
                CV, Is Linked).
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectedMFCMasterPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <MFCMasterPage />
    </ProtectedRoute>
  );
};

export default ProtectedMFCMasterPage;
