// ColumnPopup.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';

interface ColumnDescription {
  descriptionId: string; // Add this
  _id?: string; // Make optional
  prefixId: string | null;
  suffixId: string | null;
  carbonType: string;
  linkedCarbonType?: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  makeId: string;
  columnId: string;
  installationDate: string;
  isObsolete: boolean;
  usePrefix?: boolean;
  useSuffix?: boolean;
  usePrefixForNewCode?: boolean;
  useSuffixForNewCode?: boolean;
}

interface Column {
  _id: string;
  columnCode: string;
  descriptions: ColumnDescription[];
}

interface ColumnPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (columnData: {
    id: string;
    displayText: string;
    columnCode: string;
  }) => void; // Change this to pass more data
  selectedColumnCode?: string;
}

interface MakeData {
  _id: string;
  make: string;
  description: string;
}

interface PrefixSuffixData {
  _id: string;
  name: string;
  type: string;
}

const getStorageIds = () => {
  if (typeof window === "undefined")
    return { companyId: null, locationId: null };
  const companyId = localStorage.getItem("companyId");
  const locationId = localStorage.getItem("locationId");
  return { companyId, locationId };
};

const ColumnPopup: React.FC<ColumnPopupProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedColumnCode
}) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedDescriptionIndex, setSelectedDescriptionIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master data states
  const [makes, setMakes] = useState<MakeData[]>([]);
  const [prefixes, setPrefixes] = useState<PrefixSuffixData[]>([]);
  const [suffixes, setSuffixes] = useState<PrefixSuffixData[]>([]);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  const { companyId, locationId } = getStorageIds();

  // Create lookup maps for better performance and reliability
  const makesMap = useMemo(() => {
    const map = new Map<string, string>();
    makes.forEach(make => {
      map.set(make._id, make.make);
    });
    return map;
  }, [makes]);

  const prefixesMap = useMemo(() => {
    const map = new Map<string, string>();
    prefixes.forEach(prefix => {
      map.set(prefix._id, prefix.name);
    });
    return map;
  }, [prefixes]);

  const suffixesMap = useMemo(() => {
    const map = new Map<string, string>();
    suffixes.forEach(suffix => {
      map.set(suffix._id, suffix.name);
    });
    return map;
  }, [suffixes]);

  // Improved helper functions using maps
const getPrefixName = (prefixId: string | object | null) => {
  console.log(`getPrefixName called with:`, prefixId, `map size: ${prefixesMap.size}`);
  
  // Handle null/undefined cases
  if (!prefixId || prefixId === 'undefined' || prefixId === 'null') {
    return '-';
  }
  
  // Extract ID if it's an object
  let actualId: string;
  if (typeof prefixId === 'object' && prefixId !== null) {
    actualId = (prefixId as any)._id || (prefixId as any).id;
    console.log(`Extracted ID from object: "${actualId}"`);
  } else if (typeof prefixId === 'string') {
    actualId = prefixId;
  } else {
    console.log(`Invalid prefixId type: ${typeof prefixId}`);
    return '-';
  }
  
  if (!actualId) {
    console.log('No valid ID found in object');
    return '-';
  }
  
  const result = prefixesMap.get(actualId);
  console.log(`getPrefixName result for "${actualId}": "${result}"`);
  
  if (!result && prefixesMap.size > 0) {
    console.log('Available prefix IDs:', Array.from(prefixesMap.keys()));
    console.log(`getPrefixName: ID '${actualId}' NOT FOUND in map.`);
    return '-';
  }
  
  return result || '-';
};

const getSuffixName = (suffixId: string | object | null) => {
  console.log(`getSuffixName called with:`, suffixId, `map size: ${suffixesMap.size}`);
  
  if (!suffixId || suffixId === 'undefined' || suffixId === 'null') {
    return '-';
  }
  
  // Extract ID if it's an object
  let actualId: string;
  if (typeof suffixId === 'object' && suffixId !== null) {
    actualId = (suffixId as any)._id || (suffixId as any).id;
    console.log(`Extracted ID from object: "${actualId}"`);
  } else if (typeof suffixId === 'string') {
    actualId = suffixId;
  } else {
    console.log(`Invalid suffixId type: ${typeof suffixId}`);
    return '-';
  }
  
  if (!actualId) {
    console.log('No valid ID found in object');
    return '-';
  }
  
  const result = suffixesMap.get(actualId);
  console.log(`getSuffixName result for "${actualId}": "${result}"`);
  
  if (!result && suffixesMap.size > 0) {
    console.log('Available suffix IDs:', Array.from(suffixesMap.keys()));
    console.log(`getSuffixName: ID '${actualId}' NOT FOUND in map.`);
    return '-';
  }
  
  return result || '-';
};

const getMakeName = (makeId: string | object | null) => {
  console.log(`getMakeName called with:`, makeId, `map size: ${makesMap.size}`);
  
  if (!makeId || makeId === 'undefined' || makeId === 'null') {
    return '-';
  }
  
  // Extract ID if it's an object
  let actualId: string;
  if (typeof makeId === 'object' && makeId !== null) {
    actualId = (makeId as any)._id || (makeId as any).id;
    console.log(`Extracted ID from object: "${actualId}"`);
  } else if (typeof makeId === 'string') {
    actualId = makeId;
  } else {
    console.log(`Invalid makeId type: ${typeof makeId}`);
    return '-';
  }
  
  if (!actualId) {
    console.log('No valid ID found in object');
    return '-';
  }
  
  const result = makesMap.get(actualId);
  console.log(`getMakeName result for "${actualId}": "${result}"`);
  
  if (!result && makesMap.size > 0) {
    console.log('Available make IDs:', Array.from(makesMap.keys()));
    console.log(`getMakeName: ID '${actualId}' NOT FOUND in map.`);
    return '-';
  }
  
  return result || '-';
};


  useEffect(() => {
    if (isOpen && companyId && locationId) {
      // Reset states when opening
      setColumns([]);
      setMakes([]);
      setPrefixes([]);
      setSuffixes([]);
      setError(null);
      setSelectedColumnId(null);
      setSelectedDescriptionIndex(null);
      setMasterDataLoaded(false);
      fetchAllData();
    }
  }, [isOpen, companyId, locationId]);

  const fetchAllData = async () => {
  setLoading(true);
  setMasterDataLoading(true);
  setError(null);
  
  try {
    console.log('Starting to fetch all data with params:', { companyId, locationId });
    
    // First, fetch master data and wait for ALL to complete
    console.log('Fetching master data...');
    const [makesData, prefixesData, suffixesData] = await Promise.all([
      fetchMakes(),
      fetchPrefixes(), 
      fetchSuffixes()
    ]);
    
    // Verify we got data
    console.log('Master data received:', {
      makes: makesData?.length || 0,
      prefixes: prefixesData?.length || 0,
      suffixes: suffixesData?.length || 0
    });
    
    // Set all master data at once
    setMakes(makesData || []);
    setPrefixes(prefixesData || []);
    setSuffixes(suffixesData || []);
    setMasterDataLoading(false);
    
    // Wait for state to settle before marking as loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    setMasterDataLoaded(true);
    
    // Now fetch columns
    console.log('Fetching columns...');
    const columnsData = await fetchColumns();
    setColumns(columnsData || []);
    
    console.log('All data loaded successfully');
    
  } catch (err) {
    console.error('Error in fetchAllData:', err);
    setError('Error fetching data');
  } finally {
    setLoading(false);
  }
};


  const normalizeColumnDescription = (desc: any): ColumnDescription => {
  return {
    ...desc,
    prefixId: typeof desc.prefixId === 'object' && desc.prefixId?._id 
      ? desc.prefixId._id 
      : desc.prefixId,
    suffixId: typeof desc.suffixId === 'object' && desc.suffixId?._id 
      ? desc.suffixId._id 
      : desc.suffixId,
    makeId: typeof desc.makeId === 'object' && desc.makeId?._id 
      ? desc.makeId._id 
      : desc.makeId,
  };
};

const fetchColumns = async (): Promise<Column[]> => {
  try {
    console.log('Fetching columns...');
    const url = `/api/admin/column/getAll?locationId=${locationId}&companyId=${companyId}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.data) {
      // Normalize the data to ensure string IDs
      const normalizedColumns = data.data.map((column: any) => ({
        ...column,
        descriptions: column.descriptions.map((desc: any) => normalizeColumnDescription(desc))
      }));
      
      console.log(`✓ Columns loaded and normalized: ${normalizedColumns.length} columns`);
      return normalizedColumns;
    } else {
      throw new Error(data.message || 'Failed to fetch columns');
    }
  } catch (err) {
    console.error('Error fetching columns:', err);
    throw err;
  }
};


  const fetchMakes = async (): Promise<MakeData[]> => {
  try {
    console.log('Fetching makes with params:', { companyId, locationId });
    const url = `/api/admin/column/make?companyId=${companyId}&locationId=${locationId}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Makes API full response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.warn('Makes API returned unexpected structure:', data);
      return [];
    }
  } catch (err) {
    console.error('Error fetching makes:', err);
    return [];
  }
};


  const fetchPrefixes = async (): Promise<PrefixSuffixData[]> => {
    try {
      console.log('Fetching prefixes with params:', { companyId, locationId });
      const url = `/api/admin/prefixAndSuffix?type=PREFIX&companyId=${companyId}&locationId=${locationId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Prefixes API response:', data);
      
      if (data.success && data.data) {
        console.log('Prefixes successfully fetched:', data.data.length);
        return data.data;
      } else {
        console.warn('Prefixes API returned success=false or no data:', data.message);
        return [];
      }
    } catch (err) {
      console.error('Error fetching prefixes:', err);
      return [];
    }
  };

  const fetchSuffixes = async (): Promise<PrefixSuffixData[]> => {
    try {
      console.log('Fetching suffixes with params:', { companyId, locationId });
      const url = `/api/admin/prefixAndSuffix?type=SUFFIX&companyId=${companyId}&locationId=${locationId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Suffixes API response:', data);
      
      if (data.success && data.data) {
        console.log('Suffixes successfully fetched:', data.data.length);
        return data.data;
      } else {
        console.warn('Suffixes API returned success=false or no data:', data.message);
        return [];
      }
    } catch (err) {
      console.error('Error fetching suffixes:', err);
      return [];
    }
  };

  const handleTableRowClick = (column: Column, descIndex: number) => {
    setSelectedColumnId(column._id);
    setSelectedDescriptionIndex(descIndex);
  };

const handleSelectColumn = () => {
  const selectedColumn = columns.find(col => col._id === selectedColumnId);
  const selectedDesc = selectedColumn?.descriptions[selectedDescriptionIndex!];
  
  if (selectedColumn && selectedDesc) {
    // Build display text
    const parts = [];
    const prefixName = getPrefixName(selectedDesc.prefixId);
    const suffixName = getSuffixName(selectedDesc.suffixId);
    const makeName = getMakeName(selectedDesc.makeId);
    
    if (prefixName !== '-') {
      parts.push(prefixName);
    }
    
    const description = `${selectedDesc.carbonType} ${selectedDesc.innerDiameter}x${selectedDesc.length} ${selectedDesc.particleSize}µm`;
    parts.push(description);
    
    if (suffixName !== '-') {
      parts.push(suffixName);
    }
    
    let displayText = parts.join(' ');
    if (makeName !== '-') {
      displayText += ` - ${makeName}`;
    }
    
    // Handle the ID with proper type checking
    const descWithId = selectedDesc as any;
    const idToUse = descWithId.descriptionId || selectedDesc._id;
    
    if (!idToUse) {
      console.error('No valid ID found for selected description:', selectedDesc);
      alert('Error: Could not get column description ID');
      return;
    }
    
    onSelect({
      id: idToUse,
      displayText: displayText,
      columnCode: selectedColumn.columnCode
    });
    onClose();
  }
};

  // Improved filtering with correct property names
  const filteredColumns = useMemo(() => {
    if (!masterDataLoaded) return [];
    
    return columns.filter(column => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      
      return column.columnCode.toLowerCase().includes(searchLower) ||
        column.descriptions.some(desc => {
          const prefixName = getPrefixName(desc.prefixId).toLowerCase();
          const suffixName = getSuffixName(desc.suffixId).toLowerCase();
          const makeName = getMakeName(desc.makeId).toLowerCase();
          
          return desc.carbonType.toLowerCase().includes(searchLower) ||
                 desc.columnId.toLowerCase().includes(searchLower) ||
                 makeName.includes(searchLower) ||
                 prefixName.includes(searchLower) ||
                 suffixName.includes(searchLower);
        });
    });
  }, [columns, searchTerm, masterDataLoaded, makesMap, prefixesMap, suffixesMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-[80]">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col m-4">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Select Column</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search columns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={!masterDataLoaded}
          />
          {masterDataLoading && (
            <div className="mt-2 text-sm text-blue-600">Loading master data...</div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-gray-500">Loading data...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-red-500">{error}</div>
            </div>
          ) : !masterDataLoaded ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-gray-500">Loading master data...</div>
            </div>
          ) : filteredColumns.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-gray-500">
                {columns.length === 0 ? 'No columns found' : 'No columns match your search'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-gray-300 rounded-lg shadow-sm">
              <table className="w-full border-collapse border border-gray-300 bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    {[
                      "Serial No",
                      "Column Code",
                      "Prefix",
                      "Suffix",
                      "Description",
                      "Make",
                      "Column ID",
                      "Installation Date",
                      "Status",
                    ].map((header) => (
                      <th
                        key={header}
                        className="border border-gray-300 p-2 text-gray-700 font-semibold text-sm"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredColumns.map((column, colIndex) =>
                    column.descriptions.map((desc, descIndex) => (
                      <tr
                        key={`${column._id}-${descIndex}`}
                        className={`cursor-pointer text-sm ${
                          column._id === selectedColumnId &&
                          descIndex === selectedDescriptionIndex
                            ? "bg-purple-200 border-2 border-purple-500"
                            : selectedColumnCode === column.columnCode
                            ? "bg-blue-100"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => handleTableRowClick(column, descIndex)}
                        title="Click to select"
                      >
                        {descIndex === 0 && (
                          <>
                            <td
                              className="border border-gray-300 p-2"
                              rowSpan={column.descriptions.length}
                            >
                              {colIndex + 1}
                            </td>
                            <td
                              className="border border-gray-300 p-2 font-medium"
                              rowSpan={column.descriptions.length}
                            >
                              {column.columnCode}
                            </td>
                          </>
                        )}
                        <td className="border border-gray-300 p-2">
                          {getPrefixName(desc.prefixId)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {getSuffixName(desc.suffixId)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {desc.carbonType} {desc.innerDiameter} x {desc.length}{" "}
                          {desc.particleSize}µm
                        </td>
                        <td className="border border-gray-300 p-2">
                          {getMakeName(desc.makeId)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {desc.columnId}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {desc.installationDate}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            desc.isObsolete 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {desc.isObsolete ? "Obsolete" : "Active"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSelectColumn}
            disabled={!selectedColumnId}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Column
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColumnPopup;