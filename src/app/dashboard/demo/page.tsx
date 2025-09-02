"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Play,
  Clock,
  Beaker,
  Settings,
  Save,
  AlertCircle,
  FlaskConical,
  CheckCircle,
  X,
  Edit3,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

import type {
  MFCData,
  TestType,
  BatchMFC,
  OptimizedGroup,
  OptimizationResult,
  PlanningData,
  ScheduledBatch,
  ExtractedPhases,
  PriorityInfo,
  API,
  Generic,
} from "@/types/hplc";

// Updated Test Details Component with Columnar Layout
interface TestDetailsCardProps {
  test: TestType;
  mfcNumber?: string;
  showMfcNumber?: boolean;
}

const TestDetailsCard: React.FC<TestDetailsCardProps> = ({ test, mfcNumber, showMfcNumber = false }) => {
  const masterPhases = test.mobilePhaseCodes.slice(0, 4).filter(Boolean).join(', ');
  const washPhases = test.mobilePhaseCodes.slice(4, 6).filter(Boolean).join(', ');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 shadow-sm">
      {/* Header Row */}
      <div className="grid grid-cols-8 gap-3 text-xs font-semibold text-gray-500 mb-2 pb-2 border-b border-gray-100">
        <div>Test Name</div>
        <div>Column</div>
        <div>Detector</div>
        <div>Mobile Phase</div>
        <div>Wash Phase</div>
        <div>Runtime</div>
        <div>Injections</div>
        <div>Status</div>
      </div>
      
      {/* Data Row */}
      <div className="grid grid-cols-8 gap-3 text-sm">
        <div>
          <div className="font-semibold text-gray-800 truncate" title={test.testName}>
            {test.testName}
          </div>
          {showMfcNumber && mfcNumber && (
            <div className="text-xs text-blue-600 mt-1">MFC: {mfcNumber}</div>
          )}
        </div>
        
        <div className="truncate" title={test.columnCode}>
          {test.columnCode}
        </div>
        
        <div className="truncate" title={test.detectorType || 'N/A'}>
          {test.detectorType || 'N/A'}
        </div>
        
        <div className="truncate" title={masterPhases}>
          {masterPhases || 'N/A'}
        </div>
        
        <div className="truncate" title={washPhases}>
          {washPhases || 'N/A'}
        </div>
        
        <div className="font-medium text-gray-800">
          {test.runTime} min
        </div>
        
        <div className="text-xs space-y-1">
          <div>S: {test.sampleInjection}</div>
          <div>St: {test.standardInjection}</div>
          <div>B: {test.blankInjection}</div>
        </div>
        
        <div>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
            Ready
          </span>
        </div>
      </div>
    </div>
  );
};

// Test List Component with Table-like Headers
interface TestListProps {
  tests: TestType[];
  mfcNumber?: string;
  showMfcNumber?: boolean;
  maxHeight?: string;
  showHeaders?: boolean;
}

const TestList: React.FC<TestListProps> = ({ 
  tests, 
  mfcNumber, 
  showMfcNumber = false, 
  maxHeight = "max-h-48",
  showHeaders = true
}) => {
  return (
    <div className={`${maxHeight} overflow-y-auto space-y-2`}>
      {/* Table Headers (optional) */}
      {showHeaders && tests.length > 0 && (
        <div className="grid grid-cols-6 gap-3 px-3 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 sticky top-0 z-10">
          <div>Test Details</div>
          <div>Column</div>
          <div>Detector</div>
          <div>Mobile Phases</div>
          <div>Wash Phases</div>
          <div>Injections & Runtime</div>
        </div>
      )}
      
      {tests.map((test) => (
        <TestDetailsCard 
          key={test.testTypeId} 
          test={test} 
          mfcNumber={mfcNumber}
          showMfcNumber={showMfcNumber}
        />
      ))}
      
      {tests.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No tests available
        </div>
      )}
    </div>
  );
};

// Compact Test Table Component for popup display
interface CompactTestTableProps {
  tests: TestType[];
  maxDisplay?: number;
}

const CompactTestTable: React.FC<CompactTestTableProps> = ({ tests, maxDisplay = 3 }) => {
  const displayTests = maxDisplay ? tests.slice(0, maxDisplay) : tests;
  const remainingCount = tests.length - displayTests.length;

  return (
    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
      {/* Compact Table Header */}
      <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-600 mb-2 pb-1 border-b border-gray-300">
        <div>Test</div>
        <div>Column</div>
        <div>Detector</div>
        <div>Runtime</div>
        <div>Injections</div>
      </div>
      
      {/* Compact Test Rows */}
      {displayTests.map((test) => (
        <div key={test.testTypeId} className="grid grid-cols-5 gap-2 text-xs py-1 border-b border-gray-100 last:border-b-0">
          <div className="truncate font-medium" title={test.testName}>
            {test.testName}
          </div>
          <div className="truncate" title={test.columnCode}>
            {test.columnCode}
          </div>
          <div className="truncate" title={test.detectorType || 'N/A'}>
            {test.detectorType || 'N/A'}
          </div>
          <div>{test.runTime}m</div>
          <div>{test.sampleInjection}s/{test.standardInjection}st/{test.blankInjection}b</div>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="text-center text-xs text-blue-600 py-1 font-medium">
          +{remainingCount} more tests
        </div>
      )}
    </div>
  );
};

const HPLCBatchScheduler: React.FC = () => {
  // State management
  const [mfcData, setMfcData] = useState<MFCData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledBatches, setScheduledBatches] = useState<ScheduledBatch[]>([]);

  // Batch creation state
  const [batchName, setBatchName] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [batchMFCs, setBatchMFCs] = useState<BatchMFC[]>([]);

  // Popup state
  const [showMFCSelectionPopup, setShowMFCSelectionPopup] = useState<boolean>(false);
  const [showOptimizationPreview, setShowOptimizationPreview] = useState<boolean>(false);

  // Fetch MFC data
  useEffect(() => {
    const fetchMfcData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/mfc.json");
        if (!response.ok) {
          throw new Error(`Failed to fetch MFC data: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) {
          throw new Error("Invalid data format received from mfc.json");
        }
        setMfcData(data.data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setLoading(false);
      }
    };

    fetchMfcData();
  }, []);

  // Utility functions
  const extractPhases = useCallback((mobilePhaseCodes: string[]): ExtractedPhases => {
    const masterPhases = mobilePhaseCodes
      .slice(0, 4)
      .filter((phase): phase is string => phase !== "");
    const washPhases = mobilePhaseCodes
      .slice(4, 6)
      .filter((phase): phase is string => phase !== "");
    return { masterPhases, washPhases };
  }, []);

  const getPriorityInfo = useCallback((priority: "urgent" | "high" | "normal"): PriorityInfo => {
    const priorityMap: Record<"urgent" | "high" | "normal", PriorityInfo> = {
      urgent: {
        label: "Urgent",
        color: "text-red-600 bg-red-100",
        order: 1,
        icon: "🚨",
      },
      high: {
        label: "High",
        color: "text-orange-600 bg-orange-100",
        order: 2,
        icon: "⚡",
      },
      normal: {
        label: "Normal",
        color: "text-green-600 bg-green-100",
        order: 3,
        icon: "📋",
      },
    };
    return priorityMap[priority];
  }, []);

  // Add multiple MFCs to batch with their respective priorities
  const addMFCsToBatch = useCallback((selectedMFCs: Map<string, 'urgent' | 'high' | 'normal'>) => {
    const newBatchMFCs: BatchMFC[] = [];
    
    selectedMFCs.forEach((priority, mfcId) => {
      const mfc = mfcData.find(m => m._id === mfcId);
      if (mfc) {
        // Get all test types for this MFC
        const allTestTypes = mfc.generics.flatMap(generic =>
          generic.apis.flatMap(api => api.testTypes)
        );

        const batchMFC: BatchMFC = {
          mfcId: mfc._id,
          mfcNumber: mfc.mfcNumber,
          genericName: mfc.generics[0].genericName,
          priority,
          testTypes: allTestTypes,
        };

        newBatchMFCs.push(batchMFC);
      }
    });

    setBatchMFCs(prev => {
      // Remove existing MFCs that are being re-added with new priorities
      const filtered = prev.filter(existing => !selectedMFCs.has(existing.mfcId));
      return [...filtered, ...newBatchMFCs];
    });
  }, [mfcData]);

  // Remove MFC from batch
  const removeMFCFromBatch = useCallback((mfcId: string) => {
    setBatchMFCs(prev => prev.filter(item => item.mfcId !== mfcId));
  }, []);

  // Optimization calculation
  const calculateOptimization = useCallback((mfcs: BatchMFC[]): OptimizationResult => {
    if (mfcs.length === 0) {
      return {
        originalTime: 0,
        optimizedTime: 0,
        timeSaved: 0,
        groups: [],
        totalWashTime: 0,
      };
    }

    const allTests = mfcs.flatMap(mfc =>
      mfc.testTypes.map(test => ({
        ...test,
        mfcNumber: mfc.mfcNumber,
        priority: mfc.priority,
        priorityOrder: getPriorityInfo(mfc.priority).order,
      }))
    );

    const originalTime = allTests.reduce((sum, test) => sum + test.runTime, 0);

    const sortedTests = [...allTests].sort((a, b) => {
      if (a.priorityOrder !== b.priorityOrder) {
        return a.priorityOrder - b.priorityOrder;
      }
      if (a.columnCode !== b.columnCode) {
        return a.columnCode.localeCompare(b.columnCode);
      }
      const aMasterPhases = extractPhases(a.mobilePhaseCodes).masterPhases.join(",");
      const bMasterPhases = extractPhases(b.mobilePhaseCodes).masterPhases.join(",");
      if (aMasterPhases !== bMasterPhases) {
        return aMasterPhases.localeCompare(bMasterPhases);
      }
      return 0;
    });

    const groups: OptimizedGroup[] = [];
    const processedTests = new Set<string>();
    let executionOrder = 1;

    sortedTests.forEach(baseTest => {
      if (processedTests.has(baseTest.testTypeId)) return;

      const phases = extractPhases(baseTest.mobilePhaseCodes);
      
      const groupedTests = sortedTests.filter(test => 
        !processedTests.has(test.testTypeId) &&
        test.priorityOrder === baseTest.priorityOrder &&
        test.columnCode === baseTest.columnCode &&
        extractPhases(test.mobilePhaseCodes).masterPhases.join(",") === phases.masterPhases.join(",") &&
        test.runTime === baseTest.runTime
      );

      groupedTests.forEach(test => processedTests.add(test.testTypeId));

      const group: OptimizedGroup = {
        priority: baseTest.priority,
        column: baseTest.columnCode,
        masterPhases: phases.masterPhases,
        washPhases: phases.washPhases,
        tests: groupedTests.map(test => ({
          mfcNumber: test.mfcNumber,
          testName: test.testName,
          runTime: test.runTime,
          testTypeId: test.testTypeId,
          columnCode: test.columnCode,
          detectorType: test.detectorType,
          detectorTypeId: test.detectorTypeId,
          sampleInjection: test.sampleInjection,
          standardInjection: test.standardInjection,
          blankInjection: test.blankInjection,
          mobilePhaseCodes: test.mobilePhaseCodes,
        })),
        groupedRuntime: baseTest.runTime,
        washTime: 15,
        executionOrder: executionOrder++,
      };

      groups.push(group);
    });

    const washGroups: Record<string, OptimizedGroup[]> = {};
    let totalWashTime = 0;

    groups.forEach(group => {
      const washKey = group.washPhases.join(",");
      if (!washGroups[washKey]) {
        washGroups[washKey] = [];
        totalWashTime += group.washTime;
      }
      washGroups[washKey].push(group);
    });

    const optimizedTime = groups.reduce((sum, group) => sum + group.groupedRuntime, 0) + totalWashTime;

    return {
      originalTime,
      optimizedTime,
      timeSaved: originalTime - optimizedTime,
      groups,
      totalWashTime,
    };
  }, [extractPhases, getPriorityInfo]);

  // Create batch
  const createBatch = useCallback(() => {
    if (!batchName || !batchNumber || batchMFCs.length === 0) {
      alert("Please fill in batch name, number, and add at least one MFC.");
      return;
    }

    const optimization = calculateOptimization(batchMFCs);
    
    const planningData: PlanningData = {
      batchNumber,
      batchName,
      mfcs: batchMFCs,
      optimization,
      createdAt: new Date().toISOString(),
    };

    const batch: ScheduledBatch = {
      id: `batch_${Date.now()}`,
      name: batchName,
      number: batchNumber,
      planningData,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setScheduledBatches(prev => [...prev, batch]);
    setBatchName("");
    setBatchNumber("");
    setBatchMFCs([]);
    setShowOptimizationPreview(false);
  }, [batchName, batchNumber, batchMFCs, calculateOptimization]);

  // Render loading or error states
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <FlaskConical className="text-blue-600 animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600 text-lg">Loading MFC data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 text-lg">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FlaskConical className="text-blue-600" />
            HPLC Batch Planning System
          </h1>
          <p className="text-gray-600 text-lg">
            Advanced MFC-based batch planning with priority optimization
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batch Creation Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Settings className="text-blue-100" />
                  Batch Planning
                </h2>
              </div>

              <div className="p-6">
                {/* Batch Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Name *
                    </label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="e.g., Morning-HPLC-Batch-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="e.g., BATCH-2025-001"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setShowMFCSelectionPopup(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={18} />
                    Add MFCs to Batch
                  </button>
                  
                  {batchMFCs.length > 0 && (
                    <button
                      onClick={() => setShowOptimizationPreview(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle size={18} />
                      Preview Optimization
                    </button>
                  )}
                </div>

                {/* Selected MFCs - Updated to show columnar test details */}
                {batchMFCs.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Selected MFCs</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {batchMFCs.map((mfc) => {
                        const priorityInfo = getPriorityInfo(mfc.priority);
                        
                        return (
                          <div key={mfc.mfcId} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-semibold text-gray-800">{mfc.mfcNumber}</span>
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${priorityInfo.color}`}>
                                    {priorityInfo.icon} {priorityInfo.label}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">{mfc.genericName}</p>
                                <p className="text-xs text-gray-500 mt-1">{mfc.testTypes.length} tests included</p>
                              </div>
                              <button
                                onClick={() => removeMFCFromBatch(mfc.mfcId)}
                                className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            
                            {/* Detailed Test Information with Columns */}
                            <div className="border-t border-gray-200 pt-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Test Details:</h4>
                              <TestList 
                                tests={mfc.testTypes} 
                                mfcNumber={mfc.mfcNumber}
                                maxHeight="max-h-64"
                                showHeaders={true}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scheduled Batches Panel */}
          <div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Clock className="text-purple-100" />
                  Scheduled Batches ({scheduledBatches.length})
                </h2>
              </div>

              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {scheduledBatches.map((batch) => (
                    <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800">{batch.name}</h3>
                      <p className="text-sm text-gray-600">#{batch.number}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-gray-50 rounded p-2">
                          <div className="font-medium">{batch.planningData.mfcs.length}</div>
                          <div className="text-xs text-gray-600">MFCs</div>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <div className="font-medium text-green-600">{batch.planningData.optimization.timeSaved}</div>
                          <div className="text-xs text-gray-600">Min Saved</div>
                        </div>
                        <div className="bg-blue-50 rounded p-2">
                          <div className="font-medium text-blue-600">{batch.planningData.optimization.optimizedTime}</div>
                          <div className="text-xs text-gray-600">Total Min</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {scheduledBatches.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                      <Clock size={48} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No batches planned yet</p>
                      <p className="text-sm">Create your first batch to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MFC Multi-Selection Popup */}
        {showMFCSelectionPopup && (
          <MFCMultiSelectionPopup
            mfcData={mfcData}
            onClose={() => setShowMFCSelectionPopup(false)}
            onAddMFCs={addMFCsToBatch}
            existingMFCIds={batchMFCs.map(mfc => mfc.mfcId)}
            extractPhases={extractPhases}
          />
        )}

        {/* Optimization Preview Popup */}
        {showOptimizationPreview && (
          <OptimizationPreviewPopup
            batchMFCs={batchMFCs}
            optimization={calculateOptimization(batchMFCs)}
            onClose={() => setShowOptimizationPreview(false)}
            onCreateBatch={createBatch}
            getPriorityInfo={getPriorityInfo}
          />
        )}
      </div>
    </div>
  );
};

// MFC Multi-Selection Popup with IMPROVED columnar test display
interface MFCMultiSelectionPopupProps {
  mfcData: MFCData[];
  onClose: () => void;
  onAddMFCs: (selectedMFCs: Map<string, 'urgent' | 'high' | 'normal'>) => void;
  existingMFCIds: string[];
  extractPhases: (mobilePhaseCodes: string[]) => ExtractedPhases;
}

const MFCMultiSelectionPopup: React.FC<MFCMultiSelectionPopupProps> = ({
  mfcData,
  onClose,
  onAddMFCs,
  existingMFCIds,
  extractPhases,
}) => {
  // State: Map of MFC ID to priority
  const [selectedMFCs, setSelectedMFCs] = useState<Map<string, 'urgent' | 'high' | 'normal'>>(new Map());
  
  // Search and pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Filter MFCs
  const filteredMFCs = useMemo(() => {
    if (!searchTerm) return mfcData;
    return mfcData.filter(mfc =>
      mfc.mfcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mfc.generics.some(generic => 
        generic.genericName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [mfcData, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredMFCs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMFCs = filteredMFCs.slice(startIndex, startIndex + itemsPerPage);

  // Handle MFC selection toggle
  const handleMFCToggle = (mfcId: string) => {
    setSelectedMFCs(prev => {
      const newMap = new Map(prev);
      if (newMap.has(mfcId)) {
        newMap.delete(mfcId);
      } else {
        newMap.set(mfcId, 'normal'); // Default priority
      }
      return newMap;
    });
  };

  // Handle priority change for specific MFC
  const handlePriorityChange = (mfcId: string, priority: 'urgent' | 'high' | 'normal') => {
    setSelectedMFCs(prev => {
      const newMap = new Map(prev);
      if (newMap.has(mfcId)) {
        newMap.set(mfcId, priority);
      }
      return newMap;
    });
  };

  // Select all visible MFCs
  const handleSelectAllVisible = () => {
    setSelectedMFCs(prev => {
      const newMap = new Map(prev);
      paginatedMFCs.forEach(mfc => {
        if (!existingMFCIds.includes(mfc._id)) {
          newMap.set(mfc._id, 'normal');
        }
      });
      return newMap;
    });
  };

  // Deselect all visible MFCs
  const handleDeselectAllVisible = () => {
    setSelectedMFCs(prev => {
      const newMap = new Map(prev);
      paginatedMFCs.forEach(mfc => {
        newMap.delete(mfc._id);
      });
      return newMap;
    });
  };

  const handleSubmit = () => {
    if (selectedMFCs.size === 0) {
      alert("Please select at least one MFC");
      return;
    }

    onAddMFCs(selectedMFCs);
    onClose();
  };

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Fix pagination bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getPriorityButtonClass = (priority: 'urgent' | 'high' | 'normal', selectedPriority: 'urgent' | 'high' | 'normal') => {
    const baseClass = "px-2 py-1 text-xs rounded transition-colors border";
    if (priority === selectedPriority) {
      return `${baseClass} ${
        priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-300' :
        priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-300' :
        'bg-green-100 text-green-700 border-green-300'
      }`;
    }
    return `${baseClass} bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full mx-4 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center rounded-t-xl flex-shrink-0">
          <h3 className="text-xl font-semibold text-white">
            Select MFCs with Individual Priorities
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-6">
          {/* Search and Controls */}
          <div className="mb-4 bg-gray-50 p-4 rounded-lg flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search MFCs
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Search by MFC number or generic name..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items per page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllVisible}
                  className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAllVisible}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredMFCs.length)} of {filteredMFCs.length} MFCs
                {searchTerm && ` (filtered from ${mfcData.length} total)`}
              </div>
              <div className="text-sm text-green-600 font-medium">
                {selectedMFCs.size} MFCs selected
              </div>
            </div>
          </div>

          {/* IMPROVED MFC Table - Separate columns for Master Phases, Run Times, and Injections */}
          <div className="flex-1 min-h-0 bg-white border border-gray-300 rounded-lg overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="bg-gray-100 border-b border-gray-300 flex-shrink-0">
              <div className="grid grid-cols-10 gap-3 px-4 py-3">
                <div className="text-left text-sm font-medium text-gray-700">Select</div>
                <div className="text-left text-sm font-medium text-gray-700">S.No</div>
                <div className="text-left text-sm font-medium text-gray-700">MFC Number</div>
                <div className="text-left text-sm font-medium text-gray-700">Generic Name</div>
                <div className="text-left text-sm font-medium text-gray-700">APIs</div>
                <div className="text-left text-sm font-medium text-gray-700">Master Phases</div>
                <div className="text-left text-sm font-medium text-gray-700">Run Times</div>
                <div className="text-left text-sm font-medium text-gray-700">Injections</div>
                <div className="text-center text-sm font-medium text-gray-700">Priority</div>
                <div className="text-left text-sm font-medium text-gray-700">Status</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto">
              {paginatedMFCs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-gray-500 h-full">
                  <Filter className="mb-2 text-gray-300" size={48} />
                  <p className="text-lg font-medium">No MFCs found</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {paginatedMFCs.map((mfc, index) => {
                    // Get all test types for this MFC
                    const allTestTypes = mfc.generics.flatMap(generic =>
                      generic.apis.flatMap(api => api.testTypes)
                    );
                    
                    // Extract unique master phases across all tests
                    const allMasterPhases = Array.from(new Set(
                      allTestTypes.flatMap(test => 
                        extractPhases(test.mobilePhaseCodes).masterPhases
                      )
                    ));
                    
                    // Extract unique run times
                    const allRunTimes = Array.from(new Set(
                      allTestTypes.map(test => test.runTime)
                    )).sort((a, b) => a - b);
                    
                    // Get injection information
                    const injectionSummary = allTestTypes.map(test => 
                      `${test.sampleInjection}s/${test.standardInjection}st/${test.blankInjection}b`
                    );
                    const uniqueInjections = Array.from(new Set(injectionSummary));
                    
                    const isSelected = selectedMFCs.has(mfc._id);
                    const isExisting = existingMFCIds.includes(mfc._id);
                    const selectedPriority = selectedMFCs.get(mfc._id) || 'normal';
                    
                    return (
                      <div key={mfc._id} className={`grid grid-cols-10 gap-3 px-4 py-3 items-start transition-colors ${
                        isSelected ? 'bg-blue-50' : isExisting ? 'bg-yellow-50' : 'bg-white hover:bg-gray-50'
                      }`}>
                        {/* Select Checkbox */}
                        <div className="text-center pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isExisting}
                            onChange={() => handleMFCToggle(mfc._id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                          />
                        </div>
                        
                        {/* Serial Number */}
                        <div className="text-sm pt-1">
                          {startIndex + index + 1}
                        </div>
                        
                        {/* MFC Number */}
                        <div className="text-sm font-medium pt-1">
                          {mfc.mfcNumber}
                        </div>
                        
                        {/* Generic Name */}
                        <div className="text-sm pt-1">
                          {mfc.generics.map(g => g.genericName).join(", ")}
                        </div>
                        
                        {/* APIs */}
                        <div className="text-sm pt-1">
                          <div className="font-medium">{mfc.generics.reduce((sum, g) => sum + g.apis.length, 0)}</div>
                          <div className="text-xs text-gray-500">{allTestTypes.length} tests</div>
                        </div>
                        
                        {/* Master Phases - NEW SEPARATE COLUMN */}
                        <div className="text-sm pt-1">
                          <div className="max-h-16 overflow-y-auto">
                            {allMasterPhases.length > 0 ? (
                              <div className="space-y-1">
                                {allMasterPhases.slice(0, 3).map((phase, idx) => (
                                  <div key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {phase}
                                  </div>
                                ))}
                                {allMasterPhases.length > 3 && (
                                  <div className="text-xs text-blue-600 font-medium">
                                    +{allMasterPhases.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Run Times - NEW SEPARATE COLUMN */}
                        <div className="text-sm pt-1">
                          <div className="max-h-16 overflow-y-auto">
                            {allRunTimes.length > 0 ? (
                              <div className="space-y-1">
                                {allRunTimes.slice(0, 3).map((time, idx) => (
                                  <div key={idx} className="text-xs bg-green-100 px-2 py-1 rounded">
                                    {time}min
                                  </div>
                                ))}
                                {allRunTimes.length > 3 && (
                                  <div className="text-xs text-blue-600 font-medium">
                                    +{allRunTimes.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Injections - NEW SEPARATE COLUMN */}
                        <div className="text-sm pt-1">
                          <div className="max-h-16 overflow-y-auto">
                            {uniqueInjections.length > 0 ? (
                              <div className="space-y-1">
                                {uniqueInjections.slice(0, 2).map((injection, idx) => (
                                  <div key={idx} className="text-xs bg-purple-100 px-2 py-1 rounded">
                                    {injection}
                                  </div>
                                ))}
                                {uniqueInjections.length > 2 && (
                                  <div className="text-xs text-blue-600 font-medium">
                                    +{uniqueInjections.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Priority Selection */}
                        <div className="flex gap-1 justify-center pt-1">
                          {isSelected ? (
                            <>
                              <button
                                onClick={() => handlePriorityChange(mfc._id, 'urgent')}
                                className={getPriorityButtonClass('urgent', selectedPriority)}
                                title="Urgent Priority"
                              >
                                🚨
                              </button>
                              <button
                                onClick={() => handlePriorityChange(mfc._id, 'high')}
                                className={getPriorityButtonClass('high', selectedPriority)}
                                title="High Priority"
                              >
                                ⚡
                              </button>
                              <button
                                onClick={() => handlePriorityChange(mfc._id, 'normal')}
                                className={getPriorityButtonClass('normal', selectedPriority)}
                                title="Normal Priority"
                              >
                                📋
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Select MFC first</span>
                          )}
                        </div>
                        
                        {/* Status */}
                        <div className="text-sm pt-1">
                          {isExisting ? (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                              Already Added
                            </span>
                          ) : isSelected ? (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                              Selected
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                              Available
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                  />
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between items-center bg-gray-50 rounded-b-xl flex-shrink-0">
          <div className="text-sm text-gray-600">
            {selectedMFCs.size > 0 && (
              <div className="space-y-1">
                <div>{selectedMFCs.size} MFC{selectedMFCs.size > 1 ? 's' : ''} selected</div>
                <div className="flex gap-2 text-xs">
                  {Array.from(selectedMFCs.values()).reduce((acc, priority) => {
                    acc[priority] = (acc[priority] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>).urgent && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                      🚨 {Array.from(selectedMFCs.values()).filter(p => p === 'urgent').length} Urgent
                    </span>
                  )}
                  {Array.from(selectedMFCs.values()).reduce((acc, priority) => {
                    acc[priority] = (acc[priority] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>).high && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                      ⚡ {Array.from(selectedMFCs.values()).filter(p => p === 'high').length} High
                    </span>
                  )}
                  {Array.from(selectedMFCs.values()).reduce((acc, priority) => {
                    acc[priority] = (acc[priority] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>).normal && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                      📋 {Array.from(selectedMFCs.values()).filter(p => p === 'normal').length} Normal
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmit}
              disabled={selectedMFCs.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Add {selectedMFCs.size} MFC{selectedMFCs.size > 1 ? 's' : ''} to Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Optimization Preview Popup with columnar test display
interface OptimizationPreviewPopupProps {
  batchMFCs: BatchMFC[];
  optimization: OptimizationResult;
  onClose: () => void;
  onCreateBatch: () => void;
  getPriorityInfo: (priority: 'urgent' | 'high' | 'normal') => PriorityInfo;
}

const OptimizationPreviewPopup: React.FC<OptimizationPreviewPopupProps> = ({
  batchMFCs,
  optimization,
  onClose,
  onCreateBatch,
  getPriorityInfo,
}) => {
  // Calculate detailed statistics for explanation
  const totalTests = batchMFCs.reduce((sum, mfc) => sum + mfc.testTypes.length, 0);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full mx-4 my-8 h-[95vh] flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <div>
            <h3 className="text-xl font-semibold text-white">Optimization Preview & Detailed Test Analysis</h3>
            <p className="text-green-100 text-sm">Comprehensive breakdown including all test parameters</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 text-center border">
                <div className="text-2xl font-bold text-gray-800">{optimization.originalTime}</div>
                <div className="text-sm text-gray-600">Original Time (min)</div>
                <div className="text-xs text-gray-500 mt-1">{totalTests} individual tests</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{optimization.optimizedTime}</div>
                <div className="text-sm text-gray-600">Optimized Time (min)</div>
                <div className="text-xs text-gray-500 mt-1">{optimization.groups.length} grouped runs</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600">{optimization.timeSaved}</div>
                <div className="text-sm text-gray-600">Time Saved (min)</div>
                <div className="text-xs text-gray-500 mt-1">{optimization.totalWashTime}min wash optimization</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  {optimization.originalTime > 0 ? ((optimization.timeSaved / optimization.originalTime) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-gray-600">Efficiency Gain</div>
                <div className="text-xs text-gray-500 mt-1">From grouping & wash optimization</div>
              </div>
            </div>

            {/* All Tests Detailed View with Columns */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Beaker className="text-blue-600" size={20} />
                Complete Test Details ({totalTests} Tests)
              </h4>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <TestList 
                  tests={batchMFCs.flatMap(mfc => mfc.testTypes)} 
                  showMfcNumber={true}
                  maxHeight="max-h-96"
                  showHeaders={true}
                />
              </div>
            </div>

            {/* MFC Summary */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FlaskConical className="text-blue-600" size={20} />
                Selected MFCs with Individual Priorities
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-800 mb-3">MFC List ({batchMFCs.length})</h5>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {batchMFCs.map((mfc) => {
                      const priorityInfo = getPriorityInfo(mfc.priority);
                      return (
                        <div key={mfc.mfcId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{mfc.mfcNumber}</span>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${priorityInfo.color}`}>
                              {priorityInfo.icon} {priorityInfo.label}
                            </span>
                          </div>
                          <span className="text-gray-600">{mfc.testTypes.length} tests</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-semibold text-green-800 mb-3">Priority Distribution</h5>
                  <div className="space-y-2 text-sm">
                    {(['urgent', 'high', 'normal'] as const).map((priorityLevel) => {
                      const count = batchMFCs.filter(mfc => mfc.priority === priorityLevel).length;
                      const tests = batchMFCs.filter(mfc => mfc.priority === priorityLevel)
                        .reduce((sum, mfc) => sum + mfc.testTypes.length, 0);
                      const priorityInfo = getPriorityInfo(priorityLevel);
                      
                      return (
                        <div key={priorityLevel} className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <span>{priorityInfo.icon}</span>
                            <span className="capitalize">{priorityLevel}:</span>
                          </div>
                          <span className="font-medium">{count} MFCs ({tests} tests)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Summary */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-600" size={20} />
                Execution Summary
              </h4>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  The system will execute <strong>{optimization.groups.length} optimized groups</strong> instead of {totalTests} individual tests, 
                  saving <strong>{optimization.timeSaved} minutes</strong> ({((optimization.timeSaved / optimization.originalTime) * 100).toFixed(1)}% efficiency gain) 
                  through intelligent grouping by priority, column, mobile phase compatibility, detector requirements, and injection parameters.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Edit
          </button>
          <button
            onClick={onCreateBatch}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            Create Optimized Batch
          </button>
        </div>
      </div>
    </div>
  );
};

export default HPLCBatchScheduler;
