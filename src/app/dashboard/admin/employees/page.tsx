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
  userId: string; // This is the performedBy field (user who made the change)
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
    [key: string]: any; // Index signature for additional properties
  };
}

// Types
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

interface UserData {
  userId: string;
  companies: Company[];
  role?: string;
  email?: string;
}

interface EmployeeRecord {
  employeeId: string;
  userId: string;
  name: string;
  companyRoles: string[];
  companyId: string;
  locations: Location[]; // Explicitly define as an array
  moduleAccess: {
    modulePath: string;
    moduleName: string;
    permissions: string[];
  }[];
}

interface AuditLog {
  action: string;
  timestamp: string;
  userId: string; // This is the performedBy field (user who made the change)
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

    // Apply search query
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

    // Apply action filter
    if (action) {
      filtered = filtered.filter((log) => log.action === action);
    }

    // Apply date range filter
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
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Calculate pagination values
  const totalPages = Math.ceil(filteredAuditLogs.length / logsPerPage);
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredAuditLogs.slice(indexOfFirstLog, indexOfLastLog);

  useEffect(() => {
    const sorted = [...employees].sort((a, b) =>
      a.userId.localeCompare(b.userId)
    );
    setSortedEmployees(sorted);

    // Update current sorted index if we have a current employee
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
          setAvailableRoles(rolesData.data || []);
        } else {
          setError(rolesData.error || "Failed to fetch roles");
        }

        if (employeesRes.ok) {
          setEmployees(employeesData.data || []);
        } else {
          setError(employeesData.error || "Failed to fetch employees");
        }
      } catch {
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

    // Focus on userId field
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
        // Extract userIds from the response
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
        {/* Message */}
        {details.message && (
          <div className="text-sm font-medium text-gray-900">
            {details.message}
          </div>
        )}

        {/* Performed By */}
        {details.performedBy && (
          <div className="text-xs text-gray-600">
            <span className="font-medium">Performed by:</span>{" "}
            {details.performedByName || details.performedBy}
          </div>
        )}

        {/* Changes for UPDATE actions - Only show if there are actual changes */}
        {details.changes && details.changes.length > 0 && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Changes ({details.changes.length} field
              {details.changes.length > 1 ? "s" : ""}):
            </div>
            <div className="space-y-1">
              {details.changes.map((change: any, index: number) => {
                // Only render if values are actually different
                if (change.oldValue === change.newValue) {
                  return null;
                }

                return (
                  <div
                    key={index}
                    className="text-xs bg-gray-50 p-2 rounded border"
                  >
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

        {/* Created Fields for CREATE actions */}
        {details.createdFields && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Created with:
            </div>
            <div className="text-xs bg-green-50 p-2 rounded border">
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

        {/* Deleted Data for DELETE actions */}
        {details.deletedData && (
          <div className="mt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">
              Deleted data:
            </div>
            <div className="text-xs bg-red-50 p-2 rounded border">
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

        {/* Timestamp */}
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

      // Fetch user data
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

      // Fetch employee data
      const employeeRes = await fetch(
        `/api/admin/employees?userId=${encodeURIComponent(userId)}`
      );
      const employeeData = await employeeRes.json();

      console.log("📊 Employee data response:", employeeData);

      if (employeeRes.ok && employeeData.data) {
        const employee = employeeData.data;

        console.log("👤 Employee object:", employee);

        // Extract companyId from companies array (take the first company)
        const employeeCompanyId =
          employee.companies && employee.companies.length > 0
            ? employee.companies[0].companyId
            : "";

        console.log(
          "🏢 Employee company ID from companies array:",
          employeeCompanyId
        );

        // Extract locationIds from the first company's locations
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

        newFormData = {
          ...newFormData,
          employeeId: employee.employeeId || uuidv4(),
          password: "",
          name: employee.name || newFormData.name,
          companyRoles:
            employee.companyRoles?.map((role: any) =>
              typeof role === "object" ? role.roleId : role
            ) || [],
          companyId: employeeCompanyId,
          locationIds: employeeLocationIds,
          moduleAccess: employee.moduleAccess || [],
        };

        console.log("📋 New form data after employee fetch:", newFormData);

        // Validate and fix locationIds based on the selected company
        const selectedCompany = session?.user?.companies?.find(
          (c) => c.companyId === employeeCompanyId
        );

        console.log("🏢 Selected company:", selectedCompany);

        if (selectedCompany) {
          // Filter locationIds to only include locations that exist in the selected company
          let validLocationIds = newFormData.locationIds.filter((locId) =>
            selectedCompany.locations.some((loc) => loc.locationId === locId)
          );

          // If no valid locations found, use the first location of the company
          if (
            validLocationIds.length === 0 &&
            selectedCompany.locations.length > 0
          ) {
            validLocationIds = [selectedCompany.locations[0].locationId];
          }

          newFormData.locationIds = validLocationIds;
          console.log("📍 Valid location IDs:", validLocationIds);
        }

        // Update employees array
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
        // Fallback only if no employee data found
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

      // Set form data once with all the correct values
      setFormData(newFormData);
      setIsEditable(true);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to fetch user data");

      // Fallback form data on error
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

    setIsCreating(true);
    try {
      const method = currentEmployeeIndex >= 0 ? "PUT" : "POST";
      const newEmployeeId =
        currentEmployeeIndex >= 0 ? formData.employeeId : uuidv4();

      // Ensure userId is set
      const updatedFormData = {
        ...formData,
        employeeId: newEmployeeId,
        userId: formData.userId || session?.user?.userId || "unknown-user",
        companyRoles: formData.companyRoles || [],
        locationIds: formData.locationIds || [],
      };

      // Validate required fields before proceeding
      if (!updatedFormData.employeeId || !updatedFormData.userId) {
        console.error("Missing required fields in updatedFormData:", {
          employeeId: updatedFormData.employeeId,
          userId: updatedFormData.userId,
        });
        setError("Cannot save employee: Missing employeeId or userId");
        return;
      }

      console.log("updatedFormData before API call:", updatedFormData);

      // Update formData state
      setFormData(updatedFormData);

      // Make API call to save employee
      const res = await fetch("/api/admin/create-employee", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFormData),
      });

      const data = await res.json();
      console.log("API response data:", data);

      if (res.ok) {
        const isUpdate = currentEmployeeIndex >= 0;
        setMessage(
          isUpdate
            ? "Employee updated successfully!"
            : "Employee created successfully!"
        );

        // Update employees state
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

        // Log audit with validated data
        await logAudit(isUpdate ? "UPDATE" : "CREATE", {
          formData: updatedFormData,
          employeeId: updatedFormData.employeeId,
          userId: updatedFormData.userId,
          name: updatedFormData.name || "Unknown",
          ...data,
        });

        // Reset form after audit logging
        handleAddNew();
      } else {
        setError(data.error || "Failed to save employee");
      }
    } catch (error) {
      console.error("Error in handleSave:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
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

    // Helper function to normalize values (handle null, undefined, empty string consistently)
    const normalizeValue = (value: any): any => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      return value;
    };

    // Helper function for deep array comparison
    const arraysEqual = (arr1: any[], arr2: any[]): boolean => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return JSON.stringify(sorted1) === JSON.stringify(sorted2);
    };

    // Check userId
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

    // Check name
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

    // Check company ID with proper comparison
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

      // Only log if there's an actual change in company names
      if (oldCompanyName !== newCompanyName) {
        changes.push({
          field: "company",
          oldValue: oldCompanyName,
          newValue: newCompanyName,
          dataType: "string",
        });
      }
    }

    // Check company roles with proper array comparison
    const oldRoles = (oldData.companyRoles || []).filter((role) => role); // Remove falsy values
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

    // Check locations with proper comparison
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

    // Check module access
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

    let newIndex;
    if (currentSortedIndex <= 0) {
      newIndex = sortedEmployees.length - 1; // Wrap to last employee
    } else {
      newIndex = currentSortedIndex - 1;
    }

    const employee = sortedEmployees[newIndex];
    setCurrentSortedIndex(newIndex);

    // Find the original index in the unsorted array
    const originalIndex = employees.findIndex(
      (emp) => emp.employeeId === employee.employeeId
    );
    setCurrentEmployeeIndex(originalIndex);

    // Fetch and populate the form with employee data
    await fetchUserData(employee.userId);
  };

  const handleDown = async () => {
    if (sortedEmployees.length === 0) return;

    let newIndex;
    if (currentSortedIndex >= sortedEmployees.length - 1) {
      newIndex = 0; // Wrap to first employee
    } else {
      newIndex = currentSortedIndex + 1;
    }

    const employee = sortedEmployees[newIndex];
    setCurrentSortedIndex(newIndex);

    // Find the original index in the unsorted array
    const originalIndex = employees.findIndex(
      (emp) => emp.employeeId === employee.employeeId
    );
    setCurrentEmployeeIndex(originalIndex);

    // Fetch and populate the form with employee data
    await fetchUserData(employee.userId);
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
    setSelectedEmployeeIndex(-1); // Reset selection when filtering
  };

  const handleSearch = () => {
    setFilteredEmployees(employees); // Show all employees initially
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
      // Populate the form with selected employee data
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

    // Confirm deletion
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

      // Check if session exists first
      if (!session?.user?.id) {
        console.error("No user session found");
        setError("Cannot log audit: No user session");
        return;
      }

      // Get the performedBy information from session
      const performedBy = session.user.userId || "unknown-user";
      // Use name from session if available, otherwise use userId
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

      console.log("Request body being sent:", requestBody);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        const searchValue = employees[currentEmployeeIndex].employeeId; // Use employeeId for audit query
        console.log("Fetching audit logs for employeeId:", searchValue);

        const res = await fetch(
          `/api/admin/audit?employeeId=${encodeURIComponent(searchValue)}`
        );
        console.log("Response status:", res.status);

        if (res.ok) {
          const data = await res.json();
          console.log("Response data:", data);

          // Ensure data is an array and normalize the structure
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
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              .details { margin: 20px 0; }
              .details div { margin: 5px 0; }
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
    const { data: session } = useSession();
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
    <ProtectedRoute allowedRoles={["admin"]}>
      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(135deg, #f0f0f0 0%, #d8d8d8 100%)",
          fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        <div
          className="bg-white shadow-sm border-b"
          style={{
            background:
              "linear-gradient(to bottom, #e9f3ff 0%, #d0e7ff 50%, #b0d1ff 100%)",
            border: "1px outset #c0c0c0",
          }}
        ></div>

        <WindowsToolbar
          
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            className="rounded-lg shadow p-6"
            style={{
              background:
                "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              border: "1px outset #c0c0c0",
            }}
          >
            <h2 className="text-lg font-semibold mb-6">Employee Management</h2>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  User ID *
                </label>
                <input
                  type="text"
                  ref={userIdInputRef}
                  required
                  disabled={!isEditable}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.userId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, userId: value });
                    fetchUserIdSuggestions(value);
                  }}
                  onKeyDown={handleUserIdKeyDown}
                  onBlur={() => {
                    // Delay hiding suggestions to allow click selection
                    setTimeout(() => {
                      setShowSuggestions(false);
                      setSelectedSuggestionIndex(-1);
                    }, 200);
                  }}
                  autoComplete="off"
                />

                {/* Suggestions dropdown */}
                {showSuggestions && userIdSuggestions.length > 0 && (
                  <div
                    className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
                    style={{
                      border: "1px solid #c0c0c0",
                      top: "100%",
                      marginTop: "2px",
                    }}
                  >
                    {userIdSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                          index === selectedSuggestionIndex ? "bg-blue-100" : ""
                        }`}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            userId: suggestion,
                          }));
                          setShowSuggestions(false);
                          fetchUserData(suggestion);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditable}
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  disabled={!isEditable}
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company *
                </label>
                <select
                  required
                  disabled={!isEditable}
                  className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none disabled:bg-gray-100"
                  style={{
                    border: "1px inset #c0c0c0",
                    background: isEditable ? "#ffffff" : "#f0f0f0",
                    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
                  }}
                  value={formData.companyId}
                  onChange={(e) => {
                    const newCompanyId = e.target.value;
                    // Update companyId and reset locationIds to the new company's locations
                    setFormData((prev) => ({
                      ...prev,
                      companyId: newCompanyId,
                      locationIds:
                        session?.user?.companies
                          ?.find((c) => c.companyId === newCompanyId)
                          ?.locations?.map((loc: Location) => loc.locationId) ||
                        [],
                    }));
                  }}
                >
                  <option value="" disabled>
                    Select a company
                  </option>
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Roles
                </label>
                <div className="mt-2 space-y-2">
                  {availableRoles.map((role) => (
                    <div key={role.roleId} className="flex items-center">
                      <input
                        type="checkbox"
                        id={role.roleId}
                        disabled={!isEditable}
                        checked={formData.companyRoles.includes(role.roleId)}
                        onChange={() => toggleRole(role.roleId)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:bg-gray-100"
                        style={{ border: "1px inset #c0c0c0" }}
                      />
                      <label
                        htmlFor={role.roleId}
                        className="ml-2 text-sm text-gray-900"
                      >
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

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Locations
                </label>
                <div className="mt-2 space-y-2">
                  {availableLocations.map((loc) => (
                    <div key={loc.locationId} className="flex items-center">
                      <input
                        type="checkbox"
                        id={loc.locationId}
                        disabled={!isEditable}
                        checked={formData.locationIds.includes(loc.locationId)}
                        onChange={() => toggleLocation(loc.locationId)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:bg-gray-100"
                        style={{ border: "1px inset #c0c0c0" }}
                      />
                      <label
                        htmlFor={loc.locationId}
                        className="ml-2 text-sm text-gray-900"
                      >
                        {loc.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Module Access
                </label>
                <div className="mt-2 space-y-2">
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
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:bg-gray-100"
                        style={{ border: "1px inset #c0c0c0" }}
                      />
                      <label
                        htmlFor={mod.path}
                        className="ml-2 text-sm text-gray-900"
                      >
                        {mod.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}
              {message && (
                <div className="text-green-600 text-sm">{message}</div>
              )}
            </form>
          </div>
        </div>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden"
              style={{
                border: "1px outset #c0c0c0",
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              }}
            >
              <h2 className="text-lg font-semibold mb-4">Search Employees</h2>

              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by name or user ID... (Use arrow keys to navigate, Enter to select)"
                  className="w-full px-3 py-2 border rounded-md"
                  style={{
                    border: "1px inset #c0c0c0",
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

              {/* Employee List */}
              <div
                className="mb-4 max-h-96 overflow-y-auto border rounded-md"
                style={{ border: "1px inset #c0c0c0" }}
              >
                <table className="w-full">
                  <thead
                    style={{
                      background: "#f0f0f0",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    <tr>
                      <th className="text-left p-2 border-b">User ID</th>
                      <th className="text-left p-2 border-b">Name</th>
                      <th className="text-left p-2 border-b">Roles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center p-4 text-gray-500"
                        >
                          {searchQuery
                            ? "No employees found matching your search"
                            : "No employees available"}
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee, index) => (
                        <tr
                          key={employee.employeeId}
                          className={`border-b hover:bg-blue-50 cursor-pointer ${
                            selectedEmployeeIndex === index ? "bg-blue-200" : ""
                          }`}
                          onClick={() => setSelectedEmployeeIndex(index)}
                        >
                          <td className="p-2 font-mono text-sm">
                            {employee.userId}
                          </td>
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

              {/* Selected Employee Info */}
              {selectedEmployeeIndex >= 0 &&
                filteredEmployees[selectedEmployeeIndex] && (
                  <div
                    className="mb-4 p-3 bg-blue-50 rounded-md border"
                    style={{ border: "1px inset #c0c0c0" }}
                  >
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleImplementQuery}
                  disabled={selectedEmployeeIndex === -1}
                  className={`px-4 py-2 rounded-md ${
                    selectedEmployeeIndex === -1
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "1px outset #c0c0c0",
                  }}
                >
                  Select Employee
                </button>
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery("");
                    setSelectedEmployeeIndex(-1);
                  }}
                  className="px-4 py-2 rounded-md"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "1px outset #c0c0c0",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Log Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
              style={{
                border: "1px solid #ccc",
                background:
                  "linear-gradient(to bottom, #f9f9f9 0%, #eaeaea 100%)",
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Audit Log</h2>
                <div className="text-sm text-gray-600">
                  {currentEmployeeIndex >= 0 && (
                    <>
                      Employee: {employees[currentEmployeeIndex].name} (
                      {employees[currentEmployeeIndex].userId})
                    </>
                  )}
                </div>
              </div>

              {/* Search and Filters */}
              <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Logs
                    </label>
                    <input
                      type="text"
                      placeholder="Search by action, user ID, or details..."
                      className="w-full px-3 py-2 border rounded-md"
                      style={{
                        border: "1px inset #c0c0c0",
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

                  {/* Action Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Action
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      style={{
                        border: "1px inset #c0c0c0",
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
                      }}
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Date Range
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      style={{
                        border: "1px inset #c0c0c0",
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
                      }}
                    >
                      <option value="">All Dates</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="year">Last Year</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Audit Log Table */}
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 text-sm font-semibold text-gray-700">
                      <th className="p-3 text-left border border-gray-300 w-20">
                        Action
                      </th>
                      <th className="p-3 text-left border border-gray-300 w-40">
                        Timestamp
                      </th>
                      <th className="p-3 text-left border border-gray-300 w-24">
                        User
                      </th>
                      <th className="p-3 text-left border border-gray-300">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-6 text-center text-gray-500 border border-gray-300"
                        >
                          No audit logs found for this employee
                        </td>
                      </tr>
                    ) : (
                      currentLogs.map((log, index) => (
                        <tr
                          key={index}
                          className="border-b hover:bg-gray-50 transition duration-100"
                        >
                          <td className="p-3 align-top border border-gray-300">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                log.action === "CREATE"
                                  ? "bg-green-100 text-green-800"
                                  : log.action === "UPDATE"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 align-top border border-gray-300 text-sm text-gray-600">
                            <div>
                              {new Date(log.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="p-3 align-top border border-gray-300 text-sm text-gray-600">
                            {log.details.userId}
                          </td>
                          <td className="p-3 align-top border border-gray-300">
                            {renderAuditDetails(log.details)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              <div
                className="flex justify-between items-center mt-4 pt-4 
      border-t border-gray-300"
              >
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  {currentLogs.length > 0
                    ? (currentPage - 1) * logsPerPage + 1
                    : 0}
                  –
                  {Math.min(
                    currentPage * logsPerPage,
                    filteredAuditLogs.length
                  )}{" "}
                  of {filteredAuditLogs.length} entries
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-sm rounded-md bg-gray-200 disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm rounded-md bg-gray-200 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm rounded-md bg-gray-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-sm rounded-md bg-gray-200 disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowAuditModal(false);
                    setSearchQuery("");
                    setFilterAction("");
                    setFilterDateRange("");
                    setFilteredAuditLogs(auditLogs);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md"
              style={{
                border: "1px outset #c0c0c0",
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
              }}
            >
              <h2 className="text-lg font-semibold mb-4">Toolbox Help</h2>
              <div className="space-y-2">
                <p>
                  <strong>Add New (F1):</strong> Starts a new employee record
                  and focuses on the user ID field
                </p>
                <p>
                  <strong>Save (F2):</strong> Saves the current form data
                  (creates or updates)
                </p>
                <p>
                  <strong>Clear (F3):</strong> Resets all form fields to empty
                </p>
                <p>
                  <strong>Exit (F4):</strong> Returns to the dashboard
                </p>
                <p>
                  <strong>Up (F5):</strong> Navigates to the previous employee
                  record
                </p>
                <p>
                  <strong>Down (F6):</strong> Navigates to the next employee
                  record
                </p>
                <p>
                  <strong>Search (F7):</strong> Opens the search interface
                </p>
                <p>
                  <strong>Implement Query (F8):</strong> Executes a wildcard
                  search
                </p>
                <p>
                  <strong>Edit (F9):</strong> Enables editing for the current
                  record
                </p>
                <p>
                  <strong>Delete (F10):</strong> Deletes the current employee
                  record
                </p>
                <p>
                  <strong>Audit (F11):</strong> Shows the audit log for the
                  current employee
                </p>
                <p>
                  <strong>Print (F12):</strong> Prints the current form data
                </p>
                <p>
                  <strong>Help (Ctrl+H):</strong> Shows this help information
                </p>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 rounded-md"
                  style={{
                    background:
                      "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                    border: "1px outset #c0c0c0",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
