'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WindowsToolbar from '@/components/layout/ToolBox';
import { IEmployee, IModuleAccess } from '@/models/employee';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSession } from 'next-auth/react';
import { flattenNavData } from '@/lib/utils';
import { adminEmployeeNavData } from '@/data/navigationData';

interface Permission {
  read: boolean;
  write: boolean;
  edit: boolean;
  delete: boolean;
  audit: boolean;
  included: boolean;
}

interface PermissionsMap {
  [modulePath: string]: Permission;
}

interface Module {
  moduleId: string;
  modulePath: string;
  moduleName: string;
}

export default function PermissionsPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [modules, setModules] = useState<Module[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize default permission for a module
  const getDefaultPermission = (): Permission => ({
    read: false,
    write: false,
    edit: false,
    delete: false,
    audit: false,
    included: false,
  });

  // Flatten navData to get modules
  useEffect(() => {
    const flattenedModules = flattenNavData(adminEmployeeNavData);
    console.log('Flattened modules:', flattenedModules);
    setModules(flattenedModules);
    
    // Initialize permissions for all modules to prevent undefined values
    const initialPermissions: PermissionsMap = {};
    flattenedModules.forEach((module) => {
      initialPermissions[module.modulePath] = getDefaultPermission();
    });
    setPermissions(initialPermissions);
  }, []);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch employee suggestions with improved error handling
  const fetchEmployeeSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setEmployees([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/employees?query=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const filteredEmployees = session?.user.role === 'admin'
          ? result.data.filter((emp: IEmployee) =>
              emp.companies.some((empCompany) =>
                session.user.companies.some((userCompany) => userCompany.companyId === empCompany.companyId)
              )
            )
          : result.data;

        setEmployees(filteredEmployees);
        setShowDropdown(filteredEmployees.length > 0);
      } else {
        toast.error(result.error || 'No employees found');
        setEmployees([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
      setEmployees([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Fetch specific employee and their permissions
  const fetchEmployeePermissions = useCallback(async (employeeId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/employees/permissions?employeeId=${encodeURIComponent(employeeId)}`);
      const result = await response.json();

      if (response.ok) {
        return result.moduleAccess || [];
      } else {
        toast.error(result.error || 'Failed to fetch permissions');
        return [];
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to fetch employee permissions');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle employee selection with permission loading
  const handleEmployeeSelect = async (employee: IEmployee) => {
    setSelectedEmployee(employee);
    setSearchInput(employee.userId);
    setShowDropdown(false);
    
    const currentPermissions = await fetchEmployeePermissions(employee.employeeId);
    
    // Initialize permissions state with default values first
    const initialPermissions: PermissionsMap = {};
    modules.forEach((module) => {
      const moduleAccess = currentPermissions.find((m: IModuleAccess) => m.modulePath === module.modulePath);
      initialPermissions[module.modulePath] = {
        read: moduleAccess?.permissions.includes('read') || false,
        write: moduleAccess?.permissions.includes('write') || false,
        edit: moduleAccess?.permissions.includes('edit') || false,
        delete: moduleAccess?.permissions.includes('delete') || false,
        audit: moduleAccess?.permissions.includes('audit') || false,
        included: !!moduleAccess,
      };
    });
    setPermissions(initialPermissions);
  };

  // Handle permission change with better state management
  const handlePermissionChange = (modulePath: string, permission: keyof Permission) => {
    setPermissions((prev) => {
      const currentModule = prev[modulePath] || getDefaultPermission();
      const newPermission = !currentModule[permission];
      
      return {
        ...prev,
        [modulePath]: {
          ...currentModule,
          [permission]: newPermission,
          included: permission === 'included' ? newPermission : (newPermission || currentModule.included),
        },
      };
    });
  };

  // Handle module inclusion with smart permission management
  const handleModuleInclusion = (modulePath: string) => {
    setPermissions((prev) => {
      const currentModule = prev[modulePath] || getDefaultPermission();
      const isIncluded = !currentModule.included;
      
      return {
        ...prev,
        [modulePath]: {
          read: isIncluded ? currentModule.read : false,
          write: isIncluded ? currentModule.write : false,
          edit: isIncluded ? currentModule.edit : false,
          delete: isIncluded ? currentModule.delete : false,
          audit: isIncluded ? currentModule.audit : false,
          included: isIncluded,
        },
      };
    });
  };

  // Handle select all permissions for a module
  const handleSelectAll = (modulePath: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [modulePath]: {
        read: checked,
        write: checked,
        edit: checked,
        delete: checked,
        audit: checked,
        included: checked,
      },
    }));
  };

  // Handle save permissions
  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error('No employee selected');
      return;
    }

    setIsSaving(true);
    try {
      const permissionsToUpdate = Object.entries(permissions).reduce((acc, [modulePath, perms]) => {
        if (perms.included) {
          const activePermissions = Object.entries(perms)
            .filter(([key, value]) => value && key !== 'included')
            .map(([key]) => key);
          
          if (activePermissions.length > 0) {
            acc[modulePath] = activePermissions;
          }
        }
        return acc;
      }, {} as { [key: string]: string[] });

      const response = await fetch('/api/admin/employees/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.employeeId,
          permissions: permissionsToUpdate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Permissions updated successfully');
        handleEmployeeSelect(selectedEmployee);
      } else {
        toast.error(result.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // **FIXED: Utility function to check if all permissions are selected**
  const areAllPermissionsSelected = (modulePath: string): boolean => {
    const modulePerms = permissions[modulePath];
    if (!modulePerms) return false;
    
    return modulePerms.included && 
           modulePerms.read && 
           modulePerms.write && 
           modulePerms.edit && 
           modulePerms.delete && 
           modulePerms.audit;
  };

  // **FIXED: Helper function to get permission value safely**
  const getPermissionValue = (modulePath: string, permission: keyof Permission): boolean => {
    return permissions[modulePath]?.[permission] || false;
  };

  // Toolbar actions
  const handleAddNew = () => toast.info('Add New not implemented');
  const handleClear = () => {
    setSearchInput('');
    setEmployees([]);
    setSelectedEmployee(null);
    // Reset permissions to default values for all modules
    const resetPermissions: PermissionsMap = {};
    modules.forEach((module) => {
      resetPermissions[module.modulePath] = getDefaultPermission();
    });
    setPermissions(resetPermissions);
    setShowDropdown(false);
  };
  const handleExit = () => toast.info('Exit not implemented');
  const handleUp = () => toast.info('Up not implemented');
  const handleDown = () => toast.info('Down not implemented');
  const handleSearch = () => fetchEmployeeSuggestions(searchInput);
  const handleImplementQuery = () => toast.info('Implement Query not implemented');
  const handleEdit = () => toast.info('Edit not implemented');
  const handleDelete = () => toast.info('Delete not implemented');
  const handleAudit = () => toast.info('Audit not implemented');
  const handlePrint = () => toast.info('Print not implemented');
  const handleHelp = () => toast.info('Help not implemented');

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'employee']}>
      <div className="container mx-auto p-4 max-w-6xl">
        <WindowsToolbar
          modulePath="/permissions"
          onAddNew={handleAddNew}
          onSave={handleSave}
          onClear={handleClear}
          onExit={handleExit}
          onUp={handleUp}
          onDown={handleDown}
          onSearch={handleSearch}
          onImplementQuery={handleImplementQuery}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAudit={handleAudit}
          onPrint={handlePrint}
          onHelp={handleHelp}
        />
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Manage Employee Permissions</h1>

          <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
            <strong>Debug:</strong> Total modules loaded: {modules.length}
            {modules.length === 0 && <span className="text-red-600"> - No modules found!</span>}
          </div>

          {/* Employee Search Section */}
          <div className="mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Employee by User ID
              </label>
              <div className="relative">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      fetchEmployeeSuggestions(e.target.value);
                    }}
                    placeholder="Type employee user ID (e.g., ozil10, le...)"
                    className="p-3 border border-gray-300 rounded-lg w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
                      border: '1px solid #ced4da',
                    }}
                  />
                  {isLoading && (
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading...
                    </div>
                  )}
                </div>
                
                {showDropdown && employees.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-20 mt-1 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {employees.map((emp) => (
                      <div
                        key={emp.employeeId}
                        onClick={() => handleEmployeeSelect(emp)}
                        className="p-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{emp.userId}</p>
                        <p className="text-sm text-gray-600">{emp.name}</p>
                        <p className="text-xs text-gray-500">ID: {emp.employeeId}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected Employee Info */}
          {selectedEmployee && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h2 className="text-xl font-semibold mb-3 text-blue-800">Selected Employee</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div><strong>Name:</strong> {selectedEmployee.name}</div>
                <div><strong>User ID:</strong> {selectedEmployee.userId}</div>
                <div><strong>Employee ID:</strong> {selectedEmployee.employeeId}</div>
                <div><strong>Role:</strong> <span className="capitalize">{selectedEmployee.role}</span></div>
                <div><strong>Email:</strong> {selectedEmployee.email || 'N/A'}</div>
              </div>
            </div>
          )}

          {/* Permissions Management Form */}
          {selectedEmployee && modules.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Module Permissions</h2>
                <div className="text-sm text-gray-600">
                  Total Modules: {modules.length} | 
                  Assigned: {Object.values(permissions).filter(p => p.included).length}
                </div>
              </div>

              <div className="space-y-3">
                {modules.map((module) => (
                  <div 
                    key={module.moduleId} 
                    className={`p-4 border rounded-lg transition-all duration-200 ${
                      getPermissionValue(module.modulePath, 'included')
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Module Header */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={getPermissionValue(module.modulePath, 'included')}
                          onChange={() => handleModuleInclusion(module.modulePath)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{module.moduleName}</h3>
                          <p className="text-sm text-gray-600">{module.modulePath}</p>
                        </div>
                      </div>
                      
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAll(module.modulePath, e.target.checked)}
                          checked={areAllPermissionsSelected(module.modulePath)}
                          disabled={!getPermissionValue(module.modulePath, 'included')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:bg-gray-100"
                        />
                        <span className={getPermissionValue(module.modulePath, 'included') ? 'text-gray-900' : 'text-gray-400'}>
                          Select All
                        </span>
                      </label>
                    </div>

                    {/* Individual Permissions */}
                    {getPermissionValue(module.modulePath, 'included') && (
                      <div className="ml-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {['read', 'write', 'edit', 'delete', 'audit'].map((perm) => (
                          <label key={perm} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={getPermissionValue(module.modulePath, perm as keyof Permission)}
                              onChange={() => handlePermissionChange(module.modulePath, perm as keyof Permission)}
                              disabled={!getPermissionValue(module.modulePath, 'included')}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="capitalize font-medium">{perm}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={handleClear}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-150"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !selectedEmployee}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors duration-150 flex items-center gap-2"
                  style={{
                    background: isSaving || !selectedEmployee
                      ? 'linear-gradient(180deg, #a0a0a0 0%, #808080 100%)'
                      : 'linear-gradient(180deg, #4a90e2 0%, #357abd 100%)',
                  }}
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isSaving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          )}

          {/* Empty States */}
          {!selectedEmployee && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-medium mb-2">No Employee Selected</h3>
              <p>Search and select an employee above to manage their permissions.</p>
            </div>
          )}

          {selectedEmployee && modules.length === 0 && (
            <div className="text-center py-12 text-red-500">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium mb-2">No Modules Loaded</h3>
              <p>There seems to be an issue loading the navigation modules. Please check the console for errors.</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
