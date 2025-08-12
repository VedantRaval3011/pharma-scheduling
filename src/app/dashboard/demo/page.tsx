//demo codde
'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { Save, Plus, Trash2, Edit, X } from 'lucide-react';

// Types
interface MakeOption {
  _id: string;
  make: string;
  description?: string;
  companyId: string;
  locationId: string;
}

interface PrefixSuffixOption {
  _id: string;
  name: string; 
  type: string;
  companyId: string;
  locationId: string;
}

interface SeriesOption {
  _id: string;
  name: string;
  description?: string;
  companyId: string;
  locationId: string;
}

interface ColumnDescription {
  prefixId?: string | {_id: string, name: string};
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffixId?: string | {_id: string, name: string};
  makeId: string | {_id: string, make: string}; // Union type
  columnId: string;
  installationDate: string;
  usePrefixForNewCode: boolean;
  useSuffixForNewCode: boolean;
  isObsolete: boolean;
}

interface ColumnData {
  _id?: string;
  columnCode: string;
  descriptions: ColumnDescription[];
  companyId: string;
  locationId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Carbon type mappings
const carbonTypeMap: Record<string, string> = {
  C18: 'Octadecylsilane',
  C8: 'Octylsilane',
  C4: 'Butylsilane',
  CN: 'Cyano',
  NH2: 'Amino',
  Phenyl: 'Phenylsilane',
  HILIC: 'Hydrophilic Interaction',
  SCX: 'Strong Cation Exchange',
  SAX: 'Strong Anion Exchange',
  WCX: 'Weak Cation Exchange',
  WAX: 'Weak Anion Exchange',
};

const carbonTypeOptions = Object.keys(carbonTypeMap);
const linkedCarbonTypeOptions = Object.values(carbonTypeMap);

const columnCodeOptions = ['CL01', 'CL02', 'CL03', 'CL04', 'CL05'];

const EditColumnComponent: React.FC = () => {
  // State management
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [makes, setMakes] = useState<MakeOption[]>([]);
  const [prefixes, setPrefixes] = useState<PrefixSuffixOption[]>([]);
  const [suffixes, setSuffixes] = useState<PrefixSuffixOption[]>([]);
  const [series, setSeries] = useState<SeriesOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<ColumnData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<ColumnData>({
    columnCode: '',
    descriptions: [],
    companyId: '',
    locationId: '',
  });

  // Debug state changes
  useEffect(() => {
    console.log('Columns state:', columns);
    console.log('Loading state:', loading);
  }, [columns, loading]);

  // Get company and location from localStorage
  const getStorageData = () => {
    const companyId = localStorage.getItem('companyId') || '';
    const locationId = localStorage.getItem('locationId') || '';
    console.log('LocalStorage values:', { companyId, locationId });
    return { companyId, locationId };
  };

  // API calls
  const fetchData = useCallback(async () => {
    const { companyId, locationId } = getStorageData();
    if (!companyId || !locationId) {
      const errorMsg = 'Missing companyId or locationId in localStorage';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    console.log('Fetching data for:', { companyId, locationId });
    setLoading(true);
    setError(null);

    try {
      const [columnsRes, makesRes, prefixRes, suffixRes, seriesRes] = await Promise.all([
        fetch(`/api/admin/column?companyId=${companyId}&locationId=${locationId}`),
        fetch(`/api/admin/column/make?companyId=${companyId}&locationId=${locationId}`),
        fetch(`/api/admin/prefixAndSuffix?type=PREFIX&companyId=${companyId}&locationId=${locationId}`),
        fetch(`/api/admin/prefixAndSuffix?type=SUFFIX&companyId=${companyId}&locationId=${locationId}`),
        fetch(`/api/admin/series?companyId=${companyId}&locationId=${locationId}`),
      ]);

      const [columnsData, makesData, prefixData, suffixData, seriesData] = await Promise.all([
        columnsRes.json() as Promise<ApiResponse<ColumnData[]>>,
        makesRes.json() as Promise<ApiResponse<MakeOption[]>>,
        prefixRes.json() as Promise<ApiResponse<PrefixSuffixOption[]>>,
        suffixRes.json() as Promise<ApiResponse<PrefixSuffixOption[]>>,
        seriesRes.json() as Promise<ApiResponse<SeriesOption[]>>,
      ]);

      console.log('API Responses:', {
        columns: columnsData,
        makes: makesData,
        prefixes: prefixData,
        suffixes: suffixData,
        series: seriesData,
      });

      if (columnsData.success) {
         const rawData = columnsData.data || [];
  const normalizedData = normalizeColumnData(rawData);
  setColumns(normalizedData);
        const isValid = normalizedData.every(
          (col) =>
            col._id &&
            col.columnCode &&
            Array.isArray(col.descriptions) &&
            col.companyId &&
            col.locationId,
        );
        console.log('Columns data valid:', isValid);
        setColumns(normalizedData);
        console.log('Loaded columns:', normalizedData.length);
      } else {
        const errorMsg = `Failed to fetch columns: ${columnsData.error || 'Unknown error'}`;
        console.error(errorMsg);
        setError(errorMsg);
      }

      if (makesData.success) {
        setMakes(makesData.data || []);
        console.log('Loaded makes:', makesData.data?.length || 0);
      } else {
        const errorMsg = `Failed to fetch makes: ${makesData.error || 'Unknown error'}`;
        console.error(errorMsg);
        setError(errorMsg);
      }

      if (prefixData.success) {
        setPrefixes(prefixData.data || []);
        console.log('Loaded prefixes:', prefixData.data?.length || 0);
      } else {
        const errorMsg = `Failed to fetch prefixes: ${prefixData.error || 'Unknown error'}`;
        console.error(errorMsg);
        setError(errorMsg);
      }

      if (suffixData.success) {
        setSuffixes(suffixData.data || []);
        console.log('Loaded suffixes:', suffixData.data?.length || 0);
      } else {
        const errorMsg = `Failed to fetch suffixes: ${suffixData.error || 'Unknown error'}`;
        console.error(errorMsg);
        setError(errorMsg);
      }

      if (seriesData.success) {
        setSeries(seriesData.data || []);
        console.log('Loaded series:', seriesData.data?.length || 0);
      } else {
        const errorMsg = `Failed to fetch series: ${seriesData.error || 'Unknown error'}`;
        console.error(errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions
 const getMakeName = (makeId: string | {_id: string, make: string} | undefined) => {
  if (!makeId) return '-';
  
  // Extract ID if it's an object (for backward compatibility)
  const id = typeof makeId === 'object' ? makeId._id : makeId;
  
  if (makes.length === 0) return 'Loading...';
  const make = makes.find((m) => m._id.toString().trim() === id?.toString().trim());
  return make?.make || `Unknown Make (${id})`;
};

const getPrefixName = (prefixId: string | {_id: string, name: string} | undefined) => {
  if (!prefixId) return '-';
  
  // Extract ID if it's an object
  const id = typeof prefixId === 'object' ? prefixId._id : prefixId;
  
  if (prefixes.length === 0) return 'Loading...';
  const prefix = prefixes.find((p) => p._id.toString().trim() === id?.toString().trim());
  return prefix?.name || `Unknown Prefix (${id})`;
};

const getSuffixName = (suffixId: string | {_id: string, name: string} | undefined) => {
  if (!suffixId) return '-';
  
  // Extract ID if it's an object
  const id = typeof suffixId === 'object' ? suffixId._id : suffixId;
  
  if (suffixes.length === 0) return 'Loading...';
  const suffix = suffixes.find((s) => s._id.toString().trim() === id?.toString().trim());
  return suffix?.name || `Unknown Suffix (${id})`;
};

const normalizeColumnData = (columns: ColumnData[]): ColumnData[] => {
  return columns.map(column => ({
    ...column,
    descriptions: column.descriptions.map(desc => ({
      ...desc,
      // Ensure IDs are strings, not objects
      makeId: typeof desc.makeId === 'object' ? desc.makeId._id : desc.makeId,
      prefixId: desc.prefixId ? (typeof desc.prefixId === 'object' ? desc.prefixId._id : desc.prefixId) : undefined,
      suffixId: desc.suffixId ? (typeof desc.suffixId === 'object' ? desc.suffixId._id : desc.suffixId) : undefined,
    }))
  }));
};

  const getNextSeriesNumber = () => {
    if (series.length === 0) return '001';
    const maxNum = Math.max(...series.map((s) => parseInt(s.name, 10) || 0));
    return String(maxNum + 1).padStart(3, '0');
  };

  // Form handlers
  const openCreateForm = () => {
    const { companyId, locationId } = getStorageData();
    setFormData({
      columnCode: '',
      descriptions: [
        {
          carbonType: '',
          linkedCarbonType: '',
          innerDiameter: 0,
          length: 0,
          particleSize: 0,
          makeId: '',
          columnId: getNextSeriesNumber(),
          installationDate: '',
          usePrefixForNewCode: false,
          useSuffixForNewCode: false,
          isObsolete: false,
        },
      ],
      companyId,
      locationId,
    });
    setEditingColumn(null);
    setIsFormOpen(true);
  };

  const openEditForm = (column: ColumnData) => {
    setFormData({ ...column });
    setEditingColumn(column);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingColumn(null);
    setFormData({
      columnCode: '',
      descriptions: [],
      companyId: '',
      locationId: '',
    });
  };

  const addDescription = () => {
    setFormData((prev) => ({
      ...prev,
      descriptions: [
        ...prev.descriptions,
        {
          carbonType: '',
          linkedCarbonType: '',
          innerDiameter: 0,
          length: 0,
          particleSize: 0,
          makeId: '',
          columnId: getNextSeriesNumber(),
          installationDate: '',
          usePrefixForNewCode: false,
          useSuffixForNewCode: false,
          isObsolete: false,
        },
      ],
    }));
  };

  const removeDescription = (index: number) => {
    if (formData.descriptions.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      descriptions: prev.descriptions.filter((_, i) => i !== index),
    }));
  };

  const updateDescription = (index: number, field: keyof ColumnDescription, value: any) => {
    setFormData((prev) => ({
      ...prev,
      descriptions: prev.descriptions.map((desc, i) => {
        if (i !== index) return desc;

        let updatedDesc = { ...desc, [field]: value };

        if (field === 'carbonType') {
          updatedDesc.linkedCarbonType = carbonTypeMap[value] || '';
        } else if (field === 'linkedCarbonType') {
          const carbonType = Object.keys(carbonTypeMap).find((key) => carbonTypeMap[key] === value);
          if (carbonType) updatedDesc.carbonType = carbonType;
        }

        return updatedDesc;
      }),
    }));
  };

  const validateForm = (formData: ColumnData) => {
    const errors: string[] = [];
    if (!formData.columnCode) errors.push('Column Code is required.');
    formData.descriptions.forEach((desc, index) => {
      if (!desc.makeId) errors.push(`Description ${index + 1}: Make is required.`);
      if (!desc.carbonType) errors.push(`Description ${index + 1}: Carbon Type is required.`);
      if (desc.innerDiameter <= 0) errors.push(`Description ${index + 1}: Inner Diameter must be greater than 0.`);
      if (desc.length <= 0) errors.push(`Description ${index + 1}: Length must be greater than 0.`);
      if (desc.particleSize <= 0) errors.push(`Description ${index + 1}: Particle Size must be greater than 0.`);
    });
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm(formData);
    if (errors.length > 0) {
      setError(`Please fix the following errors:\n${errors.join('\n')}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { companyId, locationId } = getStorageData();
      const url = editingColumn
        ? `/api/admin/column?companyId=${companyId}&locationId=${locationId}`
        : `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
      const method = editingColumn ? 'PUT' : 'POST';
      const body = editingColumn ? { ...formData, id: editingColumn._id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.success) {
        await fetchData();
        closeForm();
        setError(null);
      } else {
        setError(`Error: ${result.error || 'Failed to save column'}`);
      }
    } catch (error) {
      const errorMsg = `Error saving column: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm('Are you sure you want to delete this column?')) return;

    try {
      setLoading(true);
      setError(null);
      const { companyId, locationId } = getStorageData();

      const response = await fetch(`/api/admin/column?companyId=${companyId}&locationId=${locationId}&id=${columnId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        await fetchData();
      } else {
        setError(`Error: ${result.error || 'Failed to delete column'}`);
      }
    } catch (error) {
      const errorMsg = `Error deleting column: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Column Management</h1>
        <button
          onClick={openCreateForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          aria-label="Add New Column"
        >
          <Plus className="w-4 h-4" />
          Add New Column
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden" key={columns.length}>
        {loading && (
          <div className="p-4 text-center text-gray-600">Loading data...</div>
        )}
        {!loading && columns.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>No columns found. Click "Add New Column" to get started.</p>
          </div>
        )}
        {!loading && columns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Column Code</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Make</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Prefix</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Carbon Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Dimensions</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Suffix</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Installation Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {columns.map((column) => (
                  <React.Fragment key={column._id}>
                    {column.descriptions.map((desc, index) => (
                      <tr key={`${column._id}-${index}`} className="hover:bg-gray-50">
                        {index === 0 && (
                          <td
                            className="px-4 py-3 text-sm text-gray-900 font-medium"
                            rowSpan={column.descriptions.length}
                          >
                            {column.columnCode}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-600" title={`Make ID: ${desc.makeId}`}>
                          {getMakeName(desc.makeId)}
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-gray-600"
                          title={desc.prefixId ? `Prefix ID: ${desc.prefixId}` : 'No prefix'}
                        >
                          {getPrefixName(desc.prefixId)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{desc.carbonType}</div>
                          <div className="text-xs text-gray-500">{desc.linkedCarbonType}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>ID: {desc.innerDiameter}mm</div>
                          <div>L: {desc.length}mm</div>
                          <div>PS: {desc.particleSize}μm</div>
                        </td>
                        <td
                          className="px-4 py-3 text-sm text-gray-600"
                          title={desc.suffixId ? `Suffix ID: ${desc.suffixId}` : 'No suffix'}
                        >
                          {getSuffixName(desc.suffixId)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{desc.installationDate}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col gap-1">
                            {desc.usePrefixForNewCode && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Prefix Code
                              </span>
                            )}
                            {desc.useSuffixForNewCode && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Suffix Code
                              </span>
                            )}
                            {desc.isObsolete && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Obsolete
                              </span>
                            )}
                          </div>
                        </td>
                        {index === 0 && (
                          <td className="px-4 py-3 text-sm" rowSpan={column.descriptions.length}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditForm(column)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit Column"
                                aria-label="Edit Column"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteColumn(column._id!)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete Column"
                                aria-label="Delete Column"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingColumn ? 'Edit Column' : 'Add New Column'}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close Form"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              {/* Column Code */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Column Code</label>
                <select
                  value={formData.columnCode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, columnCode: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select Column Code</option>
                  {columnCodeOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descriptions */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Column Descriptions</h3>
                  <button
                    onClick={addDescription}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                    aria-label="Add Description"
                  >
                    <Plus className="w-4 h-4" />
                    Add Description
                  </button>
                </div>

                {formData.descriptions.map((desc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Description {index + 1}</h4>
                      {formData.descriptions.length > 1 && (
                        <button
                          onClick={() => removeDescription(index)}
                          className="text-red-600 hover:text-red-800"
                          aria-label={`Remove Description ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Make */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
<select
  value={typeof desc.makeId === 'object' ? desc.makeId._id : desc.makeId || ''}
  onChange={(e) => updateDescription(index, 'makeId', e.target.value)}
  className="w-full border border-gray-300 rounded-md px-3 py-2"
>
  <option value="">Select Make</option>
  {makes.length === 0 ? (
    <option disabled>No makes available</option>
  ) : (
    makes.map((make) => (
      <option key={make._id} value={make._id}>
        {make.make}
      </option>
    ))
  )}
</select>
                      </div>

                      {/* Prefix */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
<select
  value={desc.prefixId ? (typeof desc.prefixId === 'object' ? desc.prefixId._id : desc.prefixId) : ''}
  onChange={(e) => updateDescription(index, 'prefixId', e.target.value || undefined)}
  className="w-full border border-gray-300 rounded-md px-3 py-2"
>
  <option value="">Select Prefix</option>
  {prefixes.length === 0 ? (
    <option disabled>No prefixes available</option>
  ) : (
    prefixes.map((prefix) => (
      <option key={prefix._id} value={prefix._id}>
        {prefix.name}
      </option>
    ))
  )}
</select>
                      </div>

                      {/* Carbon Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Carbon Type</label>
                        <select
                          value={desc.carbonType}
                          onChange={(e) => updateDescription(index, 'carbonType', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select Carbon Type</option>
                          {carbonTypeOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Linked Carbon Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Linked Carbon Type
                        </label>
                        <select
                          value={desc.linkedCarbonType}
                          onChange={(e) => updateDescription(index, 'linkedCarbonType', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select Linked Carbon Type</option>
                          {linkedCarbonTypeOptions.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Inner Diameter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Inner Diameter (mm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={desc.innerDiameter}
                          onChange={(e) =>
                            updateDescription(index, 'innerDiameter', parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      {/* Length */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Length (mm)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={desc.length}
                          onChange={(e) => updateDescription(index, 'length', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      {/* Particle Size */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Particle Size (μm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={desc.particleSize}
                          onChange={(e) =>
                            updateDescription(index, 'particleSize', parseFloat(e.target.value) || 0)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>

                      {/* Suffix */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                        <select
  value={desc.suffixId ? (typeof desc.suffixId === 'object' ? desc.suffixId._id : desc.suffixId) : ''}
  onChange={(e) => updateDescription(index, 'suffixId', e.target.value || undefined)}
  className="w-full border border-gray-300 rounded-md px-3 py-2"
>
  <option value="">Select Suffix</option>
  {suffixes.length === 0 ? (
    <option disabled>No suffixes available</option>
  ) : (
    suffixes.map((suffix) => (
      <option key={suffix._id} value={suffix._id}>
        {suffix.name}
      </option>
    ))
  )}
</select>
                      </div>

                      {/* Column ID (Series) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Column ID</label>
                        <input
                          type="text"
                          value={desc.columnId}
                          onChange={(e) => updateDescription(index, 'columnId', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Auto-generated series number"
                        />
                      </div>

                      {/* Installation Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Installation Date
                        </label>
                        <input
                          type="date"
                          value={desc.installationDate}
                          onChange={(e) => updateDescription(index, 'installationDate', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`usePrefixForNewCode-${index}`}
                          checked={desc.usePrefixForNewCode}
                          onChange={(e) => updateDescription(index, 'usePrefixForNewCode', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor={`usePrefixForNewCode-${index}`} className="text-sm text-gray-700">
                          Use prefix for new code
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`useSuffixForNewCode-${index}`}
                          checked={desc.useSuffixForNewCode}
                          onChange={(e) => updateDescription(index, 'useSuffixForNewCode', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor={`useSuffixForNewCode-${index}`} className="text-sm text-gray-700">
                          Use suffix for new code
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`isObsolete-${index}`}
                          checked={desc.isObsolete}
                          onChange={(e) => updateDescription(index, 'isObsolete', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor={`isObsolete-${index}`} className="text-sm text-gray-700">
                          Mark as obsolete
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={closeForm}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={loading}
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  disabled={loading}
                  aria-label="Save Column"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Column'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditColumnComponent;