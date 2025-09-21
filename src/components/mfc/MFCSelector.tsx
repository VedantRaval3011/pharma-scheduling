// components/mfc/MFCSelector.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

interface Mfc {
  _id: string;
  mfcNumber: string;
  genericName?: string;
  companyId?: string;
  locationId?: string;
  generics?: Array<{
    genericName: string;
    apis?: Array<{
      apiName: string;
      testTypes?: Array<{
        testTypeId: string;
        columnCode: string;
        detectorTypeId: string;
        pharmacopoeialId: string | string[];
      }>;
    }>;
  }>;
  departmentId?: string;
}

interface MFCSelectorProps {
  selectedMFC: string | null;
  onChange: (selectedMFC: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Lookup interfaces
interface LookupItem {
  id: string;
  value: string;
  label?: string;
  name?: string;
  api?: string;
  apiName?: string;
  testType?: string;
  detectorType?: string;
  department?: string;
  pharmacopeial?: string;
  columnCode?: string;
}

interface LookupData {
  testTypes: LookupItem[];
  detectorTypes: LookupItem[];
  departments: LookupItem[];
  apis: LookupItem[];
  columns: LookupItem[];
  pharmacopoeials: LookupItem[];
}

const getStorageIds = () => {
  if (typeof window === "undefined") return { companyId: null, locationId: null };
  const companyId = localStorage.getItem("companyId");
  const locationId = localStorage.getItem("locationId");
  return { companyId, locationId };
};

const MFCSelector: React.FC<MFCSelectorProps> = ({
  selectedMFC,
  onChange,
  placeholder = "Select MFC record...",
  disabled = false,
  className = "",
}) => {
  const [mfcs, setMfcs] = useState<Mfc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMfcs, setFilteredMfcs] = useState<Mfc[]>([]);
  
  // Lookup data states
  const [lookupData, setLookupData] = useState<LookupData>({
    testTypes: [] as LookupItem[],
    detectorTypes: [] as LookupItem[],
    departments: [] as LookupItem[],
    apis: [] as LookupItem[],
    columns: [] as LookupItem[],
    pharmacopoeials: [] as LookupItem[],
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { companyId, locationId } = getStorageIds();

  // Normalize API response to value, label format
  const normalizeToMasterFormat = (data: any[]): LookupItem[] => {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      id: item.id || item.value || item._id || "",
      value: item.id || item.value || item._id || "",
      label: item.detectorType || item.testType || item.api || item.apiName || item.department || 
             item.columnCode || item.pharmacopeial || item.name || item.label || item.code || 
             item.description || item.value || "",
      name: item.name || item.label || "",
      api: item.api || "",
      apiName: item.api || item.apiName || item.name || item.label || "",
      testType: item.testType || "",
      detectorType: item.detectorType || "",
      department: item.department || "",
      pharmacopeial: item.pharmacopeial || "",
      columnCode: item.columnCode || "",
    }));
  };

  // Fetch lookup data
  const fetchLookupData = async () => {
    if (!companyId || !locationId) return;

    try {
      const params = new URLSearchParams({ companyId, locationId });
      
      const [
        testTypesRes,
        detectorTypesRes,
        departmentsRes,
        apisRes,
        columnsRes,
        pharmacopoeialsRes,
      ] = await Promise.all([
        fetch(`/api/admin/test-type?${params}`).catch(() => null),
        fetch(`/api/admin/detector-type?${params}`).catch(() => null),
        fetch(`/api/admin/department?${params}`).catch(() => null),
        fetch(`/api/admin/api?${params}`).catch(() => null),
        fetch(`/api/admin/column/getAll?${params}`).catch(() => null),
        fetch(`/api/admin/pharmacopeial?${params}`).catch(() => null),
      ]);

      const lookups: LookupData = {
        testTypes: [],
        detectorTypes: [],
        departments: [],
        apis: [],
        columns: [],
        pharmacopoeials: [],
      };

      if (testTypesRes && testTypesRes.ok) {
        const testTypesData = await testTypesRes.json();
        lookups.testTypes = normalizeToMasterFormat(testTypesData.data || []);
      }

      if (detectorTypesRes && detectorTypesRes.ok) {
        const detectorTypesData = await detectorTypesRes.json();
        lookups.detectorTypes = normalizeToMasterFormat(detectorTypesData.data || []);
      }

      if (departmentsRes && departmentsRes.ok) {
        const departmentsData = await departmentsRes.json();
        lookups.departments = normalizeToMasterFormat(departmentsData.data || []);
      }

      if (apisRes && apisRes.ok) {
        const apisData = await apisRes.json();
        lookups.apis = normalizeToMasterFormat(apisData.data || []);
      }

      if (columnsRes && columnsRes.ok) {
        const columnsData = await columnsRes.json();
        lookups.columns = normalizeToMasterFormat(columnsData.data || []);
      }

      if (pharmacopoeialsRes && pharmacopoeialsRes.ok) {
        const pharmacopoeialsData = await pharmacopoeialsRes.json();
        lookups.pharmacopoeials = normalizeToMasterFormat(pharmacopoeialsData.data || []);
      }

      setLookupData(lookups);
    } catch (error) {
      console.error("Error fetching lookup data:", error);
    }
  };

  // Helper functions to get names from lookup data
  const getLabel = (id: string, master: LookupItem[]): string => {
    if (!id || !Array.isArray(master)) return "";
    const found = master.find(item => item.value === id || item.id === id);
    return found ? (found.label || "") : id;
  };

  const getDepartmentName = (id: string) => getLabel(id, lookupData.departments);
  const getTestTypeName = (id: string) => getLabel(id, lookupData.testTypes);
  const getDetectorTypeName = (id: string) => getLabel(id, lookupData.detectorTypes);
  
  const getApiName = (id: string) => {
    if (!id || !Array.isArray(lookupData.apis)) return "";
    const found = lookupData.apis.find(item => item.value === id || item.id === id);
    if (found) {
      return found.api || found.apiName || found.label || found.name || id;
    }
    return id;
  };

  const getColumnName = (columnId: string) => {
    if (!columnId || !Array.isArray(lookupData.columns)) return "";
    const found = lookupData.columns.find(item => item.value === columnId || item.id === columnId);
    return found ? (found.columnCode || found.label || columnId) : columnId;
  };

  const getPharmacopoeialsName = (ids: string | string[]): string => {
    if (!ids || !Array.isArray(lookupData.pharmacopoeials)) return "";
    const idArray = Array.isArray(ids) ? ids : [ids];
    const names = idArray.map(id => {
      const found = lookupData.pharmacopoeials.find(item => item.value === id || item.id === id);
      return found ? (found.label || "") : "";
    }).filter(Boolean);
    return names.join(", ");
  };

  // Get MFC details for display including test types
  const getMfcDisplayDetails = (mfc: Mfc): string[] => {
    const details: string[] = [];

    // Department
    if (mfc.departmentId) {
      const deptName = getDepartmentName(mfc.departmentId);
      if (deptName && deptName !== mfc.departmentId) {
        details.push(`Dept: ${deptName}`);
      }
    }

    // Generics info
    if (mfc.generics && mfc.generics.length > 0) {
      const genericCount = mfc.generics.length;
      details.push(`${genericCount} Generic${genericCount > 1 ? 's' : ''}`);
      
      // API count
      const totalApis = mfc.generics.reduce((total, generic) => {
        return total + (generic.apis ? generic.apis.length : 0);
      }, 0);
      if (totalApis > 0) {
        details.push(`${totalApis} API${totalApis > 1 ? 's' : ''}`);
      }

      // Test type count
      const totalTestTypes = mfc.generics.reduce((total, generic) => {
        return total + (generic.apis ? generic.apis.reduce((apiTotal, api) => {
          return apiTotal + (api.testTypes ? api.testTypes.length : 0);
        }, 0) : 0);
      }, 0);
      if (totalTestTypes > 0) {
        details.push(`${totalTestTypes} Test Type${totalTestTypes > 1 ? 's' : ''}`);
      }
    }

    return details;
  };

  // Get test types for display
  const getMfcTestTypes = (mfc: Mfc): string[] => {
    const testTypes: string[] = [];
    
    if (mfc.generics && mfc.generics.length > 0) {
      mfc.generics.forEach(generic => {
        if (generic.apis && generic.apis.length > 0) {
          generic.apis.forEach(api => {
            if (api.testTypes && api.testTypes.length > 0) {
              api.testTypes.forEach(testType => {
                const testTypeName = getTestTypeName(testType.testTypeId);
                if (testTypeName && testTypeName !== testType.testTypeId && !testTypes.includes(testTypeName)) {
                  testTypes.push(testTypeName);
                }
              });
            }
          });
        }
      });
    }
    
    return testTypes;
  };

  // Fetch MFCs from API
  const fetchMfcs = async () => {
    if (!companyId || !locationId) {
      setError("Company ID or Location ID not found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/mfc?companyId=${companyId}&locationId=${locationId}&populate=true&limit=1000`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const mfcData = Array.isArray(data.data) ? data.data : [];
        setMfcs(mfcData);
        setFilteredMfcs(mfcData);
      } else {
        throw new Error("No MFC data found in response");
      }
    } catch (err: any) {
      console.error("Error fetching MFCs:", err.message || err);
      setError(`Failed to fetch MFCs: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Load MFCs on mount
  useEffect(() => {
    fetchMfcs();
    fetchLookupData();
  }, [companyId, locationId]);

  // Filter MFCs based on search term (including test types)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMfcs(mfcs);
    } else {
      const filtered = mfcs.filter(mfc => {
        const searchLower = searchTerm.toLowerCase();
        
        // Search in MFC number
        if (mfc.mfcNumber && mfc.mfcNumber.toLowerCase().includes(searchLower)) return true;
        
        // Search in generic names
        if (mfc.generics && mfc.generics.some(generic => 
          generic.genericName && generic.genericName.toLowerCase().includes(searchLower)
        )) return true;

        // Search in department
        if (mfc.departmentId) {
          const deptName = getDepartmentName(mfc.departmentId);
          if (deptName && deptName.toLowerCase().includes(searchLower)) return true;
        }

        // Search in test types
        const testTypes = getMfcTestTypes(mfc);
        if (testTypes.some(testType => testType.toLowerCase().includes(searchLower))) return true;

        return false;
      });
      setFilteredMfcs(filtered);
    }
  }, [searchTerm, mfcs, lookupData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Listen for storage events for real-time updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mfc-product-sync') {
        // MFC was updated, refresh our MFC list
        fetchMfcs();
        fetchLookupData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleToggleDropdown = () => {
    if (disabled || loading) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
    }
  };

  const handleSelectMFC = (mfc: Mfc) => {
    onChange(mfc._id);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const getSelectedMFCDetails = (): Mfc | null => {
    if (!selectedMFC) return null;
    return mfcs.find(mfc => mfc._id === selectedMFC) || null;
  };

  const selectedMFCDetails = getSelectedMFCDetails();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main selector button */}
      <div
        className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none cursor-pointer ${
          disabled ? "bg-[#f0f0f0] cursor-not-allowed" : "bg-white hover:bg-[#f8f9fa]"
        } ${isOpen ? "ring-2 ring-[#66a3ff]" : ""}`}
        style={{
          borderStyle: "inset",
          boxShadow: !disabled ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
        }}
        onClick={handleToggleDropdown}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {loading ? (
              <span className="text-gray-500">Loading MFCs...</span>
            ) : error ? (
              <span className="text-red-500 text-sm">{error}</span>
            ) : selectedMFCDetails ? (
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 truncate">
                  {selectedMFCDetails.mfcNumber}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {getMfcDisplayDetails(selectedMFCDetails).map((detail, index) => (
                    <span key={index} className="mr-2 bg-gray-100 px-1 rounded">
                      {detail}
                    </span>
                  ))}
                </div>
                {/* Show test types for selected MFC */}
                {getMfcTestTypes(selectedMFCDetails).length > 0 && (
                  <div className="text-xs text-purple-600 mt-1">
                    <strong>Test Types:</strong> {getMfcTestTypes(selectedMFCDetails).slice(0, 3).join(", ")}
                    {getMfcTestTypes(selectedMFCDetails).length > 3 && 
                      ` +${getMfcTestTypes(selectedMFCDetails).length - 3} more`}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            {selectedMFC && !disabled && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Clear selection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
                disabled ? "text-gray-400" : "text-gray-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-[#a6c8ff] rounded-md shadow-lg max-h-96 overflow-hidden"
          style={{
            backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
          }}
        >
          {/* Search input */}
          <div className="p-3 border-b border-[#a6c8ff]">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
              placeholder="Search MFC records, generics, test types..."
              style={{
                borderStyle: "inset",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
              }}
            />
          </div>

          {/* MFC list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0055a4] mx-auto mb-2"></div>
                Loading MFCs...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">
                {error}
                <button
                  onClick={fetchMfcs}
                  className="block mx-auto mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            ) : filteredMfcs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "No MFC records found matching your search" : "No MFC records available"}
              </div>
            ) : (
              filteredMfcs.map((mfc) => {
                const details = getMfcDisplayDetails(mfc);
                const testTypes = getMfcTestTypes(mfc);
                
                return (
                  <div
                    key={mfc._id}
                    className={`px-3 py-3 cursor-pointer hover:bg-[#e6f0fa] ${
                      selectedMFC === mfc._id ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]" : ""
                    }`}
                    onClick={() => handleSelectMFC(mfc)}
                  >
                    <div className="flex flex-col">
                      <div className="font-medium text-gray-900 mb-1">
                        {mfc.mfcNumber}
                      </div>
                      
                      {/* MFC Details */}
                      {details.length > 0 && (
                        <div className="text-xs text-gray-600 space-y-1 mb-2">
                          {details.map((detail, index) => (
                            <span key={index} className="inline-block bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                              {detail}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Generic Names */}
                      {mfc.generics && mfc.generics.length > 0 && (
                        <div className="text-xs text-blue-600 mt-1">
                          <strong>Generics:</strong> {mfc.generics.map(g => g.genericName).join(", ")}
                        </div>
                      )}

                      {/* API names */}
                      {mfc.generics && mfc.generics.some(g => g.apis && g.apis.length > 0) && (
                        <div className="text-xs text-green-600 mt-1">
                          <strong>APIs:</strong> {
                            (() => {
                              const allApis = mfc.generics.flatMap(g => g.apis || []);
                              const apiNames = allApis.slice(0, 3).map(api => getApiName(api.apiName) || api.apiName).filter(Boolean);
                              const displayText = apiNames.join(", ");
                              const remainingCount = allApis.length - 3;
                              return displayText + (remainingCount > 0 ? ` +${remainingCount} more` : "");
                            })()
                          }
                        </div>
                      )}

                      {/* Test Types */}
                      {testTypes.length > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          <strong>Test Types:</strong> {
                            testTypes.slice(0, 3).join(", ")
                          }
                          {testTypes.length > 3 && ` +${testTypes.length - 3} more`}
                        </div>
                      )}
                    </div>
                    
                    {selectedMFC === mfc._id && (
                      <div className="flex justify-end mt-2">
                        <div className="flex items-center text-xs text-blue-600">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Selected
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with count */}
          {!loading && !error && (
            <div className="p-2 border-t border-[#a6c8ff] bg-gray-50 text-xs text-gray-600 text-center">
              {filteredMfcs.length} of {mfcs.length} MFC records
              {searchTerm && ` (filtered by "${searchTerm}")`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MFCSelector;