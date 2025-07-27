"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";
import { IEmployee, IModuleAccess } from "@/models/employee";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSession } from "next-auth/react";
import { flattenNavData } from "@/lib/utils";
import { adminEmployeeNavData } from "@/data/navigationData";
import { useRouter } from "next/navigation";

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

interface AuditLog {
  id: string;
  employeeId: string;
  updatedBy: string;
  changes: { previous?: { [modulePath: string]: string[] }; new?: { [modulePath: string]: string[] }; deleted?: boolean };
  timestamp: string;
}

export default function PermissionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [previousPermissions, setPreviousPermissions] = useState<PermissionsMap>({});
  const [modules, setModules] = useState<Module[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);
  const [isAuditPopupOpen, setIsAuditPopupOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getDefaultPermission = (): Permission => ({
    read: false,
    write: false,
    edit: false,
    delete: false,
    audit: false,
    included: false,
  });

  useEffect(() => {
    const flattenedModules = flattenNavData(adminEmployeeNavData);
    setModules(flattenedModules);
    const initialPermissions: PermissionsMap = {};
    flattenedModules.forEach((module) => {
      initialPermissions[module.modulePath] = getDefaultPermission();
    });
    setPermissions(initialPermissions);
    setPreviousPermissions(initialPermissions);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || employees.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < employees.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleEmployeeSelect(employees[highlightedIndex]);
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const fetchEmployeeSuggestions = useCallback(
    async (query: string) => {
      if (!query || query.length < 1) {
        setEmployees([]);
        setShowDropdown(false);
        setHighlightedIndex(-1);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/employees?query=${encodeURIComponent(query)}`);
        const result = await response.json();
        if (response.ok && result.data) {
          const filteredEmployees =
            session?.user.role === "admin"
              ? result.data.filter((emp: IEmployee) =>
                  emp.companies.some((empCompany) =>
                    session.user.companies.some(
                      (userCompany) => userCompany.companyId === empCompany.companyId
                    )
                  )
                )
              : result.data;
          const sortedEmployees = filteredEmployees.sort((a: IEmployee, b: IEmployee) =>
            a.name.localeCompare(b.name)
          );
          setEmployees(sortedEmployees);
          setShowDropdown(sortedEmployees.length > 0);
          setHighlightedIndex(sortedEmployees.length > 0 ? 0 : -1);
        } else {
          toast.error(result.error || "No employees found");
          setEmployees([]);
          setShowDropdown(false);
          setHighlightedIndex(-1);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast.error("Failed to fetch employees");
        setEmployees([]);
        setShowDropdown(false);
        setHighlightedIndex(-1);
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  const fetchEmployeePermissions = useCallback(async (employeeId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/employees/permissions?employeeId=${encodeURIComponent(employeeId)}`
      );
      const result = await response.json();
      if (response.ok) {
        return result.moduleAccess || [];
      } else {
        toast.error(result.error || "Failed to fetch permissions");
        return [];
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to fetch employee permissions");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleEmployeeSelect = async (employee: IEmployee) => {
    setSelectedEmployee(employee);
    setSearchInput(employee.userId);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setIsEditing(false);
    const currentPermissions = await fetchEmployeePermissions(employee.employeeId);
    const initialPermissions: PermissionsMap = {};
    modules.forEach((module) => {
      const moduleAccess = currentPermissions.find(
        (m: IModuleAccess) => m.modulePath === module.modulePath
      );
      initialPermissions[module.modulePath] = {
        read: moduleAccess?.permissions.includes("read") || false,
        write: moduleAccess?.permissions.includes("write") || false,
        edit: moduleAccess?.permissions.includes("edit") || false,
        delete: moduleAccess?.permissions.includes("delete") || false,
        audit: moduleAccess?.permissions.includes("audit") || false,
        included: !!moduleAccess,
      };
    });
    setPermissions(initialPermissions);
    setPreviousPermissions(initialPermissions);
  };

  const handlePermissionChange = (modulePath: string, permission: keyof Permission) => {
    if (!isEditing) return;
    setPermissions((prev) => {
      const currentModule = prev[modulePath] || getDefaultPermission();
      const newPermission = !currentModule[permission];
      return {
        ...prev,
        [modulePath]: {
          ...currentModule,
          [permission]: newPermission,
          included: permission === "included" ? newPermission : newPermission || currentModule.included,
        },
      };
    });
  };

  const handleModuleInclusion = (modulePath: string) => {
    if (!isEditing) return;
    setPermissions((prev) => {
      const currentModule = prev[modulePath] || getDefaultPermission();
      const isIncluded = !currentModule.included;
      return {
        ...prev,
        [modulePath]: {
          read: isIncluded,
          write: isIncluded,
          edit: isIncluded,
          delete: isIncluded,
          audit: isIncluded,
          included: isIncluded,
        },
      };
    });
  };

  const handleSelectAll = (modulePath: string, checked: boolean) => {
    if (!isEditing) return;
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

  const handleSave = async () => {
    if (!selectedEmployee || !session?.user) {
      toast.error("No employee selected");
      return;
    }
    if (!isEditing) {
      toast.error("Please enable edit mode to save changes");
      return;
    }
    setIsSaving(true);
    try {
      const permissionsToUpdate = Object.entries(permissions).reduce(
        (acc, [modulePath, perms]) => {
          if (perms.included) {
            const activePermissions = Object.entries(perms)
              .filter(([key, value]) => value && key !== "included")
              .map(([key]) => key);
            if (activePermissions.length > 0) {
              acc[modulePath] = activePermissions;
            }
          }
          return acc;
        },
        {} as { [key: string]: string[] }
      );

      const response = await fetch("/api/admin/employees/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.employeeId,
          permissions: permissionsToUpdate,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Log audit data
        const auditResponse = await fetch("/api/admin/assignment-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: selectedEmployee.employeeId,
            updatedBy: session.user.id,
            changes: {
              previous: Object.entries(previousPermissions).reduce(
                (acc, [modulePath, perms]) => {
                  if (perms.included) {
                    acc[modulePath] = Object.keys(perms).filter(
                      (key) => perms[key as keyof Permission] && key !== "included"
                    );
                  }
                  return acc;
                },
                {} as { [key: string]: string[] }
              ),
              new: permissionsToUpdate,
            },
          }),
        });

        if (!auditResponse.ok) {
          console.error("Failed to log audit data:", await auditResponse.json());
        }

        toast.success("Permissions updated successfully");
        setIsEditing(false);
        handleEmployeeSelect(selectedEmployee);
      } else {
        toast.error(result.error || "Failed to update permissions");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Failed to save permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const getPermissionValue = (modulePath: string, permission: keyof Permission): boolean => {
    return permissions[modulePath]?.[permission] || false;
  };

  const handleAddNew = () => {
    setSearchInput("");
    setShowDropdown(true);
    setEmployees([]);
    setSelectedEmployee(null);
    setIsEditing(true);
    inputRef.current?.focus();
    const resetPermissions: PermissionsMap = {};
    modules.forEach((module) => {
      resetPermissions[module.modulePath] = getDefaultPermission();
    });
    setPermissions(resetPermissions);
    setPreviousPermissions(resetPermissions);
    toast.info("Ready to add new permissions");
  };

  const handleClear = () => {
    setSearchInput("");
    setEmployees([]);
    setSelectedEmployee(null);
    setIsEditing(false);
    const resetPermissions: PermissionsMap = {};
    modules.forEach((module) => {
      resetPermissions[module.modulePath] = getDefaultPermission();
    });
    setPermissions(resetPermissions);
    setPreviousPermissions(resetPermissions);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    toast.info("Form cleared");
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = async () => {
    if (!selectedEmployee || employees.length === 0) {
      toast.error("No employee selected or no employees loaded");
      return;
    }
    const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name));
    const currentIndex = sortedEmployees.findIndex((emp) => emp.employeeId === selectedEmployee.employeeId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedEmployees.length - 1;
    await handleEmployeeSelect(sortedEmployees[prevIndex]);
  };

  const handleDown = async () => {
    if (!selectedEmployee || employees.length === 0) {
      toast.error("No employee selected or no employees loaded");
      return;
    }
    const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name));
    const currentIndex = sortedEmployees.findIndex((emp) => emp.employeeId === selectedEmployee.employeeId);
    const nextIndex = currentIndex < sortedEmployees.length - 1 ? currentIndex + 1 : 0;
    await handleEmployeeSelect(sortedEmployees[nextIndex]);
  };

  const handleSearch = () => {
    inputRef.current?.focus();
    fetchEmployeeSuggestions(searchInput);
  };

  const handleEdit = () => {
    if (!selectedEmployee) {
      toast.error("No employee selected");
      return;
    }
    setIsEditing(true);
    inputRef.current?.focus();
    toast.info("Edit mode enabled");
  };

  const handleDelete = async () => {
    if (!selectedEmployee) {
      toast.error("No employee selected");
      return;
    }
    if (!confirm(`Are you sure you want to delete permissions for ${selectedEmployee.name}?`)) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/employees/permissions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmployee.employeeId }),
      });
      const result = await response.json();
      if (response.ok) {
        await fetch("assignment-", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: selectedEmployee.employeeId,
            updatedBy: session?.user.id,
            changes: { deleted: true },
          }),
        });
        toast.success("Permissions deleted successfully");
        handleClear();
      } else {
        toast.error(result.error || "Failed to delete permissions");
      }
    } catch (error) {
      console.error("Error deleting permissions:", error);
      toast.error("Failed to delete permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!selectedEmployee) {
      toast.error("No employee selected");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/assignment-audit?employeeId=${encodeURIComponent(selectedEmployee.employeeId)}`
      );
      const result = await response.json();
      if (response.ok) {
        setAuditLogs(Array.isArray(result.data) ? result.data : []);
        setIsAuditPopupOpen(true);
      } else {
        toast.error(result.error || "Failed to fetch audit logs");
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to fetch audit logs");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedEmployee) {
      toast.error("No employee selected");
      return;
    }
    const printContent = `
      Permissions for ${selectedEmployee.name} (${selectedEmployee.userId}):
      ${modules
        .filter((module) => permissions[module.modulePath]?.included)
        .map(
          (module) =>
            `${module.moduleName}: ${Object.entries(permissions[module.modulePath] || {})
              .filter(([key, value]) => value && key !== "included")
              .map(([key]) => key)
              .join(", ")}`
        )
        .join("\n")}
    `;
    const printWindow = window.open("", "_blank");
    printWindow?.document.write(`<pre>${printContent}</pre>`);
    printWindow?.document.close();
    printWindow?.print();
  };

  const handleHelp = () => {
    alert(
      "Permissions Management Help:\n- Add New: Start a new permission setup\n- Save: Save changes\n- Clear: Reset the form\n- Exit: Return to dashboard\n- Up/Down: Cycle through employees alphabetically\n- Search: Focus input and search employees\n- Edit: Enable editing mode\n- Delete: Remove permissions\n- Audit: View change history\n- Print: Print current permissions"
    );
  };

  // Function to compare permissions and determine changes
  const getPermissionChanges = (
    previous: { [modulePath: string]: string[] } | undefined,
    current: { [modulePath: string]: string[] } | undefined
  ) => {
    const changes: {
      modulePath: string;
      added: string[];
      removed: string[];
      unchanged: string[];
    }[] = [];
    const allModulePaths = new Set([
      ...(previous ? Object.keys(previous) : []),
      ...(current ? Object.keys(current) : []),
    ]);

    allModulePaths.forEach((modulePath) => {
      const prevPerms = previous?.[modulePath] || [];
      const currPerms = current?.[modulePath] || [];
      const added = currPerms.filter((perm) => !prevPerms.includes(perm));
      const removed = prevPerms.filter((perm) => !currPerms.includes(perm));
      const unchanged = currPerms.filter((perm) => prevPerms.includes(perm));

      if (added.length > 0 || removed.length > 0 || unchanged.length > 0) {
        changes.push({ modulePath, added, removed, unchanged });
      }
    });

    return changes;
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin", "admin", "employee"]}>
      <div
        className="min-h-screen bg-gradient-to-b from-[#a1c4fd] to-[#c2e9fb] font-sans"
        style={{
          fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
          background: "linear-gradient(to bottom, #a1c4fd 0%, #c2e9fb 100%)",
        }}
      >
        <WindowsToolbar
          modulePath="/permissions"
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

        <div className="container mx-auto p-6 max-w-6xl">
          <div className="bg-white border-2 border-[#8c8c8c] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] rounded-sm">
            <div className="bg-gradient-to-r from-[#0f3d7b] to-[#3b6ca4] text-white px-4 py-2 border-b-2 border-[#0c2f5f] flex items-center">
              <h1 className="text-lg font-bold">Role Management</h1>
            </div>

            <div className="p-4 bg-[#f0f0f0] border-b-2 border-[#8c8c8c] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563]">
              <div className="flex items-center gap-3">
                <label className="font-bold text-[#003087] text-base min-w-fit">
                  Role:
                </label>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      if (isEditing) {
                        setSearchInput(e.target.value);
                        fetchEmployeeSuggestions(e.target.value);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search employee by User ID..."
                    className="w-full px-3 py-2 border-2 border-[#8c8c8c] bg-white shadow-[inset_2px_2px_0px_#4b5563,inset_-2px_-2px_0px_#ffffff] text-base rounded-sm focus:outline-none focus:ring-2 focus:ring-[#0052cc] disabled:bg-[#d8d8d8] disabled:cursor-not-allowed"
                    disabled={!isEditing}
                  />
                  {showDropdown && employees.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-20 mt-1 w-full bg-[#f5f6f5] border-2 border-[#8c8c8c] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] max-h-60 overflow-y-auto rounded-sm"
                    >
                      {employees.map((emp, index) => (
                        <div
                          key={emp.employeeId}
                          onClick={() => handleEmployeeSelect(emp)}
                          className={`p-3 cursor-pointer border-b border-[#8c8c8c] last:border-b-0 text-sm ${
                            index === highlightedIndex
                              ? "bg-[#316ac5] text-white"
                              : "hover:bg-[#c6d8f0]"
                          }`}
                        >
                          <div className="font-bold">{emp.userId}</div>
                          <div className="text-xs">{emp.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedEmployee && (
              <div className="px-4 py-2 bg-[#f0f0f0] border-b-2 border-[#8c8c8c] text-sm font-bold text-[#003087] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563]">
                Selected: {selectedEmployee.name} ({selectedEmployee.userId}) - {selectedEmployee.role}
              </div>
            )}

            {selectedEmployee && modules.length > 0 ? (
              <div className="bg-white">
                <div className="grid grid-cols-9 gap-0 bg-gradient-to-r from-[#0f3d7b] to-[#3b6ca4] text-white text-sm font-bold border-b-2 border-[#0c2f5f]">
                  <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 border-2 border-[#8c8c8c] bg-white focus:ring-[#0052cc] disabled:opacity-50"
                      onChange={(e) => {
                        if (isEditing) {
                          modules.forEach((module) => {
                            handleSelectAll(module.modulePath, e.target.checked);
                          });
                        }
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="col-span-3 p-3 border-r-2 border-[#8c8c8c]">
                    Module Name
                  </div>
                  <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                    Add
                  </div>
                  <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                    Modify
                  </div>
                  <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                    Delete
                  </div>
                  <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                    View
                  </div>
                  <div className="col-span-1 p-3 text-center">
                    Audit
                  </div>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  {modules.map((module, index) => (
                    <div
                      key={module.moduleId}
                      className={`grid grid-cols-9 gap-0 border-b-2 border-[#8c8c8c] text-sm ${
                        index % 2 === 0 ? "bg-white" : "bg-[#f5f5f5]"
                      } hover:bg-[#c6d8f0]`}
                    >
                      <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 border-2 border-[#8c8c8c] bg-white focus:ring-[#0052cc] disabled:opacity-50"
                          checked={getPermissionValue(module.modulePath, "included")}
                          onChange={() => handleModuleInclusion(module.modulePath)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="col-span-3 p-3 border-r-2 border-[#8c8c8c] font-bold text-[#003087]">
                        {module.moduleName}
                      </div>
                      <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 border-2 border-[#8c8c8c] bg-white focus:ring-[#0052cc] disabled:opacity-50"
                          checked={getPermissionValue(module.modulePath, "write")}
                          onChange={() => handlePermissionChange(module.modulePath, "write")}
                          disabled={!getPermissionValue(module.modulePath, "included") || !isEditing}
                        />
                      </div>
                      <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 border-2 border-[#8c8c8c] bg-white focus:ring-[#0052cc] disabled:opacity-50"
                          checked={getPermissionValue(module.modulePath, "edit")}
                          onChange={() => handlePermissionChange(module.modulePath, "edit")}
                          disabled={!getPermissionValue(module.modulePath, "included") || !isEditing}
                        />
                      </div>
                      <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 border-2 border-[#8c8c8c] bg-white focus:ring-[#0052cc] disabled:opacity-50"
                          checked={getPermissionValue(module.modulePath, "delete")}
                          onChange={() => handlePermissionChange(module.modulePath, "delete")}
                          disabled={!getPermissionValue(module.modulePath, "included") || !isEditing}
                        />
                      </div>
                      <div className="col-span-1 p-3 border-r-2 border-[#8c8c8c] text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 border-2 border-[#8c8c8c] bg-white focus:ring-[#0052cc] disabled:opacity-50"
                          checked={getPermissionValue(module.modulePath, "read")}
                          onChange={() => handlePermissionChange(module.modulePath, "read")}
                          disabled={!getPermissionValue(module.modulePath, "included") || !isEditing}
                        />
                      </div>
                      <div className="col-span-1 p-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 border-2 border-[#8c8c8c] bg-white focus:ring-[#0052cc] disabled:opacity-50"
                          checked={getPermissionValue(module.modulePath, "audit")}
                          onChange={() => handlePermissionChange(module.modulePath, "audit")}
                          disabled={!getPermissionValue(module.modulePath, "included") || !isEditing}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#f0f0f0] px-4 py-2 border-t-2 border-[#8c8c8c] text-sm text-[#003087] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] flex items-center">
                  <span>Records: {modules.length}</span>
                  <span className="ml-4">Selected: {Object.values(permissions).filter((p) => p.included).length}</span>
                  {isLoading && (
                    <span className="ml-4 text-[#0f3d7b] font-bold">Loading...</span>
                  )}
                  {isSaving && (
                    <span className="ml-4 text-[#0f3d7b] font-bold">Saving...</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white h-80 flex items-center justify-center text-[#003087] border-2 border-[#8c8c8c] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] rounded-sm">
                {!selectedEmployee ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <div className="text-lg">Select an employee to manage permissions</div>
                  </div>
                ) : modules.length === 0 ? (
                  <div className="text-center text-[#a40000]">
                    <div className="text-6xl mb-4">⚠️</div>
                    <div className="text-lg">No modules loaded</div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          {isAuditPopupOpen && (
            <div className="fixed inset-0 backdrop-blur-md  bg-opacity-20 flex items-center justify-center z-50">
              <div
                className="p-6 rounded-sm max-w-2xl w-full shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563]"
                style={{
                  background: "linear-gradient(180deg, #f5f6f5 0%, #e0e1e0 100%)",
                  border: "2px solid #8c8c8c",
                }}
              >
                <h2 className="text-lg font-bold mb-4 text-[#003087]">
                  Audit Logs for {selectedEmployee?.name}
                </h2>
                <div className="max-h-[500px] overflow-y-auto relative">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-[#003087] italic text-center">
                      No audit logs found
                    </p>
                  ) : (
                    <div className="relative pl-8">
                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-[#8c8c8c]"></div>
                      {auditLogs.map((log, index) => {
                        const changes = getPermissionChanges(log.changes.previous, log.changes.new);
                        return (
                          <div key={index} className="mb-6 relative">
                            <div className="absolute left-[-1.45rem] top-2 w-3 h-3 bg-[#316ac5] rounded-full border-2 border-[#8c8c8c]"></div>
                            <div
                              className="p-4 rounded-sm hover:bg-[#c6d8f0] transition-colors"
                              style={{
                                background: "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)",
                                border: "2px solid #8c8c8c",
                                boxShadow: "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #4b5563",
                              }}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-semibold text-[#003087]">
                                  By: {log.updatedBy}
                                </p>
                                <p className="text-xs text-[#003087]">
                                  {new Date(log.timestamp).toLocaleString()}
                                </p>
                              </div>
                              {log.changes.deleted ? (
                                <p className="text-sm text-[#a40000] font-medium">
                                  All permissions deleted
                                </p>
                              ) : changes.length > 0 ? (
                                <table className="w-full text-xs text-[#003087] border-collapse">
                                  <thead>
                                    <tr className="border-b-2 border-[#8c8c8c]">
                                      <th className="p-2 text-left font-bold">Module</th>
                                      <th className="p-2 text-left font-bold">Added</th>
                                      <th className="p-2 text-left font-bold">Removed</th>
                                      <th className="p-2 text-left font-bold">Unchanged</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {changes.map((change, idx) => (
                                      <tr key={idx} className="border-b border-[#d8d8d8]">
                                        <td className="p-2">{change.modulePath}</td>
                                        <td className="p-2">
                                          {change.added.length > 0 ? (
                                            change.added.map((perm, i) => (
                                              <span
                                                key={i}
                                                className="inline-block px-2 py-1 mr-1 mb-1 bg-green-200 text-green-800 rounded-sm text-xs"
                                              >
                                                {perm}
                                              </span>
                                            ))
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {change.removed.length > 0 ? (
                                            change.removed.map((perm, i) => (
                                              <span
                                                key={i}
                                                className="inline-block px-2 py-1 mr-1 mb-1 bg-red-200 text-red-800 rounded-sm text-xs"
                                              >
                                                {perm}
                                              </span>
                                            ))
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {change.unchanged.length > 0 ? (
                                            change.unchanged.map((perm, i) => (
                                              <span
                                                key={i}
                                                className="inline-block px-2 py-1 mr-1 mb-1 bg-blue-200 text-blue-800 rounded-sm text-xs"
                                              >
                                                {perm}
                                              </span>
                                            ))
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-sm text-[#003087] italic">
                                  No permission changes
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsAuditPopupOpen(false)}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-sm"
                  style={{
                    background: "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)",
                    border: "2px solid #2e5cb8",
                    boxShadow: "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8",
                  }}
                  onMouseDown={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                      "linear-gradient(180deg, #2e5cb8 0%, #4a90e2 100%)";
                    (e.target as HTMLButtonElement).style.boxShadow =
                      "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff";
                  }}
                  onMouseUp={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                      "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                    (e.target as HTMLButtonElement).style.boxShadow =
                      "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background =
                      "linear-gradient(180deg, #4a90e2 0%, #2e5cb8 100%)";
                    (e.target as HTMLButtonElement).style.boxShadow =
                      "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #2e5cb8";
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}