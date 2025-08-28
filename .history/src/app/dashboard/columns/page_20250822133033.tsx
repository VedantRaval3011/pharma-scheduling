// ColumnPopup.tsx
"use client";

import React, { useState, useEffect } from 'react';

interface ColumnDescription {
  _id: string;
  prefix: string;
  suffix: string;
  carbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  make: string;
  columnId: string;
  installationDate: string;
  isObsolete: boolean;
}

interface Column {
  _id: string;
  columnCode: string;
  descriptions: ColumnDescription[];
}

interface ColumnPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (columnCode: string) => void;
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
  const [error, setError] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedDescriptionIndex, setSelectedDescriptionIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master data states
  const [makes, setMakes] = useState<MakeData[]>([]);
  const [prefixes, setPrefixes] = useState<PrefixSuffixData[]>([]);
  const [suffixes, setSuffixes] = useState<PrefixSuffixData[]>([]);

  const { companyId, locationId } = getStorageIds();

  // Helper functions to get names from master data
  const getPrefixName = (prefixId: string) => {
    if (!prefixId) return '-';
    const prefix = prefixes.find(p => p._id === prefixId);
    const result = prefix ? prefix.name : prefixId;
    console.log('getPrefixName:', { prefixId, found: !!prefix, result, totalPrefixes: prefixes.length });
    return result;
  };

  const getSuffixName = (suffixId: string) => {
    if (!suffixId) return '-';
    const suffix = suffixes.find(s => s._id === suffixId);
    const result = suffix ? suffix.name : suffixId;
    console.log('getSuffixName:', { suffixId, found: !!suffix, result, totalSuffixes: suffixes.length });
    return result;
  };

  const getMakeName = (makeId: string) => {
    if (!makeId) return '-';
    const make = makes.find(m => m._id === makeId);
    const result = make ? make.make : makeId;
    console.log('getMakeName:', { makeId, found: !!make, result, totalMakes: makes.length });
    return result;
  };

  useEffect(() => {
    if (isOpen && companyId && locationId) {
      fetchAllData();
    }
  }, [isOpen, companyId, locationId]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // First fetch master data, then columns
      await Promise.all([
        fetchMakes(),
        fetchPrefixes(),
        fetchSuffixes()
      ]);
      
      // Then fetch columns
      await fetchColumns();
    } catch (err) {
      setError('Error fetching data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchColumns = async () => {
    try {
      const response = await fetch(
        `/api/admin/column/getAll?locationId=${locationId}&companyId=${companyId}`
      );
      const data = await response.json();
      if (data.success) {
        setColumns(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch columns');
      }
    } catch (err) {
      console.error('Error fetching columns:', err);
      throw err;
    }
  };

  const fetchMakes = async () => {
    try {
      console.log('Fetching makes...', { companyId, locationId });
      const response = await fetch(
        `/api/admin/column/make?companyId=${companyId}&locationId=${locationId}`
      );
      const data = await response.json();
      console.log('Makes response:', data);
      if (data.success) {
        setMakes(data.data || []);
        console.log('Makes set:', data.data?.length || 0, 'items');
      } else {
        console.warn('Failed to fetch makes:', data.message);
      }
    } catch (err) {
      console.error('Error fetching makes:', err);
    }
  };

  const fetchPrefixes = async () => {
    try {
      console.log('Fetching prefixes...');
      const response = await fetch(
        `/api/admin/prefixAndSuffix?type=PREFIX&companyId=${companyId}&locationId=${locationId}`
      );
      const data = await response.json();
      console.log('Prefixes response:', data);
      if (data.success) {
        setPrefixes(data.data || []);
        console.log('Prefixes set:', data.data?.length || 0, 'items');
      } else {
        console.warn('Failed to fetch prefixes:', data.message);
      }
    } catch (err) {
      console.error('Error fetching prefixes:', err);
    }
  };

  const fetchSuffixes = async () => {
    try {
      console.log('Fetching suffixes...');
      const response = await fetch(
        `/api/admin/prefixAndSuffix?type=SUFFIX&companyId=${companyId}&locationId=${locationId}`
      );
      const data = await response.json();
      console.log('Suffixes response:', data);
      if (data.success) {
        setSuffixes(data.data || []);
        console.log('Suffixes set:', data.data?.length || 0, 'items');
      } else {
        console.warn('Failed to fetch suffixes:', data.message);
      }
    } catch (err) {
      console.error('Error fetching suffixes:', err);
    }
  };

  const handleTableRowClick = (column: Column, descIndex: number) => {
    setSelectedColumnId(column._id);
    setSelectedDescriptionIndex(descIndex);
  };

  const handleSelectColumn = () => {
    const selectedColumn = columns.find(col => col._id === selectedColumnId);
    if (selectedColumn) {
      onSelect(selectedColumn.columnCode);
      onClose();
    }
  };

  const filteredColumns = columns.filter(column =>
    column.columnCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    column.descriptions.some(desc =>
      desc.carbonType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.columnId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getMakeName(desc.make).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPrefixName(desc.prefix).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSuffixName(desc.suffix).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
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
          />
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-gray-500">Loading columns...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-red-500">{error}</div>
            </div>
          ) : filteredColumns.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-gray-500">No columns found</div>
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
                          {getPrefixName(desc.prefix)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {getSuffixName(desc.suffix)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {desc.carbonType} {desc.innerDiameter} x {desc.length}{" "}
                          {desc.particleSize}µm
                        </td>
                        <td className="border border-gray-300 p-2">
                          {getMakeName(desc.make)}
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