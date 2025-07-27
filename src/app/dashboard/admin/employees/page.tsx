"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { adminEmployeeNavData } from "@/data/navigationData";
import { v4 as uuidv4 } from "uuid";
import WindowsToolbar from "@/components/layout/ToolBox";
import { NavItem } from "@/types";

interface AuditLog {
  action: string;
  timestamp: string;
  userId: string;
  details: {
    message?: string;
    changes?: {
      field: string;
      oldValue: any;
      newValue: any;
      dataType: string;
    }[];
    performedBy?: string;
    employeeId?: string;
    userId?: string;
    name?: string;
    deletedEmployeeId?: string;
    deletedUserId?: string;
    [key: string]: any;
  };
}

interface FormData {
  employeeId: string;
  userId: string;
  password: string;
  name: string;
  companyRoles: string[];
  companyId: string;
  locationIds: string[];
  moduleAccess: {
    modulePath: string;
    moduleName: string;
    permissions: string[];
  }[];
}

interface CompanyRole {
  roleId: string;
  name: string;
  description?: string;
}

interface Location {
  locationId: string;
  name: string;
}

interface Company {
  companyId: string;
  name: string;
  locations: Location[];
}

interface EmployeeRecord {
  employeeId: string;
  userId: string;
  name: string;
  companyRoles: string[];
  companyId: string;
  locations: Location[];
  moduleAccess: {
    modulePath: string;
    moduleName: string;
    permissions: string[];
  }[];
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [userIdSuggestions, setUserIdSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isEditable, setIsEditable] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    employeeId: "",
    userId: "",
    password: "",
    name: "",
    companyRoles: [],
    companyId: session?.user?.companies?.[0]?.companyId || "",
    locationIds: [],
    moduleAccess: [],
  });
  const [availableRoles, setAvailableRoles] = useState<CompanyRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const userIdInputRef = useRef<HTMLInputElement>(null);
  const [sortedEmployees, setSortedEmployees] = useState<EmployeeRecord[]>([]);
  const [currentSortedIndex, setCurrentSortedIndex] = useState(-1);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeRecord[]>(
    []
  );
  const [filterAction, setFilterAction] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("");
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>([]);
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] =
    useState<number>(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  useEffect(() => {
    setFilteredAuditLogs(auditLogs);
  }, [auditLogs]);

  const filterAuditLogs = (
    query: string,
    action: string,
    dateRange: string
  ) => {
    let filtered = [...auditLogs];
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter((log) => {
        const detailsStr = JSON.stringify(log.details).toLowerCase();
        return (
          log.action.toLowerCase().includes(lowerQuery) ||
          log.userId.toLowerCase().includes(lowerQuery) ||
          detailsStr.includes(lowerQuery)
        );
      });
    }
    if (action) {
      filtered = filtered.filter((log) => log.action === action);
    }
    if (dateRange) {
      const now = new Date();
      let startDate: Date;
      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case "year":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0);
      }
      filtered = filtered.filter((log) => new Date(log.timestamp) >= startDate);
    }
    setFilteredAuditLogs(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredAuditLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredAuditLogs.slice(indexOfFirstLog, indexOfLastLog);

  useEffect(() => {
    const sorted = [...employees].sort((a, b) =>
      a.userId.localeCompare(b.userId)
    );
    setSortedEmployees(sorted);
    if (currentEmployeeIndex >= 0) {
      const currentEmployee = employees[currentEmployeeIndex];
      const sortedIndex = sorted.findIndex(
        (emp) => emp.employeeId === currentEmployee.employeeId
      );
      setCurrentSortedIndex(sortedIndex);
    }
  }, [employees, currentEmployeeIndex]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, employeesRes] = await Promise.all([
          fetch("/api/admin/company-roles"),
          fetch("/api/admin/create-employee"),
        ]);
        const rolesData = await rolesRes.json();
        const employeesData = await employeesRes.json();
        if (rolesRes.ok) {
          console.log("Fetched roles:", rolesData.data); // Debug log
          setAvailableRoles(rolesData.data || []);
        } else {
          setError(rolesData.error || "Failed to fetch roles");
        }
        if (employeesRes.ok) {
          console.log("Fetched employees:", employeesData.data); // Debug log
          setEmployees(employeesData.data || []);
        } else {
          setError(employeesData.error || "Failed to fetch employees");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("An error occurred while fetching data");
      }
    };
    if (session?.user?.id) {
      fetchData();
    }
  }, [session]);

  const handleAddNew = () => {
    setIsEditable(true);
    setFormData({
      employeeId: "",
      userId: "",
      password: "",
      name: "",
      companyRoles: [],
      companyId: session?.user?.companies?.[0]?.companyId || "",
      locationIds:
        session?.user?.companies?.[0]?.locations?.map(
          (loc: Location) => loc.locationId
        ) || [],
      moduleAccess: [],
    });
    setError("");
    setMessage("");
    setCurrentEmployeeIndex(-1);
    setCompanies(session?.user?.companies || []);
    setTimeout(() => {
      if (userIdInputRef.current) {
        userIdInputRef.current.focus();
      }
    }, 100);
  };

  const fetchUserIdSuggestions = async (query: string) => {
    if (query.length < 1) {
      setUserIdSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/employees?userIdQuery=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (res.ok && data.data) {
        const suggestions = data.data.map((emp: any) => emp.userId);
        setUserIdSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error("Error fetching userId suggestions:", error);
    }
  };

  const renderAuditDetails = (details: any) => {
    if (!details)
      return <span className="text-gray-500">No details available</span>;
    return (
      <div className="space-y-2">
        {details.message && (
          <div className="text-sm font-medium text-gray-900">
            {details.message}
          </div>
        )}
        {details.performedBy && (
          <div className="text-xs text-gray-600">
            <span className="font-medium">Performed by:</span>{" "}
            {details.performedByName || details.performedBy}
          </div>
        )}
        {details.changes && details.changes.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Changes ({details.changes.length} field
              {details.changes.length > 1 ? "s" : ""}):
            </div>
            <div className="space-y-1">
              {details.changes.map((change: any, index: number) => {
                if (change.oldValue === change.newValue) {
                  return null;
                }
                return (
                  <div
                    key={index}
                    className="text-xs bg-gray-50 p-2 rounded border"
                    style={{ border: "1px inset #c0c0c0" }}>
                    <div className="font-medium text-gray-800 capitalize">
                      {change.field.replace(/([A-Z])/g, " $1").trim()}:
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1">
                        <span className="text-red-600 font-medium">From:</span>{" "}
                        <span className="text-gray-700">
                          {change.oldValue || "None"}
                        </span>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="flex-1">
                        <span className="text-green-600 font-medium">To:</span>{" "}
                        <span className="text-gray-700">
                          {change.newValue || "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {details.createdFields && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Created with:
            </div>
            <div
              className="text-xs bg-green-50 p-2 rounded border"
              style={{ border: "1px inset #c0c0c0" }}>
              {Object.entries(details.createdFields).map(
                ([key, value]: [string, any]) => (
                  <div key={key} className="mb-1">
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}:
                    </span>{" "}
                    <span>
                      {Array.isArray(value)
                        ? value.join(", ") || "None"
                        : value || "None"}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
        {details.deletedData && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Deleted data:
            </div>
            <div
              className="text-xs bg-red-50 p-2 rounded border"
              style={{ border: "1px inset #c0c0c0" }}>
              {Object.entries(details.deletedData).map(
                ([key, value]: [string, any]) => (
                  <div key={key} className="mb-1">
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}:
                    </span>{" "}
                    <span>
                      {Array.isArray(value)
                        ? value.join(", ") || "None"
                        : value || "None"}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
        {details.timestamp && (
          <div className="text-xs text-gray-500 mt-2">
            {new Date(details.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!formData.companyId) return;
    const selectedCompany = session?.user?.companies?.find(
      (c) => c.companyId === formData.companyId
    );
    if (selectedCompany) {
      const validLocationIds = formData.locationIds.filter((locId) =>
        selectedCompany.locations.some((loc) => loc.locationId === locId)
      );
      if (validLocationIds.length === 0 && selectedCompany.locations[0]) {
        validLocationIds.push(selectedCompany.locations[0].locationId);
      }
      setFormData((prev) => ({
        ...prev,
        locationIds: validLocationIds,
      }));
    }
  }, [formData.companyId]);

  const fetchUserData = async (userId: string) => {
    if (!userId) return;
    console.log("🔍 Fetching user data for:", userId);
    try {
      let newFormData: FormData = {
        employeeId: "",
        userId: userId,
        password: "",
        name: "",
        companyRoles: [],
        companyId: "",
        locationIds: [],
        moduleAccess: [],
      };
      const userRes = await fetch(`/api/user/${encodeURIComponent(userId)}`);
      const userData = await userRes.json();
      if (userRes.ok && userData.user) {
        const user = userData.user;
        newFormData = {
          ...newFormData,
          name: user.name || userId,
        };
      } else {
        setError(userData.error || "Failed to fetch user data");
      }
      const employeeRes = await fetch(
        `/api/admin/employees?userId=${encodeURIComponent(userId)}`
      );
      const employeeData = await employeeRes.json();
      console.log("📊 Employee data response:", employeeData);
      if (employeeRes.ok && employeeData.data) {
        const employee = employeeData.data;
        console.log("👤 Employee object:", employee);
        const employeeCompanyId =
          employee.companies && employee.companies.length > 0
            ? employee.companies[0].companyId
            : "";
        console.log(
          "🏢 Employee company ID from companies array:",
          employeeCompanyId
        );
        const employeeLocationIds =
          employee.companies && employee.companies.length > 0
            ? (employee.companies[0].locations || []).map(
                (loc: any) => loc.locationId
              )
            : [];
        console.log(
          "📍 Employee location IDs from companies array:",
          employeeLocationIds
        );
        // Validate companyRoles against availableRoles
        const validRoles =
          employee.companyRoles?.filter((role: string) =>
            availableRoles.some((r) => r.roleId === role)
          ) || [];
        newFormData = {
          ...newFormData,
          employeeId: employee.employeeId || uuidv4(),
          password: "",
          name: employee.name || newFormData.name,
          companyRoles: validRoles,
          companyId: employeeCompanyId,
          locationIds: employeeLocationIds,
          moduleAccess: employee.moduleAccess || [],
        };
        console.log("📋 New form data after employee fetch:", newFormData);
        const selectedCompany = session?.user?.companies?.find(
          (c) => c.companyId === employeeCompanyId
        );
        console.log("🏢 Selected company:", selectedCompany);
        if (selectedCompany) {
          let validLocationIds = newFormData.locationIds.filter((locId) =>
            selectedCompany.locations.some((loc) => loc.locationId === locId)
          );
          if (
            validLocationIds.length === 0 &&
            selectedCompany.locations.length > 0
          ) {
            validLocationIds = [selectedCompany.locations[0].locationId];
          }
          newFormData.locationIds = validLocationIds;
          console.log("📍 Valid location IDs:", validLocationIds);
        }
        const existingIndex = employees.findIndex(
          (emp) => emp.userId === userId
        );
        if (existingIndex !== -1) {
          setCurrentEmployeeIndex(existingIndex);
          const sortedIndex = sortedEmployees.findIndex(
            (emp) => emp.userId === userId
          );
          setCurrentSortedIndex(sortedIndex);
          setEmployees((prev) => {
            const newEmployees = [...prev];
            newEmployees[existingIndex] = {
              ...newEmployees[existingIndex],
              ...newFormData,
              locations: newFormData.locationIds
                .map((id) =>
                  session?.user?.companies
                    ?.flatMap((c) => c.locations)
                    .find((loc) => loc.locationId === id)
                )
                .filter((loc): loc is Location => loc !== undefined),
            };
            return newEmployees;
          });
        } else {
          setCurrentEmployeeIndex(-1);
          setCurrentSortedIndex(-1);
          setEmployees((prev) => [
            ...prev,
            {
              ...newFormData,
              locations: newFormData.locationIds
                .map((id) =>
                  session?.user?.companies
                    ?.flatMap((c) => c.locations)
                    .find((loc) => loc.locationId === id)
                )
                .filter((loc): loc is Location => loc !== undefined),
            },
          ]);
        }
      } else {
        console.log("❌ No employee data found, using fallback");
        newFormData = {
          ...newFormData,
          companyId: session?.user?.companies?.[0]?.companyId || "",
          locationIds:
            session?.user?.companies?.[0]?.locations?.map(
              (loc: Location) => loc.locationId
            ) || [],
        };
      }
      console.log("✅ Final form data before setState:", newFormData);
      setFormData(newFormData);
      setIsEditable(true);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to fetch user data");
      setFormData((prev) => ({
        ...prev,
        userId: userId,
        employeeId: prev.employeeId || uuidv4(),
        companyId: session?.user?.companies?.[0]?.companyId || "",
        locationIds:
          session?.user?.companies?.[0]?.locations?.map(
            (loc: Location) => loc.locationId
          ) || [],
      }));
      setIsEditable(true);
    }
  };

  const handleUserIdKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!formData.userId.trim()) {
          setError("User ID cannot be empty.");
          return;
        }
        fetchUserData(formData.userId);
        setIsEditable(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < userIdSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : userIdSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selectedUserId = userIdSuggestions[selectedSuggestionIndex];
          setFormData((prev) => ({ ...prev, userId: selectedUserId }));
          setShowSuggestions(false);
          fetchUserData(selectedUserId);
          setIsEditable(true);
        } else {
          fetchUserData(formData.userId);
          setShowSuggestions(false);
          setIsEditable(true);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSave = async () => {
    if (!isEditable) return;
    const form = document.querySelector("form");
    if (!form) {
      setError("Form not found");
      return;
    }

    // Refresh available roles before validation
    try {
      const rolesRes = await fetch("/api/admin/company-roles");
      const rolesData = await rolesRes.json();
      if (rolesRes.ok) {
        setAvailableRoles(rolesData.data || []);
      } else {
        setError(rolesData.error || "Failed to fetch roles");
        return;
      }
    } catch {
      setError("An error occurred while fetching roles");
      return;
    }

    // Validate company roles
    const validRoleIds = availableRoles.map((role) => role.roleId);
    const invalidRoles = formData.companyRoles.filter(
      (roleId) => !validRoleIds.includes(roleId)
    );
    if (invalidRoles.length > 0) {
      setError(`Invalid roles selected: ${invalidRoles.join(", ")}`);
      return;
    }

    setIsCreating(true);
    try {
      const method = currentEmployeeIndex >= 0 ? "PUT" : "POST";
      const newEmployeeId =
        currentEmployeeIndex >= 0 ? formData.employeeId : uuidv4();
      const updatedFormData = {
        ...formData,
        employeeId: newEmployeeId,
        userId: formData.userId || session?.user?.userId || "unknown-user",
        companyRoles: formData.companyRoles || [],
        locationIds: formData.locationIds || [],
      };
      if (!updatedFormData.employeeId || !updatedFormData.userId) {
        setError("Cannot save employee: Missing employeeId or userId");
        return;
      }
      setFormData(updatedFormData);
      const res = await fetch("/api/admin/create-employee", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFormData),
      });
      const data = await res.json();
      if (res.ok) {
        const isUpdate = currentEmployeeIndex >= 0;
        setMessage(
          isUpdate
            ? "Employee updated successfully!"
            : "Employee created successfully!"
        );
        const employeeData = {
          ...updatedFormData,
          locations:
            availableLocations.filter((loc) =>
              updatedFormData.locationIds.includes(loc.locationId)
            ) || [],
        };
        setEmployees((prev) => {
          const newEmployees = [...prev];
          if (isUpdate) {
            newEmployees[currentEmployeeIndex] = employeeData;
          } else {
            newEmployees.push(employeeData);
          }
          return newEmployees;
        });
        await logAudit(isUpdate ? "UPDATE" : "CREATE", {
          formData: updatedFormData,
          employeeId: updatedFormData.employeeId,
          userId: updatedFormData.userId,
          name: updatedFormData.name || "Unknown",
          ...data,
        });
        handleAddNew();
      } else {
        setError(data.error || "Failed to save employee");
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      setError("An error occurred while saving employee");
    } finally {
      setIsCreating(false);
    }
  };

  const detectChanges = (oldData: EmployeeRecord, newData: FormData) => {
    const changes: {
      field: string;
      oldValue: any;
      newValue: any;
      dataType: string;
    }[] = [];
    const normalizeValue = (value: any): any => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      return value;
    };
    const arraysEqual = (arr1: any[], arr2: any[]): boolean => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return JSON.stringify(sorted1) === JSON.stringify(sorted2);
    };
    const oldUserId = normalizeValue(oldData.userId);
    const newUserId = normalizeValue(newData.userId);
    if (oldUserId !== newUserId) {
      changes.push({
        field: "userId",
        oldValue: oldUserId || "None",
        newValue: newUserId || "None",
        dataType: "string",
      });
    }
    const oldName = normalizeValue(oldData.name);
    const newName = normalizeValue(newData.name);
    if (oldName !== newName) {
      changes.push({
        field: "name",
        oldValue: oldName || "None",
        newValue: newName || "None",
        dataType: "string",
      });
    }
    const oldCompanyId = normalizeValue(oldData.companyId);
    const newCompanyId = normalizeValue(newData.companyId);
    if (oldCompanyId !== newCompanyId) {
      const oldCompanyName = oldCompanyId
        ? companies.find((c) => c.companyId === oldCompanyId)?.name ||
          oldCompanyId
        : "None";
      const newCompanyName = newCompanyId
        ? companies.find((c) => c.companyId === newCompanyId)?.name ||
          newCompanyId
        : "None";
      if (oldCompanyName !== newCompanyName) {
        changes.push({
          field: "company",
          oldValue: oldCompanyName,
          newValue: newCompanyName,
          dataType: "string",
        });
      }
    }
    const oldRoles = (oldData.companyRoles || []).filter((role) => role);
    const newRoles = (newData.companyRoles || []).filter((role) => role);
    if (!arraysEqual(oldRoles, newRoles)) {
      const oldRoleNames =
        oldRoles.length > 0
          ? oldRoles.map(
              (roleId) =>
                availableRoles.find((r) => r.roleId === roleId)?.name || roleId
            )
          : ["None"];
      const newRoleNames =
        newRoles.length > 0
          ? newRoles.map(
              (roleId) =>
                availableRoles.find((r) => r.roleId === roleId)?.name || roleId
            )
          : ["None"];
      changes.push({
        field: "companyRoles",
        oldValue: oldRoleNames,
        newValue: newRoleNames,
        dataType: "array",
      });
    }
    const oldLocationIds = (oldData.locations || [])
      .map((loc) => loc?.locationId)
      .filter((id) => id);
    const newLocationIds = (newData.locationIds || []).filter((id) => id);
    if (!arraysEqual(oldLocationIds, newLocationIds)) {
      const oldLocationNames =
        oldLocationIds.length > 0
          ? oldLocationIds
              .map(
                (locId) =>
                  availableLocations.find((l) => l.locationId === locId)
                    ?.name || locId
              )
              .filter((name) => name)
          : ["None"];
      const newLocationNames =
        newLocationIds.length > 0
          ? newLocationIds
              .map(
                (locId) =>
                  availableLocations.find((l) => l.locationId === locId)
                    ?.name || locId
              )
              .filter((name) => name)
          : ["None"];
      if (!arraysEqual(oldLocationNames, newLocationNames)) {
        changes.push({
          field: "locations",
          oldValue: oldLocationNames,
          newValue: newLocationNames,
          dataType: "array",
        });
      }
    }
    const oldModules = (oldData.moduleAccess || [])
      .map((m) => m.moduleName)
      .filter((name) => name);
    const newModules = (newData.moduleAccess || [])
      .map((m) => m.moduleName)
      .filter((name) => name);
    if (!arraysEqual(oldModules, newModules)) {
      changes.push({
        field: "moduleAccess",
        oldValue: oldModules.length > 0 ? oldModules : ["None"],
        newValue: newModules.length > 0 ? newModules : ["None"],
        dataType: "array",
      });
    }
    return changes;
  };

  const handleClear = () => {
    setFormData({
      employeeId: "",
      userId: "",
      password: "",
      name: "",
      companyRoles: [],
      companyId: session?.user?.companies?.[0]?.companyId || "",
      locationIds: [],
      moduleAccess: [],
    });
    setError("");
    setMessage("");
    setIsEditable(false);
    setCurrentEmployeeIndex(-1);
    setCompanies(session?.user?.companies || []);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = async () => {
    if (sortedEmployees.length === 0) return;
    const wasDisabled = !isEditable;
    let newIndex;
    if (currentSortedIndex <= 0) {
      newIndex = sortedEmployees.length - 1;
    } else {
      newIndex = currentSortedIndex - 1;
    }
    const employee = sortedEmployees[newIndex];
    setCurrentSortedIndex(newIndex);
    const originalIndex = employees.findIndex(
      (emp) => emp.employeeId === employee.employeeId
    );
    setCurrentEmployeeIndex(originalIndex);
    await fetchUserData(employee.userId);
    if (wasDisabled) {
      setIsEditable(false);
    }
  };

  const handleDown = async () => {
    if (sortedEmployees.length === 0) return;
    const wasDisabled = !isEditable;
    let newIndex;
    if (currentSortedIndex >= sortedEmployees.length - 1) {
      newIndex = 0;
    } else {
      newIndex = currentSortedIndex + 1;
    }
    const employee = sortedEmployees[newIndex];
    setCurrentSortedIndex(newIndex);
    const originalIndex = employees.findIndex(
      (emp) => emp.employeeId === employee.employeeId
    );
    setCurrentEmployeeIndex(originalIndex);
    await fetchUserData(employee.userId);
    if (wasDisabled) {
      setIsEditable(false);
    }
  };

  const filterEmployees = (query: string) => {
    if (!query.trim()) {
      setFilteredEmployees(employees);
      setSelectedEmployeeIndex(-1);
      return;
    }
    const filtered = employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query.toLowerCase()) ||
        emp.userId.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEmployees(filtered);
    setSelectedEmployeeIndex(-1);
  };

  const handleSearch = () => {
    setFilteredEmployees(employees);
    setSelectedEmployeeIndex(-1);
    setSearchQuery("");
    setShowSearchModal(true);
  };

  const handleImplementQuery = async () => {
    if (
      selectedEmployeeIndex === -1 ||
      !filteredEmployees[selectedEmployeeIndex]
    ) {
      setError("Please select an employee from the list");
      return;
    }
    try {
      const selectedEmployee = filteredEmployees[selectedEmployeeIndex];
      await fetchUserData(selectedEmployee.userId);
      setShowSearchModal(false);
      setSearchQuery("");
      setSelectedEmployeeIndex(-1);
    } catch (error) {
      setError("Failed to load employee data");
    }
  };

  const handleEdit = () => {
    if (currentEmployeeIndex >= 0) {
      setIsEditable(true);
      if (userIdInputRef.current) {
        userIdInputRef.current.focus();
      }
    }
  };

  const handleDelete = async () => {
    if (currentEmployeeIndex < 0 || !employees[currentEmployeeIndex]) {
      setError("No employee selected for deletion");
      return;
    }
    const employee = employees[currentEmployeeIndex];
    if (!employee.employeeId || !employee.userId) {
      setError("Cannot delete: Employee data incomplete");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete employee ${employee.name} (${employee.userId})? This will also delete associated user and audit log records.`
      )
    ) {
      return;
    }
    try {
      setIsCreating(true);
      setError("");
      setMessage("");
      const res = await fetch(
        `/api/admin/delete-employee/${encodeURIComponent(employee.userId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) =>
          prev.filter((_, i) => i !== currentEmployeeIndex)
        );
        handleClear();
        setMessage("Employee, user, and audit logs deleted successfully!");
      } else {
        setError(data.error || "Failed to delete employee records");
      }
    } catch (error) {
      setError("An error occurred while deleting employee records");
    } finally {
      setIsCreating(false);
    }
  };

  const logAudit = async (
    action: "CREATE" | "UPDATE" | "DELETE",
    additionalData: Record<string, any> = {}
  ) => {
    try {
      console.log("=== LOGGING AUDIT ===");
      console.log("Action:", action);
      console.log("Additional data:", additionalData);
      console.log("Form data:", formData);
      if (!session?.user?.id) {
        console.error("No user session found");
        setError("Cannot log audit: No user session");
        return;
      }
      const performedBy = session.user.userId || "unknown-user";
      const performedByName =
        session.user.userId || session.user.userId || "Unknown User";
      let auditDetails: any = {
        performedBy: performedBy,
        performedByName: performedByName,
        timestamp: new Date().toISOString(),
      };
      let employeeIdToUse: string;
      let userIdToUse: string;
      switch (action) {
        case "CREATE":
          const createFormData = additionalData.formData || formData;
          console.log("CREATE audit - checking form data:", {
            hasAdditionalFormData: !!additionalData.formData,
            createFormData: createFormData,
            globalFormData: formData,
          });
          if (!createFormData.employeeId || !createFormData.userId) {
            console.error("Missing required fields for CREATE audit", {
              employeeId: createFormData.employeeId,
              userId: createFormData.userId,
              createFormData: createFormData,
            });
            if (additionalData.employeeId && additionalData.userId) {
              employeeIdToUse = additionalData.employeeId;
              userIdToUse = additionalData.userId;
              console.log("Using employeeId and userId from additionalData");
            } else {
              setError(
                "Cannot log audit: Missing employeeId or userId for creation"
              );
              return;
            }
          } else {
            employeeIdToUse = createFormData.employeeId;
            userIdToUse = createFormData.userId;
          }
          const companyName =
            createFormData.companyId && companies?.length > 0
              ? companies.find((c) => c.companyId === createFormData.companyId)
                  ?.name || createFormData.companyId
              : "None";
          const roleNames =
            createFormData.companyRoles?.length > 0 &&
            availableRoles?.length > 0
              ? createFormData.companyRoles.map(
                  (roleId: string) =>
                    availableRoles.find((r) => r.roleId === roleId)?.name ||
                    roleId
                )
              : ["None"];
          const locationNames =
            createFormData.locationIds?.length > 0 &&
            availableLocations?.length > 0
              ? createFormData.locationIds.map(
                  (locId: string) =>
                    availableLocations.find((l) => l.locationId === locId)
                      ?.name || locId
                )
              : ["None"];
          auditDetails = {
            ...auditDetails,
            message: `Employee record created by ${performedByName}`,
            employeeId: employeeIdToUse,
            userId: userIdToUse,
            name: createFormData.name || additionalData.name || "Unknown",
            createdFields: {
              company: companyName,
              roles: roleNames,
              locations: locationNames,
            },
            ...Object.fromEntries(
              Object.entries(additionalData).filter(
                ([key]) => key !== "message"
              )
            ),
          };
          break;
        case "UPDATE":
          if (
            currentEmployeeIndex < 0 ||
            !employees ||
            !employees[currentEmployeeIndex]
          ) {
            console.error("Invalid currentEmployeeIndex or no employee data", {
              currentEmployeeIndex,
              employeesLength: employees?.length || 0,
            });
            setError("Cannot log audit: No employee selected");
            return;
          }
          const originalEmployee = employees[currentEmployeeIndex];
          if (!originalEmployee.employeeId || !originalEmployee.userId) {
            console.error("Employee data missing required fields", {
              employeeId: originalEmployee.employeeId,
              userId: originalEmployee.userId,
            });
            setError("Cannot log audit: Employee data incomplete");
            return;
          }
          employeeIdToUse = originalEmployee.employeeId;
          userIdToUse = originalEmployee.userId;
          let changes = [];
          try {
            changes = detectChanges(originalEmployee, formData);
          } catch (detectError) {
            console.error("Error detecting changes:", detectError);
            changes = [
              { field: "unknown", oldValue: "unknown", newValue: "unknown" },
            ];
          }
          if (changes.length === 0) {
            console.log("No changes detected, skipping audit log");
            return;
          }
          auditDetails = {
            ...auditDetails,
            message: `Employee record updated by ${performedByName} - ${changes.length} field(s) changed`,
            changes: changes,
            employeeId: originalEmployee.employeeId,
            userId: originalEmployee.userId,
            name: originalEmployee.name || "Unknown",
            changedFields: changes.map((change) => change.field),
            ...Object.fromEntries(
              Object.entries(additionalData).filter(
                ([key]) => key !== "message"
              )
            ),
          };
          break;
        case "DELETE":
          if (
            currentEmployeeIndex < 0 ||
            !employees ||
            !employees[currentEmployeeIndex]
          ) {
            console.error("Invalid currentEmployeeIndex or no employee data", {
              currentEmployeeIndex,
              employeesLength: employees?.length || 0,
            });
            setError("Cannot log audit: No employee selected");
            return;
          }
          const deletedEmployee = employees[currentEmployeeIndex];
          if (!deletedEmployee.employeeId || !deletedEmployee.userId) {
            console.error("Employee data missing required fields", {
              employeeId: deletedEmployee.employeeId,
              userId: deletedEmployee.userId,
            });
            setError("Cannot log audit: Employee data incomplete");
            return;
          }
          employeeIdToUse = deletedEmployee.employeeId;
          userIdToUse = deletedEmployee.userId;
          const deletedCompanyName =
            deletedEmployee.companyId && companies?.length > 0
              ? companies.find((c) => c.companyId === deletedEmployee.companyId)
                  ?.name || deletedEmployee.companyId
              : "None";
          const deletedRoleNames =
            deletedEmployee.companyRoles?.length > 0 &&
            availableRoles?.length > 0
              ? deletedEmployee.companyRoles.map(
                  (roleId) =>
                    availableRoles.find((r) => r.roleId === roleId)?.name ||
                    roleId
                )
              : ["None"];
          const deletedLocationNames =
            deletedEmployee.locations?.length > 0
              ? deletedEmployee.locations.map((loc) => loc.name)
              : ["None"];
          auditDetails = {
            ...auditDetails,
            message: `Employee record deleted by ${performedByName}`,
            deletedEmployeeId: deletedEmployee.employeeId,
            deletedUserId: deletedEmployee.userId,
            name: deletedEmployee.name,
            deletedData: {
              company: deletedCompanyName,
              roles: deletedRoleNames,
              locations: deletedLocationNames,
            },
            ...Object.fromEntries(
              Object.entries(additionalData).filter(
                ([key]) => key !== "message"
              )
            ),
          };
          break;
      }
      const requestBody = {
        action,
        employeeId: employeeIdToUse,
        userId: userIdToUse,
        details: auditDetails,
      };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch("/api/admin/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log("Audit log response status:", res.status);
        if (res.ok) {
          const responseData = await res.json();
          console.log("Audit log response data:", responseData);
        } else {
          let errorData;
          try {
            errorData = await res.json();
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
            errorData = { error: "Failed to parse error response" };
          }
          console.error("Failed to log audit:", {
            status: res.status,
            statusText: res.statusText,
            error: errorData.error || "No error message provided",
            details: errorData.details || "No additional details",
          });
          setError(errorData.error || "Failed to log audit");
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          console.error("Audit log request timed out");
          setError("Audit log request timed out");
        } else {
          console.error("Network error during audit log:", fetchError);
          setError("Network error during audit log");
        }
        return;
      }
      console.log("=== END AUDIT LOG ===");
    } catch (error) {
      console.error("Error logging audit:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error,
        errorType: Object.prototype.toString.call(error),
        errorConstructor: error?.constructor?.name,
      });
      if (error && typeof error === "object") {
        console.error("Error object keys:", Object.keys(error));
        console.error("Error object:", error);
      }
      setError("An error occurred while logging audit");
    }
  };

  const handleAudit = async () => {
    if (currentEmployeeIndex >= 0) {
      try {
        const searchValue = employees[currentEmployeeIndex].employeeId;
        console.log("Fetching audit logs for employeeId:", searchValue);
        const res = await fetch(
          `/api/admin/audit?employeeId=${encodeURIComponent(searchValue)}`
        );
        console.log("Response status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("Response data:", data);
          const logs = Array.isArray(data) ? data : data.data || [];
          const normalizedLogs = logs.map((log: any) => ({
            action: log.action,
            timestamp: log.timestamp || new Date().toISOString(),
            userId: log.userId || log.details?.performedBy || "unknown-user",
            details: {
              ...log.details,
              performedBy:
                log.details?.performedBy || log.userId || "unknown-user",
              performedByName:
                log.details?.performedByName || log.userId || "Unknown User",
              message: log.details?.message || "",
              changes: log.details?.changes || [],
              employeeId: log.details?.employeeId || log.employeeId,
              userId: log.details?.userId || log.userId,
              name: log.details?.name || "Unknown",
            },
          }));
          console.log("Processed logs:", normalizedLogs);
          setAuditLogs(normalizedLogs);
          setFilteredAuditLogs(normalizedLogs);
          setShowAuditModal(true);
          setCurrentPage(1);
          setSearchQuery("");
          setFilterAction("");
          setFilterDateRange("");
        } else {
          const errorData = await res.json();
          console.error("Error response:", errorData);
          setError(errorData.error || "Failed to load audit logs");
        }
      } catch (err) {
        console.error("Error fetching audit logs:", err);
        setError("An error occurred while loading audit logs.");
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Employee Details</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; font-size: 18px; }
              .details { margin: 20px 0; }
              .details div { margin: 8px 0; font-size: 14px; }
              strong { font-weight: 600; }
            </style>
          </head>
          <body>
            <h1>Employee Details</h1>
            <div class="details">
              <div><strong>User ID:</strong> ${formData.userId}</div>
              <div><strong>Name:</strong> ${formData.name}</div>
              <div><strong>Company:</strong> ${
                companies.find((c) => c.companyId === formData.companyId)
                  ?.name || ""
              }</div>
              <div><strong>Roles:</strong> ${formData.companyRoles
                .map((r) => availableRoles.find((ar) => ar.roleId === r)?.name)
                .join(", ")}</div>
              <div><strong>Locations:</strong> ${formData.locationIds
                .map(
                  (l) =>
                    availableLocations.find((al) => al.locationId === l)?.name
                )
                .join(", ")}</div>
              <div><strong>Modules:</strong> ${formData.moduleAccess
                .map((m) => m.moduleName)
                .join(", ")}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  const getAllModules = (
    items: NavItem[],
    userRole: string
  ): { path: string; label: string }[] => {
    const modules: { path: string; label: string }[] = [];
    const traverse = (item: NavItem) => {
      if (
        item.path &&
        typeof item.path === "string" &&
        item.path.trim() !== "" &&
        typeof item.label === "string" &&
        (!item.roles ||
          item.roles.includes(userRole as "super_admin" | "admin" | "employee"))
      ) {
        modules.push({ path: item.path, label: item.label });
      }
      if (item.children && item.children.length > 0) {
        item.children.forEach(traverse);
      }
    };
    items.forEach(traverse);
    return modules;
  };

  const availableModules = () => {
    const userRole = session?.user?.role || "employee";
    return getAllModules(adminEmployeeNavData, userRole).filter(
      (item): item is { path: string; label: string } =>
        typeof item.path === "string" &&
        item.path.trim() !== "" &&
        typeof item.label === "string"
    );
  };

  const availableLocations =
    session?.user?.companies?.find(
      (c: Company) => c.companyId === formData.companyId
    )?.locations || [];

  const toggleRole = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      companyRoles: prev.companyRoles.includes(roleId)
        ? prev.companyRoles.filter((id) => id !== roleId)
        : [...prev.companyRoles, roleId],
    }));
  };

  const toggleLocation = (locationId: string) => {
    setFormData((prev) => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter((id) => id !== locationId)
        : [...prev.locationIds, locationId],
    }));
  };

  const toggleModule = (modulePath: string, moduleName: string) => {
    setFormData((prev) => ({
      ...prev,
      moduleAccess: prev.moduleAccess.some((m) => m.modulePath === modulePath)
        ? prev.moduleAccess.filter((m) => m.modulePath !== modulePath)
        : [
            ...prev.moduleAccess,
            { modulePath, moduleName, permissions: ["read"] },
          ],
    }));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (filteredEmployees.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedEmployeeIndex((prev) =>
          prev < filteredEmployees.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedEmployeeIndex((prev) =>
          prev > 0 ? prev - 1 : filteredEmployees.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedEmployeeIndex >= 0) {
          handleImplementQuery();
        }
        break;
      case "Escape":
        setShowSearchModal(false);
        setSearchQuery("");
        setSelectedEmployeeIndex(-1);
        break;
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <div
        className="min-h-screen flex"
        style={{
          background: "linear-gradient(135deg, #f0f0f0 0%, #d8d8d8 100%)",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}>
        {/* Left Sidebar for Toolbar */}
        <div
          style={{
            borderRight: "2px outset #c0c0c0",
            background: "linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%)",
          }}>
          <WindowsToolbar
            modulePath="/dashboard/admin/employees"
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
        </div>

        {/* Main Content */}
        <div
          className="flex justify-between items-center w-full pl-16"
          style={{
            background:
              "linear-gradient(180deg, #e4f2ff 0%, #d1e7fe 50%, #b6d6ff 100%)",
            fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
          }}>
          <div className="flex-1 p-6">
            <div
              className="w-full shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] rounded-lg"
              style={{
                background:
                  "linear-gradient(to bottom, #f5f6f5 0%, #e0e1e0 100%)",
                border: "2px solid #8c8c8c",
              }}>
              {/* Tabbed Header */}
              <div
                className="border-b-2 border-[#8c8c8c] bg-gradient-to-r from-[#c6d8f0] to-[#ffffff] px-4 py-2 flex items-center"
                style={{
                  boxShadow:
                    "inset 1px 1px 0px #ffffff, inset -1px -1px 0px #8c8c8c",
                }}>
                <h2 className="text-lg font-bold text-[#003087]">
                  Employee Management
                </h2>
              </div>

              {/* Form */}
              <form onSubmit={(e) => e.preventDefault()} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* General Information */}
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-sm font-bold text-[#003087] mb-1">
                        User ID *
                      </label>
                      <input
                        type="text"
                        ref={userIdInputRef}
                        required
                        disabled={!isEditable}
                        className="w-full px-3 py-2 text-sm border bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#0052cc] disabled:bg-[#d8d8d8]"
                        style={{
                          border: "2px solid #8c8c8c",
                          boxShadow:
                            "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff",
                        }}
                        value={formData.userId}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, userId: value });
                          fetchUserIdSuggestions(value);
                        }}
                        onKeyDown={handleUserIdKeyDown}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowSuggestions(false);
                            setSelectedSuggestionIndex(-1);
                          }, 200);
                        }}
                        autoComplete="off"
                      />
                      {showSuggestions && userIdSuggestions.length > 0 && (
                        <div
                          className="absolute z-10 w-full bg-[#f5f6f5] shadow-[inset_2px_2px_0px_#ffffff,inset_-2px_-2px_0px_#4b5563] max-h-48 overflow-y-auto rounded"
                          style={{
                            border: "2px solid #8c8c8c",
                            top: "100%",
                            marginTop: "4px",
                          }}>
                          {userIdSuggestions.map((suggestion, index) => (
                            <div
                              key={suggestion}
                              className={`px-3 py-2 cursor-pointer text-sm ${
                                index === selectedSuggestionIndex
                                  ? "bg-[#0052cc] text-white"
                                  : "hover:bg-[#c6d8f0]"
                              }`}
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  userId: suggestion,
                                }));
                                setShowSuggestions(false);
                                fetchUserData(suggestion);
                              }}>
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!isEditable}
                        minLength={6}
                        className="w-full px-3 py-2 text-sm border bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#0052cc] disabled:bg-[#d8d8d8]"
                        style={{
                          border: "2px solid #8c8c8c",
                          boxShadow:
                            "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff",
                        }}
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        disabled={!isEditable}
                        minLength={6}
                        className="w-full px-3 py-2 text-sm border bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#0052cc] disabled:bg-[#d8d8d8]"
                        style={{
                          border: "2px solid #8c8c8c",
                          boxShadow:
                            "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff",
                        }}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#003087] mb-1">
                        Company *
                      </label>
                      <select
                        required
                        disabled={!isEditable}
                        className="w-full px-3 py-2 text-sm border bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#0052cc] disabled:bg-[#d8d8d8]"
                        style={{
                          border: "2px solid #8c8c8c",
                          boxShadow:
                            "inset 2px 2px 0px #4b5563, inset -2px -2px 0px #ffffff",
                        }}
                        value={formData.companyId}
                        onChange={(e) => {
                          const newCompanyId = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            companyId: newCompanyId,
                            locationIds:
                              session?.user?.companies
                                ?.find((c) => c.companyId === newCompanyId)
                                ?.locations?.map(
                                  (loc: Location) => loc.locationId
                                ) || [],
                          }));
                        }}>
                        <option value="" disabled>
                          Select a company
                        </option>
                        {companies.map((company) => (
                          <option
                            key={company.companyId}
                            value={company.companyId}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="space-y-4">
                    <div
                      className="p-4 rounded"
                      style={{
                        border: "2px solid #8c8c8c",
                        background:
                          "linear-gradient(to bottom, #f5f6f5 0%, #e0e1e0 100%)",
                        boxShadow:
                          "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                      }}>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Company Roles
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableRoles.map((role) => (
                          <div key={role.roleId} className="flex items-center">
                            <input
                              type="checkbox"
                              id={role.roleId}
                              disabled={!isEditable}
                              checked={formData.companyRoles.includes(
                                role.roleId
                              )}
                              onChange={() => toggleRole(role.roleId)}
                              className="h-4 w-4 text-[#0052cc] border-[#8c8c8c] rounded focus:ring-[#0052cc] disabled:opacity-50"
                              style={{ border: "2px solid #8c8c8c" }}
                            />
                            <label
                              htmlFor={role.roleId}
                              className="ml-2 text-sm text-[#003087]">
                              {role.name}{" "}
                              {role.description && (
                                <span className="text-gray-500">
                                  ({role.description})
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Locations and Modules */}
                  <div className="space-y-4">
                    <div
                      className="p-4 rounded"
                      style={{
                        border: "2px solid #8c8c8c",
                        background:
                          "linear-gradient(to bottom, #f5f6f5 0%, #e0e1e0 100%)",
                        boxShadow:
                          "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                      }}>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Locations
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableLocations.map((loc) => (
                          <div
                            key={loc.locationId}
                            className="flex items-center">
                            <input
                              type="checkbox"
                              id={loc.locationId}
                              disabled={!isEditable}
                              checked={formData.locationIds.includes(
                                loc.locationId
                              )}
                              onChange={() => toggleLocation(loc.locationId)}
                              className="h-4 w-4 text-[#0052cc] border-[#8c8c8c] rounded focus:ring-[#0052cc] disabled:opacity-50"
                              style={{ border: "2px solid #8c8c8c" }}
                            />
                            <label
                              htmlFor={loc.locationId}
                              className="ml-2 text-sm text-[#003087]">
                              {loc.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div
                      className="p-4 rounded"
                      style={{
                        border: "2px solid #8c8c8c",
                        background:
                          "linear-gradient(to bottom, #f5f6f5 0%, #e0e1e0 100%)",
                        boxShadow:
                          "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                      }}>
                      <label className="block text-sm font-bold text-[#003087] mb-3">
                        Module Access
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableModules().map((mod, id) => (
                          <div key={id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={mod.path}
                              disabled={!isEditable}
                              checked={formData.moduleAccess.some(
                                (m) => m.modulePath === mod.path
                              )}
                              onChange={() => toggleModule(mod.path, mod.label)}
                              className="h-4 w-4 text-[#0052cc] border-[#8c8c8c] rounded focus:ring-[#0052cc] disabled:opacity-50"
                              style={{ border: "2px solid #8c8c8c" }}
                            />
                            <label
                              htmlFor={mod.path}
                              className="ml-2 text-sm text-[#003087]">
                              {mod.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Messages */}
                <div className="mt-6 space-y-2">
                  {error && (
                    <div
                      className="p-3 text-sm text-[#a40000] rounded"
                      style={{
                        background:
                          "linear-gradient(to bottom, #ffe6e6 0%, #ffd1d1 100%)",
                        border: "2px solid #8c8c8c",
                        boxShadow:
                          "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                      }}>
                      {error}
                    </div>
                  )}
                  {message && (
                    <div
                      className="p-3 text-sm text-[#006600] rounded"
                      style={{
                        background:
                          "linear-gradient(to bottom, #e6ffe6 0%, #d1ffd1 100%)",
                        border: "2px solid #8c8c8c",
                        boxShadow:
                          "inset 2px 2px 0px #ffffff, inset -2px -2px 0px #4b5563",
                      }}>
                      {message}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div
              className="bg-white w-full max-w-4xl max-h-[80vh] overflow-hidden"
              style={{
                border: "2px outset #c0c0c0",
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              }}>
              <div
                className="px-4 py-2 flex justify-between items-center"
                style={{
                  background:
                    "linear-gradient(to bottom, #000080 0%, #1084d0 100%)",
                  borderBottom: "2px outset #c0c0c0",
                  color: "white",
                }}>
                <span className="text-sm font-medium">Search Employees</span>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery("");
                    setSelectedEmployeeIndex(-1);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-sm"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "2px outset #c0c0c0",
                  }}>
                  ×
                </button>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by name or user ID..."
                    className="w-full px-3 py-2 text-sm border"
                    style={{
                      border: "2px inset #c0c0c0",
                      background: "#ffffff",
                    }}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      filterEmployees(e.target.value);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    autoFocus
                  />
                </div>
                <div
                  className="mb-4 max-h-96 overflow-y-auto"
                  style={{ border: "2px inset #c0c0c0" }}>
                  <table className="w-full text-sm">
                    <thead
                      style={{
                        background:
                          "linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%)",
                        position: "sticky",
                        top: 0,
                      }}>
                      <tr>
                        <th className="text-left p-2 border-b border-gray-400">
                          User ID
                        </th>
                        <th className="text-left p-2 border-b border-gray-400">
                          Name
                        </th>
                        <th className="text-left p-2 border-b border-gray-400">
                          Roles
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="text-center p-4 text-gray-500">
                            {searchQuery
                              ? "No employees found matching your search"
                              : "No employees available"}
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((employee, index) => (
                          <tr
                            key={employee.employeeId}
                            className={`border-b border-gray-300 hover:bg-blue-50 cursor-pointer ${
                              selectedEmployeeIndex === index
                                ? "bg-blue-200"
                                : ""
                            }`}
                            onClick={() => setSelectedEmployeeIndex(index)}>
                            <td className="p-2 font-mono">{employee.userId}</td>
                            <td className="p-2">{employee.name}</td>
                            <td className="p-2">
                              {employee.companyRoles
                                .map((roleId) => {
                                  const role = availableRoles.find(
                                    (r) => r.roleId === roleId
                                  );
                                  return role?.name;
                                })
                                .filter(Boolean)
                                .join(", ") || "None"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {selectedEmployeeIndex >= 0 &&
                  filteredEmployees[selectedEmployeeIndex] && (
                    <div
                      className="mb-4 p-3"
                      style={{
                        border: "2px inset #c0c0c0",
                        background:
                          "linear-gradient(to bottom, #e6f3ff 0%, #cce9ff 100%)",
                      }}>
                      <h3 className="font-semibold text-sm mb-2">
                        Selected Employee:
                      </h3>
                      <p className="text-sm">
                        <strong>User ID:</strong>{" "}
                        {filteredEmployees[selectedEmployeeIndex].userId} |
                        <strong> Name:</strong>{" "}
                        {filteredEmployees[selectedEmployeeIndex].name}
                      </p>
                    </div>
                  )}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleImplementQuery}
                    disabled={selectedEmployeeIndex === -1}
                    className={`px-4 py-2 text-sm ${
                      selectedEmployeeIndex === -1
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    style={{
                      background:
                        "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                      border: "2px outset #c0c0c0",
                    }}>
                    Select Employee
                  </button>
                  <button
                    onClick={() => {
                      setShowSearchModal(false);
                      setSearchQuery("");
                      setSelectedEmployeeIndex(-1);
                    }}
                    className="px-4 py-2 text-sm"
                    style={{
                      background:
                        "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                      border: "2px outset #c0c0c0",
                    }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Audit Log Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div
              className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden"
              style={{
                border: "2px outset #c0c0c0",
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              }}>
              <div
                className="px-4 py-2 flex justify-between items-center"
                style={{
                  background:
                    "linear-gradient(to bottom, #000080 0%, #1084d0 100%)",
                  borderBottom: "2px outset #c0c0c0",
                  color: "white",
                }}>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">Audit Log</span>
                  {currentEmployeeIndex >= 0 && (
                    <span className="text-sm">
                      Employee: {employees[currentEmployeeIndex].name} (
                      {employees[currentEmployeeIndex].userId})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowAuditModal(false);
                    setSearchQuery("");
                    setFilterAction("");
                    setFilterDateRange("");
                    setFilteredAuditLogs(auditLogs);
                    setCurrentPage(1);
                  }}
                  className="w-6 h-6 flex items-center justify-center text-sm"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "2px outset #c0c0c0",
                  }}>
                  ❌
                </button>
              </div>
              <div
                className="p-4 overflow-y-auto"
                style={{ maxHeight: "calc(90vh - 100px)" }}>
                <div
                  className="mb-6 p-4"
                  style={{
                    border: "2px inset #c0c0c0",
                    background:
                      "linear-gradient(to bottom, #f8f8f8 0%, #f0f0f0 100%)",
                  }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Logs
                      </label>
                      <input
                        type="text"
                        placeholder="Search by action, user ID, or details..."
                        className="w-full px-3 py-2 text-sm border"
                        style={{
                          border: "2px inset #c0c0c0",
                          background: "#ffffff",
                        }}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          filterAuditLogs(
                            e.target.value,
                            filterAction,
                            filterDateRange
                          );
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Filter by Action
                      </label>
                      <select
                        className="w-full px-3 py-2 text-sm border"
                        style={{
                          border: "2px inset #c0c0c0",
                          background: "#ffffff",
                        }}
                        value={filterAction}
                        onChange={(e) => {
                          setFilterAction(e.target.value);
                          filterAuditLogs(
                            searchQuery,
                            e.target.value,
                            filterDateRange
                          );
                        }}>
                        <option value="">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Filter by Date Range
                      </label>
                      <select
                        className="w-full px-3 py-2 text-sm border"
                        style={{
                          border: "2px inset #c0c0c0",
                          background: "#ffffff",
                        }}
                        value={filterDateRange}
                        onChange={(e) => {
                          setFilterDateRange(e.target.value);
                          filterAuditLogs(
                            searchQuery,
                            filterAction,
                            e.target.value
                          );
                        }}>
                        <option value="">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="year">Last Year</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div
                  className="overflow-x-auto"
                  style={{ border: "2px inset #c0c0c0" }}>
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr
                        style={{
                          background:
                            "linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%)",
                        }}>
                        <th className="p-3 text-left border-r border-gray-400 w-20">
                          Action
                        </th>
                        <th className="p-3 text-left border-r border-gray-400 w-40">
                          Timestamp
                        </th>
                        <th className="p-3 text-left border-r border-gray-400 w-24">
                          User
                        </th>
                        <th className="p-3 text-left">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-6 text-center text-gray-500">
                            No audit logs found for this employee
                          </td>
                        </tr>
                      ) : (
                        currentLogs.map((log, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-300 hover:bg-blue-50">
                            <td className="p-3 border-r border-gray-300">
                              {log.action}
                            </td>
                            <td className="p-3 border-r border-gray-300">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3 border-r border-gray-300">
                              {log.details.performedByName || log.userId}
                            </td>
                            <td className="p-3">
                              {renderAuditDetails(log.details)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 px-4">
                    <div className="text-sm text-gray-600">
                      Showing {indexOfFirstLog + 1} to{" "}
                      {Math.min(indexOfLastLog, filteredAuditLogs.length)} of{" "}
                      {filteredAuditLogs.length} logs
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className={`px-3 py-1 text-sm ${
                          currentPage === 1
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        style={{
                          background:
                            "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                          border: "2px outset #c0c0c0",
                        }}>
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 text-sm ${
                          currentPage === totalPages
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        style={{
                          background:
                            "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                          border: "2px outset #c0c0c0",
                        }}>
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Modal and any other modals can go here */}
      </div>
    </ProtectedRoute>
  );
}
