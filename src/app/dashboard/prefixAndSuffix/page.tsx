"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import WindowsToolbar from "@/components/layout/ToolBox";

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
  
  // New state for audit filters
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditDateFilter, setAuditDateFilter] = useState("");
  const [filteredAuditData, setFilteredAuditData] = useState<any[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);

  const modulePath = "/dashboard/prefixAndSuffix";

  // Get companyId and locationId from localStorage
  const selectedCompanyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : null;
  const selectedLocationId = typeof window !== 'undefined' ? localStorage.getItem('locationId') : null;

  useEffect(() => {
    if (selectedCompanyId && selectedLocationId) {
      loadAllItems();
    }
  }, [selectedCompanyId, selectedLocationId, type]);

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
    type,
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
          audit.userName?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
          audit.action?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
          JSON.stringify(audit.oldValue)?.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
          JSON.stringify(audit.newValue)?.toLowerCase().includes(auditSearchTerm.toLowerCase())
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
      const response = await fetch(
        `/api/admin/prefixAndSuffix?type=${type}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`
      );

      console.log("Load items response status:", response.status);
      if (!response.ok) {
        console.error(
          `Failed to load items: ${response.status} ${response.statusText}`
        );
        setError(`Failed to load items: ${response.statusText}`);
        return;
      }

      const result = await response.json();
      console.log("Load items response:", result);

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
    }
  };

  const fetchSuggestions = async () => {
    if (!session || !selectedCompanyId || !selectedLocationId) return;

    try {
      const response = await fetch(
        `/api/admin/prefixAndSuffix?type=${type}&search=${encodeURIComponent(
          name
        )}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`
      );

      console.log("Fetch suggestions response status:", response.status);
      if (!response.ok) {
        console.error(
          `Failed to fetch suggestions: ${response.status} ${response.statusText}`
        );
        setError(`Failed to fetch suggestions: ${response.statusText}`);
        setSuggestions([]);
        return;
      }

      const result = await response.json();
      console.log("Fetch suggestions response:", result);

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

  const handleAdd = () => {
    setIsFormEnabled(true);
    setIsEditMode(false);
    setName("");
    setSelectedItemId(null);
    setCurrentItemIndex(-1);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const handleSave = async () => {
    if (!name || !session || !selectedCompanyId || !selectedLocationId) {
      setError("Please fill in all required fields");
      return;
    }

    try {
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
              type,
              companyId: selectedCompanyId,
              locationId: selectedLocationId,
            };

      console.log("Saving with method:", method, "body:", body);

      const response = await fetch("/api/admin/prefixAndSuffix", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      console.log("Save response:", result);

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

        setIsFormEnabled(false);
        setIsEditMode(false);
        setName("");
        setSelectedItemId(null);
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
    }
  };

  const handleClear = () => {
    setIsFormEnabled(false);
    setIsEditMode(false);
    setName("");
    setSelectedItemId(null);
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
    setName(item.name);
    setSelectedItemId(item._id);
    setCurrentItemIndex(newIndex);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setError(null);
  };

  const handleSearch = async () => {
    if (!session || !selectedCompanyId || !selectedLocationId) {
      setError("Company ID or Location ID not found in local storage");
      return;
    }

    try {
      const [prefixResponse, suffixResponse] = await Promise.all([
        fetch(
          `/api/admin/prefixAndSuffix?type=PREFIX&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`
        ),
        fetch(
          `/api/admin/prefixAndSuffix?type=SUFFIX&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`
        ),
      ]);

      const prefixResult = await prefixResponse.json();
      const suffixResult = await suffixResponse.json();
      console.log("Search responses:", { prefixResult, suffixResult });

      const allSearchItems = [
        ...(prefixResult.success ? prefixResult.data : []),
        ...(suffixResult.success ? suffixResult.data : []),
      ].sort((a, b) => a.name.localeCompare(b.name));

      setSearchItems(allSearchItems);
      setSelectedSearchIndex(0);
      setIsSearchModalOpen(true);
      setError(null);
    } catch (err) {
      console.error("Error loading search items:", err);
      setError("Failed to load search items");
    }
  };

  const handleEdit = () => {
    if (!selectedItemId || !name) {
      setError("Please select an item first");
      return;
    }
    setIsFormEnabled(true);
    setIsEditMode(true);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setError(null);
    inputRef.current?.focus();
  };

  const handleDelete = async () => {
    if (
      !selectedItemId ||
      !session ||
      !selectedCompanyId ||
      !selectedLocationId
    ) {
      setError("Please select an item to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const itemToDelete = allItems.find((item) => item._id === selectedItemId);

      const response = await fetch(
        `/api/admin/prefixAndSuffix?id=${selectedItemId}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      console.log("Delete response:", result);

      if (!response.ok) {
        setError(result.error || `Failed to delete: ${response.statusText}`);
        return;
      }

      if (result.success) {
        await createAuditLog("DELETE", itemToDelete, null, selectedItemId);

        setName("");
        setSelectedItemId(null);
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
      console.log("Fetching audit with params:", {
        companyId: selectedCompanyId,
        locationId: selectedLocationId,
        moduleName: "PrefixSuffix",
        limit: 100,
      });
      const response = await fetch(
        `/api/admin/prefixSuffixAudit?companyId=${selectedCompanyId}&locationId=${selectedLocationId}&limit=100`
      );

      console.log("Audit API response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Audit API error:", errorData);
        setError(
          `Failed to fetch audit data: ${
            errorData.error || response.statusText
          }`
        );
        setAuditData([]);
        return;
      }

      const result = await response.json();
      console.log("Audit API response:", result);

      if (result.success && Array.isArray(result.data)) {
        console.log("Setting auditData:", result.data);
        setAuditData(result.data);
        setIsAuditModalOpen(true);
        setError(null);
        // Reset filters when opening audit
        setAuditSearchTerm("");
        setAuditActionFilter("");
        setAuditDateFilter("");
      } else {
        console.error("Unexpected audit API response structure:", result);
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
            <p><strong>Type:</strong> ${type}</p>
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
                  <td>${new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>${new Date(item.updatedAt).toLocaleDateString()}</td>
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
          setName(selectedItem.name);
          setSelectedItemId(selectedItem._id);
          setType(selectedItem.type);
          const index = allItems.findIndex(
            (item) => item._id === selectedItem._id
          );
          setCurrentItemIndex(index);
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

  return (
    <div
      className="p-4 relative h-screen"
      style={{
        background: "linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%)",
      }}
    >
      <WindowsToolbar
        modulePath={modulePath}
        onAddNew={handleAdd}
        onSave={handleSave}
        onClear={handleClear}
        onExit={handleExit}
        onUp={() => handleBrowse("up")}
        onDown={() => handleBrowse("down")}
        onSearch={handleSearch}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAudit={handleAudit}
        onPrint={handlePrint}
        onHelp={handleHelp}
      />

      <div className="ml-16">
        {error && (
          <div className="mb-4 p-2 bg-[#ffcccb] border border-[#c0c0c0] text-[#8b0000] text-sm">
            {error}
          </div>
        )}

        {/* Vertical Form Layout */}
        <div
          className="mb-4 p-6 border-2 border-[#c0c0c0] bg-[#ece9d8] shadow-inner max-w-md"
          style={{ borderStyle: "ridge" }}
        >
          <h3 className="text-lg font-bold text-[#000080] mb-4">Prefix/Suffix Management</h3>
          
          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-[#000080] mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "PREFIX" | "SUFFIX")}
                disabled={isEditMode || (!isFormEnabled && !isEditMode)}
                className="w-full border border-[#c0c0c0] rounded-sm px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#000080] appearance-none"
                style={{
                  borderStyle: "inset",
                  background:
                    !isEditMode &&
                    (isFormEnabled || selectedItemId) &&
                    selectedCompanyId &&
                    selectedLocationId
                      ? "linear-gradient(to bottom, #ffffff 0%, #f0f0f0 100%)"
                      : "#d3d3d3",
                }}
              >
                <option value="PREFIX">Prefix</option>
                <option value="SUFFIX">Suffix</option>
              </select>
            </div>

            {/* Name Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-[#000080] mb-1">Name</label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleSuggestionKeyDown}
                placeholder={`Enter ${type.toLowerCase()}`}
                disabled={!isFormEnabled && !isEditMode}
                className="w-full border border-[#c0c0c0] rounded-sm px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#000080]"
                style={{
                  borderStyle: "inset",
                  background:
                    (isFormEnabled || isEditMode) &&
                    selectedCompanyId &&
                    selectedLocationId
                      ? "linear-gradient(to bottom, #ffffff 0%, #f0f0f0 100%)"
                      : "#d3d3d3",
                }}
              />
              {suggestions.length > 0 && (
                <div
                  className="absolute z-10 border border-[#c0c0c0] bg-[#ece9d8] shadow-lg max-h-40 overflow-auto w-full rounded-sm mt-1"
                  style={{ borderStyle: "outset" }}
                >
                  {suggestions.map((item, index) => (
                    <div
                      key={item._id}
                      className={`p-2 cursor-pointer text-sm ${
                        index === selectedSuggestionIndex
                          ? "bg-[#000080] text-white"
                          : "hover:bg-[#c0c0c0] bg-white"
                      }`}
                      onClick={() => {
                        setName(item.name);
                        setSelectedItemId(item._id);
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

            {/* Status Display */}
            <div className="bg-[#f0f0f0] border border-[#c0c0c0] rounded-sm px-3 py-2">
              <div className="text-xs font-medium text-[#000080]">
                Status: {isEditMode
                  ? "EDIT MODE"
                  : isFormEnabled
                  ? "ADD MODE"
                  : selectedItemId
                  ? "SELECTED"
                  : "READY"}
              </div>
            </div>
          </div>
        </div>

        {/* Current Item Display */}
        {selectedItemId && !isFormEnabled && !isEditMode && (
          <div className="mb-4 p-4 bg-[#e0e0e0] border border-[#c0c0c0] rounded-sm shadow-sm max-w-md">
            <h4 className="text-sm font-bold text-[#000080] mb-2">Current Selection</h4>
            <div className="text-sm space-y-1">
              <div><strong>Item:</strong> {name}</div>
              <div><strong>Type:</strong> {type}</div>
              <div><strong>Index:</strong> {currentItemIndex + 1} of {allItems.length}</div>
            </div>
          </div>
        )}

        {/* Data Visualization */}
        {allItems.length > 0 && (
          <div className="mb-4 p-4 bg-white border border-[#c0c0c0] rounded-sm shadow-sm">
            <h4 className="text-lg font-bold text-[#000080] mb-4">Data Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-800">
                  {allItems.filter(item => item.type === 'PREFIX').length}
                </div>
                <div className="text-sm text-blue-600">Prefixes</div>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-800">
                  {allItems.filter(item => item.type === 'SUFFIX').length}
                </div>
                <div className="text-sm text-green-600">Suffixes</div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-800">
                  {allItems.length}
                </div>
                <div className="text-sm text-purple-600">Total Items</div>
              </div>
            </div>
            
            {/* Items List */}
            <div className="border border-[#c0c0c0] rounded-sm max-h-60 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#d3d3d3] sticky top-0">
                  <tr>
                    <th className="p-2 text-left border-b border-[#c0c0c0]">Name</th>
                    <th className="p-2 text-left border-b border-[#c0c0c0]">Type</th>
                    <th className="p-2 text-left border-b border-[#c0c0c0]">Created</th>
                    <th className="p-2 text-left border-b border-[#c0c0c0]">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item, index) => (
                    <tr
                      key={item._id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-[#f8f8f8]"
                      } ${selectedItemId === item._id ? "bg-blue-100" : ""} hover:bg-blue-50 cursor-pointer`}
                      onClick={() => {
                        setName(item.name);
                        setSelectedItemId(item._id);
                        setType(item.type);
                        setCurrentItemIndex(index);
                      }}
                    >
                      <td className="p-2 border-b border-[#e0e0e0]">{item.name}</td>
                      <td className="p-2 border-b border-[#e0e0e0]">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.type === 'PREFIX' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-2 border-b border-[#e0e0e0]">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-2 border-b border-[#e0e0e0]">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            ref={searchModalRef}
            className="bg-[#ece9d8] rounded-sm border-2 border-[#c0c0c0] shadow-xl p-4 max-w-2xl w-full max-h-[80vh] overflow-hidden"
            style={{ borderStyle: "ridge" }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#000080]">
                Search Prefix/Suffix ({searchItems.length} items)
              </h2>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="w-6 h-6 bg-[#c0c0c0] border border-[#808080] text-[#000080] flex items-center justify-center hover:bg-[#d3d3d3]"
                style={{ borderStyle: "outset" }}
                onMouseDown={(e) => {
                  e.currentTarget.style.borderStyle = "inset";
                  e.currentTarget.style.background = "#d3d3d3";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.borderStyle = "outset";
                  e.currentTarget.style.background = "#c0c0c0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderStyle = "outset";
                  e.currentTarget.style.background = "#c0c0c0";
                }}
              >
                ✕
              </button>
            </div>

            <div className="mb-2 text-sm text-[#000080]">
              Use ↑↓ arrow keys to navigate, Enter to select, Escape to close
            </div>

            <div
              className="max-h-96 overflow-auto border border-[#c0c0c0]"
              style={{ borderStyle: "inset" }}
            >
              {searchItems.length > 0 ? (
                searchItems.map((item, index) => (
                  <div
                    key={item._id}
                    className={`p-3 cursor-pointer text-sm border-b border-[#c0c0c0] flex justify-between items-center ${
                      index === selectedSearchIndex
                        ? "bg-[#000080] text-white"
                        : "hover:bg-[#c0c0c0] bg-white"
                    }`}
                    onClick={() => {
                      setName(item.name);
                      setSelectedItemId(item._id);
                      setType(item.type);
                      const itemIndex = allItems.findIndex(
                        (i) => i._id === item._id
                      );
                      setCurrentItemIndex(itemIndex);
                      setIsSearchModalOpen(false);
                      setSuggestions([]);
                      setSelectedSuggestionIndex(-1);
                    }}
                  >
                    <div>
                      <span className="font-semibold">{item.name}</span>
                      <span
                        className={`ml-2 px-2 py-1 text-xs rounded ${
                          item.type === "PREFIX"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <div className="text-xs opacity-75">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-[#000080] text-center">
                  No items found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Audit Modal with Search and Filters */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="bg-[#ece9d8] rounded-sm border-2 border-[#c0c0c0] shadow-xl p-4 max-w-6xl w-full max-h-[90vh] overflow-hidden"
            style={{ borderStyle: "ridge" }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#000080]">
                Audit History ({filteredAuditData.length} of {auditData.length} records)
              </h2>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="w-6 h-6 bg-[#c0c0c0] border border-[#808080] text-[#000080] flex items-center justify-center hover:bg-[#d3d3d3]"
                style={{ borderStyle: "outset" }}
                onMouseDown={(e) => {
                  e.currentTarget.style.borderStyle = "inset";
                  e.currentTarget.style.background = "#d3d3d3";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.borderStyle = "outset";
                  e.currentTarget.style.background = "#c0c0c0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderStyle = "outset";
                  e.currentTarget.style.background = "#c0c0c0";
                }}
              >
                ✕
              </button>
            </div>

            {/* Filter Controls */}
            <div className="mb-4 p-4 bg-white border border-[#c0c0c0] rounded-sm">
              <h3 className="text-sm font-bold text-[#000080] mb-3">Search & Filter</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#000080] mb-1">Search</label>
                  <input
                    type="text"
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    placeholder="Search user, action, values..."
                    className="w-full border border-[#c0c0c0] rounded-sm px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#000080]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#000080] mb-1">Action</label>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="w-full border border-[#c0c0c0] rounded-sm px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#000080]"
                  >
                    <option value="">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#000080] mb-1">Date</label>
                  <input
                    type="date"
                    value={auditDateFilter}
                    onChange={(e) => setAuditDateFilter(e.target.value)}
                    className="w-full border border-[#c0c0c0] rounded-sm px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#000080]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearAuditFilters}
                    className="w-full bg-[#c0c0c0] border border-[#808080] text-[#000080] px-3 py-1 text-sm hover:bg-[#d3d3d3] rounded-sm"
                    style={{ borderStyle: "outset" }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.borderStyle = "inset";
                      e.currentTarget.style.background = "#d3d3d3";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.borderStyle = "outset";
                      e.currentTarget.style.background = "#c0c0c0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderStyle = "outset";
                      e.currentTarget.style.background = "#c0c0c0";
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Statistics */}
            {auditData.length > 0 && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                  <div className="text-lg font-bold text-green-800">
                    {auditData.filter(a => a.action === 'CREATE').length}
                  </div>
                  <div className="text-xs text-green-600">Created</div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                  <div className="text-lg font-bold text-blue-800">
                    {auditData.filter(a => a.action === 'UPDATE').length}
                  </div>
                  <div className="text-xs text-blue-600">Updated</div>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
                  <div className="text-lg font-bold text-red-800">
                    {auditData.filter(a => a.action === 'DELETE').length}
                  </div>
                  <div className="text-xs text-red-600">Deleted</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                  <div className="text-lg font-bold text-purple-800">
                    {new Set(auditData.map(a => a.userName)).size}
                  </div>
                  <div className="text-xs text-purple-600">Users</div>
                </div>
              </div>
            )}

            {/* Audit Data Table */}
            <div
              className="max-h-[50vh] overflow-auto border border-[#c0c0c0]"
              style={{ borderStyle: "inset" }}
            >
              {filteredAuditData.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-[#d3d3d3] sticky top-0">
                    <tr>
                      <th className="p-2 text-left border-b border-[#c0c0c0] min-w-[80px]">
                        Action
                      </th>
                      <th className="p-2 text-left border-b border-[#c0c0c0] min-w-[120px]">
                        User
                      </th>
                      <th className="p-2 text-left border-b border-[#c0c0c0] min-w-[140px]">
                        Date/Time
                      </th>
                      <th className="p-2 text-left border-b border-[#c0c0c0] min-w-[150px]">
                        Old Value
                      </th>
                      <th className="p-2 text-left border-b border-[#c0c0c0] min-w-[150px]">
                        New Value
                      </th>
                      <th className="p-2 text-left border-b border-[#c0c0c0] min-w-[100px]">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditData.map((audit, index) => (
                      <tr
                        key={audit._id}
                        className={
                          index % 2 === 0 ? "bg-white" : "bg-[#f8f8f8]"
                        }
                      >
                        <td className="p-2 border-b border-[#e0e0e0]">
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
                        <td className="p-2 border-b border-[#e0e0e0]">
                          <div className="font-semibold">
                            {audit.userName || "Unknown"}
                          </div>
                        </td>
                        <td className="p-2 border-b border-[#e0e0e0]">
                          <div>
                            {new Date(audit.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(audit.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="p-2 border-b border-[#e0e0e0]">
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
                        <td className="p-2 border-b border-[#e0e0e0]">
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
                        <td className="p-2 border-b border-[#e0e0e0] text-xs">
                          {audit.ipAddress || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-sm text-[#000080] text-center">
                  {auditData.length === 0 ? "No audit records found" : "No records match your filters"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrefixSuffixManager;