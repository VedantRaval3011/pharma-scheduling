'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Calendar, Search, Plus, Play, StopCircle, Merge, X } from 'lucide-react';
import WindowsToolbar from "@/components/layout/ToolBox";

interface Product {
  _id: string;
  productCode: string;
  productName: string;
  genericName: string;
  mfcs: string[];
  pharmacopeiaToUse?: string; // Remove the "l" - match your database
}

interface MFC {
  _id: string;
  mfcNumber: string;
  departmentId: string;
  generics: Array<{
    genericName: string;
    apis: Array<{
      testTypes: TestType[];
    }>;
  }>;
}

interface TestType {
  testTypeId: string;
  columnCode: string;
  mobilePhaseCodes: string[];
  detectorTypeId: string;
  pharmacopoeialId: string;
  blankInjection: number;
  standardInjection: number;
  sampleInjection: number;
  bracketingFrequency: number;
  runTime: number;
  washTime: number;
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
}

interface EnhancedTestType extends TestType {
  testTypeName?: string;
  columnName?: string;
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

interface BatchData {
  _id?: string;
  productCode: string;
  productName: string;
  genericName: string;
  pharmacopeiaToUse?: string; // Remove the "l" - match your database
  pharmacopoeialName?: string; // Keep this for display name
  batchNumber: string;
  manufacturingDate: string;
  priority: 'Urgent' | 'High' | 'Normal';
  daysForUrgency: number;
  mfcNumber: string;
  departmentName: string;
  typeOfSample: string;
  tests: Array<{
    testTypeId: string;
    testName: string;
    columnCode: string;
    mobilePhaseCodes: string[];
    detectorTypeId: string;
    pharmacopoeialId: string;
    blankInjection: number;
    standardInjection: number;
    sampleInjection: number;
    bracketingFrequency: number;
    runTime: number;
    washTime: number;
    outsourced: boolean;
    continueTests: boolean;
  }>;
  batchStatus: 'Not Started' | 'In Progress' | 'Closed';
}

export default function BatchInputForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Get localStorage values
  const [locationId, setLocationId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<Partial<BatchData>>({
    priority: 'Normal',
    batchStatus: 'Not Started'
  });

  // Options data
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pharmacopoeials, setPharmacopoeials] = useState<Pharmacopeial[]>([]); // Add this state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMFC, setSelectedMFC] = useState<MFC | null>(null);
  const [availableTests, setAvailableTests] = useState<EnhancedTestType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Form state control
  const [isProductSelected, setIsProductSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const typeOfSampleOptions = [
    'Bulk', 'FP', 'Stability Partial', 'Stability Final', 'AMV', 'PV', 'CV'
  ];

  // Initialize localStorage values
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocationId = localStorage.getItem('locationId') || '';
      const storedCompanyId = localStorage.getItem('companyId') || '';
      setLocationId(storedLocationId);
      setCompanyId(storedCompanyId);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (locationId && companyId) {
      fetchProducts();
      fetchDepartments();
      fetchBatches();
      fetchPharmacopoeials(); // Add this line
    }
  }, [locationId, companyId]);

  // Helper function to get pharmacopoeial name by ID
  const getPharmacopoeialName = (pharmacopoeialId: string): string => {
  console.log('getPharmacopoeialName called with ID:', pharmacopoeialId);
  console.log('Available pharmacopoeials:', pharmacopoeials.map(p => ({ id: p._id, name: p.pharmacopeial })));
  
  if (!pharmacopoeialId || !pharmacopoeials.length) {
    console.log('Returning "Not defined" - missing ID or empty array');
    return 'Not defined';
  }
  
  const pharmacopeial = pharmacopoeials.find(p => p._id === pharmacopoeialId);
  console.log('Found pharmacopeial:', pharmacopeial);
  return pharmacopeial ? pharmacopeial.pharmacopeial : 'Not defined';
};

const handleBatchNumberChange = (value: string) => {
  setFormData(prev => ({...prev, batchNumber: value}));
};

// Update the manufacturing date input handler  
const handleManufacturingDateChange = (value: string) => {
  setFormData(prev => ({...prev, manufacturingDate: value}));
};

  // Helper functions to fetch names by ID
  const fetchColumnName = async (id: string): Promise<string> => {
    try {
      const response = await fetch(`/api/admin/product?locationId=${locationId}&companyId=${companyId}&limit=10000`);
      const data = await response.json();
      return data.success ? (data.data?.columnName || data.data?.name || id) : id;
    } catch (error) {
      console.error(`Error fetching column name for ID ${id}:`, error);
      return id;
    }
  };

  const fetchDetectorName = async (id: string): Promise<string> => {
    try {
      const response = await fetch(`/api/admin/detector-type?companyId=${companyId}&locationId=${locationId}`);
      const data = await response.json();
      return data.success ? (data.data?.detectorTypeName || data.data?.name || id) : id;
    } catch (error) {
      console.error(`Error fetching detector name for ID ${id}:`, error);
      return id;
    }
  };

  const fetchTestTypeName = async (id: string): Promise<string> => {
    try {
      const response = await fetch(`/api/admin/test-type?companyId=${companyId}&locationId=${locationId}`);
      const data = await response.json();
      return data.success ? (data.data?.testTypeName || data.data?.name || id) : id;
    } catch (error) {
      console.error(`Error fetching test type name for ID ${id}:`, error);
      return id;
    }
  };

  const fetchPharmacopoeialName = async (id: string): Promise<string> => {
    try {
      const response = await fetch(`/api/admin/pharmacopeial?companyId=${companyId}&locationId=${locationId}`);
      const data = await response.json();
      if (data.success && data.data) {
        const pharmacopeial = data.data.find((p: any) => p._id === id);
        return pharmacopeial ? pharmacopeial.pharmacopeial : id;
      }
      return id;
    } catch (error) {
      console.error(`Error fetching pharmacopoeial name for ID ${id}:`, error);
      return id;
    }
  };

  // Function to enhance tests with names
  const enhanceTestsWithNames = async (tests: TestType[]): Promise<EnhancedTestType[]> => {
    setLoadingNames(true);
    try {
      const enhancedTests = await Promise.all(
        tests.map(async (test) => {
          const [columnName, detectorName, testTypeName, pharmacopoeialName] = await Promise.all([
            fetchColumnName(test.columnCode),
            fetchDetectorName(test.detectorTypeId),
            fetchTestTypeName(test.testTypeId),
            fetchPharmacopoeialName(test.pharmacopoeialId)
          ]);

          return {
            ...test,
            columnName,
            detectorName,
            testTypeName,
            pharmacopoeialName
          };
        })
      );
      return enhancedTests;
    } catch (error) {
      console.error('Error enhancing tests with names:', error);
      return tests.map(test => ({ ...test }));
    } finally {
      setLoadingNames(false);
    }
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

    if (!confirm(`Are you sure you want to delete batch "${selectedBatch.batchNumber}"?`)) return;

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
                    <td>${new Date(batch.manufacturingDate).toLocaleDateString()}</td>
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

  const loadBatchToForm = (batch: BatchData) => {
    const product = products.find(p => p.productCode === batch.productCode);
    const pharmacopoeialName = product?.pharmacopeiaToUse ? 
      getPharmacopoeialName(product.pharmacopeiaToUse) : 'Not defined';
    
    setFormData({
      ...batch,
      pharmacopoeialName: pharmacopoeialName
    });
    
    setSearchTerm(`${batch.productCode} - ${batch.productName}`);
    setIsProductSelected(true);
    
    if (product) {
      setSelectedProduct(product);
    }
  };

  const handleBatchSearchKeyDown = (e: React.KeyboardEvent) => {
    const searchResults = batches.filter(
      (batch) =>
        batch.batchNumber.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
        batch.productName.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
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
        if (dropdownSelectedIndex >= 0 && searchResults[dropdownSelectedIndex]) {
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

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/admin/product?locationId=${locationId}&companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
        setFilteredProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`/api/admin/department?locationId=${locationId}&companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch(`/api/batch-input?locationId=${locationId}&companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setBatches(data.data);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  // Add this function to fetch pharmacopeial master data
  const fetchPharmacopoeials = async () => {
    try {
      const response = await fetch(`/api/admin/pharmacopeial?locationId=${locationId}&companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setPharmacopoeials(data.data);
      }
    } catch (error) {
      console.error('Error fetching pharmacopoeials:', error);
    }
  };

  const handleProductSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.productCode.toLowerCase().includes(term.toLowerCase()) ||
        product.productName.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
    setShowProductDropdown(true);
  };

  const selectProduct = async (product: Product) => {
  setSelectedProduct(product);
  
  // Add debugging logs
  console.log('Selected product:', product);
  console.log('Product pharmacopoeiaToUse:', product.pharmacopeiaToUse);
  console.log('Pharmacopoeials array:', pharmacopoeials);
  console.log('Pharmacopoeials array length:', pharmacopoeials.length);
  
  // Get pharmacopoeial name
  const pharmacopoeialName = getPharmacopoeialName(product.pharmacopeiaToUse || '');
  console.log('Resolved pharmacopoeial name:', pharmacopoeialName);
  
  setFormData(prev => ({
    ...prev,
    productCode: product.productCode,
    productName: product.productName,
    genericName: product.genericName,
    pharmacopoeiaToUse: product.pharmacopeiaToUse,
    pharmacopoeialName: pharmacopoeialName // Store the name for display
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
      const mfcResponse = await fetch(`/api/admin/mfc/${mfcId}?locationId=${locationId}&companyId=${companyId}`);
      const mfcData = await mfcResponse.json();
      
      if (mfcData.success && mfcData.data) {
        const mfc = mfcData.data;
        setSelectedMFC(mfc);
        
        setFormData(prev => ({
          ...prev,
          mfcNumber: mfc.mfcNumber
        }));

        if (mfc.departmentId) {
          await fetchDepartmentData(mfc.departmentId);
        }
      }
    } catch (error) {
      console.error('Error fetching MFC data:', error);
    }
  };

  const fetchDepartmentData = async (departmentId: string) => {
    try {
      const department = departments.find(d => d._id === departmentId);
      if (department) {
        setFormData(prev => ({
          ...prev,
          departmentName: department.description || department.department,
          daysForUrgency: department.daysOfUrgency || 0
        }));
        return;
      }
      console.warn('Department not found in cached list:', departmentId);
    } catch (error) {
      console.error('Error fetching department data:', error);
    }
  };

  const handleTypeOfSampleChange = (type: string) => {
  setFormData(prev => ({ ...prev, typeOfSample: type }));
};

  const isTestApplicable = (test: TestType, sampleType: string): boolean => {
    switch (sampleType) {
      case 'Bulk': return test.bulk;
      case 'FP': return test.fp;
      case 'Stability Partial': return test.stabilityPartial;
      case 'Stability Final': return test.stabilityFinal;
      case 'AMV': return test.amv;
      case 'PV': return test.pv;
      case 'CV': return test.cv;
      default: return false;
    }
  };

  const updateTestCheckbox = (testIndex: number, field: 'outsourced' | 'continueTests', value: boolean) => {
    setFormData(prev => ({
      ...prev,
      tests: prev.tests?.map((test, index) => 
        index === testIndex ? { ...test, [field]: value } : test
      ) || []
    }));
  };

const loadAvailableTests = async () => {
  if (!selectedMFC || !selectedProduct) {
    return;
  }

  const allTests: TestType[] = [];
  
  selectedMFC.generics.forEach((generic) => {
    generic.apis.forEach((api) => {
      allTests.push(...api.testTypes);
    });
  });

  // Safe comparison function
  const safeStringCompare = (id1: any, id2: any): boolean => {
    try {
      const str1 = (id1 && id1.toString) ? id1.toString().trim() : String(id1 || '').trim();
      const str2 = (id2 && id2.toString) ? id2.toString().trim() : String(id2 || '').trim();
      return str1 === str2 && str1.length > 0;
    } catch (error) {
      return false;
    }
  };

  // Filter by pharmacopoeial if specified
  let filteredTests = allTests;
  if (selectedProduct.pharmacopeiaToUse) {
    filteredTests = allTests.filter((test) => {
      return safeStringCompare(test.pharmacopoeialId, selectedProduct.pharmacopeiaToUse);
    });
  }

  // If no tests match pharmacopoeial filter, show all tests
  if (filteredTests.length === 0) {
    filteredTests = allTests;
  }

  // Enhance tests with names
  const enhancedTests = await enhanceTestsWithNames(filteredTests);
  setAvailableTests(enhancedTests);

  const testData = enhancedTests.map(test => ({
    testTypeId: test.testTypeId,
    testName: test.testTypeName || `Test ${test.testTypeId}`,
    columnCode: test.columnCode,
    mobilePhaseCodes: test.mobilePhaseCodes,
    detectorTypeId: test.detectorTypeId,
    pharmacopoeialId: test.pharmacopoeialId,
    blankInjection: test.blankInjection,
    standardInjection: test.standardInjection,
    sampleInjection: test.sampleInjection,
    bracketingFrequency: test.bracketingFrequency,
    runTime: test.runTime,
    washTime: test.washTime,
    outsourced: false,
    continueTests: false
  }));

  setFormData(prev => ({ ...prev, tests: testData }));
};

// Also add debugging to the useEffect that calls loadAvailableTests
useEffect(() => {
  console.log('useEffect triggered with:', {
    batchNumber: formData.batchNumber,
    manufacturingDate: formData.manufacturingDate,
    selectedMFC: selectedMFC?.mfcNumber,
    selectedProduct: selectedProduct?.productCode,
    typeOfSample: formData.typeOfSample
  });
  
  if (formData.batchNumber && formData.manufacturingDate && selectedMFC && selectedProduct) {
    console.log('Conditions met, calling loadAvailableTests');
    loadAvailableTests();
  } else {
    console.log('Conditions not met for loadAvailableTests');
  }
}, [formData.batchNumber, formData.manufacturingDate, selectedMFC, selectedProduct, formData.typeOfSample]);

// Add debugging to the test table rendering section
console.log('Rendering component with:', {
  'formData.typeOfSample': formData.typeOfSample,
  'availableTests.length': availableTests.length,
  'formData.tests?.length': formData.tests?.length
});

useEffect(() => {
  if (formData.batchNumber && formData.manufacturingDate && selectedMFC && selectedProduct) {
    loadAvailableTests();
  }
}, [formData.batchNumber, formData.manufacturingDate, selectedMFC, selectedProduct]);



  const saveBatch = async () => {
    if (!isProductSelected || !formData.batchNumber || !formData.manufacturingDate || !formData.typeOfSample) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        ...formData,
        companyId,
        locationId,
        mfcId: selectedProduct?.mfcs[0]
      };

      const method = isEditMode && selectedBatch ? 'PUT' : 'POST';
      const url = isEditMode && selectedBatch ? `/api/batch-input/${selectedBatch._id}` : '/api/batch-input';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        fetchBatches();
        setShowFormModal(false);
        resetForm();
      } else {
        setError('Error saving batch: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving batch:', error);
      setError('Error saving batch');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ priority: 'Normal', batchStatus: 'Not Started' });
    setSelectedProduct(null);
    setSelectedMFC(null);
    setIsProductSelected(false);
    setSearchTerm('');
    setAvailableTests([]);
    setError("");
  };

  const updateBatchStatus = async (batchId: string, status: string) => {
    try {
      const response = await fetch(`/api/batch-input/${batchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batchStatus: status })
      });

      const data = await response.json();
      if (data.success) {
        fetchBatches();
      }
    } catch (error) {
      console.error('Error updating batch status:', error);
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

          {/* Status Information */}
          {selectedBatch && (
            <div 
              className="bg-white rounded-lg shadow-md p-4 mb-4"
              style={{
                border: "1px solid #a6c8ff",
                backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              }}
            >
              <div className="text-sm text-gray-600">
                <span className="font-medium">Selected:</span>{" "}
                {selectedBatch.batchNumber} - {selectedBatch.productName}
                <span className="ml-4 font-medium">Index:</span>{" "}
                {currentBatchIndex + 1} of {batches.length}
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
              style={{ backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)" }}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                Batch Management ({batches.length})
              </h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0055a4] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading batches...</p>
              </div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No batches found. Click Add New (F1) to create your first batch!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead 
                    className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff]"
                    style={{ borderBottom: "1px solid #a6c8ff" }}
                  >
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Batch Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Generic Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">MFC</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type of Test</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Manufacturing Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a6c8ff]">
                    {batches.map((batch, index) => (
                      <tr
                        key={batch._id}
                        className={`cursor-pointer ${
                          selectedBatch?._id === batch._id
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          setSelectedBatch(batch);
                          setCurrentBatchIndex(index);
                        }}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {batch.batchNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {batch.productName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {batch.genericName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {batch.mfcNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {batch.typeOfSample}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(batch.manufacturingDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            batch.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                            batch.priority === 'High' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {batch.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            batch.batchStatus === 'Closed' ? 'bg-gray-100 text-gray-800' :
                            batch.batchStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {batch.batchStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex space-x-2">
                            {batch.batchStatus === 'Not Started' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateBatchStatus(batch._id!, 'In Progress');
                                }}
                                className="text-green-600 hover:text-green-900 flex items-center gap-1"
                              >
                                <Play className="h-3 w-3" />
                                <span className="text-xs">Start</span>
                              </button>
                            )}
                            {batch.batchStatus === 'In Progress' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateBatchStatus(batch._id!, 'Closed');
                                }}
                                className="text-red-600 hover:text-red-900 flex items-center gap-1"
                              >
                                <StopCircle className="h-3 w-3" />
                                <span className="text-xs">Close</span>
                              </button>
                            )}
                            <button className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                              <Merge className="h-3 w-3" />
                              <span className="text-xs">Merge</span>
                            </button>
                          </div>
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

      {/* Batch Information Form Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              className="p-4 border-b border-[#a6c8ff] flex items-center justify-between"
              style={{ backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)" }}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditMode ? 'Edit Batch Information' : 'Add New Batch'}
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
                  <span className="text-blue-600 font-medium">Pharmacopoeial to Use: </span>
                  <span className="text-blue-800">{formData.pharmacopoeialName}</span>
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
                      style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
                    >
                      {filteredProducts.map((product) => (
                        <div
                          key={product._id}
                          onClick={() => selectProduct(product)}
                          className="px-3 py-2 hover:bg-[#e6f0fa] cursor-pointer border-b border-[#a6c8ff]"
                        >
                          <div className="font-medium text-sm">{product.productCode}</div>
                          <div className="text-xs text-gray-600">{product.productName}</div>
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
                    value={formData.genericName || ''}
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
                    value={formData.mfcNumber || ''}
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
                    value={formData.batchNumber || ''}
                    onChange={(e) => handleBatchNumberChange(e.target.value)}
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                    }}
                    disabled={!isProductSelected}
                  />
                </div>
                
                {/* Manufacturing Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Manufacturing *
                  </label>
                  <input
                    type="date"
                    value={formData.manufacturingDate || ''}
                    onChange={(e) => handleManufacturingDateChange(e.target.value)}
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                    }}
                    disabled={!isProductSelected}
                  />
                </div>

                {/* Type of Test */}
                <div className={!isProductSelected ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type of Test *
                  </label>
                  <select
                    value={formData.typeOfSample || ''}
                    onChange={(e) => handleTypeOfSampleChange(e.target.value)}
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                    }}
                    disabled={!isProductSelected}
                  >
                    <option value="">Select Type</option>
                    {typeOfSampleOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className={!isProductSelected ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority || 'Normal'}
                    onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value as 'Urgent' | 'High' | 'Normal'}))}
                    className="w-full px-3 py-1 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none text-sm"
                    style={{
                      borderStyle: "inset",
                      boxShadow: isProductSelected ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                    }}
                    disabled={!isProductSelected}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.departmentName || ''}
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
                    value={formData.daysForUrgency || ''}
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
                    <h3 className="text-md font-semibold text-gray-800">Test Configuration</h3>
                    {loadingNames && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Loading names...</span>
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-[#a6c8ff] rounded">
                      <thead 
                        className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff]"
                        style={{ borderBottom: "1px solid #a6c8ff" }}
                      >
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Test Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Column</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Mobile Phase</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Detector</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Pharmacopoeial</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Blank</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Std</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Sample</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Bracket</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Runtime</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Wash</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Outsource</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Continue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#a6c8ff]">
                        {availableTests.map((test, index) => {
                          const uniqueKey = `${test.testTypeId}-${test.columnCode}-${test.pharmacopoeialId}-${index}`;
                          const isApplicable = isTestApplicable(test, formData.typeOfSample!);
                          const rowClass = isApplicable ? 'hover:bg-[#e6f0fa]' : 'bg-gray-100 text-gray-400';
                          
                          return (
                            <tr key={uniqueKey} className={rowClass}>
                              <td className="px-3 py-2 text-xs" title={test.testTypeId}>
                                {test.testTypeName || test.testTypeId}
                              </td>
                              <td className="px-3 py-2 text-xs" title={test.columnCode}>
                                {test.columnName || test.columnCode}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {test.mobilePhaseCodes.filter(mp => mp).join(', ')}
                              </td>
                              <td className="px-3 py-2 text-xs" title={test.detectorTypeId}>
                                {test.detectorName || test.detectorTypeId}
                              </td>
                              <td className="px-3 py-2 text-xs" title={test.pharmacopoeialId}>
                                {test.pharmacopoeialName || test.pharmacopoeialId}
                              </td>
                              <td className="px-3 py-2 text-xs">{test.blankInjection}</td>
                              <td className="px-3 py-2 text-xs">{test.standardInjection}</td>
                              <td className="px-3 py-2 text-xs">{test.sampleInjection}</td>
                              <td className="px-3 py-2 text-xs">{test.bracketingFrequency}</td>
                              <td className="px-3 py-2 text-xs">{test.runTime}</td>
                              <td className="px-3 py-2 text-xs">{test.washTime}</td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!isApplicable}
                                  checked={formData.tests?.[index]?.outsourced || false}
                                  onChange={(e) => updateTestCheckbox(index, 'outsourced', e.target.checked)}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!isApplicable}
                                  checked={formData.tests?.[index]?.continueTests || false}
                                  onChange={(e) => updateTestCheckbox(index, 'continueTests', e.target.checked)}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                disabled={loading || !isProductSelected || !formData.batchNumber || !formData.manufacturingDate || !formData.typeOfSample}
                className="px-4 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] disabled:opacity-50"
                style={{
                  border: "1px solid #004080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                {loading ? 'Saving...' : (isEditMode ? 'Update Batch' : 'Save Batch')}
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
              style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
            >
              {batches
                .filter(
                  (batch) =>
                    batch.batchNumber.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
                    batch.productName.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
                    batch.typeOfSample.toLowerCase().includes(batchSearchTerm.toLowerCase())
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
                    <div className="font-medium text-gray-800">{batch.batchNumber}</div>
                    <div className="text-sm text-gray-500">
                      {batch.productName} | {batch.typeOfSample} | {batch.priority}
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
                <h4 className="font-semibold text-[#0055a4]">Keyboard Shortcuts:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F1</kbd> - Add New Batch (Opens Form)</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F2</kbd> - Save Current Batch (In Form)</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F7</kbd> - Search Batches</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F9</kbd> - Edit Selected Batch (Opens Form)</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F5/F6</kbd> - Navigate Up/Down</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F10</kbd> - Delete Selected Batch</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Features:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Test configuration displays actual names instead of IDs</li>
                  <li>• Real-time name resolution from API endpoints</li>
                  <li>• Enhanced test table with column, detector, and pharmacopoeial names</li>
                  <li>• Pharmacopoeial filtering ensures only compatible tests are shown</li>
                  <li>• Tooltips show original IDs for reference</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">How to Use:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Click on any batch row to select it</li>
                  <li>• Use F1 (Add New) to open batch input form</li>
                  <li>• Use F9 (Edit) to modify selected batch</li>
                  <li>• In the form, follow the sequence: Product → Generic → Pharmacopoeial → MFC → Batch → Date → Test Type</li>
                  <li>• Test configurations load automatically with pharmacopoeial filtering</li>
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
    </div>
  );
}
