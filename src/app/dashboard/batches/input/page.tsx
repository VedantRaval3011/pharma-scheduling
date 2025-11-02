"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Search,
  Plus,
  Play,
  StopCircle,
  Merge,
  X,
} from "lucide-react";
import WindowsToolbar from "@/components/layout/ToolBox";

interface Product {
  _id: string;
  productCode: string;
  productName: string;
  genericName: string;
  mfcs: string[];
  pharmacopeiaToUse?: string;
}

interface MFC {
  _id: string;
  mfcNumber: string;
  departmentId: string;
  generics: Array<{
    genericName: string;
    apis: Array<{
      apiName: string; // Add this line
      testTypes: TestType[];
    }>;
  }>;
}
interface API {
  apiName: string;
  testTypes: TestType[];
}

// Add this interface with other interfaces
interface APIData {
  _id: string;
  api: string;
  desc: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Generic {
  genericName: string;
  apis: API[];
}

interface TestType {
  testTypeId: string;
  columnCode: string;
  mobilePhaseCodes: string[];
  detectorTypeId: string;
  pharmacopoeialId: string | string[];

  // Injection counts
  blankInjection: number;
  standardInjection: number;
  sampleInjection: number;
  systemSuitability: number;
  sensitivity: number;
  placebo: number;
  reference1: number;
  reference2: number;
  bracketingFrequency: number;

  // Runtime values
  runTime: number;
  washTime: number;

  // Individual runtime values
  blankRunTime: number;
  standardRunTime: number;
  sampleRunTime: number;
  systemSuitabilityRunTime: number;
  sensitivityRunTime: number;
  placeboRunTime: number;
  reference1RunTime: number;
  reference2RunTime: number;

  // Test type applicability flags
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
  isOutsourcedTest?: boolean;

  // MISSING PROPERTIES - Add these:
  selectMakeSpecific?: boolean;
  isColumnCodeLinkedToMfc?: boolean;
  injectionTime?: number;
  uniqueRuntimes?: boolean;
  testApplicability?: boolean;
  numberOfInjections?: number;
  numberOfInjectionsAMV?: number;
  numberOfInjectionsPV?: number;
  numberOfInjectionsCV?: number;
  isLinked?: boolean;
  priority?: "urgent" | "high" | "normal";
}

// Updated BatchData test interface
interface BatchData {
  _id?: string;
  productCode: string;
  productName: string;
  genericName: string;
  pharmacopeiaToUse?: string;
  pharmacopoeialName?: string;
  batchNumber: string;
  manufacturingDate?: string;
  withdrawalDate?: string;
  priority: "Urgent" | "High" | "Normal";
  daysForUrgency: number;
  mfcNumber: string;
  departmentName: string;
  typeOfSample: string;

  // Add generics hierarchy
  generics?: Generic[];

  tests: Array<{
    testTypeId: string;
    testName: string;
    columnCode: string;
    mobilePhaseCodes: string[];
    detectorTypeId: string;
    pharmacopoeialId: string | string[]; // ✅ Allow both string and array
    blankInjection: number;
    standardInjection: number;
    sampleInjection: number;
    systemSuitability: number;
    sensitivity: number;
    placebo: number;
    reference1: number;
    reference2: number;
    bracketingFrequency: number;
    runTime: number;
    washTime: number;
    blankRunTime: number;
    standardRunTime: number;
    sampleRunTime: number;
    systemSuitabilityRunTime: number;
    sensitivityRunTime: number;
    placeboRunTime: number;
    reference1RunTime: number;
    reference2RunTime: number;
    outsourced: boolean;
    continueTests: boolean;
    testStatus: "Not Started" | "In Progress" | "Completed";
  }>;
  batchStatus: "Not Started" | "In Progress" | "Closed";
}

interface EnhancedTestType extends TestType {
  testTypeName?: string;
  columnName?: string;
  columnDetails?: string;
  detectorName?: string;
  pharmacopoeialName?: string;
}

interface Department {
  _id: string;
  department: string;
  description: string;
  daysOfUrgency?: number;
}

interface Pharmacopeial {
  _id: string;
  pharmacopeial: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// New interfaces for master data
interface TestTypeData {
  _id: string;
  testType: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DetectorTypeData {
  _id: string;
  detectorType: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ColumnMake {
  _id: string;
  make: string;
  description: string | null;
}

interface ColumnDescription {
  descriptionId: string;
  prefixId: {
    _id: string;
    name: string;
  } | null;
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffixId: {
    _id: string;
    name: string;
  } | null;
  makeId: ColumnMake;
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
  usePrefixForNewCode: boolean;
  useSuffixForNewCode: boolean;
  isObsolete: boolean;
}

interface ColumnData {
  _id: string;
  columnCode: string;
  descriptions: ColumnDescription[];
  companyId: string;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  id: string;
}

export default function BatchInputForm() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get localStorage values
  const [locationId, setLocationId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<Partial<BatchData>>({
    priority: "Normal",
    batchStatus: "Not Started",
  });

  // Options data
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pharmacopoeials, setPharmacopoeials] = useState<Pharmacopeial[]>([]);

  // Master data for name resolution
  const [testTypes, setTestTypes] = useState<TestTypeData[]>([]);
  const [detectorTypes, setDetectorTypes] = useState<DetectorTypeData[]>([]);
  const [columns, setColumns] = useState<ColumnData[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMFC, setSelectedMFC] = useState<MFC | null>(null);
  const [availableTests, setAvailableTests] = useState<EnhancedTestType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Form state control
  const [isProductSelected, setIsProductSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Batch table data
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingNames, setLoadingNames] = useState(false);

  // Toolbar functionality state
  const [selectedBatch, setSelectedBatch] = useState<BatchData | null>(null);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(-1);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [batchSearchTerm, setBatchSearchTerm] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(-1);

  // New state for form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Refs for focus management
  const productSearchRef = useRef<HTMLInputElement>(null);
  const batchSearchInputRef = useRef<HTMLInputElement>(null);
  const [showBatchDetailsModal, setShowBatchDetailsModal] = useState(false);
  const [detailsBatch, setDetailsBatch] = useState<BatchData | null>(null);

  const [apis, setApis] = useState<APIData[]>([]);

  const typeOfSampleOptions = [
    "Bulk",
    "FP",
    "Stability Partial",
    "Stability Final",
    "AMV",
    "PV",
    "CV",
  ];

  // Initialize localStorage values
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLocationId = localStorage.getItem("locationId") || "";
      const storedCompanyId = localStorage.getItem("companyId") || "";
      setLocationId(storedLocationId);
      setCompanyId(storedCompanyId);
    }
  }, []);

  const fetchApis = async (): Promise<void> => {
    try {
      console.log("Fetching APIs with:", { locationId, companyId });
      const response = await fetch(
        `/api/admin/api?locationId=${locationId}&companyId=${companyId}`
      );
      const data: { success: boolean; data: APIData[] } = await response.json();
      console.log("API Response:", data);
      if (data.success) {
        console.log("Setting APIs:", data.data);
        setApis(data.data);
      } else {
        console.error("API fetch failed:", data);
      }
    } catch (error) {
      console.error("Error fetching APIs:", error);
    }
  };

  // Fetch master data functions
  const fetchProducts = async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/admin/product?locationId=${locationId}&companyId=${companyId}`
      );
      const data: { success: boolean; data: Product[] } = await response.json();
      if (data.success) {
        setProducts(data.data);
        setFilteredProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchDepartments = async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/admin/department?locationId=${locationId}&companyId=${companyId}`
      );
      const data: { success: boolean; data: Department[] } =
        await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchBatches = async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/batch-input?locationId=${locationId}&companyId=${companyId}`
      );
      const data: { success: boolean; data: BatchData[] } =
        await response.json();
      if (data.success) {
        setBatches(data.data);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchPharmacopoeials = async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/admin/pharmacopeial?locationId=${locationId}&companyId=${companyId}`
      );
      const data: { success: boolean; data: Pharmacopeial[] } =
        await response.json();
      if (data.success) {
        setPharmacopoeials(data.data);
      }
    } catch (error) {
      console.error("Error fetching pharmacopoeials:", error);
    }
  };

  const fetchTestTypes = async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/admin/test-type?companyId=${companyId}&locationId=${locationId}&limit=10000`
      );
      const data: { success: boolean; data: TestTypeData[] } =
        await response.json();
      if (data.success) {
        console.log("Fetched test types:", data.data);
        setTestTypes(data.data);
      }
    } catch (error) {
      console.error("Error fetching test types:", error);
    }
  };

  const fetchDetectorTypes = async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/admin/detector-type?companyId=${companyId}&locationId=${locationId}&limit=10000`
      );
      const data: { success: boolean; data: DetectorTypeData[] } =
        await response.json();
      if (data.success) {
        console.log("Fetched detector types:", data.data);
        setDetectorTypes(data.data);
      }
    } catch (error) {
      console.error("Error fetching detector types:", error);
    }
  };

  const fetchColumns = async (): Promise<void> => {
    try {
      const response = await fetch(
        `/api/admin/column/getAll?companyId=${companyId}&locationId=${locationId}&limit=10000`
      );
      const data: { success: boolean; data: ColumnData[] } =
        await response.json();
      if (data.success) {
        console.log("Fetched columns:", data.data);
        setColumns(data.data);
      }
    } catch (error) {
      console.error("Error fetching columns:", error);
    }
  };

  // Load master data when locationId and companyId are available
  useEffect(() => {
    if (locationId && companyId) {
      const loadMasterData = async () => {
        console.log("Loading master data...");
        await Promise.all([
          fetchProducts(),
          fetchDepartments(),
          fetchBatches(),
          fetchPharmacopoeials(),
          fetchTestTypes(),
          fetchDetectorTypes(),
          fetchColumns(),
          fetchApis(), // Add this line
        ]);
        console.log("Master data loaded");
      };
      loadMasterData();
    }
  }, [locationId, companyId]);

  // Normalize mobile phases for stable comparison
  function normMobilePhases(arr?: string[]) {
    return JSON.stringify(
      (arr ?? []).map((s) => (s ?? "").trim()).filter(Boolean)
    );
  }

  function signature(t: any) {
    // pharmacopoeialId can be string or [string]; compare on first value
    const pharm = Array.isArray(t.pharmacopoeialId)
      ? t.pharmacopoeialId
      : t.pharmacopoeialId;
    return [
      t.testTypeId,
      t.columnCode,
      normMobilePhases(t.mobilePhaseCodes),
      (pharm ?? "").toString().trim(),
    ].join("|");
  }

  function getApiIdForRow(
    batch: any,
    targetTest: any,
    targetRowIdx: number,
    continueTests: any[]
  ) {
    const sig = signature(targetTest);

    // Count how many same-signature rows appear up to and including this row
    const localIdx =
      continueTests
        .slice(0, targetRowIdx + 1)
        .filter((x) => signature(x) === sig).length - 1;

    // Build a list of API ids for tests that match the signature, in the same order as generics/apis/testTypes
    const matches = (batch.generics ?? []).flatMap((g: any) =>
      (g.apis ?? []).flatMap(
        (api: any) =>
          (api.testTypes ?? [])
            .filter((tt: any) => signature(tt) === sig)
            .map(() => api.apiName) // apiName here is actually the API id
      )
    );

    return matches[localIdx] ?? null;
  }

  const getApiName = (apiId: string | null | undefined): string => {
    if (!apiId || typeof apiId !== "string") {
      return "Not defined";
    }

    const trimmedId = apiId.trim();
    if (trimmedId === "" || !apis || apis.length === 0) {
      return "Not defined";
    }

    const apiData = apis.find((api: APIData) => api._id === trimmedId);
    return apiData ? apiData.api : `ID: ${trimmedId}`;
  };

  const getPharmacopoeialName = (
    pharmacopoeialId: string | string[] | null | undefined
  ): string => {
    // Handle null or undefined
    if (!pharmacopoeialId) {
      console.log('Returning "Not defined" - missing or null ID');
      return "Not defined";
    }

    // ✅ IMPROVED: Handle array format - take the first element
    let actualId: string;
    if (Array.isArray(pharmacopoeialId)) {
      if (pharmacopoeialId.length === 0) {
        return "Not defined";
      }
      actualId = pharmacopoeialId[0];
      console.log("Extracted ID from array:", actualId);
    } else if (typeof pharmacopoeialId === "string") {
      actualId = pharmacopoeialId;
    } else {
      console.log('Returning "Not defined" - invalid type');
      return "Not defined";
    }

    // Handle empty string after trimming
    const trimmedId = actualId.trim();
    if (trimmedId === "" || !pharmacopoeials || pharmacopoeials.length === 0) {
      return "Not defined";
    }

    const pharmacopeial = pharmacopoeials.find((p) => p._id === trimmedId);
    const result = pharmacopeial ? pharmacopeial.pharmacopeial : "Not defined";
    console.log("Found pharmacopeial:", result);
    return result;
  };

  // Fixed getTestTypeName function
  const getTestTypeName = (testTypeId: string | null | undefined): string => {
    console.log("getTestTypeName called with:", testTypeId);
    console.log("Type of testTypeId:", typeof testTypeId);

    if (!testTypeId || typeof testTypeId !== "string") {
      console.log(
        'Returning "Not defined" - missing, null, undefined, or non-string ID'
      );
      return "Not defined";
    }

    const trimmedId = testTypeId.trim();
    if (trimmedId === "" || !testTypes || testTypes.length === 0) {
      return "Not defined";
    }

    const testType = testTypes.find((t: TestTypeData) => t._id === trimmedId);
    return testType ? testType.testType : "Not defined";
  };

  // Fixed getDetectorTypeName function
  const getDetectorTypeName = (
    detectorTypeId: string | null | undefined
  ): string => {
    console.log("getDetectorTypeName called with:", detectorTypeId);
    console.log("Type of detectorTypeId:", typeof detectorTypeId);

    if (!detectorTypeId || typeof detectorTypeId !== "string") {
      console.log(
        'Returning "Not defined" - missing, null, undefined, or non-string ID'
      );
      return "Not defined";
    }

    const trimmedId = detectorTypeId.trim();
    if (trimmedId === "" || !detectorTypes || detectorTypes.length === 0) {
      return "Not defined";
    }

    const detectorType = detectorTypes.find(
      (d: DetectorTypeData) => d._id === trimmedId
    );
    return detectorType ? detectorType.detectorType : "Not defined";
  };

  // Update the enhanceTestsWithNames function
  const enhanceTestsWithNames = async (
    tests: TestType[]
  ): Promise<EnhancedTestType[]> => {
    setLoadingNames(true);
    try {
      const enhancedTests: EnhancedTestType[] = tests.map((test: TestType) => {
        const testTypeName: string = getTestTypeName(test.testTypeId);
        const detectorName: string = getDetectorTypeName(test.detectorTypeId);
        const columnName: string = getColumnName(test.columnCode);
        const pharmacopoeialName: string = getPharmacopoeialName(
          test.pharmacopoeialId
        );

        return {
          ...test,
          testTypeName,
          detectorName,
          columnName,
          pharmacopoeialName,
        };
      });
      return enhancedTests;
    } catch (error) {
      console.error("Error enhancing tests with names:", error);
      return tests.map((test: TestType): EnhancedTestType => ({ ...test }));
    } finally {
      setLoadingNames(false);
    }
  };

  // Fixed getColumnName function
  const getColumnName = (columnId: string | null | undefined): string => {
    console.log("getColumnName called with:", columnId);
    console.log("Type of columnId:", typeof columnId);

    if (!columnId || typeof columnId !== "string") {
      console.log(
        'Returning "Not defined" - missing, null, undefined, or non-string ID'
      );
      return "Not defined";
    }

    const trimmedId = columnId.trim();
    if (trimmedId === "" || !columns || columns.length === 0) {
      return "Not defined";
    }

    // Find column by _id and return columnCode
    const column = columns.find((c) => c._id === trimmedId);

    if (column) {
      console.log("Found column:", column);

      // Enhanced version with details from first description
      if (column.descriptions && column.descriptions.length > 0) {
        const desc = column.descriptions[0];
        const make = desc.makeId?.make || "";
        const carbonType = desc.carbonType || "";
        const length = desc.length || 0;
        const innerDiameter = desc.innerDiameter || 0;
        const particleSize = desc.particleSize || 0;

        return `${column.columnCode} (${make} ${carbonType} ${length}x${innerDiameter}, ${particleSize}μm)`;
      }

      return column.columnCode;
    }

    console.log("No matching column found for ID:", trimmedId);
    return "Not defined";
  };

  const handleBatchNumberChange = (value: string) => {
    setFormData((prev) => ({ ...prev, batchNumber: value }));
  };

  const handleManufacturingDateChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      manufacturingDate: value,
    }));
  };

  const handleWithdrawalDateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, withdrawalDate: value }));
  };
  // Toolbar Functions
  const handleAddNew = () => {
    resetForm();
    setIsEditMode(false);
    setShowFormModal(true);
    setTimeout(() => productSearchRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (showFormModal) {
      await saveBatch();
    }
  };

  const handleClear = () => {
    resetForm();
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentBatchIndex > 0) {
      const newIndex = currentBatchIndex - 1;
      setCurrentBatchIndex(newIndex);
      const batch = batches[newIndex];
      setSelectedBatch(batch);
    }
  };

  const handleDown = () => {
    if (currentBatchIndex < batches.length - 1) {
      const newIndex = currentBatchIndex + 1;
      setCurrentBatchIndex(newIndex);
      const batch = batches[newIndex];
      setSelectedBatch(batch);
    } else if (currentBatchIndex === -1 && batches.length > 0) {
      setCurrentBatchIndex(0);
      const batch = batches[0];
      setSelectedBatch(batch);
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
    setBatchSearchTerm("");
    setDropdownSelectedIndex(-1);
    setTimeout(() => batchSearchInputRef.current?.focus(), 100);
  };

  const handleEdit = () => {
    if (selectedBatch) {
      loadBatchToForm(selectedBatch);
      setIsEditMode(true);
      setShowFormModal(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedBatch) return;

    if (
      !confirm(
        `Are you sure you want to delete batch "${selectedBatch.batchNumber}"?`
      )
    )
      return;

    try {
      const response = await fetch(`/api/batch-input/${selectedBatch._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await fetchBatches();
        setSelectedBatch(null);
        setCurrentBatchIndex(-1);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete batch");
    }
  };

  const handleAudit = async () => {
    alert("Audit functionality - to be implemented");
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Batch Report</title>
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
          <h1>Batch Input Report</h1>
          <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <tr>
              <th>Batch Number</th>
              <th>Product Name</th>
              <th>Type of Sample</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Manufacturing Date</th>
            </tr>
            ${batches
              .map(
                (batch) =>
                  `<tr>
                    <td>${batch.batchNumber}</td>
                    <td>${batch.productName}</td>
                    <td>${batch.typeOfSample}</td>
                    <td>${batch.priority}</td>
                    <td>${batch.batchStatus}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
  {new Date(batch.manufacturingDate).toLocaleDateString()}
</td>
                  </tr>`
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

  const loadBatchToForm = async (batch: BatchData) => {
    const product = products.find((p) => p.productCode === batch.productCode);
    const pharmacopoeialName = product?.pharmacopeiaToUse
      ? getPharmacopoeialName(product.pharmacopeiaToUse)
      : "Not defined";

    setFormData({
      ...batch,
      manufacturingDate: batch.manufacturingDate
        ? new Date(batch.manufacturingDate).toISOString().substring(0, 10)
        : "",
      pharmacopoeialName: pharmacopoeialName,
      generics: batch.generics || [], // Load generics data
    });

    setSearchTerm(`${batch.productCode} - ${batch.productName}`);
    setIsProductSelected(true);

    // If loading a Bulk batch, ensure priority is set to Urgent
    if (batch.typeOfSample === "Bulk") {
      setTimeout(() => {
        setFormData((prev) => ({ ...prev, priority: "Urgent" }));
      }, 100);
    }

    if (product) {
      setSelectedProduct(product);

      if (product.mfcs && product.mfcs.length > 0) {
        await fetchMFCAndDepartmentData(product.mfcs[0]);

        setTimeout(() => {
          if (batch.tests && availableTests.length > 0) {
            const updatedTests = availableTests.map((availableTest, index) => {
              const existingTest = batch.tests?.find(
                (test) =>
                  test.testTypeId === availableTest.testTypeId &&
                  test.columnCode === availableTest.columnCode
              );

              if (existingTest) {
                return {
                  ...existingTest,
                  testName: availableTest.testTypeName || existingTest.testName,
                };
              } else {
                return {
                  testTypeId: availableTest.testTypeId,
                  testName:
                    availableTest.testTypeName ||
                    `Test ${availableTest.testTypeId}`,
                  columnCode: availableTest.columnCode,
                  mobilePhaseCodes: availableTest.mobilePhaseCodes,
                  detectorTypeId: availableTest.detectorTypeId,
                  pharmacopoeialId: availableTest.pharmacopoeialId,

                  blankInjection: availableTest.blankInjection || 0,
                  standardInjection: availableTest.standardInjection || 0,
                  sampleInjection: availableTest.sampleInjection || 0,
                  systemSuitability: availableTest.systemSuitability || 0,
                  sensitivity: availableTest.sensitivity || 0,
                  placebo: availableTest.placebo || 0,
                  reference1: availableTest.reference1 || 0,
                  reference2: availableTest.reference2 || 0,
                  bracketingFrequency: availableTest.bracketingFrequency || 0,

                  runTime: availableTest.runTime || 0,
                  washTime: availableTest.washTime || 0,
                  blankRunTime: availableTest.blankRunTime || 0,
                  standardRunTime: availableTest.standardRunTime || 0,
                  sampleRunTime: availableTest.sampleRunTime || 0,
                  systemSuitabilityRunTime:
                    availableTest.systemSuitabilityRunTime || 0,
                  sensitivityRunTime: availableTest.sensitivityRunTime || 0,
                  placeboRunTime: availableTest.placeboRunTime || 0,
                  reference1RunTime: availableTest.reference1RunTime || 0,
                  reference2RunTime: availableTest.reference2RunTime || 0,

                  outsourced: availableTest.isOutsourcedTest ?? false,
                  continueTests: !(availableTest.isOutsourcedTest ?? false),
                  testStatus: "Not Started" as
                    | "Not Started"
                    | "In Progress"
                    | "Completed",
                };
              }
            });

            setFormData((prev) => ({
              ...prev,
              tests: updatedTests,
            }));
          }
        }, 500);
      }
    }
  };

  const handleBatchSearchKeyDown = (e: React.KeyboardEvent) => {
    const searchResults = batches.filter(
      (batch) =>
        batch.batchNumber
          .toLowerCase()
          .includes(batchSearchTerm.toLowerCase()) ||
        batch.productName
          .toLowerCase()
          .includes(batchSearchTerm.toLowerCase()) ||
        batch.typeOfSample.toLowerCase().includes(batchSearchTerm.toLowerCase())
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
          const batch = searchResults[dropdownSelectedIndex];
          setSelectedBatch(batch);
          setCurrentBatchIndex(batches.findIndex((b) => b._id === batch._id));
          setShowSearchModal(false);
          setDropdownSelectedIndex(-1);
          setBatchSearchTerm("");
        }
        break;
      case "Escape":
        setShowSearchModal(false);
        setDropdownSelectedIndex(-1);
        setBatchSearchTerm("");
        break;
    }
  };

  const handleProductSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.productCode.toLowerCase().includes(term.toLowerCase()) ||
          product.productName.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
    setShowProductDropdown(true);
  };

  const selectProduct = async (product: Product) => {
    setSelectedProduct(product);

    console.log("Selected product:", product);
    console.log("Product pharmacopoeiaToUse:", product.pharmacopeiaToUse);
    console.log("Pharmacopoeials array:", pharmacopoeials);
    console.log("Pharmacopoeials array length:", pharmacopoeials.length);

    const pharmacopoeialName = getPharmacopoeialName(
      product.pharmacopeiaToUse || ""
    );
    console.log("Resolved pharmacopoeial name:", pharmacopoeialName);

    setFormData((prev) => ({
      ...prev,
      productCode: product.productCode,
      productName: product.productName,
      genericName: product.genericName,
      pharmacopeiaToUse: product.pharmacopeiaToUse,
      pharmacopoeialName: pharmacopoeialName,
    }));

    setSearchTerm(`${product.productCode} - ${product.productName}`);
    setShowProductDropdown(false);
    setIsProductSelected(true);

    if (product.mfcs && product.mfcs.length > 0) {
      await fetchMFCAndDepartmentData(product.mfcs[0]);
    }
  };

  const fetchMFCAndDepartmentData = async (mfcId: string) => {
    try {
      const mfcResponse = await fetch(
        `/api/admin/mfc/${mfcId}?locationId=${locationId}&companyId=${companyId}`
      );
      const mfcData = await mfcResponse.json();

      if (mfcData.success && mfcData.data) {
        const mfc = mfcData.data;
        setSelectedMFC(mfc);

        setFormData((prev) => ({
          ...prev,
          mfcNumber: mfc.mfcNumber,
        }));

        if (mfc.departmentId) {
          await fetchDepartmentData(mfc.departmentId);
        }
      }
    } catch (error) {
      console.error("Error fetching MFC data:", error);
    }
  };

  const fetchDepartmentData = async (departmentId: string) => {
    try {
      const department = departments.find((d) => d._id === departmentId);
      if (department) {
        setFormData((prev) => ({
          ...prev,
          departmentName: department.description || department.department,
          daysForUrgency: department.daysOfUrgency || 0,
        }));
        return;
      }
      console.warn("Department not found in cached list:", departmentId);
    } catch (error) {
      console.error("Error fetching department data:", error);
    }
  };

  const handleTypeOfSampleChange = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      typeOfSample: type,
      // Auto-set priority to Urgent for Bulk samples
      priority: type === "Bulk" ? "Urgent" : prev.priority,
    }));
  };

  const isTestApplicable = (test: TestType, sampleType: string): boolean => {
    switch (sampleType) {
      case "Bulk":
        return test.bulk;
      case "FP":
        return test.fp;
      case "Stability Partial":
        return test.stabilityPartial;
      case "Stability Final":
        return test.stabilityFinal;
      case "AMV":
        return test.amv;
      case "PV":
        return test.pv;
      case "CV":
        return test.cv;
      default:
        return false;
    }
  };

  // Updated updateTestCheckbox function with interdependent logic
  const updateTestCheckbox = (
    testIndex: number,
    field: "outsourced" | "continueTests",
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      tests:
        prev.tests?.map((test, index) => {
          if (index === testIndex) {
            if (field === "outsourced") {
              // If outsourced is checked, continueTests should be unchecked
              // If outsourced is unchecked, continueTests should be checked
              return {
                ...test,
                outsourced: value,
                continueTests: !value,
              };
            } else if (field === "continueTests") {
              // If continueTests is checked, outsourced should be unchecked
              // If continueTests is unchecked, outsourced should be checked
              return {
                ...test,
                continueTests: value,
                outsourced: !value,
              };
            }
          }
          return test;
        }) || [],
    }));
  };

  // Updated loadAvailableTests function with isOutsourcedTest logic
  const loadAvailableTests = async () => {
    console.log("loadAvailableTests called with:", {
      selectedMFC: selectedMFC?.mfcNumber,
      selectedProduct: selectedProduct?.productCode,
      testTypesLoaded: testTypes.length,
      detectorTypesLoaded: detectorTypes.length,
      columnsLoaded: columns.length,
      pharmacopeialsLoaded: pharmacopoeials.length,
    });

    if (!selectedMFC || !selectedProduct) {
      console.log("Missing selectedMFC or selectedProduct");
      return;
    }

    // Build generics hierarchy and flat tests array from MFC data
    const genericsHierarchy: Generic[] = [];
    const allTests: TestType[] = [];

    selectedMFC.generics.forEach((generic) => {
      const genericData: Generic = {
        genericName: generic.genericName,
        apis: [],
      };

      generic.apis.forEach((api) => {
        const apiData: API = {
          apiName: api.apiName, // This is the API ID from MFC
          testTypes: [],
        };

        api.testTypes.forEach((test) => {
          // Add to flat tests array
          allTests.push(test);

          // Add to API's testTypes
          apiData.testTypes.push(test);
        });

        genericData.apis.push(apiData);
      });

      genericsHierarchy.push(genericData);
    });

    console.log("Built generics hierarchy from MFC:", genericsHierarchy);
    console.log("Found tests from MFC:", allTests.length);

    const safeStringCompare = (id1: string, id2: string): boolean => {
      try {
        const str1 =
          id1 && id1.toString
            ? id1.toString().trim()
            : String(id1 || "").trim();
        const str2 =
          id2 && id2.toString
            ? id2.toString().trim()
            : String(id2 || "").trim();
        return str1 === str2 && str1.length > 0;
      } catch (error) {
        return false;
      }
    };

    let filteredTests = allTests;
    if (selectedProduct.pharmacopeiaToUse) {
      filteredTests = allTests.filter((test) => {
        // Handle both array and string format for pharmacopoeialId
        const testPharmacopoeialId = Array.isArray(test.pharmacopoeialId)
          ? test.pharmacopoeialId[0]
          : test.pharmacopoeialId;

        return safeStringCompare(
          testPharmacopoeialId,
          selectedProduct.pharmacopeiaToUse!
        );
      });
    }

    if (filteredTests.length === 0) {
      filteredTests = allTests;
    }

    console.log("Filtered tests:", filteredTests.length);

    const enhancedTests = await enhanceTestsWithNames(filteredTests);
    console.log("Enhanced tests:", enhancedTests);
    setAvailableTests(enhancedTests);

    const testData = enhancedTests.map((test) => {
      const isOutsourced = test.isOutsourcedTest ?? false;
      const continueTests = !isOutsourced;

      // ✅ Normalize pharmacopoeialId to string for batch tests
      const normalizedPharmacopoeialId = Array.isArray(test.pharmacopoeialId)
        ? test.pharmacopoeialId[0] || ""
        : test.pharmacopoeialId || "";

      return {
        testTypeId: test.testTypeId,
        testName: test.testTypeName || `Test ${test.testTypeId}`,
        columnCode: test.columnCode,
        mobilePhaseCodes: test.mobilePhaseCodes,
        detectorTypeId: test.detectorTypeId,
        pharmacopoeialId: normalizedPharmacopoeialId, // ✅ Always string

        // Injection counts
        blankInjection: test.blankInjection || 0,
        standardInjection: test.standardInjection || 0,
        sampleInjection: test.sampleInjection || 0,
        systemSuitability: test.systemSuitability || 0,
        sensitivity: test.sensitivity || 0,
        placebo: test.placebo || 0,
        reference1: test.reference1 || 0,
        reference2: test.reference2 || 0,
        bracketingFrequency: test.bracketingFrequency || 0,

        // Runtime values
        runTime: test.runTime || 0,
        washTime: test.washTime || 0,
        blankRunTime: test.blankRunTime || 0,
        standardRunTime: test.standardRunTime || 0,
        sampleRunTime: test.sampleRunTime || 0,
        systemSuitabilityRunTime: test.systemSuitabilityRunTime || 0,
        sensitivityRunTime: test.sensitivityRunTime || 0,
        placeboRunTime: test.placeboRunTime || 0,
        reference1RunTime: test.reference1RunTime || 0,
        reference2RunTime: test.reference2RunTime || 0,

        outsourced: isOutsourced,
        continueTests: continueTests,
        testStatus: "Not Started" as
          | "Not Started"
          | "In Progress"
          | "Completed", // ✅ Type assertion
      };
    });

    // Store both the hierarchy and flat tests
    setFormData((prev) => ({
      ...prev,
      tests: testData,
      generics: genericsHierarchy, // Store the generics hierarchy with API IDs
    }));
  };

  useEffect(() => {
    const hasRequiredDate =
      formData.typeOfSample === "Stability Final" ||
      formData.typeOfSample === "Stability Partial"
        ? formData.withdrawalDate
        : formData.manufacturingDate;

    if (
      formData.batchNumber &&
      hasRequiredDate &&
      selectedMFC &&
      selectedProduct &&
      testTypes.length > 0 &&
      detectorTypes.length > 0 &&
      columns.length > 0 &&
      pharmacopoeials.length > 0 &&
      apis.length > 0 // Add this
    ) {
      loadAvailableTests();
    }
  }, [
    formData.batchNumber,
    formData.manufacturingDate,
    formData.withdrawalDate,
    formData.typeOfSample,
    selectedMFC,
    selectedProduct,
    testTypes,
    detectorTypes,
    columns,
    pharmacopoeials,
    apis, // Add this line
  ]);

  const saveBatch = async () => {
    const hasRequiredDate =
      formData.typeOfSample === "Stability Final" ||
      formData.typeOfSample === "Stability Partial"
        ? formData.withdrawalDate
        : formData.manufacturingDate;

    if (
      !isProductSelected ||
      !formData.batchNumber ||
      !hasRequiredDate ||
      !formData.typeOfSample
    ) {
      setError("Please fill all required fields");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Filter tests based on applicability and continueTests
      const filteredTests =
        formData.tests?.filter((test, index) => {
          const availableTest = availableTests[index];
          if (!availableTest) return false;

          const isApplicable = isTestApplicable(
            availableTest,
            formData.typeOfSample!
          );

          return isApplicable && test.continueTests === true;
        }) || [];

      // CORRECTED: Build generics hierarchy with proper API-test relationships
      const processedGenerics: Generic[] = [];

      if (selectedMFC && selectedMFC.generics) {
        // Create a map to group APIs by their unique combinations
        const apiMap = new Map<string, { apiName: string; tests: any[] }>();

        selectedMFC.generics.forEach((mfcGeneric) => {
          // Process each API in the MFC
          mfcGeneric.apis.forEach((mfcApi) => {
            // For each test in this API, check if it's in filtered tests
            mfcApi.testTypes.forEach((mfcTest) => {
              const correspondingFilteredTest = filteredTests.find(
                (filteredTest) =>
                  filteredTest.testTypeId === mfcTest.testTypeId &&
                  filteredTest.columnCode === mfcTest.columnCode &&
                  JSON.stringify(filteredTest.mobilePhaseCodes) ===
                    JSON.stringify(mfcTest.mobilePhaseCodes)
              );

              if (correspondingFilteredTest) {
                // Create unique key for this API based on apiName
                const apiKey = mfcApi.apiName;

                if (!apiMap.has(apiKey)) {
                  apiMap.set(apiKey, { apiName: mfcApi.apiName, tests: [] });
                }

                const enhancedTestData = {
                  testTypeId: correspondingFilteredTest.testTypeId,
                  testName: correspondingFilteredTest.testName,
                  columnCode: correspondingFilteredTest.columnCode,
                  mobilePhaseCodes: correspondingFilteredTest.mobilePhaseCodes,
                  detectorTypeId: correspondingFilteredTest.detectorTypeId,
                  pharmacopoeialId: correspondingFilteredTest.pharmacopoeialId,

                  isColumnCodeLinkedToMfc:
                    mfcTest.isColumnCodeLinkedToMfc ?? false,
                  selectMakeSpecific: mfcTest.selectMakeSpecific ?? false,
                  sampleInjection: correspondingFilteredTest.sampleInjection,
                  standardInjection:
                    correspondingFilteredTest.standardInjection,
                  blankInjection: correspondingFilteredTest.blankInjection,
                  systemSuitability:
                    correspondingFilteredTest.systemSuitability,
                  sensitivity: correspondingFilteredTest.sensitivity,
                  placebo: correspondingFilteredTest.placebo,
                  reference1: correspondingFilteredTest.reference1,
                  reference2: correspondingFilteredTest.reference2,
                  bracketingFrequency:
                    correspondingFilteredTest.bracketingFrequency,

                  injectionTime: mfcTest.injectionTime ?? 0,
                  runTime: correspondingFilteredTest.runTime,
                  uniqueRuntimes: mfcTest.uniqueRuntimes ?? false,
                  blankRunTime: correspondingFilteredTest.blankRunTime,
                  standardRunTime: correspondingFilteredTest.standardRunTime,
                  sampleRunTime: correspondingFilteredTest.sampleRunTime,
                  systemSuitabilityRunTime:
                    correspondingFilteredTest.systemSuitabilityRunTime,
                  sensitivityRunTime:
                    correspondingFilteredTest.sensitivityRunTime,
                  placeboRunTime: correspondingFilteredTest.placeboRunTime,
                  reference1RunTime:
                    correspondingFilteredTest.reference1RunTime,
                  reference2RunTime:
                    correspondingFilteredTest.reference2RunTime,

                  washTime: correspondingFilteredTest.washTime,

                  testApplicability: mfcTest.testApplicability ?? false,
                  numberOfInjections: mfcTest.numberOfInjections ?? 0,
                  numberOfInjectionsAMV: mfcTest.numberOfInjectionsAMV ?? 0,
                  numberOfInjectionsPV: mfcTest.numberOfInjectionsPV ?? 0,
                  numberOfInjectionsCV: mfcTest.numberOfInjectionsCV ?? 0,

                  bulk: mfcTest.bulk,
                  fp: mfcTest.fp,
                  stabilityPartial: mfcTest.stabilityPartial,
                  stabilityFinal: mfcTest.stabilityFinal,
                  amv: mfcTest.amv,
                  pv: mfcTest.pv,
                  cv: mfcTest.cv,
                  isLinked: mfcTest.isLinked ?? false,
                  priority: mfcTest.priority ?? "normal",
                  isOutsourcedTest: mfcTest.isOutsourcedTest ?? false,

                  outsourced: correspondingFilteredTest.outsourced,
                  continueTests: correspondingFilteredTest.continueTests,
                  testStatus: (correspondingFilteredTest.testStatus ||
                    "Not Started") as
                    | "Not Started"
                    | "In Progress"
                    | "Completed",
                };

                apiMap.get(apiKey)!.tests.push(enhancedTestData);
              }
            });
          });

          // Build the final structure for this generic
          const genericData: Generic = {
            genericName: mfcGeneric.genericName,
            apis: Array.from(apiMap.values()).map(({ apiName, tests }) => ({
              apiName,
              testTypes: tests,
            })),
          };

          if (genericData.apis.length > 0) {
            processedGenerics.push(genericData);
          }

          // Ensure Bulk samples always have Urgent priority
          if (
            formData.typeOfSample === "Bulk" &&
            formData.priority !== "Urgent"
          ) {
            payload.priority = "Urgent";
          }

          // Clear the map for next generic (if multiple generics exist)
          apiMap.clear();
        });
      }

      console.log("=== CORRECTED SAVE DEBUG ===");
      console.log("Filtered tests count:", filteredTests.length);
      console.log(
        "Processed generics with correct API relationships:",
        JSON.stringify(processedGenerics, null, 2)
      );

      const payload = {
        ...formData,
        tests: filteredTests,
        generics: processedGenerics,
        companyId,
        locationId,
        mfcId: selectedProduct?.mfcs[0],
      };

      console.log(
        "Full payload being sent to API:",
        JSON.stringify(payload, null, 2)
      );

      const method = isEditMode && selectedBatch ? "PUT" : "POST";
      const url =
        isEditMode && selectedBatch
          ? `/api/batch-input/${selectedBatch._id}`
          : "/api/batch-input";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (data.success) {
        fetchBatches();
        setShowFormModal(false);
        resetForm();
      } else {
        setError("Error saving batch: " + data.message);
      }
    } catch (error) {
      console.error("Error saving batch:", error);
      setError("Error saving batch");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      priority: "Normal",
      batchStatus: "Not Started",
      manufacturingDate: "", // Clear manufacturing date
      withdrawalDate: "", // Clear withdrawal date
    });
    setSelectedProduct(null);
    setSelectedMFC(null);
    setIsProductSelected(false);
    setSearchTerm("");
    setAvailableTests([]);
    setError("");
  };

  const updateBatchStatus = async (batchId: string, status: string) => {
    try {
      const response = await fetch(`/api/batch-input/${batchId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchStatus: status }),
      });

      const data = await response.json();
      if (data.success) {
        fetchBatches();
      }
    } catch (error) {
      console.error("Error updating batch status:", error);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#c0dcff] font-segoe"
      style={{
        backgroundImage: "linear-gradient(to bottom, #e6f0fa, #c0dcff)",
      }}
    >
      <WindowsToolbar
        modulePath="/dashboard/batch-input"
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
              <span className="text-[#0055a4] text-xs font-bold">B</span>
            </div>
            <span className="font-semibold text-sm">Batch Management</span>
          </div>
        </div>

        <div className="container mx-auto p-4 max-w-7xl">
          {error && (
            <div
              className="bg-[#ffe6e6] border border-[#cc0000] text-[#cc0000] px-4 py-3 rounded mb-4 shadow-inner"
              style={{ borderStyle: "inset" }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons - Outside Table */}
          {selectedBatch && (
            <div className="mt-4 p-4 bg-gray-50 border border-[#a6c8ff] rounded-lg">
              <div className="flex items-center justify-between">
                {/* Batch Info with Status and Priority */}
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Selected Batch:{" "}
                    </span>
                    <span className="text-blue-600">
                      {selectedBatch.batchNumber}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {selectedBatch.productName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedBatch.batchStatus === "Closed"
                          ? "bg-gray-100 text-gray-800"
                          : selectedBatch.batchStatus === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {selectedBatch.batchStatus}
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedBatch.priority === "Urgent"
                          ? "bg-red-100 text-red-800"
                          : selectedBatch.priority === "High"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {selectedBatch.priority}
                    </span>
                  </div>
                </div>

                {/* Streamlined Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      loadBatchToForm(selectedBatch);
                      setIsEditMode(true);
                      setShowFormModal(true);
                    }}
                    className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Batch Management Table */}
          <div
            className="bg-white rounded-lg shadow-md"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <div
              className="p-4 border-b border-[#a6c8ff]"
              style={{
                backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)",
              }}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                Batch Management ({batches.length})
              </h2>
            </div>

            {loading ? (
              // Loading skeleton with proper table structure
              <div className="overflow-x-auto">
                <table className="w-full text-sm leading-tight">
                  <thead
                    className="bg-gradient-to-b from-f0f0f0 to-ffffff sticky top-0"
                    style={{ borderBottom: "1px solid #a6c8ff" }}
                  >
                    <tr>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-8">
                        SR. NO
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-24">
                        MFC NUMBER
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-32">
                        PRODUCT NAME
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-28">
                        GENERIC NAME
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-24">
                        API NAME
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-16">
                        TEST TYPE
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-20">
                        TYPE OF SAMPLE
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-24">
                        DEPARTMENT
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-20">
                        COLUMN
                      </th>
                      {/* MP columns */}
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        MP1
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        MP2
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        MP3
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        MP4
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        WASH1
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        WASH2
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-16">
                        DETECTOR
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-16">
                        PHARMACO
                      </th>
                      {/* Injection columns */}
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-10">
                        BLANK
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-10">
                        STD
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        SAMPLE
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        SYS SUIT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-10">
                        SENS
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        PLACEBO
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-10">
                        REF1
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-10">
                        REF2
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        BRACKET
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        WASH TIME
                      </th>
                      {/* Runtime columns */}
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        BLANK RT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        STD RT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        SAMPLE RT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        SYS RT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        SENS RT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        PLACEBO RT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        REF1 RT
                      </th>
                      <th className="px-1 py-1 text-center text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-12">
                        REF2 RT
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase border-r border-a6c8ff w-16">
                        TESTING LOCATION
                      </th>
                      <th className="px-1 py-1 text-left text-9px font-medium text-gray-700 uppercase w-16">
                        TEST STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a6c8ff]">
                    {batches.map((batch, batchIndex) => {
                      const continueTests =
                        batch.tests?.filter((test) => test.continueTests) || [];
                      const testCount = continueTests.length;

                      if (testCount === 0) {
                        return (
                          <tr
                            key={`${batch._id}-empty`}
                            className={`cursor-pointer ${
                              selectedBatch?._id === batch._id
                                ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                                : "hover:bg-[#e6f0fa]"
                            }`}
                            onClick={() => {
                              setSelectedBatch(batch);
                              setCurrentBatchIndex(batchIndex);
                            }}
                          >
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {batchIndex + 1}
                            </td>
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">{batch.mfcNumber}</div>
                            </td>
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {batch.productName}
                              </div>
                            </td>
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {batch.genericName}
                              </div>
                            </td>
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-gray-400 italic text-[11px]"
                              colSpan={33}
                            >
                              No active tests for this batch
                            </td>
                          </tr>
                        );
                      }

                      return continueTests.map((test, testIndex) => {
                        const apiId = getApiIdForRow(
                          batch,
                          test,
                          testIndex,
                          continueTests
                        );
                        const resolvedApiName = getApiName(apiId);
                        const resolvedColumnName = getColumnName(
                          test.columnCode
                        );
                        const resolvedDetectorName = getDetectorTypeName(
                          test.detectorTypeId
                        );
                        const resolvedPharmacoName = getPharmacopoeialName(
                          test.pharmacopoeialId
                        );
                        const testingLocation = test.outsourced
                          ? "Outsource"
                          : "On-site";

                        return (
                          <tr
                            key={`${batch._id}-${test.testTypeId}-${test.columnCode}-${testIndex}`}
                            className={`cursor-pointer ${
                              selectedBatch?._id === batch._id
                                ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                                : "hover:bg-[#e6f0fa]"
                            }`}
                            onClick={() => {
                              setSelectedBatch(batch);
                              setCurrentBatchIndex(batchIndex);
                            }}
                          >
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="font-medium">
                                  {batchIndex + 1}
                                </div>
                              </td>
                            )}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate font-medium">
                                  {batch.mfcNumber}
                                </div>
                              </td>
                            )}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.productName}
                                </div>
                              </td>
                            )}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.genericName}
                                </div>
                              </td>
                            )}
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top">
                              <div className="text-blue-600 font-medium truncate">
                                {resolvedApiName !== "Not defined"
                                  ? resolvedApiName
                                  : `ID: ${apiId}`}
                              </div>
                            </td>
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top">
                              <div className="truncate">{test.testName}</div>
                            </td>
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.typeOfSample}
                                </div>
                              </td>
                            )}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r max-w-[80px] border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.departmentName}
                                </div>
                              </td>
                            )}
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                              title={resolvedColumnName}
                            >
                              <div className="truncate">
                                {resolvedColumnName}
                              </div>
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.mobilePhaseCodes[0] || "-"}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.mobilePhaseCodes[1] || "-"}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.mobilePhaseCodes[2] || "-"}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.mobilePhaseCodes[3] || "-"}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.mobilePhaseCodes[4] || "-"}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.mobilePhaseCodes[5] || "-"}
                            </td>
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]"
                              title={resolvedDetectorName}
                            >
                              <div className="truncate">
                                {resolvedDetectorName}
                              </div>
                            </td>
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]"
                              title={resolvedPharmacoName}
                            >
                              <div className="truncate">
                                {resolvedPharmacoName}
                              </div>
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.blankInjection || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.standardInjection || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sampleInjection || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.systemSuitability || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sensitivity || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.placebo || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference1 || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference2 || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.bracketingFrequency || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.washTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.blankRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.standardRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sampleRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.systemSuitabilityRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sensitivityRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.placeboRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference1RunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference2RunTime || 0}
                            </td>
                            {/* Sticky Testing Location */}
                            <td
                              className={`px-1 py-1 border-r border-[#a6c8ff] text-[11px] sticky right-16 z-10 ${
                                selectedBatch?._id === batch._id
                                  ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                                  : batchIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50"
                              }`}
                            >
                              <div className="truncate">{testingLocation}</div>
                            </td>
                            {/* TEST STATUS - Show for each test (no rowspan) */}
                            <td
                              className={`sticky right-0 min-w-[80px] px-1 py-1 text-[11px] z-10 ${
                                selectedBatch?._id === batch._id
                                  ? "bg-gradient-to-r from-[#a6c8ff] to-[#sc0dcff]"
                                  : batchIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50"
                              }`}
                            >
                              <span
                                className={`inline-flex px-1 py-0.5 text-[9px] font-semibold rounded-full ${
                                  test.testStatus === "Completed"
                                    ? "bg-green-100 text-green-800"
                                    : test.testStatus === "In Progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {test.testStatus || "Not Started"}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No batches found. Click "Add New (F1)" to create your first
                batch!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] leading-tight">
                  <thead
                    className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] sticky top-0"
                    style={{ borderBottom: "1px solid #a6c8ff" }}
                  >
                    <tr>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-8">
                        SR. NO
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-24">
                        BATCH NAME
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-24">
                        MFC NUMBER
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-32">
                        PRODUCT NAME
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-24">
                        MFG DATE
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-24">
                        WITHDRAWAL DATE
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-20">
                        TYPE OF SAMPLE
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-28">
                        API NAME
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-16">
                        TEST TYPE
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-24">
                        DEPARTMENT
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-20">
                        COLUMN
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        MP1
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        MP2
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        MP3
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        MP4
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        WASH1
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        WASH2
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-16">
                        DETECTOR
                      </th>
                      <th className="px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-16">
                        PHARMACO
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-10">
                        BLANK
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-10">
                        STD
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        SAMPLE
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        SYS SUIT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-10">
                        SENS
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        PLACEBO
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-10">
                        REF1
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-10">
                        REF2
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        BRACKET
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        WASH TIME
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        BLANK RT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        STD RT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        SAMPLE RT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        SYS RT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        SENS RT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        PLACEBO RT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        REF1 RT
                      </th>
                      <th className="px-1 py-1 text-center text-[9px] font-medium text-gray-700 uppercase border-r border-[#a6c8ff] w-12">
                        REF2 RT
                      </th>
                      <th className="sticky right-[80px] min-w-[80px] px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase  border-[#a6c8ff] bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] z-10">
                        TESTING LOCATION
                      </th>
                      <th className="sticky right-0 min-w-[80px] px-1 py-1 text-left text-[9px] font-medium text-gray-700 uppercase bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] z-10">
                        TEST STATUS
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#a6c8ff]">
                    {batches.map((batch, batchIndex) => {
                      // Get the tests that should continue (not outsourced)
                      const continueTests =
                        batch.tests?.filter((test) => test.continueTests) || [];
                      const testCount = continueTests.length;

                      // Format dates helper function
                      interface FormatDate {
                        (dateString: string | undefined | null): string;
                      }

                      const formatDate: FormatDate = (dateString) => {
                        if (!dateString) return "-";
                        try {
                          return new Date(dateString).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          );
                        } catch {
                          return "-";
                        }
                      };

                      if (testCount === 0) {
                        // Show batch info with "No active tests" message
                        return (
                          <tr
                            key={`${batch._id}-empty`}
                            className={`cursor-pointer ${
                              selectedBatch?._id === batch._id
                                ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                                : "hover:bg-[#e6f0fa]"
                            }`}
                            onClick={() => {
                              setSelectedBatch(batch);
                              setCurrentBatchIndex(batchIndex);
                            }}
                          >
                            {/* SR. NO */}
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {batchIndex + 1}
                            </td>
                            {/* BATCH NAME */}
                            <td className="px-1 py-1 border-r border-[rgb(166,200,255)] text-[11px]">
                              <div className="truncate">
                                {batch.batchNumber}
                              </div>
                            </td>
                            {/* MFC NUMBER */}
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">{batch.mfcNumber}</div>
                            </td>
                            {/* PRODUCT NAME */}
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {batch.productName}
                              </div>
                            </td>
                            {/* MANUFACTURING DATE */}
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {formatDate(batch.manufacturingDate)}
                              </div>
                            </td>
                            {/* DATE OF WITHDRAWAL */}
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {formatDate(batch.withdrawalDate)}
                              </div>
                            </td>
                            {/* No active tests message spanning remaining columns */}
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-gray-400 italic text-[11px]"
                              colSpan={34}
                            >
                              <div className="truncate">
                                No active tests for this batch
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // Create rows for each test, with batch info spanning multiple rows
                      return continueTests.map((test, testIndex) => {
                        // Get API name for this test by finding it in the generics structure
                        const apiId = getApiIdForRow(
                          batch,
                          test,
                          testIndex,
                          continueTests
                        );

                        const resolvedApiName =
                          getApiName(apiId) || "Not defined";
                        const resolvedColumnName = getColumnName(
                          test.columnCode
                        );
                        const resolvedDetectorName = getDetectorTypeName(
                          test.detectorTypeId
                        );
                        const resolvedPharmacoName = getPharmacopoeialName(
                          test.pharmacopoeialId
                        );

                        // Determine testing location
                        const testingLocation = test.outsourced
                          ? "Outsource"
                          : "On-site";

                        return (
                          <tr
                            key={`${batch._id}-${test.testTypeId}-${test.columnCode}-${testIndex}`}
                            className={`cursor-pointer ${
                              selectedBatch?._id === batch._id
                                ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                                : "hover:bg-[#e6f0fa]"
                            }`}
                            onClick={() => {
                              setSelectedBatch(batch);
                              setCurrentBatchIndex(batchIndex);
                            }}
                          >
                            {/* SR. NO - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="font-medium">
                                  {batchIndex + 1}
                                </div>
                              </td>
                            )}

                            {/* BATCH NAME - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.batchNumber}
                                </div>
                              </td>
                            )}

                            {/* MFC NUMBER - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate font-medium">
                                  {batch.mfcNumber}
                                </div>
                              </td>
                            )}

                            {/* PRODUCT NAME - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.productName}
                                </div>
                              </td>
                            )}

                            {/* MANUFACTURING DATE - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate text-gray-600">
                                  {formatDate(batch.manufacturingDate)}
                                </div>
                              </td>
                            )}

                            {/* DATE OF WITHDRAWAL - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate text-gray-600">
                                  {formatDate(batch.withdrawalDate)}
                                </div>
                              </td>
                            )}

                            {/* TYPE OF SAMPLE - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.typeOfSample}
                                </div>
                              </td>
                            )}

                            {/* API NAME - Show for each test (no rowspan) */}
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top">
                              <div className="text-blue-600 font-medium truncate">
                                {resolvedApiName !== "Not defined"
                                  ? resolvedApiName
                                  : `ID: ${apiId}`}
                              </div>
                            </td>

                            {/* TEST TYPE - Show for each test (no rowspan) */}
                            <td className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top">
                              <div className="truncate">{test.testName}</div>
                            </td>

                            {/* DEPARTMENT - Show only for first test of each batch with rowspan */}
                            {testIndex === 0 && (
                              <td
                                className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                                rowSpan={testCount}
                              >
                                <div className="truncate">
                                  {batch.departmentName}
                                </div>
                              </td>
                            )}

                            {/* COLUMN - Show for each test (no rowspan) */}
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-[11px] align-top"
                              title={resolvedColumnName}
                            >
                              <div className="truncate">
                                {resolvedColumnName}
                              </div>
                            </td>

                            {/* Mobile Phase columns MP1-MP4, WASH1-WASH2 - Show for each test */}
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {test.mobilePhaseCodes[0] || "-"}
                              </div>
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {test.mobilePhaseCodes[1] || "-"}
                              </div>
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {test.mobilePhaseCodes[2] || "-"}
                              </div>
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {test.mobilePhaseCodes[3] || "-"}
                              </div>
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {test.mobilePhaseCodes[4] || "-"}
                              </div>
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              <div className="truncate">
                                {test.mobilePhaseCodes[5] || "-"}
                              </div>
                            </td>

                            {/* DETECTOR - Show for each test (no rowspan) */}
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]"
                              title={resolvedDetectorName}
                            >
                              <div className="truncate">
                                {resolvedDetectorName}
                              </div>
                            </td>

                            {/* PHARMACOPOEIAL - Show for each test (no rowspan) */}
                            <td
                              className="px-1 py-1 border-r border-[#a6c8ff] text-[11px]"
                              title={resolvedPharmacoName}
                            >
                              <div className="truncate">
                                {resolvedPharmacoName}
                              </div>
                            </td>

                            {/* Injection Counts - Show for each test */}
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.blankInjection || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.standardInjection || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sampleInjection || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.systemSuitability || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sensitivity || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.placebo || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference1 || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference2 || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.bracketingFrequency || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.washTime || 0}
                            </td>

                            {/* Runtime Values - Show for each test */}
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.blankRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.standardRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sampleRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.systemSuitabilityRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.sensitivityRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.placeboRunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference1RunTime || 0}
                            </td>
                            <td className="px-1 py-1 text-center border-r border-[#a6c8ff] text-[11px]">
                              {test.reference2RunTime || 0}
                            </td>

                            {/* TESTING LOCATION - Show for each test (sticky) with smaller width and border */}
                            <td className="sticky right-[80px] min-w-[80px] px-1 py-1  border-[#a6c8ff] text-[11px] bg-[#d6e1f1] z-10">
                              <div className="truncate text-xs ">
                                {testingLocation}
                              </div>
                            </td>

                            <td
                              className={`sticky right-0 min-w-[80px] px-1 py-1 text-[11px] z-10 ${
                                selectedBatch?._id === batch._id
                                  ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                                  : batchIndex % 2 === 0
                                  ? "bg-white"
                                  : "bg-gray-50"
                              }`}
                            >
                              <span
                                className={`inline-flex px-1 py-0.5 text-[9px] font-semibold rounded-full ${
                                  test.testStatus === "Completed"
                                    ? "bg-green-100 text-green-800"
                                    : test.testStatus === "In Progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {test.testStatus || "Not Started"}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Information Form Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg w-4/5 max-w-6xl max-h-[90vh] overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              className="p-4 border-b border-[#a6c8ff] flex items-center justify-between"
              style={{
                backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)",
              }}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditMode ? "Edit Batch Information" : "Add New Batch"}
              </h2>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4">
              {/* Pharmacopoeial Info Corner Display */}
              {formData.pharmacopoeialName && (
                <div className="absolute top-4 right-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                  <span className="text-blue-600 font-medium">
                    Pharmacopoeial to Use:{" "}
                  </span>
                  <span className="text-blue-800">
                    {formData.pharmacopoeialName}
                  </span>
                </div>
              )}

              {/* Grid Form Layout */}
              <div className="grid grid-cols-2 gap-4 max-w-4xl">
                {/* Product Code/Name - Full Width */}
                <div className="col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Code / Name *
                  </label>
                  <div className="relative max-w-md">
                    <input
                      ref={productSearchRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => handleProductSearch(e.target.value)}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Search product code or name..."
                      className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none"
                      style={{
                        borderStyle: "inset",
                        boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Search className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
                  </div>

                  {showProductDropdown && (
                    <div
                      className="absolute z-10 max-w-md mt-1 bg-white border border-[#a6c8ff] rounded-md shadow-lg max-h-48 overflow-y-auto"
                      style={{
                        backgroundImage:
                          "linear-gradient(to bottom, #ffffff, #f5faff)",
                      }}
                    >
                      {filteredProducts.map((product) => (
                        <div
                          key={product._id}
                          onClick={() => selectProduct(product)}
                          className="px-3 py-2 hover:bg-[#e6f0fa] cursor-pointer border-b border-[#a6c8ff]"
                        >
                          <div className="font-medium text-sm">
                            {product.productCode}
                          </div>
                          <div className="text-xs text-gray-600">
                            {product.productName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generic Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    value={formData.genericName || ""}
                    readOnly
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded bg-[#f0f0f0] text-sm"
                    style={{ borderStyle: "inset" }}
                  />
                </div>

                {/* MFC Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MFC Number
                  </label>
                  <input
                    type="text"
                    value={formData.mfcNumber || ""}
                    readOnly
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded bg-[#f0f0f0] text-sm"
                    style={{ borderStyle: "inset" }}
                  />
                </div>

                {/* Batch Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    value={formData.batchNumber || ""}
                    onChange={(e) => handleBatchNumberChange(e.target.value)}
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected
                        ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                        : "none",
                    }}
                    disabled={!isProductSelected}
                  />
                </div>

                {/* Conditional Date Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.typeOfSample === "Stability Final" ||
                    formData.typeOfSample === "Stability Partial"
                      ? "Withdrawal Date *"
                      : "Date of Manufacturing *"}
                  </label>
                  <input
                    type="date"
                    value={
                      formData.typeOfSample === "Stability Final" ||
                      formData.typeOfSample === "Stability Partial"
                        ? formData.withdrawalDate || ""
                        : formData.manufacturingDate || ""
                    }
                    onChange={(e) => {
                      if (
                        formData.typeOfSample === "Stability Final" ||
                        formData.typeOfSample === "Stability Partial"
                      ) {
                        handleWithdrawalDateChange(e.target.value);
                      } else {
                        handleManufacturingDateChange(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected
                        ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                        : "none",
                    }}
                    disabled={!isProductSelected}
                  />
                </div>

                {/* Type of Test */}
                <div
                  className={
                    !isProductSelected ? "opacity-50 pointer-events-none" : ""
                  }
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type of Test *
                  </label>
                  <select
                    value={formData.typeOfSample || ""}
                    onChange={(e) => handleTypeOfSampleChange(e.target.value)}
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected
                        ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                        : "none",
                    }}
                    disabled={!isProductSelected}
                  >
                    <option value="">Select Type</option>
                    {typeOfSampleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div
                  className={
                    !isProductSelected ? "opacity-50 pointer-events-none" : ""
                  }
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                    {formData.typeOfSample === "Bulk" && (
                      <span className="text-xs text-blue-600 ml-2">
                        (Auto-set to Urgent for Bulk samples)
                      </span>
                    )}
                  </label>
                  <select
                    value={formData.priority || "Normal"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority:
                          formData.typeOfSample === "Bulk"
                            ? "Urgent"
                            : (e.target.value as "Urgent" | "High" | "Normal"),
                      }))
                    }
                    className="w-full px-3 py-1 border border-a6c8ff rounded focus:ring-2 focus:ring-66a3ff focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected
                        ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                        : "none",
                      backgroundColor:
                        formData.typeOfSample === "Bulk" ? "#f0f0f0" : "white",
                      cursor:
                        formData.typeOfSample === "Bulk"
                          ? "not-allowed"
                          : "pointer",
                    }}
                    disabled={
                      !isProductSelected || formData.typeOfSample === "Bulk"
                    }
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  {formData.typeOfSample === "Bulk" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Bulk samples automatically have Urgent priority and cannot
                      be changed.
                    </p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.departmentName || ""}
                    readOnly
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded bg-[#f0f0f0] text-sm"
                    style={{ borderStyle: "inset" }}
                  />
                </div>

                {/* Days for Urgency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days for Urgency
                  </label>
                  <input
                    type="number"
                    value={formData.daysForUrgency || ""}
                    readOnly
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded bg-[#f0f0f0] text-sm"
                    style={{ borderStyle: "inset" }}
                  />
                </div>
              </div>

              {/* Test Configuration Table */}
              {formData.typeOfSample && availableTests.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold text-gray-800">
                      Test Configuration
                    </h3>
                    {loadingNames && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Loading names...</span>
                      </div>
                    )}
                  </div>

                  <div className="border border-[#a6c8ff] rounded bg-white overflow-hidden">
                    <div className="relative">
                      {/* Scrollable table container */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead
                            className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] sticky top-0"
                            style={{ borderBottom: "1px solid #a6c8ff" }}
                          >
                            <tr>
                              <th className="min-w-[120px] px-2 py-2 text-left font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Test Type
                              </th>
                              <th className="min-w-[150px] px-2 py-2 text-left font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Column
                              </th>
                              <th className="min-w-[250px] px-2 py-2 text-left font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Mobile Phase
                              </th>
                              <th className="min-w-[150px] px-2 py-2 text-left font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Detector
                              </th>
                              <th className="min-w-[150px] px-2 py-2 text-left font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Pharmaco
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Blank
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Std
                              </th>
                              <th className="min-w-[120px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Sample
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Sys Suit
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Sens
                              </th>
                              <th className="min-w-[150px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Placebo
                              </th>
                              <th className="min-w-[80px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Ref1
                              </th>
                              <th className="min-w-[80px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Ref2
                              </th>
                              <th className="min-w-[120px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Bracket
                              </th>
                              <th className="min-w-[120px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Runtime
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Wash
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Blank RT
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Std RT
                              </th>
                              <th className="min-w-[120px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Sample RT
                              </th>
                              <th className="min-w-[120px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                SysSuit RT
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Sens RT
                              </th>
                              <th className="min-w-[120px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Placebo RT
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Ref1 RT
                              </th>
                              <th className="min-w-[100px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff]">
                                Ref2 RT
                              </th>
                              {/* Fixed columns - these will remain visible */}
                              <th className="sticky right-[180px] min-w-[180px] px-2 py-2 text-center font-medium text-gray-700 uppercase border-r border-[#a6c8ff] bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] z-10">
                                Outsource
                              </th>
                              <th className="sticky right-0 min-w-[180px] px-2 py-2 text-center font-medium text-gray-700 uppercase bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] z-10">
                                Continue
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#a6c8ff]">
                            {availableTests.map((test, index) => {
                              const uniqueKey = `${test.testTypeId}-${test.columnCode}-${test.pharmacopoeialId}-${index}`;
                              const isApplicable = isTestApplicable(
                                test,
                                formData.typeOfSample!
                              );
                              const rowClass = isApplicable
                                ? `hover:bg-[#e6f0fa] ${
                                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                  }`
                                : "bg-gray-100 text-gray-400";

                              return (
                                <tr key={uniqueKey} className={rowClass}>
                                  {/* Test Type */}
                                  <td
                                    className="min-w-[120px] px-2 py-2 border-r border-[#a6c8ff] font-semibold"
                                    title={test.testTypeId}
                                  >
                                    <div className="truncate">
                                      {test.testTypeName || test.testTypeId}
                                    </div>
                                  </td>

                                  {/* Column */}
                                  <td className="min-w-[150px] px-2 py-2 border-r border-[#a6c8ff] cursor-help">
                                    <div
                                      className="truncate"
                                      title={test.columnName || test.columnCode}
                                    >
                                      {test.columnName || test.columnCode}
                                    </div>
                                  </td>

                                  {/* Mobile Phase */}
                                  <td className="min-w-[250px] px-2 py-2 border-r border-[#a6c8ff]">
                                    <div
                                      className="truncate"
                                      title={test.mobilePhaseCodes
                                        .filter((mp) => mp)
                                        .join(", ")}
                                    >
                                      {test.mobilePhaseCodes
                                        .filter((mp) => mp)
                                        .join(", ")}
                                    </div>
                                  </td>

                                  {/* Detector */}
                                  <td
                                    className="min-w-[150px] px-2 py-2 border-r border-[#a6c8ff]"
                                    title={test.detectorTypeId}
                                  >
                                    <div className="truncate">
                                      {test.detectorName || test.detectorTypeId}
                                    </div>
                                  </td>

                                  {/* Pharmacopoeial */}
                                  <td
                                    className="min-w-[150px] px-2 py-2 border-r border-[#a6c8ff]"
                                    title={
                                      Array.isArray(test.pharmacopoeialId)
                                        ? test.pharmacopoeialId.join(", ")
                                        : test.pharmacopoeialId || ""
                                    } // ✅ Handle both string and array
                                  >
                                    <div className="truncate">
                                      {test.pharmacopoeialName ||
                                        (Array.isArray(test.pharmacopoeialId)
                                          ? test.pharmacopoeialId.join(", ")
                                          : test.pharmacopoeialId)}
                                    </div>
                                  </td>

                                  {/* Blank Injection */}
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.blankInjection || ""}
                                  </td>

                                  {/* Standard Injection */}
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.standardInjection || ""}
                                  </td>

                                  {/* Sample Injection */}
                                  <td className="min-w-[120px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.sampleInjection || ""}
                                  </td>

                                  {/* System Suitability */}
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.systemSuitability || ""}
                                  </td>

                                  {/* Sensitivity */}
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.sensitivity || ""}
                                  </td>

                                  {/* Placebo */}
                                  <td className="min-w-[150px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.placebo || ""}
                                  </td>

                                  {/* Reference 1 */}
                                  <td className="min-w-[80px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.reference1 || ""}
                                  </td>

                                  {/* Reference 2 */}
                                  <td className="min-w-[80px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.reference2 || ""}
                                  </td>

                                  {/* Bracketing Frequency */}
                                  <td className="min-w-[120px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.bracketingFrequency || ""}
                                  </td>

                                  {/* Runtime */}
                                  <td className="min-w-[120px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.runTime || ""}
                                  </td>

                                  {/* Wash Time */}
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.washTime || ""}
                                  </td>

                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.blankRunTime || ""}
                                  </td>
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.standardRunTime || ""}
                                  </td>
                                  <td className="min-w-[120px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.sampleRunTime || ""}
                                  </td>
                                  <td className="min-w-[120px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.systemSuitabilityRunTime || ""}
                                  </td>
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.sensitivityRunTime || ""}
                                  </td>
                                  <td className="min-w-[120px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.placeboRunTime || ""}
                                  </td>
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.reference1RunTime || ""}
                                  </td>
                                  <td className="min-w-[100px] px-2 py-2 border-r border-[#a6c8ff] text-center font-medium">
                                    {test.reference2RunTime || ""}
                                  </td>

                                  {/* Outsourced Checkbox - Fixed */}
                                  <td
                                    className={`sticky right-[180px] min-w-[180px] px-2 py-2 border-r border-[#b0a6ff] text-center z-10 ${
                                      isApplicable
                                        ? index % 2 === 0
                                          ? "bg-white"
                                          : "bg-gray-50"
                                        : "bg-gray-100"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!isApplicable}
                                      checked={
                                        formData.tests?.[index]?.outsourced ||
                                        false
                                      }
                                      onChange={(e) =>
                                        updateTestCheckbox(
                                          index,
                                          "outsourced",
                                          e.target.checked
                                        )
                                      }
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                    />
                                  </td>

                                  {/* Continue Tests Checkbox - Fixed */}
                                  <td
                                    className={`sticky right-0 min-w-[180px] px-2 py-2 text-center z-10 ${
                                      isApplicable
                                        ? index % 2 === 0
                                          ? "bg-white"
                                          : "bg-gray-50"
                                        : "bg-gray-100"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!isApplicable}
                                      checked={
                                        formData.tests?.[index]
                                          ?.continueTests || false
                                      }
                                      onChange={(e) =>
                                        updateTestCheckbox(
                                          index,
                                          "continueTests",
                                          e.target.checked
                                        )
                                      }
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#a6c8ff] flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveBatch}
                disabled={
                  loading ||
                  !isProductSelected ||
                  !formData.batchNumber ||
                  !(formData.typeOfSample === "Stability Final" ||
                  formData.typeOfSample === "Stability Partial"
                    ? formData.withdrawalDate
                    : formData.manufacturingDate) ||
                  !formData.typeOfSample
                }
                className="px-4 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] disabled:opacity-50"
                style={{
                  border: "1px solid #004080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {loading
                  ? "Saving..."
                  : isEditMode
                  ? "Update Batch"
                  : "Save Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
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
              Search Batches
            </h3>
            <input
              ref={batchSearchInputRef}
              type="text"
              value={batchSearchTerm}
              onChange={(e) => {
                setBatchSearchTerm(e.target.value);
                setDropdownSelectedIndex(-1);
              }}
              onKeyDown={handleBatchSearchKeyDown}
              className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
              style={{
                borderStyle: "inset",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
              }}
              placeholder="Type to search batches..."
            />

            <div
              className="max-h-48 overflow-y-auto border border-[#a6c8ff] rounded mt-2"
              style={{
                backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              }}
            >
              {batches
                .filter(
                  (batch) =>
                    batch.batchNumber
                      .toLowerCase()
                      .includes(batchSearchTerm.toLowerCase()) ||
                    batch.productName
                      .toLowerCase()
                      .includes(batchSearchTerm.toLowerCase()) ||
                    batch.typeOfSample
                      .toLowerCase()
                      .includes(batchSearchTerm.toLowerCase())
                )
                .map((batch, index) => (
                  <div
                    key={batch._id}
                    className={`px-3 py-2 cursor-pointer ${
                      index === dropdownSelectedIndex
                        ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                        : "hover:bg-[#e6f0fa]"
                    }`}
                    onClick={() => {
                      setSelectedBatch(batch);
                      setCurrentBatchIndex(
                        batches.findIndex((b) => b._id === batch._id)
                      );
                      setShowSearchModal(false);
                      setDropdownSelectedIndex(-1);
                      setBatchSearchTerm("");
                    }}
                  >
                    <div className="font-medium text-gray-800">
                      {batch.batchNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {batch.productName} | {batch.typeOfSample} |{" "}
                      {batch.priority}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setDropdownSelectedIndex(-1);
                  setBatchSearchTerm("");
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9]"
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

      {/* Help Modal */}
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
              Batch Management - Help
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-[#0055a4]">
                  Keyboard Shortcuts:
                </h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F1
                    </kbd>{" "}
                    - Add New Batch (Opens Form)
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F2
                    </kbd>{" "}
                    - Save Current Batch (In Form)
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F7
                    </kbd>{" "}
                    - Search Batches
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F9
                    </kbd>{" "}
                    - Edit Selected Batch (Opens Form)
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F5/F6
                    </kbd>{" "}
                    - Navigate Up/Down
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F10
                    </kbd>{" "}
                    - Delete Selected Batch
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Features:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • Test configuration displays actual names instead of IDs
                  </li>
                  <li>• Real-time name resolution from API endpoints</li>
                  <li>
                    • Enhanced test table with column, detector, and
                    pharmacopoeial names
                  </li>
                  <li>
                    • Pharmacopoeial filtering ensures only compatible tests are
                    shown
                  </li>
                  <li>• Tooltips show original IDs for reference</li>
                  <li>
                    • Outsourced and Continue tests are mutually exclusive
                  </li>
                  <li>
                    • Default checkbox values based on MFC isOutsourcedTest
                    field
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">How to Use:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Click on any batch row to select it</li>
                  <li>• Use F1 (Add New) to open batch input form</li>
                  <li>• Use F9 (Edit) to modify selected batch</li>
                  <li>
                    • In the form, follow the sequence: Product → Generic →
                    Pharmacopoeial → MFC → Batch → Date → Test Type
                  </li>
                  <li>
                    • Test configurations load automatically with pharmacopoeial
                    filtering
                  </li>
                  <li>
                    • Outsourced and Continue checkboxes are automatically set
                    based on MFC configuration
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4]"
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
      {showBatchDetailsModal && detailsBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header - Single close button and batch info with status/priority */}
            <div
              className="p-4 border-b border-[#a6c8ff] flex items-center justify-between"
              style={{
                backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)",
              }}
            >
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Batch Details - {detailsBatch.batchNumber}
                </h2>
                {/* Status and Priority Display */}
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      detailsBatch.batchStatus === "Closed"
                        ? "bg-gray-100 text-gray-800"
                        : detailsBatch.batchStatus === "In Progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    Status: {detailsBatch.batchStatus}
                  </span>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      detailsBatch.priority === "Urgent"
                        ? "bg-red-100 text-red-800"
                        : detailsBatch.priority === "High"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    Priority: {detailsBatch.priority}
                  </span>
                </div>
              </div>

              {/* Action Buttons - Edit and Close only */}
              <div className="flex items-center space-x-2">
                {/* Single Edit Button */}
                <button
                  onClick={() => {
                    loadBatchToForm(detailsBatch);
                    setIsEditMode(true);
                    setShowFormModal(true);
                    setShowBatchDetailsModal(false); // Close details modal when opening edit
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                >
                  Edit
                </button>

                {/* Single Close Button */}
                <button
                  onClick={() => setShowBatchDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Rest remains the same */}
            <div className="p-4 space-y-4">
              {/* Your existing modal content */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
