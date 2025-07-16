'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { IEmployee, IModuleAccess } from '@/models/employee';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Define interfaces
interface Permission {
  read: boolean;
  write: boolean;
  edit: boolean;
  delete: boolean;
  audit: boolean;
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
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [modules, setModules] = useState<Module[]>([]);
  const [searchModule, setSearchModule] = useState('');

  // Fetch employee data
  const fetchEmployee = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setEmployees([]);
      setSelectedEmployee(null);
      setPermissions({});
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/employee?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok && data.employees) {
        setEmployees(data.employees);
        if (data.employees.length === 1) {
          setSelectedEmployee(data.employees[0]);
          // Initialize permissions from employee moduleAccess
          const initialPermissions: PermissionsMap = {};
          data.employees[0].moduleAccess.forEach((module: IModuleAccess) => {
            initialPermissions[module.modulePath] = {
              read: module.permissions.includes('read'),
              write: module.permissions.includes('write'),
              edit: module.permissions.includes('edit'),
              delete: module.permissions.includes('delete'),
              audit: module.permissions.includes('audit'),
            };
          });
          setPermissions(initialPermissions);
        } else {
          setSelectedEmployee(null);
          setPermissions({});
        }
      } else {
        toast.error(data.error || 'No employees found');
        setEmployees([]);
        setSelectedEmployee(null);
        setPermissions({});
      }
    } catch (error) {
      toast.error('Failed to fetch employees');
      setEmployees([]);
      setSelectedEmployee(null);
      setPermissions({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch modules
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch('/api/modules');
        const data = await response.json();
        if (response.ok) {
          setModules(data.modules);
        } else {
          toast.error(data.error || 'Failed to fetch modules');
        }
      } catch (error) {
        toast.error('Failed to fetch modules');
      }
    };
    fetchModules();
  }, []);

  // Handle employee selection
  const handleEmployeeSelect = (employee: IEmployee) => {
    setSelectedEmployee(employee);
    const initialPermissions: PermissionsMap = {};
    employee.moduleAccess.forEach((module: IModuleAccess) => {
      initialPermissions[module.modulePath] = {
        read: module.permissions.includes('read'),
        write: module.permissions.includes('write'),
        edit: module.permissions.includes('edit'),
        delete: module.permissions.includes('delete'),
        audit: module.permissions.includes('audit'),
      };
    });
    setPermissions(initialPermissions);
  };

  // Handle permission change
  const handlePermissionChange = (modulePath: string, permission: keyof Permission) => {
    setPermissions((prev) => ({
      ...prev,
      [modulePath]: {
        ...prev[modulePath],
        [permission]: !prev[modulePath]?.[permission],
      },
    }));
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
      },
    }));
  };

  // Handle save permissions
  const handleSave = async () => {
    if (!selectedEmployee) {
      toast.error('No employee selected');
      return;
    }

    setIsLoading(true);
    try {
      const permissionObject = {
        employeeId: selectedEmployee.employeeId,
        permissions: Object.entries(permissions).reduce((acc, [modulePath, perms]) => {
          const activePermissions = Object.entries(perms)
            .filter(([_, value]) => value)
            .map(([key]) => key);
          if (activePermissions.length > 0) {
            acc[modulePath] = activePermissions;
          }
          return acc;
        }, {} as { [key: string]: string[] }),
      };

      const response = await fetch('/api/employee/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionObject),
      });

      if (response.ok) {
        toast.success('Permissions updated successfully');
        // Refresh employee data
        fetchEmployee(searchInput);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter modules based on search
  const filteredModules = modules.filter((module) =>
    module.moduleName.toLowerCase().includes(searchModule.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'admin']} requiredModule="/permissions" requiredPermission="edit">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Manage Employee Permissions</h1>

        {/* Employee Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Search Employee</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                fetchEmployee(e.target.value);
              }}
              placeholder="Enter employee ID or name"
              className="mt-1 p-2 border rounded w-full max-w-md"
            />
            {isLoading && <span className="text-blue-600">Loading...</span>}
          </div>
        </div>

        {/* Employee List */}
        {employees.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Select Employee</h2>
            <div className="grid gap-2">
              {employees.map((emp) => (
                <button
                  key={emp.employeeId}
                  onClick={() => handleEmployeeSelect(emp)}
                  className={`p-2 border rounded text-left ${
                    selectedEmployee?.employeeId === emp.employeeId ? 'bg-blue-100' : 'bg-white'
                  }`}
                >
                  <p><strong>Name:</strong> {emp.name}</p>
                  <p><strong>Employee ID:</strong> {emp.employeeId}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Employee Info */}
        {selectedEmployee && (
          <div className="mb-6 p-4 border rounded bg-gray-50">
            <h2 className="text-lg font-semibold">Employee Details</h2>
            <p><strong>Name:</strong> {selectedEmployee.name}</p>
            <p><strong>Role:</strong> {selectedEmployee.role}</p>
            <p><strong>Email:</strong> {selectedEmployee.email || 'N/A'}</p>
            <p><strong>Employee ID:</strong> {selectedEmployee.employeeId}</p>
          </div>
        )}

        {/* Module Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Search Modules</label>
          <input
            type="text"
            value={searchModule}
            onChange={(e) => setSearchModule(e.target.value)}
            placeholder="Search modules..."
            className="mt-1 p-2 border rounded w-full max-w-md"
          />
        </div>

        {/* Modules List */}
        {selectedEmployee && (
          <div className="space-y-4">
            {filteredModules.map((module) => (
              <div key={module.moduleId} className="p-4 border rounded bg-white">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{module.moduleName}</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(module.modulePath, e.target.checked)}
                      checked={permissions[module.modulePath]?.read &&
                        permissions[module.modulePath]?.write &&
                        permissions[module.modulePath]?.edit &&
                        permissions[module.modulePath]?.delete &&
                        permissions[module.modulePath]?.audit}
                    />
                    Select All
                  </label>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {['read', 'write', 'edit', 'delete', 'audit'].map((perm) => (
                    <label key={perm} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissions[module.modulePath]?.[perm as keyof Permission] || false}
                        onChange={() => handlePermissionChange(module.modulePath, perm as keyof Permission)}
                      />
                      {perm.charAt(0).toUpperCase() + perm.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save Button */}
        {selectedEmployee && (
          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={isLoading || !selectedEmployee}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            >
              {isLoading ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}