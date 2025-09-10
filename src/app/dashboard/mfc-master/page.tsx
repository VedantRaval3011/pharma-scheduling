"use client";

import React, { useState, useEffect, JSX, useMemo } from "react";
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
  api?: string;
  apiName?: string;
  testType?: string;
  detectorType?: string;
  department?: string;
  pharmacopeial?: string;
  desc?: string;
  companyId?: string;
  locationId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Product {
  _id: string;
  productName: string;
  productCode: string;
  genericName: string;
  makeId: string;
  marketedBy: string;
  mfcs: string[];
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  const [auditFilters, setAuditFilters] = useState({
    search: "",
    action: "",
    dateFrom: "",
    dateTo: "",
  });
  const [activeTab, setActiveTab] = useState<
    "active" | "obsolete" | "rawMaterial"
  >("active");

  // Lookup data states
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [detectorTypes, setDetectorTypes] = useState<DetectorType[]>([]);
  const [pharmacopoeials, setPharmacopoeials] = useState<Pharmacopoeial[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [mobilePhases, setMobilePhases] = useState<MobilePhase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [apis, setApis] = useState<MasterItem[]>([]);
  const [columnDisplayTexts, setColumnDisplayTexts] = useState<{
    [key: string]: string;
  }>({});
  const [fetchingColumnTexts, setFetchingColumnTexts] = useState<Set<string>>(
    new Set()
  );

  // Get company and location IDs from localStorage
  const getStorageIds = () => {
    if (typeof window === "undefined")
      return { companyId: null, locationId: null };
    const companyId = localStorage.getItem("companyId");
    const locationId = localStorage.getItem("locationId");
    return { companyId, locationId };
  };

  const fetchColumnDisplayText = async (columnId: string): Promise<string> => {
    console.log("🔍 fetchColumnDisplayText called with columnId:", columnId);

    try {
      const locationId = getStorageIds().locationId;
      const companyId = getStorageIds().companyId;

      console.log("🔍 Storage IDs:", { locationId, companyId });

      if (!locationId || !companyId) {
        console.error("❌ Missing locationId or companyId");
        return columnId;
      }

      const url = `/api/admin/column/desc?descriptionId=${columnId}&locationId=${locationId}&companyId=${companyId}`;
      console.log("🔍 Fetching URL:", url);

      const response = await fetch(url);
      console.log("🔍 Response status:", response.status);

      if (!response.ok) {
        console.error(
          "❌ API response not ok:",
          response.status,
          response.statusText
        );
        return columnId;
      }

      const data = await response.json();
      console.log("🔍 Response data:", data);

      if (data.success && data.data) {
        const {
          prefixId,
          carbonType,
          innerDiameter,
          length,
          particleSize,
          suffixId,
          makeId,
        } = data.data;

        console.log("🔍 Extracted data:", {
          prefixId: prefixId?.name,
          carbonType,
          innerDiameter,
          length,
          particleSize,
          suffixId: suffixId?.name,
          makeId: makeId?.make,
        });

        // Build display text in the format: ${prefix} ${carbonType} ${innerDiameter} x ${length} ${particleSize}µm ${suffix}-{desc.make}
        const prefix = prefixId?.name || "";
        const suffix = suffixId?.name || "";
        const make = makeId?.make || "";

        let displayText = "";

        // Add prefix if exists
        if (prefix) {
          displayText += `${prefix} `;
        }

        // Add carbon type, dimensions, and particle size
        displayText += `${carbonType} ${innerDiameter} x ${length} ${particleSize}µm`;

        // Add suffix if exists
        if (suffix) {
          displayText += ` ${suffix}`;
        }

        // Add make
        if (make) {
          displayText += `-${make}`;
        }

        const finalDisplayText = displayText.trim();
        console.log("✅ Final display text:", finalDisplayText);
        return finalDisplayText;
      } else {
        console.error("❌ API response not successful or no data:", data);
      }
    } catch (error) {
      console.error("❌ Error fetching column details:", error);
    }

    console.log("⚠️ Fallback to columnId:", columnId);
    return columnId; // Fallback to columnId
  };

  const getColumnDisplayText = useMemo(() => {
    return (columnId: string) => {
      if (!columnId) return "";

      // First, try to find the column in the lookup data
      const columnMatch = columns.find(
        (item) => item.value === columnId || item._id === columnId
      );

      // If we have a simple column code (like CL01, CL02), use it directly
      if (columnMatch && columnMatch.columnCode) {
        return columnMatch.columnCode;
      }

      // If we already have fetched the make-specific display text, return it
      if (columnDisplayTexts[columnId]) {
        return columnDisplayTexts[columnId];
      }

      // If we're currently fetching this column, return a temporary display
      if (fetchingColumnTexts.has(columnId)) {
        return columnMatch?.label || "Loading...";
      }

      // If no simple column code exists, this might be a make-specific column
      // Start fetching make-specific details
      setFetchingColumnTexts((prev) => new Set(prev).add(columnId));

      fetchColumnDisplayText(columnId).then((displayText) => {
        setColumnDisplayTexts((prev) => ({
          ...prev,
          [columnId]: displayText,
        }));
        setFetchingColumnTexts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(columnId);
          return newSet;
        });
      });

      // While fetching, return the best fallback available
      return columnMatch?.label || columnId;
    };
  }, [columnDisplayTexts, fetchingColumnTexts, columns]);

  // Normalize API response to {value, label} format
  const normalizeToMasterFormat = (data: any[]): MasterItem[] => {
    return data.map((item) => ({
      value: item._id || item.value || item.id,
      label:
        item.detectorType ||
        item.testType ||
        item.api || // This maps the "api" field from your response
        item.apiName || // Keep this for backward compatibility
        item.department ||
        item.columnCode ||
        item.pharmacopeial ||
        item.name ||
        item.label ||
        item.code ||
        item.description ||
        item.value,
      ...item,
      // Add this to ensure apiName is always available
      apiName: item.api || item.apiName || item.name || item.label,
    }));
  };

  const getProductCodeTooltip = (
    productData: Array<{ code: string; name: string }>
  ): string => {
    if (productData.length <= 2) return "";
    return productData.map((p) => `${p.code} (${p.name})`).join("\n");
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

      console.log("=== FETCHING LOOKUP DATA ===");
      console.log("Company ID:", companyId);
      console.log("Location ID:", locationId);

      const [
        testTypesRes,
        detectorTypesRes,
        pharmacopoeialsRes,
        departmentsRes,
        columnsRes,
        productsRes,
        apiRes,
      ] = await Promise.all([
        fetch(`/api/admin/test-type?${params}`),
        fetch(`/api/admin/detector-type?${params}`),
        fetch(`/api/admin/pharmacopeial?${params}`),
        fetch(`/api/admin/department?${params}`),
        fetch(`/api/admin/column/getAll?${params}`),
        fetch(`/api/admin/product?${params}`),
        fetch(`/api/admin/api?${params}`),
      ]);

      // Process each response separately to avoid stream conflicts
      try {
        if (testTypesRes.ok) {
          const testTypesData = await testTypesRes.json();
          setTestTypes(normalizeToMasterFormat(testTypesData.data || []));
        }
      } catch (error) {
        console.error("Error processing test types:", error);
      }

      try {
        if (detectorTypesRes.ok) {
          const detectorTypesData = await detectorTypesRes.json();
          setDetectorTypes(
            normalizeToMasterFormat(detectorTypesData.data || [])
          );
        }
      } catch (error) {
        console.error("Error processing detector types:", error);
      }

      try {
        if (pharmacopoeialsRes.ok) {
          const pharmacopoeialsData = await pharmacopoeialsRes.json();
          setPharmacopoeials(
            normalizeToMasterFormat(pharmacopoeialsData.data || [])
          );
        }
      } catch (error) {
        console.error("Error processing pharmacopoeials:", error);
      }

      try {
        if (departmentsRes.ok) {
          const departmentsData = await departmentsRes.json();
          setDepartments(normalizeToMasterFormat(departmentsData.data || []));
        }
      } catch (error) {
        console.error("Error processing departments:", error);
      }

      try {
        if (columnsRes.ok) {
          const columnsData = await columnsRes.json();
          setColumns(normalizeToMasterFormat(columnsData.data || []));
        }
      } catch (error) {
        console.error("Error processing columns:", error);
      }

      try {
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          console.log("=== PRODUCTS FETCHED ===");
          console.log("Products response:", productsData);
          console.log("Products array length:", productsData.data?.length || 0);

          if (productsData.data && Array.isArray(productsData.data)) {
            setProducts(productsData.data);
            console.log("First few products:", productsData.data.slice(0, 3));
          } else {
            console.warn("Products data is not an array:", productsData);
            setProducts([]);
          }
        } else {
          console.error("Failed to fetch products:", productsRes.status);
          setProducts([]);
        }
      } catch (error) {
        console.error("Error processing products:", error);
        setProducts([]);
      }

      try {
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          console.log("=== API DATA FETCHED ===");
          console.log("API response:", apiData);
          setApis(normalizeToMasterFormat(apiData.data || []));
        } else {
          console.error("Failed to fetch API data:", apiRes.status);
          setApis([]);
        }
      } catch (error) {
        console.error("Error processing API data:", error);
        setApis([]);
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

  useEffect(() => {
    if (mfcRecords.length > 0) {
      console.log("Sample MFC Record:", mfcRecords[0]);
      console.log(
        "Sample API object:",
        mfcRecords[0]?.generics?.[0]?.apis?.[0]
      );
      console.log("APIs lookup data:", apis.slice(0, 3));
    }
  }, [mfcRecords, apis]);

  const getPharmacopoeialsTickTableForTestType = (
    testType: any,
    apiName?: string
  ): JSX.Element | string => {
    if (!testType?.pharmacopoeialId || !pharmacopoeials.length) return "-";

    const selectedIds = Array.isArray(testType.pharmacopoeialId)
      ? testType.pharmacopoeialId
      : [testType.pharmacopoeialId];

    // Get the specific pharmacopoeials that are selected for this test type
    const selectedPharmcos = pharmacopoeials.filter((pharmaco) =>
      selectedIds.some(
        (id: string) => id === pharmaco.value || id === pharmaco._id
      )
    );

    // Show more pharmacopoeials if needed, but limit to prevent excessive width
    const maxCols = Math.min(pharmacopoeials.length, 12); // Max 12 columns
    const displayPharmcos = pharmacopoeials.slice(0, maxCols);

    if (displayPharmcos.length === 0) return "-";

    return (
      <div
        className="pharmaco-grid text-xs w-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${displayPharmcos.length}, minmax(1rem, 1fr))`,
          gap: "0.25rem",
        }}
      >
        {/* Headers */}
        <div className="contents">
          {displayPharmcos.map((pharmaco, index) => {
            const label = pharmaco.label || pharmaco.name || "";
            const shortLabel = label.length > 4 ? label.substring(0, 4) : label;
            return (
              <div
                key={`header-${index}`}
                className="pharmaco-header text-center font-medium text-gray-600 mb-1 text-xs"
                title={label} // Show full name on hover
              >
                {shortLabel}
              </div>
            );
          })}
        </div>

        {/* Ticks/Crosses */}
        <div className="contents">
          {displayPharmcos.map((pharmaco, index) => {
            const isSelected = selectedIds.some(
              (id: string) => id === pharmaco.value || id === pharmaco._id
            );
            return (
              <div key={`tick-${index}`} className="text-center">
                <span
                  className={`inline-block font-bold ${
                    isSelected ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {isSelected ? "✔️" : "❌"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getPharmacopoeialsTickTable = (
    ids: string | string[],
    testType?: any // Add testType parameter to get context-specific pharmacopoeials
  ): JSX.Element | string => {
    if (!ids || !pharmacopoeials.length) return "-";

    // Handle both single ID and array of IDs
    const idArray = Array.isArray(ids) ? ids : [ids];

    // If we have a specific testType, we can get more targeted pharmacopoeials
    // Otherwise, get the commonly used ones (first 6)
    const displayPharmcos = pharmacopoeials.slice(0, 6);

    if (displayPharmcos.length === 0) return "-";

    return (
      <div className="pharmaco-grid grid grid-cols-6 gap-1 text-xs">
        {/* Headers */}
        <div className="contents">
          {displayPharmcos.map((pharmaco, index) => {
            const label = pharmaco.label || pharmaco.name || "";
            const shortLabel = label.length > 3 ? label.substring(0, 3) : label;
            return (
              <div
                key={`header-${index}`}
                className="pharmaco-header text-center font-medium text-gray-600 mb-1"
              >
                {shortLabel}
              </div>
            );
          })}
        </div>

        {/* Ticks/Crosses */}
        <div className="contents">
          {displayPharmcos.map((pharmaco, index) => {
            const isSelected = idArray.some(
              (id) => id === pharmaco.value || id === pharmaco._id
            );
            return (
              <div key={`tick-${index}`} className="text-center">
                <span
                  className={`inline-block ${
                    isSelected ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {isSelected ? "✓" : "✗"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const getTestTypeName = (id: string) => getLabel(id, testTypes);
  const getApiName = (id: string) => {
    if (!id) return "";
    const found = apis.find((item) => item.value === id || item._id === id);
    if (found) {
      // Return the actual API name from the lookup
      return found.api || found.apiName || found.label || found.name || id;
    }
    return id;
  };
  const getDetectorTypeName = (id: string) => getLabel(id, detectorTypes);
  const getPharmacopoeialsName = (ids: string | string[]): string => {
    if (!ids) return "";

    // Handle both single ID (backward compatibility) and array of IDs
    const idArray = Array.isArray(ids) ? ids : [ids];

    const names = idArray.map((id) => {
      const found = pharmacopoeials.find(
        (item) => item.value === id || item._id === id
      );
      return found ? found.label : "";
    });

    return names.join(", ");
  };

  const getDepartmentName = (id: string) => getLabel(id, departments);
  const getColumnName = (columnId: string) => {
    if (!columnId) return "";
    const found = columns.find(
      (item) => item.value === columnId || item._id === columnId
    );
    return found ? found.columnCode || found.label || columnId : columnId;
  };
  const getMobilePhaseName = (id: string) => getLabel(id, mobilePhases);

  // FIXED: Get product codes for MFC using productIds field
  const getProductCodesForMFC = (
    mfcRecord: IMFCMaster
  ): Array<{ code: string; name: string }> => {
    if (!mfcRecord || !products.length) {
      console.log("No MFC record or no products available");
      return [];
    }

    // Get productIds from the MFC record - handle both direct property and nested structure
    interface ProductId {
      id?: string;
      _id?: string;
    }

    let productIds: Array<string | ProductId> = [];

    // Try to get productIds from different possible locations in the record
    if ((mfcRecord as any).productIds) {
      productIds = (mfcRecord as any).productIds;
    } else if (mfcRecord.productIds) {
      productIds = mfcRecord.productIds.map((id) => id.toString());
    }

    if (!productIds || productIds.length === 0) {
      console.log("No productIds found in MFC record");
      return [];
    }

    // Find products that match the productIds in the MFC record
    const relatedProducts = products.filter((product) => {
      const isRelated = productIds.some((pid: any) => {
        // Handle different formats of product IDs
        let productIdToCompare = pid;

        // If pid is an object with id property
        if (typeof pid === "object" && pid !== null) {
          if (pid.id) {
            productIdToCompare = pid.id;
          } else if (pid._id) {
            productIdToCompare = pid._id;
          } else {
            productIdToCompare = pid.toString();
          }
        }

        // Convert to string for comparison
        const pidString = String(productIdToCompare);
        const productIdString = String(product._id);

        const matches = pidString === productIdString;

        if (matches) {
          console.log(
            `✓ Found matching product: ${product.productCode} (${product.productName}) - ID: ${product._id}`
          );
        }

        return matches;
      });

      return isRelated;
    });

    console.log(
      `Found ${relatedProducts.length} products for MFC ${mfcRecord.mfcNumber}`
    );

    const result = relatedProducts.map((product) => ({
      code: product.productCode,
      name: product.productName,
    }));

    console.log("Final product codes result:", result);
    return result;
  };

  // Format product codes display
  const formatProductCodes = (
    productData: Array<{ code: string; name: string }>
  ): string => {
    if (productData.length === 0) return "-";

    if (productData.length <= 2) {
      return productData.map((p) => `${p.code} (${p.name})`).join(", ");
    }

    const first2 = productData
      .slice(0, 2)
      .map((p) => `${p.code} (${p.name})`)
      .join(", ");
    return `${first2} +${productData.length - 2} more`;
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
        populate: "true",
      });

      // Filter based on active tab
      if (activeTab === "obsolete") {
        params.append("isObsolete", "true");
      } else if (activeTab === "rawMaterial") {
        params.append("isRawMaterial", "true");
      } else {
        // Active tab - show only normal records (not obsolete and not raw material)
        params.append("isObsolete", "false");
        params.append("isRawMaterial", "false");
      }

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`/api/admin/mfc?${params}`);
      const data = await response.json();

      console.log("MFC Records Response:", data);

      if (response.ok) {
        const records = data.data || [];
        console.log(`Fetched ${records.length} ${activeTab} MFC records`);

        setMfcRecords(records);
        setPagination(
          data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
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

  const handleTabChange = (tab: "active" | "obsolete" | "rawMaterial") => {
    setActiveTab(tab);
    setSelectedRecord(null);
    setSearchTerm("");
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  // Add useEffect to refetch data when tab changes
  useEffect(() => {
    fetchMFCRecords(1, ""); // Reset to page 1 and clear search when tab changes
  }, [activeTab]);

  // Add function to get tab display info
  const getTabInfo = () => {
    switch (activeTab) {
      case "obsolete":
        return {
          title: "Obsolete MFC Records",
          description: "MFC records that have been marked as obsolete",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "rawMaterial":
        return {
          title: "Raw Material MFC Records",
          description: "MFC records for raw material testing",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      default:
        return {
          title: "Active MFC Records",
          description: "Currently active MFC records",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
    }
  };

  // Fetch audit records
  const fetchAuditRecords = async (
    mfcId?: string,
    filters?: {
      search?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ) => {
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

      if (mfcId) params.append("mfcId", mfcId);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.action) params.append("action", filters.action);
      if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters?.dateTo) params.append("dateTo", filters.dateTo);

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

      // Extract productIds from form data (should be array of objects with id property)
      const productIds =
        formData.productIds?.map((product: any) =>
          typeof product === "object" ? product.id : product
        ) || [];

      console.log("=== FORM SUBMISSION ===");
      console.log("Form Data:", formData);
      console.log("Extracted Product IDs:", productIds);

      const transformedPayload = {
        mfcNumber: trimmedMFCNumber,
        generics: [
          {
            genericName: formData.genericName,
            apis: formData.apis,
          },
        ],
        departmentId: formData.departmentId,
        wash: formData.wash,
        productIds, // Include productIds in the payload
        // Add the new fields
        isObsolete: formData.isObsolete || false,
        isRawMaterial: formData.isRawMaterial || false,
        companyId,
        locationId,
        createdBy: session?.user?.userId || "unknown",
      };

      console.log("Transformed Payload:", transformedPayload);

      let response;
      if (editingRecord) {
        // For editing, use the [id] route
        response = await fetch(
          `/api/admin/mfc/${editingRecord._id}?companyId=${companyId}&locationId=${locationId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...transformedPayload,
              updatedBy: session?.user?.userId || "unknown",
            }),
          }
        );
      } else {
        // For creating new record
        response = await fetch(
          `/api/admin/mfc?companyId=${companyId}&locationId=${locationId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transformedPayload),
          }
        );
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (response.ok) {
        alert(
          `MFC record ${editingRecord ? "updated" : "created"} successfully!`
        );
        setShowForm(false);
        setEditingRecord(null);
        setErrorMessage("");
        fetchMFCRecords(pagination.page, searchTerm);
        // Re-fetch products to get updated MFC associations
        fetchLookupData();
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

      // Use the dynamic route with record ID and query parameters
      const response = await fetch(
        `/api/admin/mfc/${record._id}?locationId=${locationId}&companyId=${companyId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deletedBy: session?.user?.userId || "unknown",
          }),
        }
      );

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
        // Re-fetch products to get updated MFC associations
        fetchLookupData();
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

  // Handle edit - FIXED to fetch the complete record with productIds
  const handleEdit = async (record?: IMFCMaster) => {
    const recordToEdit = record || selectedRecord;
    if (!recordToEdit) {
      alert("Please select a record to edit.");
      return;
    }

    try {
      const { companyId, locationId } = getStorageIds();

      if (!companyId || !locationId) {
        setErrorMessage(
          "Company ID and Location ID not found. Please login again."
        );
        return;
      }

      // Fetch the complete record with populated productIds
      const response = await fetch(
        `/api/admin/mfc/${recordToEdit._id}?companyId=${companyId}&locationId=${locationId}&populate=true`
      );
      const data = await response.json();

      console.log("=== EDIT RECORD FETCH ===");
      console.log("Edit response:", data);

      if (response.ok && data.data) {
        console.log("Setting editing record with populated data:", data.data);
        setEditingRecord(data.data);
        setShowForm(true);
        setErrorMessage("");
      } else {
        console.error("Failed to fetch record for editing:", data.error);
        setErrorMessage(data.error || "Failed to fetch record for editing");
      }
    } catch (error) {
      console.error("Error fetching record for edit:", error);
      setErrorMessage("Failed to fetch record for editing");
    }
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

  // Fixed search handler - opens modal
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

  // Fixed search submit handler - works in modal
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔍 Search submitted with term:", searchTerm);
    fetchMFCRecords(1, searchTerm);
    setShowSearchModal(false);
  };

  // Fixed clear search handler
  const handleClearSearch = () => {
    console.log("🔍 Clearing search");
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

  // Format audit change display - improved version
  const formatChangeValue = (value: any, fieldName?: string) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    // Special handling for pharmacopeial arrays
    if (fieldName?.toLowerCase().includes("pharmacopeial")) {
      if (Array.isArray(value) || typeof value === "string") {
        return getPharmacopoeialsTickTable(value);
      }
    }
    // Special handling for generics field - make it more readable
    if (
      fieldName === "generics" ||
      (typeof value === "object" &&
        Array.isArray(value) &&
        value.length > 0 &&
        value[0].genericName)
    ) {
      if (Array.isArray(value)) {
        return value
          .map((generic, index) => {
            const genericName = generic.genericName || "Unknown Generic";
            const apiCount = generic.apis?.length || 0;
            const testTypeCount =
              generic.apis?.reduce(
                (total: number, api: any) =>
                  total + (api.testTypes?.length || 0),
                0
              ) || 0;

            return `Generic ${
              index + 1
            }: ${genericName} (${apiCount} APIs, ${testTypeCount} Test Types)`;
          })
          .join("; ");
      }
    }

    // Special handling for other complex objects
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        // For arrays, show count and brief summary
        if (value.length > 3) {
          return `Array with ${value.length} items: [${value
            .slice(0, 2)
            .map((item) =>
              typeof item === "object"
                ? JSON.stringify(item).substring(0, 30) + "..."
                : String(item)
            )
            .join(", ")}... +${value.length - 2} more]`;
        } else {
          return value
            .map((item) =>
              typeof item === "object"
                ? JSON.stringify(item).substring(0, 50) +
                  (JSON.stringify(item).length > 50 ? "..." : "")
                : String(item)
            )
            .join(", ");
        }
      } else {
        // For objects, show a summary
        const jsonStr = JSON.stringify(value, null, 2);
        if (jsonStr.length > 100) {
          const keys = Object.keys(value);
          return `Object with ${keys.length} properties: {${keys
            .slice(0, 3)
            .join(", ")}${keys.length > 3 ? "..." : ""}}`;
        }
        return jsonStr;
      }
    }

    const valueStr = String(value);

    // Handle ObjectId lookups
    if (valueStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(valueStr)) {
      const testTypeName = getTestTypeName(valueStr);
      const detectorTypeName = getDetectorTypeName(valueStr);
      const pharmacopoeialsName = getPharmacopoeialsName(valueStr); // This will now handle both single and array
      const departmentName = getDepartmentName(valueStr);
      const columnName = getColumnName(valueStr);
      const apiName = getApiName(valueStr);

      if (testTypeName !== valueStr) return `${testTypeName}`;
      if (detectorTypeName !== valueStr) return `${detectorTypeName}`;
      if (pharmacopoeialsName !== valueStr) return `${pharmacopoeialsName}`;
      if (departmentName !== valueStr) return `${departmentName}`;
      if (columnName !== valueStr) return `${columnName}`;
      if (apiName !== valueStr) return `${apiName}`;
    }

    // Handle arrays of ObjectIds (for pharmacopeial arrays)
    if (
      Array.isArray(value) &&
      value.every(
        (v) =>
          typeof v === "string" &&
          v.length === 24 &&
          /^[0-9a-fA-F]{24}$/.test(v)
      )
    ) {
      return value.map((id) => getPharmacopoeialsName(id)).join(", ");
    }

    // Truncate very long strings
    if (valueStr.length > 100) {
      return valueStr.substring(0, 100) + "...";
    }

    return valueStr;
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

  // Debug effect to monitor data changes
  useEffect(() => {
    if (mfcRecords.length > 0 && products.length > 0) {
      console.log("=== DEBUG: Data Synchronization ===");
      console.log("Total MFC Records:", mfcRecords.length);
      console.log("Total Products:", products.length);

      mfcRecords.forEach((record, index) => {
        const productCodes = getProductCodesForMFC(record);
        console.log(
          `MFC ${record.mfcNumber}: ${productCodes.length} products found`
        );
        if (
          productCodes.length === 0 &&
          (record as any).productIds?.length > 0
        ) {
          console.warn(
            `⚠️  MFC ${record.mfcNumber} has productIds but no matching products found`
          );
          console.log("ProductIds:", (record as any).productIds);
        }
      });
    }
  }, [mfcRecords, products]);

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
                      Products:{" "}
                      {formatProductCodes(
                        getProductCodesForMFC(selectedRecord)
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 flex gap-2 border-b border-gray-300 bg-gray-50">
              <button
                onClick={() => handleTabChange("active")}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === "active"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Active MFCs
              </button>
              <button
                onClick={() => handleTabChange("obsolete")}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === "obsolete"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Obsolete MFCs
              </button>
              <button
                onClick={() => handleTabChange("rawMaterial")}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === "rawMaterial"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Raw Material MFCs
              </button>
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

            {/* Tab Content Description */}
            <div
              className={`p-3 rounded-lg ${getTabInfo().bgColor} ${
                getTabInfo().borderColor
              } border`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {getTabInfo().title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {getTabInfo().description}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
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
              </div>
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
                        Product Codes
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
                        colSpan={6}
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
                        className="px-2 py-2 font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                        style={{
                          minWidth: `${
                            Math.max(6, Math.min(pharmacopoeials.length, 12)) *
                            2.5
                          }rem`,
                        }}
                      >
                        Pharmacopoeial
                      </th>

                      {/* New Injection & Reference Fields Group */}
                      <th
                        colSpan={9}
                        className="px-2 py-2 text-center font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-blue-100"
                      >
                        Injection & Reference Fields
                      </th>
                      {/* New Runtime & Wash Fields Group */}
                      <th
                        colSpan={9}
                        className="px-2 py-2 text-center font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-green-100"
                      >
                        Runtime & Wash Fields
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        AMV Inj
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        PV Inj
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        CV Inj
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Outsourced
                      </th>
                      <th
                        rowSpan={2}
                        className="px-2 py-2 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400 bg-gray-100"
                      >
                        Stage
                      </th>
                    </tr>
                    <tr>
                      {/* Mobile Phase sub-headers */}
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
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-gray-50">
                        Wash1
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-gray-50">
                        Wash2
                      </th>

                      {/* Injection & Reference Fields sub-headers */}
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Blank Inj
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        System Suit
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Sensitivity
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Placebo
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Std Inj
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Ref 1
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Ref 2
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Sample Inj
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-blue-50">
                        Bracket Freq
                      </th>

                      {/* Runtime & Wash Fields sub-headers */}
                      {/* Updated Runtime & Wash Fields sub-headers */}
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Wash Time
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Blank Run
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Std Run
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Sample Run
                      </th>
                      {/* New Runtime Fields */}
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Sys Suit Run
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Sensitivity Run
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Placebo Run
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Ref1 Run
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-400 bg-green-50">
                        Ref2 Run
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
                                  const productData =
                                    getProductCodesForMFC(record);

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
                                      {/* MFC Number - spans all rows for this record */}
                                      {isFirstRowForRecord && (
                                        <td
                                          rowSpan={totalTestTypesInRecord}
                                          className="px-2 py-2 border border-gray-300 font-mono text-xs font-medium bg-blue-50"
                                        >
                                          <div className="text-center">
                                            <div className="font-bold">
                                              {record.mfcNumber}
                                            </div>
                                            <div className="mt-1 flex flex-col items-center gap-1">
                                              {(record as any).isObsolete && (
                                                <span className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded text-xs font-normal">
                                                  Obsolete
                                                </span>
                                              )}
                                              {(record as any)
                                                .isRawMaterial && (
                                                <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs font-normal">
                                                  Raw Material
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      )}

                                      {/* Product Codes - show all products in one cell, spans all rows for this record */}
                                      {isFirstRowForRecord && (
                                        <td
                                          rowSpan={totalTestTypesInRecord}
                                          className="px-2 py-2 border border-gray-300 text-xs bg-purple-50"
                                          title={getProductCodeTooltip(
                                            productData
                                          )}
                                        >
                                          <div className="max-w-32">
                                            {formatProductCodes(productData)}
                                          </div>
                                        </td>
                                      )}

                                      {/* Generic Name - spans all rows for this generic */}
                                      {isFirstRowForGeneric && (
                                        <td
                                          rowSpan={totalTestTypesInGeneric}
                                          className="px-2 py-2 border border-gray-300 text-xs font-medium bg-green-50"
                                        >
                                          {generic.genericName}
                                        </td>
                                      )}

                                      {/* API Name - spans all rows for this api */}
                                      {isFirstRowForApi && (
                                        <td
                                          rowSpan={testTypesInApi}
                                          className="px-2 py-2 border border-gray-300 text-xs bg-yellow-50"
                                        >
                                          {(() => {
                                            // Check if any test type in this API is linked
                                            const hasLinkedTestType =
                                              api.testTypes?.some(
                                                (testType) => testType.isLinked
                                              );

                                            return (
                                              <div
                                                className={`font-medium ${
                                                  hasLinkedTestType
                                                    ? "font-bold"
                                                    : ""
                                                }`}
                                                style={{
                                                  color: hasLinkedTestType
                                                    ? "#af261c"
                                                    : "#1e1e1e",
                                                  fontWeight: hasLinkedTestType
                                                    ? "bold"
                                                    : "medium",
                                                }}
                                              >
                                                {getApiName(api.apiName)}
                                                {hasLinkedTestType && (
                                                  <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                                                    LINKED
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </td>
                                      )}

                                      {/* Test Type - one row per test type */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        <div className="font-medium text-gray-900">
                                          {getTestTypeName(testType.testTypeId)}
                                        </div>
                                      </td>

                                      {/* Column - one row per test type */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        <div className="font-medium text-gray-900">
                                          {getColumnDisplayText(
                                            testType.columnCode
                                          ) || testType.columnCode}
                                        </div>
                                      </td>

                                      {/* Mobile Phase columns - one row per test type */}
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

                                      {/* NEW: Wash 1 column */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.mobilePhaseCodes?.[4] ? (
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {getMobilePhaseName(
                                                testType.mobilePhaseCodes[4]
                                              )}
                                            </div>
                                            {getMobilePhaseName(
                                              testType.mobilePhaseCodes[4]
                                            ) !==
                                              testType.mobilePhaseCodes[4] && (
                                              <div className="text-gray-400 text-xs font-mono">
                                                {testType.mobilePhaseCodes[4]}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </td>

                                      {/* NEW: Wash 2 column */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.mobilePhaseCodes?.[5] ? (
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {getMobilePhaseName(
                                                testType.mobilePhaseCodes[5]
                                              )}
                                            </div>
                                            {getMobilePhaseName(
                                              testType.mobilePhaseCodes[5]
                                            ) !==
                                              testType.mobilePhaseCodes[5] && (
                                              <div className="text-gray-400 text-xs font-mono">
                                                {testType.mobilePhaseCodes[5]}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </td>

                                      {/* Detector - one row per test type */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        <div className="font-medium text-gray-900">
                                          {getDetectorTypeName(
                                            testType.detectorTypeId
                                          )}
                                        </div>
                                      </td>

                                      <td
                                        className="px-2 py-2 border border-gray-300 text-xs"
                                        style={{
                                          minWidth: `${
                                            Math.max(
                                              6,
                                              Math.min(
                                                pharmacopoeials.length,
                                                12
                                              )
                                            ) * 2.5
                                          }rem`,
                                        }}
                                      >
                                        {record.generics?.[0]?.apis?.[0]
                                          ?.testTypes?.[0]?.pharmacopoeialId ? (
                                          <div className="font-mono text-center leading-tight w-full">
                                            {getPharmacopoeialsTickTableForTestType(
                                              record.generics[0].apis[0]
                                                .testTypes[0],
                                              getApiName(
                                                record.generics[0].apis[0]
                                                  .apiName
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-center text-gray-400">
                                            -
                                          </div>
                                        )}
                                      </td>

                                      {/* Blank Injection */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.blankInjection || "-"}
                                      </td>

                                      {/* System Suitability */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.systemSuitability || "-"}
                                      </td>

                                      {/* Sensitivity */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.sensitivity || "-"}
                                      </td>

                                      {/* Placebo */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.placebo || "-"}
                                      </td>

                                      {/* Standard Injection */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.standardInjection || "-"}
                                      </td>

                                      {/* Reference 1 */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.reference1 || "-"}
                                      </td>

                                      {/* Reference 2 */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.reference2 || "-"}
                                      </td>

                                      {/* Sample Injection */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.sampleInjection || "-"}
                                      </td>

                                      {/* Bracketing Frequency */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-blue-25">
                                        {testType.bracketingFrequency || "-"}
                                      </td>

                                      {/* Wash Time */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.washTime || "-"}
                                      </td>

                                      {/* Blank Run Time */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.blankRunTime || "-"}
                                      </td>

                                      {/* Standard Run Time */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.standardRunTime || "-"}
                                      </td>

                                      {/* Sample Run Time */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.sampleRunTime || "-"}
                                      </td>

                                      {/* NEW: System Suitability Runtime */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.systemSuitabilityRunTime ||
                                          "-"}
                                      </td>

                                      {/* NEW: Sensitivity Runtime */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.sensitivityRunTime || "-"}
                                      </td>

                                      {/* NEW: Placebo Runtime */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.placeboRunTime || "-"}
                                      </td>

                                      {/* NEW: Reference1 Runtime */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.reference1RunTime || "-"}
                                      </td>

                                      {/* NEW: Reference2 Runtime */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center bg-green-25">
                                        {testType.reference2RunTime || "-"}
                                      </td>

                                      {/* NEW: AMV Injections */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.amv
                                          ? testType.numberOfInjectionsAMV || 0
                                          : "-"}
                                      </td>

                                      {/* NEW: PV Injections */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.pv
                                          ? testType.numberOfInjectionsPV || 0
                                          : "-"}
                                      </td>

                                      {/* NEW: CV Injections */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        {testType.cv
                                          ? testType.numberOfInjectionsCV || 0
                                          : "-"}
                                      </td>
                                      <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                        <span
                                          className={`inline-block ${
                                            testType.isOutsourcedTest
                                              ? "text-green-600"
                                              : "text-red-500"
                                          }`}
                                        >
                                          {testType.isOutsourcedTest
                                            ? "✓"
                                            : "✗"}
                                        </span>
                                      </td>

                                      {/* Flags - one row per test type */}
                                      <td className="px-2 py-2 border border-gray-300 text-xs">
                                        {getTestTypeFlags(testType)}
                                      </td>
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
                          colSpan={38}
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

      {/* Search Modal - Fixed and working */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
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
                    placeholder="Search by MFC Number, Generic Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isLoading ? "Searching..." : "Search"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 disabled:opacity-50"
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

              {/* Show current search status */}
              <div className="mb-4 text-sm text-gray-600">
                {isLoading ? (
                  "Searching..."
                ) : (
                  <>
                    {searchTerm
                      ? `Found ${pagination.total} results for "${searchTerm}"`
                      : `Showing ${pagination.total} total records`}
                  </>
                )}
              </div>

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
                          Product Codes
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
                        mfcRecords.map((record, index) => {
                          const productCodes = getProductCodesForMFC(record);
                          const apiCount =
                            record.generics?.reduce((total, generic) => {
                              return (
                                total + (generic.apis ? generic.apis.length : 0)
                              );
                            }, 0) || 0;
                          const testTypeCount =
                            record.generics?.reduce((total, generic) => {
                              return (
                                total +
                                (generic.apis?.reduce((apiTotal, api) => {
                                  return (
                                    apiTotal +
                                    (api.testTypes ? api.testTypes.length : 0)
                                  );
                                }, 0) || 0)
                              );
                            }, 0) || 0;

                          return (
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
                              <td
                                className="px-2 py-2 border border-gray-300 text-xs"
                                title={
                                  productCodes.length > 3
                                    ? productCodes
                                        .map((p) => `${p.code} (${p.name})`)
                                        .join(", ")
                                    : ""
                                }
                              >
                                <div className="max-w-32">
                                  {formatProductCodes(productCodes)}
                                </div>
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-xs">
                                {record.generics?.[0]?.genericName || "-"}
                              </td>

                              <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                {apiCount}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-xs text-center">
                                {testTypeCount}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-xs">
                                {record.generics?.[0]?.apis?.[0]?.testTypes?.[0]
                                  ?.pharmacopoeialId ? (
                                  <div className="font-mono text-center leading-tight">
                                    {getPharmacopoeialsTickTableForTestType(
                                      record.generics[0].apis[0].testTypes[0],
                                      getApiName(
                                        record.generics[0].apis[0].apiName
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-400">
                                    -
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-xs">
                                {getDepartmentName(record.departmentId)}
                              </td>
                              <td className="px-2 py-2 border border-gray-300 text-xs">
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(record);
                                    }}
                                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(record);
                                    }}
                                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
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
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                Audit Trail
              </h2>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="🔍 Search by MFC Number, User..."
                  value={auditFilters.search}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, search: e.target.value })
                  }
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />

                <select
                  value={auditFilters.action}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, action: e.target.value })
                  }
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <input
                  type="date"
                  value={auditFilters.dateFrom}
                  onChange={(e) =>
                    setAuditFilters({
                      ...auditFilters,
                      dateFrom: e.target.value,
                    })
                  }
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />

                <input
                  type="date"
                  value={auditFilters.dateTo}
                  onChange={(e) =>
                    setAuditFilters({ ...auditFilters, dateTo: e.target.value })
                  }
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {auditLoading ? (
                <div className="flex justify-center items-center h-full py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 text-sm">
                    Loading audit records...
                  </span>
                </div>
              ) : auditRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-gray-100 text-gray-700 text-xs uppercase tracking-wide">
                      <tr>
                        {[
                          "MFC Number",
                          "Action",
                          "Performed By",
                          "Performed At",
                          "Field",
                          "Old Value",
                          "New Value",
                        ].map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 border text-left font-medium"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditRecords.map((audit) =>
                        audit.changes.map((change, index) => (
                          <tr
                            key={`${audit._id}-${index}`}
                            className="odd:bg-white even:bg-gray-50"
                          >
                            {index === 0 && (
                              <>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-3 py-2 border font-mono text-xs"
                                >
                                  {audit.mfcNumber}
                                </td>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-3 py-2 border text-xs font-semibold"
                                >
                                  <span
                                    className={`px-2 py-1 rounded text-xs ${
                                      audit.action === "CREATE"
                                        ? "bg-green-100 text-green-700"
                                        : audit.action === "UPDATE"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {audit.action}
                                  </span>
                                </td>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-3 py-2 border text-xs"
                                >
                                  {audit.performedBy}
                                </td>
                                <td
                                  rowSpan={audit.changes.length}
                                  className="px-3 py-2 border text-xs"
                                >
                                  {new Date(audit.performedAt).toLocaleString()}
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2 border text-xs">
                              {change.field}
                            </td>
                            <td className="px-3 py-2 border text-xs">
                              {formatChangeValue(change.oldValue)}
                            </td>
                            <td className="px-3 py-2 border text-xs">
                              {formatChangeValue(change.newValue)}
                            </td>
                            <td className="px-3 py-2 border text-xs">
                              {change.field
                                .toLowerCase()
                                .includes("pharmacopeial") ? (
                                <div className="font-mono text-center leading-tight">
                                  <pre className="whitespace-pre text-xs m-0 p-0">
                                    {formatChangeValue(
                                      change.oldValue,
                                      change.field
                                    )}
                                  </pre>
                                </div>
                              ) : (
                                formatChangeValue(change.oldValue, change.field)
                              )}
                            </td>
                            <td className="px-3 py-2 border text-xs">
                              {change.field
                                .toLowerCase()
                                .includes("pharmacopeial") ? (
                                <div className="font-mono text-center leading-tight">
                                  <pre className="whitespace-pre text-xs m-0 p-0">
                                    {formatChangeValue(
                                      change.newValue,
                                      change.field
                                    )}
                                  </pre>
                                </div>
                              ) : (
                                formatChangeValue(change.newValue, change.field)
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  No audit records found
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
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
                Department, APIs, and Test Types. Ensure all required fields are
                filled, especially for APIs and Test Types, which include nested
                configurations for test parameters and flags (Bulk, FP,
                Stability Partial, Stability Final, AMV, PV, CV, Is Linked).
              </p>
              <h3 className="text-md font-semibold mb-2">Product Codes</h3>
              <p className="text-sm text-gray-600 mb-4">
                The Product Codes column shows all product codes that are
                associated with each MFC record. Products are linked to MFC
                records through their productIds. If more than 3 product codes
                exist, a truncated display with a "+X more" indicator is shown.
                Hover over the cell to see all product codes.
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
