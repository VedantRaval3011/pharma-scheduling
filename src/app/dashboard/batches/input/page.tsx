'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Plus, Play, StopCircle, Merge } from 'lucide-react';

interface Product {
  _id: string;
  productCode: string;
  productName: string;
  genericName: string;
  mfcs: string[];
}

interface MFC {
  _id: string;
  mfcNumber: string;
  departmentId: string; // Add departmentId to MFC interface
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

interface Department {
  _id: string;
  department: string;
  description: string;
  daysOfUrgency?: number;
}

interface BatchData {
  _id?: string;
  productCode: string;
  productName: string;
  genericName: string;
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedMFC, setSelectedMFC] = useState<MFC | null>(null);
  const [availableTests, setAvailableTests] = useState<TestType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // Form state control
  const [isProductSelected, setIsProductSelected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // Batch table data
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [loading, setLoading] = useState(false);

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
    }
  }, [locationId, companyId]);

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
    setFormData(prev => ({
      ...prev,
      productCode: product.productCode,
      productName: product.productName,
      genericName: product.genericName
    }));
    setSearchTerm(`${product.productCode} - ${product.productName}`);
    setShowProductDropdown(false);
    setIsProductSelected(true);

    // Step 1: Get MFC data using product's mfc ID
    if (product.mfcs && product.mfcs.length > 0) {
      await fetchMFCAndDepartmentData(product.mfcs[0]);
    }
  };

  const fetchMFCAndDepartmentData = async (mfcId: string) => {
    try {
      // Step 1: Fetch MFC details using mfcId
      const mfcResponse = await fetch(`/api/admin/mfc/${mfcId}?locationId=${locationId}&companyId=${companyId}`);
      const mfcData = await mfcResponse.json();
      
      if (mfcData.success && mfcData.data) {
        const mfc = mfcData.data;
        setSelectedMFC(mfc);
        
        setFormData(prev => ({
          ...prev,
          mfcNumber: mfc.mfcNumber
        }));

        // Step 2: Fetch department details using departmentId from MFC
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
      // Find department in the cached departments list first
      const department = departments.find(d => d._id === departmentId);
      if (department) {
        setFormData(prev => ({
          ...prev,
          departmentName: department.description || department.department,
          daysForUrgency: department.daysOfUrgency || 0
        }));
        return;
      }

      // If not found in cache, try to fetch individual department (if API supports it)
      // Since your API seems to only support fetching all departments, 
      // we'll use the cached departments list
      console.warn('Department not found in cached list:', departmentId);
      
    } catch (error) {
      console.error('Error fetching department data:', error);
    }
  };

  const handleTypeOfSampleChange = (type: string) => {
    setFormData(prev => ({ ...prev, typeOfSample: type }));
    
    if (selectedMFC) {
      // Extract all test types from MFC
      const allTests: TestType[] = [];
      selectedMFC.generics.forEach(generic => {
        generic.apis.forEach(api => {
          allTests.push(...api.testTypes);
        });
      });
      
      setAvailableTests(allTests);
      
      // Initialize test data
      const testData = allTests.map(test => ({
        testTypeId: test.testTypeId,
        testName: `Test ${test.testTypeId}`,
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
    }
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

  const saveBatch = async () => {
    if (!isProductSelected || !formData.batchNumber || !formData.manufacturingDate || !formData.typeOfSample) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        companyId,
        locationId,
        mfcId: selectedProduct?.mfcs[0]
      };

      const response = await fetch('/api/batch-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        alert('Batch saved successfully!');
        fetchBatches();
        // Reset form
        resetForm();
      } else {
        alert('Error saving batch: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Error saving batch');
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Batch Input Form</h1>
        
        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          
          {/* 1. Product Details */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              1. Product Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Code / Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Search product code or name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                
                {showProductDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <div
                        key={product._id}
                        onClick={() => selectProduct(product)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b"
                      >
                        <div className="font-medium">{product.productCode}</div>
                        <div className="text-sm text-gray-600">{product.productName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.productName || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generic Name
                </label>
                <input
                  type="text"
                  value={formData.genericName || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* 2. Batch Details */}
          <div className={`mb-8 ${!isProductSelected ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              2. Batch Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={formData.batchNumber || ''}
                  onChange={(e) => setFormData(prev => ({...prev, batchNumber: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isProductSelected}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manufacturing Date *
                </label>
                <input
                  type="date"
                  value={formData.manufacturingDate || ''}
                  onChange={(e) => setFormData(prev => ({...prev, manufacturingDate: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isProductSelected}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  value={formData.priority || 'Normal'}
                  onChange={(e) => setFormData(prev => ({...prev, priority: e.target.value as 'Urgent' | 'High' | 'Normal'}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!isProductSelected}
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days for Urgency
                </label>
                <input
                  type="number"
                  value={formData.daysForUrgency || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from department</p>
              </div>
            </div>
          </div>

          {/* 3. MFC & Department */}
          <div className={`mb-8 ${!isProductSelected ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              3. MFC & Department
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MFC Number
                </label>
                <input
                  type="text"
                  value={formData.mfcNumber || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from product</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  value={formData.departmentName || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-filled from MFC</p>
              </div>
            </div>
          </div>

          {/* Rest of the component remains the same... */}
          {/* 4. Type of Sample */}
          <div className={`mb-8 ${!isProductSelected ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
              4. Type of Sample
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Type *
              </label>
              <select
                value={formData.typeOfSample || ''}
                onChange={(e) => handleTypeOfSampleChange(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isProductSelected}
              >
                <option value="">Select Type</option>
                {typeOfSampleOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Test Configuration Table */}
          {formData.typeOfSample && availableTests.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                5. Test Configuration
              </h2>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MP1-MP4, Wash1-2</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detector</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacopoeial</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blank Inj</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Std Inj</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Inj</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bracket Freq</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Runtime</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wash Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outsource</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Continue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {availableTests.map((test, index) => {
                          const uniqueKey = `${test.testTypeId}-${test.columnCode}-${test.pharmacopoeialId}-${index}`;
                          const isApplicable = isTestApplicable(test, formData.typeOfSample!);
                          const rowClass = isApplicable ? '' : 'bg-gray-100 text-gray-400';
                          
                          return (
                            <tr key={uniqueKey} className={rowClass}>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.testTypeId}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.columnCode}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                {test.mobilePhaseCodes.filter(mp => mp).join(', ')}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.detectorTypeId}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.pharmacopoeialId}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.blankInjection}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.standardInjection}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.sampleInjection}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.bracketingFrequency}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.runTime}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">{test.washTime}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <input
                                  type="checkbox"
                                  disabled={!isApplicable}
                                  checked={formData.tests?.[index]?.outsourced || false}
                                  onChange={(e) => updateTestCheckbox(index, 'outsourced', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                <input
                                  type="checkbox"
                                  disabled={!isApplicable}
                                  checked={formData.tests?.[index]?.continueTests || false}
                                  onChange={(e) => updateTestCheckbox(index, 'continueTests', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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

          {/* 6. Save & Actions */}
          <div className="flex flex-wrap gap-4 pt-6 border-t">
            <button
              onClick={saveBatch}
              disabled={loading || !isProductSelected}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Batch'}
            </button>
            
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              Reset Form
            </button>
          </div>
        </div>

        {/* Batch Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Batch Management
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type of Sample</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr key={batch._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {batch.batchNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.typeOfSample}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        batch.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                        batch.priority === 'High' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {batch.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        batch.batchStatus === 'Closed' ? 'bg-gray-100 text-gray-800' :
                        batch.batchStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {batch.batchStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {batch.batchStatus === 'Not Started' && (
                        <button
                          onClick={() => updateBatchStatus(batch._id!, 'In Progress')}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                        >
                          <Play className="h-4 w-4" />
                          Start
                        </button>
                      )}
                      {batch.batchStatus === 'In Progress' && (
                        <button
                          onClick={() => updateBatchStatus(batch._id!, 'Closed')}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        >
                          <StopCircle className="h-4 w-4" />
                          Close
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                        <Merge className="h-4 w-4" />
                        Merge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}