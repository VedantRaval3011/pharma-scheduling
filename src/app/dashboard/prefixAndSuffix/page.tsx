"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import WindowsToolbar from "@/components/layout/ToolBox";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface PrefixSuffixItem {
  _id: string;
  name: string;
  type: "PREFIX" | "SUFFIX";
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const PrefixSuffixManager: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [type, setType] = useState<"PREFIX" | "SUFFIX">("PREFIX");
  const [name, setName] = useState("");
  const [allItems, setAllItems] = useState<PrefixSuffixItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<PrefixSuffixItem | null>(
    null
  );
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [searchItems, setSearchItems] = useState<PrefixSuffixItem[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PrefixSuffixItem[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"PREFIX" | "SUFFIX">("PREFIX");
  const [searchTerm, setSearchTerm] = useState("");

  // New state for audit filters
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditDateFilter, setAuditDateFilter] = useState("");
  const [filteredAuditData, setFilteredAuditData] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);

  const modulePath = "/dashboard/prefixAndSuffix";

  // Get companyId and locationId from localStorage
  const selectedCompanyId =
    typeof window !== "undefined" ? localStorage.getItem("companyId") : null;
  const selectedLocationId =
    typeof window !== "undefined" ? localStorage.getItem("locationId") : null;

  useEffect(() => {
    if (selectedCompanyId && selectedLocationId) {
      loadAllItems();
    }
  }, [selectedCompanyId, selectedLocationId, activeTab]);

  interface AuditValueObject {
    name?: string;
    type?: string;
    companyId?: string;
    locationId?: string;
    [key: string]: any;
  }

  type AuditAction = "CREATE" | "UPDATE" | "DELETE" | string;

  const formatAuditValue = (
    value: string | AuditValueObject | null | undefined,
    action: AuditAction
  ): React.ReactNode => {
    if (!value) return "N/A";

    // Handle different data types
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object") {
      // Handle prefix/suffix object data
      if ((value as AuditValueObject).name) {
        return (
          <div className="space-y-1">
            <div>
              <span className="font-medium">Name:</span>{" "}
              {(value as AuditValueObject).name}
            </div>
            {(value as AuditValueObject).type && (
              <div>
                <span className="font-medium">Type:</span>{" "}
                {(value as AuditValueObject).type}
              </div>
            )}
            {(value as AuditValueObject).companyId && (
              <div>
                <span className="font-medium">Company:</span>{" "}
                {(value as AuditValueObject).companyId}
              </div>
            )}
            {(value as AuditValueObject).locationId && (
              <div>
                <span className="font-medium">Location:</span>{" "}
                {(value as AuditValueObject).locationId}
              </div>
            )}
          </div>
        );
      }

      // Handle other object types
      const entries = Object.entries(value);
      if (entries.length === 0) return "Empty";

      return (
        <div className="space-y-1">
          {entries.map(([key, val], index) => (
            <div key={index}>
              <span className="font-medium capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}:
              </span>{" "}
              {String(val)}
            </div>
          ))}
        </div>
      );
    }

    return String(value);
  };

  useEffect(() => {
    if (
      name &&
      (isFormEnabled || isEditMode) &&
      selectedCompanyId &&
      selectedLocationId
    ) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
  }, [
    name,
    activeTab,
    isFormEnabled,
    isEditMode,
    selectedCompanyId,
    selectedLocationId,
  ]);

  // Filter audit data based on search and filters
  useEffect(() => {
    let filtered = auditData;

    if (auditSearchTerm) {
      filtered = filtered.filter(
        (audit) =>
          audit.userName
            ?.toLowerCase()
            .includes(auditSearchTerm.toLowerCase()) ||
          audit.action?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
          JSON.stringify(audit.oldValue)
            ?.toLowerCase()
            .includes(auditSearchTerm.toLowerCase()) ||
          JSON.stringify(audit.newValue)
            ?.toLowerCase()
            .includes(auditSearchTerm.toLowerCase())
      );
    }

    if (auditActionFilter) {
      filtered = filtered.filter((audit) => audit.action === auditActionFilter);
    }

    if (auditDateFilter) {
      const filterDate = new Date(auditDateFilter);
      filtered = filtered.filter((audit) => {
        const auditDate = new Date(audit.timestamp);
        return (
          auditDate.getFullYear() === filterDate.getFullYear() &&
          auditDate.getMonth() === filterDate.getMonth() &&
          auditDate.getDate() === filterDate.getDate()
        );
      });
    }

    setFilteredAuditData(filtered);
  }, [auditData, auditSearchTerm, auditActionFilter, auditDateFilter]);

  const createAuditLog = async (
    action: string,
    oldValue?: any,
    newValue?: any,
    itemId?: string
  ) => {
    try {
      const response = await fetch("/api/admin/prefixSuffixAudit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          companyId: selectedCompanyId,
          locationId: selectedLocationId,
          oldValue,
          newValue,
          itemId,
          moduleName: "PrefixSuffix",
        }),
      });
      console.log("Audit log creation response:", await response.json());
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  };

  const loadAllItems = async () => {
    if (!session || !selectedCompanyId || !selectedLocationId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/prefixAndSuffix?type=${activeTab}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`
      );

      if (!response.ok) {
        console.error(
          `Failed to load items: ${response.status} ${response.statusText}`
        );
        setError(`Failed to load items: ${response.statusText}`);
        return;
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setAllItems(result.data);
        setError(null);
      } else {
        console.error("Unexpected API response structure:", result);
        setError("Failed to load items");
        setAllItems([]);
      }
    } catch (err) {
      console.error("Error loading items:", err);
      setError("Failed to load items");
      setAllItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!session || !selectedCompanyId || !selectedLocationId) return;

    try {
      const response = await fetch(
        `/api/admin/prefixAndSuffix?type=${activeTab}&search=${encodeURIComponent(
          name
        )}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`
      );

      if (!response.ok) {
        console.error(
          `Failed to fetch suggestions: ${response.status} ${response.statusText}`
        );
        setError(`Failed to fetch suggestions: ${response.statusText}`);
        setSuggestions([]);
        return;
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setSuggestions(result.data);
        setSelectedSuggestionIndex(-1);
        setError(null);
      } else {
        console.error("Unexpected API response structure:", result);
        setError("Failed to fetch suggestions");
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Failed to fetch suggestions");
      setSuggestions([]);
    }
  };

  const handleSuggestionKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const selected = suggestions[selectedSuggestionIndex];
          setName(selected.name);
          setSelectedItemId(selected._id);
          setSelectedRecord(selected);
          setSuggestions([]);
          setSelectedSuggestionIndex(-1);
          setIsEditMode(true);
          setIsFormEnabled(true);
        }
        break;
      case "Escape":
        e.preventDefault();
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleTabChange = (tab: "PREFIX" | "SUFFIX") => {
    setActiveTab(tab);
    setType(tab);
    setSelectedRecord(null);
    setSelectedItemId(null);
    setName("");
    setCurrentItemIndex(-1);
    setIsFormEnabled(false);
    setIsEditMode(false);
    setSearchTerm("");
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  const handleRowSelect = (item: PrefixSuffixItem) => {
    setSelectedRecord(item);
    setSelectedItemId(item._id);
    setName(item.name);
    setType(item.type);
    const index = allItems.findIndex((i) => i._id === item._id);
    setCurrentItemIndex(index);
    setError(null);
  };

  const handleAdd = () => {
    setShowForm(true);
    setIsFormEnabled(true);
    setIsEditMode(false);
    setName("");
    setSelectedItemId(null);
    setSelectedRecord(null);
    setCurrentItemIndex(-1);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  const handleSave = async () => {
    if (!name || !session || !selectedCompanyId || !selectedLocationId) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);
      const method = isEditMode && selectedItemId ? "PUT" : "POST";
      const body =
        isEditMode && selectedItemId
          ? {
              id: selectedItemId,
              name,
              companyId: selectedCompanyId,
              locationId: selectedLocationId,
            }
          : {
              name,
              type: activeTab,
              companyId: selectedCompanyId,
              locationId: selectedLocationId,
            };

      const response = await fetch("/api/admin/prefixAndSuffix", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `Failed to save: ${response.statusText}`);
        return;
      }

      if (result.success) {
        if (isEditMode) {
          const oldItem = allItems.find((item) => item._id === selectedItemId);
          await createAuditLog(
            "UPDATE",
            { name: oldItem?.name },
            { name },
            selectedItemId ?? undefined
          );
        } else {
          await createAuditLog("CREATE", null, result.data, result.data._id);
        }

        setShowForm(false);
        setIsFormEnabled(false);
        setIsEditMode(false);
        setName("");
        setSelectedItemId(null);
        setSelectedRecord(null);
        setCurrentItemIndex(-1);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        setError(null);
        await loadAllItems();
        console.log("Item saved successfully:", result.data);
      } else {
        setError(result.error || "Failed to save item");
      }
    } catch (err) {
      console.error("Error saving:", err);
      setError("Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setShowForm(false);
    setIsFormEnabled(false);
    setIsEditMode(false);
    setName("");
    setSelectedItemId(null);
    setSelectedRecord(null);
    setCurrentItemIndex(-1);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setError(null);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleBrowse = (direction: "up" | "down") => {
    if (allItems.length === 0) {
      setError("No items available to browse");
      return;
    }

    let newIndex;
    if (currentItemIndex === -1) {
      newIndex = direction === "down" ? 0 : allItems.length - 1;
    } else {
      newIndex =
        direction === "down"
          ? (currentItemIndex + 1) % allItems.length
          : (currentItemIndex - 1 + allItems.length) % allItems.length;
    }

    const item = allItems[newIndex];
    handleRowSelect(item);
  };

  const handleSearch = async () => {
    if (!session || !selectedCompanyId || !selectedLocationId) {
      setError("Company ID or Location ID not found in local storage");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/prefixAndSuffix?type=${activeTab}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}&search=${encodeURIComponent(
          searchTerm
        )}`
      );

      const result = await response.json();

      if (result.success) {
        setSearchItems(result.data);
        setSelectedSearchIndex(0);
        setIsSearchModalOpen(true);
        setError(null);
      } else {
        setError("Failed to load search items");
      }
    } catch (err) {
      console.error("Error loading search items:", err);
      setError("Failed to load search items");
    }
  };

  const handleEdit = (item?: PrefixSuffixItem) => {
    const itemToEdit = item || selectedRecord;
    if (!itemToEdit) {
      setError("Please select an item first");
      return;
    }

    setSelectedRecord(itemToEdit);
    setSelectedItemId(itemToEdit._id);
    setName(itemToEdit.name);
    setType(itemToEdit.type);
    setShowForm(true);
    setIsFormEnabled(true);
    setIsEditMode(true);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setError(null);
  };

  const handleDelete = async (item?: PrefixSuffixItem) => {
    const itemToDelete = item || selectedRecord;
    if (
      !itemToDelete ||
      !session ||
      !selectedCompanyId ||
      !selectedLocationId
    ) {
      setError("Please select an item to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${itemToDelete.name}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/prefixAndSuffix?id=${itemToDelete._id}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `Failed to delete: ${response.statusText}`);
        return;
      }

      if (result.success) {
        await createAuditLog("DELETE", itemToDelete, null, itemToDelete._id);

        setName("");
        setSelectedItemId(null);
        setSelectedRecord(null);
        setCurrentItemIndex(-1);
        setIsFormEnabled(false);
        setIsEditMode(false);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        setError(null);
        await loadAllItems();
      } else {
        setError(result.error || "Failed to delete item");
      }
    } catch (err) {
      console.error("Error deleting:", err);
      setError("Failed to delete");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!session?.user?.companies?.length) {
      setError("No companies assigned to user");
      return;
    }
    if (!selectedCompanyId || !selectedLocationId) {
      setError("Company ID or Location ID not found in local storage");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/prefixSuffixAudit?companyId=${selectedCompanyId}&locationId=${selectedLocationId}&limit=100`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(
          `Failed to fetch audit data: ${
            errorData.error || response.statusText
          }`
        );
        setAuditData([]);
        return;
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setAuditData(result.data);
        setIsAuditModalOpen(true);
        setError(null);
        // Reset filters when opening audit
        setAuditSearchTerm("");
        setAuditActionFilter("");
        setAuditDateFilter("");
      } else {
        setError("No audit data found or invalid response");
        setAuditData([]);
      }
    } catch (err) {
      console.error("Error fetching audit data:", err);
      setError("Failed to fetch audit data");
      setAuditData([]);
    }
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Prefix/Suffix Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Prefix/Suffix Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          <div class="company-info">
            <p><strong>Company ID:</strong> ${selectedCompanyId || "N/A"}</p>
            <p><strong>Location ID:</strong> ${selectedLocationId || "N/A"}</p>
            <p><strong>Type:</strong> ${activeTab}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Created Date</th>
                <th>Updated Date</th>
              </tr>
            </thead>
            <tbody>
              ${allItems
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.type}</td>
                  <td>${new Date(item.createdAt).toLocaleDateString(
                    "en-GB"
                  )}</td>
                  <td>${new Date(item.updatedAt).toLocaleDateString(
                    "en-GB"
                  )}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleHelp = () => {
    const helpText = `
📋 PREFIX/SUFFIX MANAGER HELP

🔘 BUTTON FUNCTIONS:
1️⃣ ADD (F1) - Enable form to create new prefix/suffix
2️⃣ SAVE (F2) - Save current entry to database
3️⃣ CLEAR (F3) - Clear form and disable inputs
4️⃣ EXIT (F4) - Return to main dashboard

5️⃣ UP (F5) - Browse to previous item (alphabetically)
6️⃣ DOWN (F6) - Browse to next item (alphabetically)

7️⃣ SEARCH (F7) - Open search dialog with all items
8️⃣ EDIT (F9) - Enable editing of selected item
9️⃣ DELETE (F10) - Delete selected item (with confirmation)

🔟 AUDIT (F11) - View change history and logs
1️⃣1️⃣ PRINT (F12) - Print current data report
1️⃣2️⃣ HELP (Ctrl+H) - Show this help message

⌨️ SEARCH MODAL CONTROLS:
• ↑↓ Arrow keys - Navigate through items
• Enter - Select highlighted item
• Escape - Close search modal

⌨️ AUTOCOMPLETE CONTROLS:
• ↑↓ Arrow keys - Navigate through suggestions
• Enter - Select highlighted suggestion
• Escape - Clear suggestions

💡 TIPS:
• Items are sorted alphabetically
• All changes are tracked in audit log
• Edit mode allows updating selected item only
    `;

    alert(helpText);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchModalOpen || searchItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSearchIndex((prev) =>
          prev < searchItems.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSearchIndex((prev) =>
          prev > 0 ? prev - 1 : searchItems.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        const selectedItem = searchItems[selectedSearchIndex];
        if (selectedItem) {
          handleRowSelect(selectedItem);
          setIsSearchModalOpen(false);
          setSuggestions([]);
          setSelectedSuggestionIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsSearchModalOpen(false);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsSearchModalOpen(false);
  };

  useEffect(() => {
    if (isSearchModalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        handleSearchKeyDown(e as any);
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isSearchModalOpen, searchItems, selectedSearchIndex]);

  const clearAuditFilters = () => {
    setAuditSearchTerm("");
    setAuditActionFilter("");
    setAuditDateFilter("");
  };

  // Show form view
  if (showForm) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#b9d7ff" }}>
        <WindowsToolbar
          modulePath={modulePath}
          onAddNew={handleAdd}
          onSave={handleSave}
          onClear={handleClear}
          onExit={handleExit}
          onUp={() => handleBrowse("up")}
          onDown={() => handleBrowse("down")}
          onSearch={handleSearch}
          onEdit={() => alert("Already in edit mode or select a record first.")}
          onDelete={() => selectedRecord && handleDelete(selectedRecord)}
          onAudit={handleAudit}
          onPrint={handlePrint}
          onHelp={handleHelp}
        />
        <div className="ml-20 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  setIsEditMode(false);
                  setIsFormEnabled(false);
                  setError("");
                }}
                className="flex items-center text-gray-700 hover:text-gray-900 bg-white bg-opacity-80 px-3 py-2 rounded-lg border border-gray-300 hover:bg-opacity-100 transition-all"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to List
              </button>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg bg-opacity-95">
                {error}
              </div>
            )}

            {/* Form */}
            <div className="bg-white bg-opacity-95 shadow-lg rounded-lg border border-gray-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-300 bg-gray-100">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode ? "Edit" : "Add"} {activeTab}
                </h1>
              </div>

              <div className="p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={type}
                        onChange={(e) =>
                          setType(e.target.value as "PREFIX" | "SUFFIX")
                        }
                        disabled={isEditMode}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="PREFIX">Prefix</option>
                        <option value="SUFFIX">Suffix</option>
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleSuggestionKeyDown}
                        placeholder={`Enter ${activeTab.toLowerCase()} name`}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        required
                        autoFocus
                      />
                      {suggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-auto">
                          {suggestions.map((item, index) => (
                            <div
                              key={item._id}
                              className={`p-3 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${
                                index === selectedSuggestionIndex
                                  ? "bg-blue-500 text-white"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                setName(item.name);
                                setSelectedItemId(item._id);
                                setSelectedRecord(item);
                                setSuggestions([]);
                                setSelectedSuggestionIndex(-1);
                                setIsEditMode(true);
                                setIsFormEnabled(true);
                              }}
                            >
                              {item.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={isLoading || !name.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isLoading ? "Saving..." : isEditMode ? "Update" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-opacity-25 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#b9d7ff" }}>
      <WindowsToolbar
        modulePath={modulePath}
        onAddNew={handleAdd}
        onSave={() => alert("Please open the form to save.")}
        onClear={handleClear}
        onExit={handleExit}
        onUp={() =>
          selectedRecord
            ? handleBrowse("up")
            : alert("Please select a record first.")
        }
        onDown={() =>
          selectedRecord
            ? handleBrowse("down")
            : alert("Please select a record first.")
        }
        onSearch={() => setIsSearchModalOpen(true)}
        onEdit={() => handleEdit()}
        onDelete={() =>
          selectedRecord
            ? handleDelete(selectedRecord)
            : alert("Please select a record to delete.")
        }
        onAudit={handleAudit}
        onPrint={handlePrint}
        onHelp={handleHelp}
      />
      <div className="ml-20 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white bg-opacity-95 shadow-lg rounded border border-gray-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-300 bg-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Prefix/Suffix Master
                  </h1>
                </div>
                {selectedRecord && (
                  <div className="text-sm text-gray-600">
                    Selected:{" "}
                    <span className="font-mono font-bold">
                      {selectedRecord.name}
                    </span>
                    <div className="text-xs mt-1">
                      Type:{" "}
                      <span className="font-medium">{selectedRecord.type}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-b border-gray-300 flex justify-between items-center">
              <div className="flex gap-3">
                <button
                  onClick={() => handleTabChange("PREFIX")}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeTab === "PREFIX"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Prefixes
                </button>
                <button
                  onClick={() => handleTabChange("SUFFIX")}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    activeTab === "SUFFIX"
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Suffixes
                </button>
              </div>

              <div className="flex items-center gap-3">
                {searchTerm && (
                  <span className="text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
                    Filtered: "{searchTerm}"
                  </span>
                )}
                <span className="text-sm text-gray-600">
                  Total {activeTab.toLowerCase()}es: {allItems.length}
                </span>
              </div>
            </div>

            {error && (
              <div className="fixed top-4 right-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md z-50 animate-slide-in">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => setError("")}
                    className="ml-3 text-red-500 hover:text-red-700"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div
              className={`p-3 rounded-lg ${
                activeTab === "PREFIX"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-green-50 border-green-200"
              } border`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {activeTab === "PREFIX"
                      ? "Prefix Records"
                      : "Suffix Records"}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {activeTab === "PREFIX"
                      ? "Manage prefix values for column descriptions"
                      : "Manage suffix values for column descriptions"}
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  {searchTerm ? (
                    <span>
                      Found {allItems.length} results for "{searchTerm}"
                    </span>
                  ) : (
                    <span>Showing {allItems.length} total records</span>
                  )}
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="px-6 py-12">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading...</span>
                </div>
              </div>
            )}

            {!isLoading && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400">
                        Created By
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400">
                        Created Date
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400">
                        Updated Date
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 uppercase tracking-wider border border-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allItems.length > 0 ? (
                      allItems.map((item, index) => (
                        <tr
                          key={item._id}
                          onClick={() => handleRowSelect(item)}
                          className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                            selectedRecord?._id === item._id
                              ? "bg-blue-100"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3 border border-gray-300 font-medium">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 border border-gray-300">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                item.type === "PREFIX"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 border border-gray-300 text-sm">
                            {item.createdBy || "-"}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 text-sm">
                            {new Date(item.createdAt).toLocaleDateString(
                              "en-GB"
                            )}
                          </td>
                          <td className="px-4 py-3 border border-gray-300 text-sm">
                            {new Date(item.updatedAt).toLocaleDateString(
                              "en-GB"
                            )}
                          </td>
                          <td className="px-4 py-3 border border-gray-300">
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(item);
                                }}
                                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item);
                                }}
                                className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-gray-500 border border-gray-300"
                        >
                          <div className="flex flex-col items-center">
                            <svg
                              className="w-12 h-12 text-gray-300 mb-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <p className="text-lg font-medium text-gray-900 mb-2">
                              No {activeTab.toLowerCase()}es found
                            </p>
                            <p className="text-gray-500 mb-4">
                              Get started by creating your first{" "}
                              {activeTab.toLowerCase()}.
                            </p>
                            <button
                              onClick={handleAdd}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              Add {activeTab}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                Search {activeTab}es
              </h2>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              <form onSubmit={handleSearchSubmit} className="flex gap-4">
                <input
                  type="text"
                  placeholder={`Search ${activeTab.toLowerCase()}es...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
                >
                  {isLoading ? "Searching..." : "Search"}
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 text-sm font-medium"
                >
                  Clear
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-full py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 text-sm">
                    Searching...
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-gray-100 text-gray-700 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium border">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-medium border">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left font-medium border">
                          Created Date
                        </th>
                        <th className="px-4 py-3 text-left font-medium border">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredAuditData.map((audit, index) => (
                        <tr
                          key={audit._id}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-3 py-2 border">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                audit.action === "CREATE"
                                  ? "bg-green-100 text-green-800"
                                  : audit.action === "UPDATE"
                                  ? "bg-blue-100 text-blue-800"
                                  : audit.action === "DELETE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {audit.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 border">
                            <div className="font-semibold">
                              {audit.userName || "Unknown"}
                            </div>
                          </td>
                          <td className="px-3 py-2 border">
                            <div>
                              {new Date(audit.timestamp).toLocaleDateString(
                                "en-GB"
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(audit.timestamp).toLocaleTimeString(
                                "en-GB"
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 border">
                            <div className="text-xs bg-red-50 p-2 rounded max-h-20 overflow-auto max-w-[200px] border border-red-200">
                              {formatAuditValue(audit.oldValue, audit.action)}
                            </div>
                          </td>
                          <td className="px-3 py-2 border">
                            <div className="text-xs bg-green-50 p-2 rounded max-h-20 overflow-auto max-w-[200px] border border-green-200">
                              {formatAuditValue(audit.newValue, audit.action)}
                            </div>
                          </td>
                          <td className="px-3 py-2 border text-xs">
                            {audit.ipAddress || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-800">
                Audit History ({filteredAuditData.length} of {auditData.length}{" "}
                records)
              </h2>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 mb-3">
                Search & Filter
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    placeholder="Search user, action, values..."
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Action
                  </label>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={auditDateFilter}
                    onChange={(e) => setAuditDateFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearAuditFilters}
                    className="w-full bg-gray-200 text-gray-800 px-3 py-1 text-sm hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3 p-4">
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                <div className="text-lg font-bold text-green-800">
                  {auditData.filter((a) => a.action === "CREATE").length}
                </div>
                <div className="text-xs text-green-600">Created</div>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-blue-800">
                  {auditData.filter((a) => a.action === "UPDATE").length}
                </div>
                <div className="text-xs text-blue-600">Updated</div>
              </div>
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
                <div className="text-lg font-bold text-red-800">
                  {auditData.filter((a) => a.action === "DELETE").length}
                </div>
                <div className="text-xs text-red-600">Deleted</div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                <div className="text-lg font-bold text-purple-800">
                  {new Set(auditData.map((a) => a.userName)).size}
                </div>
                <div className="text-xs text-purple-600">Users</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredAuditData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-gray-100 text-gray-700 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium border">
                          Action
                        </th>
                        <th className="px-3 py-2 text-left font-medium border">
                          User
                        </th>
                        <th className="px-3 py-2 text-left font-medium border">
                          Date/Time
                        </th>
                        <th className="px-3 py-2 text-left font-medium border">
                          Old Value
                        </th>
                        <th className="px-3 py-2 text-left font-medium border">
                          New Value
                        </th>
                        <th className="px-3 py-2 text-left font-medium border">
                          IP Address
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredAuditData.map((audit, index) => (
                        <tr
                          key={audit._id}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-3 py-2 border">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                audit.action === "CREATE"
                                  ? "bg-green-100 text-green-800"
                                  : audit.action === "UPDATE"
                                  ? "bg-blue-100 text-blue-800"
                                  : audit.action === "DELETE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {audit.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 border">
                            <div className="font-semibold">
                              {audit.userName || "Unknown"}
                            </div>
                          </td>
                          <td className="px-3 py-2 border">
                            <div>
                              {new Date(audit.timestamp).toLocaleDateString(
                                "en-GB"
                              )}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(audit.timestamp).toLocaleTimeString(
                                "en-GB"
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 border">
                            <div className="text-xs bg-gray-100 p-1 rounded max-h-20 overflow-auto max-w-[150px]">
                              {audit.oldValue ? (
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(audit.oldValue, null, 2)}
                                </pre>
                              ) : (
                                "N/A"
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 border">
                            <div className="text-xs bg-gray-100 p-1 rounded max-h-20 overflow-auto max-w-[150px]">
                              {audit.newValue ? (
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(audit.newValue, null, 2)}
                                </pre>
                              ) : (
                                "N/A"
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 border text-xs">
                            {audit.ipAddress || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  {auditData.length === 0
                    ? "No audit records found"
                    : "No records match your filters"}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default function ProtectedPharmacopeialMaster() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <PrefixSuffixManager />
    </ProtectedRoute>
  );
}
