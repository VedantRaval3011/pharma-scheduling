"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import WindowsToolbar from "@/components/layout/ToolBox";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

interface Series {
  _id: string;
  name: string;
  prefix: string;
  suffix: string;
  currentNumber: number;
  endNumber: number; // New field
  padding: number;
  isActive: boolean;
  resetFrequency: "daily" | "monthly" | "yearly" | "none";
}

interface AuditLog {
  _id: string;
  userId: string;
  action: "create" | "read" | "update" | "delete";
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  seriesId?: string;
  companyId: string;
  locationId: string;
}

export default function SeriesMaster() {
  const [series, setSeries] = useState<Series[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Series>({
    _id: "",
    name: "",
    prefix: "",
    suffix: "",
    currentNumber: 1,
    endNumber: 0, // Initialize endNumber
    padding: 4,
    isActive: true,
    resetFrequency: "none",
  });
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [filteredSeries, setFilteredSeries] = useState<Series[]>([]);
  const [seriesSearchQuery, setSeriesSearchQuery] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [searchPopupIndex, setSearchPopupIndex] = useState(-1);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditDateFilter, setAuditDateFilter] = useState<string>("");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("");
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>([]);
  const [seriesPage, setSeriesPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const itemsPerPage = 10;

  const nameInputRef = useRef<HTMLInputElement>(null);
  const seriesSearchRef = useRef<HTMLInputElement>(null);
  const auditSearchRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const router = useRouter();

  // Get companyId and locationId from local storage
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const locationId = localStorage.getItem("locationId");
    if (companyId && locationId) {
      setSelectedCompanyId(companyId);
      setSelectedLocationId(locationId);
    }
  }, []);

  // Fetch series when company and location are selected
  useEffect(() => {
    if (selectedCompanyId && selectedLocationId) {
      fetchSeries();
    }
  }, [selectedCompanyId, selectedLocationId]);

  const fetchSeries = async () => {
    if (!selectedCompanyId || !selectedLocationId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/admin/series?companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        { credentials: "include" }
      );
      const result = await response.json();

      if (result.success) {
        const sortedSeries = result.data.sort((a: Series, b: Series) =>
          a.name.localeCompare(b.name)
        );
        setSeries(sortedSeries);
        applySeriesFilters(sortedSeries);
      } else {
        setSeries([]);
        setFilteredSeries([]);
        setError(result.error || "Failed to fetch series");
      }

      logAudit("read", undefined, undefined, undefined, "");
    } catch (err) {
      console.error("Error fetching series:", err);
      setSeries([]);
      setFilteredSeries([]);
      setError("Network error while fetching series");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!selectedCompanyId || !selectedLocationId) return;
    try {
      const response = await fetch(
        `/api/admin/series/audit?companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        { credentials: "include" }
      );
      const result = await response.json();
      if (result.success) {
        const filteredLogs = result.data.filter(
          (log: AuditLog) => log.action !== "read"
        );
        setAuditLogs(filteredLogs);
        applyAuditFilters(filteredLogs);
      } else {
        setError(result.error || "Failed to fetch audit logs");
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setError("Network error while fetching audit logs");
    }
  };

  const applySeriesFilters = (seriesList: Series[]) => {
    let filtered = seriesList;
    if (seriesSearchQuery) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(seriesSearchQuery.toLowerCase())
      );
    }
    setFilteredSeries(filtered);
    setSeriesPage(1); // Reset to first page when filtering
  };

  const applyAuditFilters = (logs: AuditLog[]) => {
    let filtered = logs;

    if (form._id) {
      filtered = filtered.filter((log) => log.seriesId === form._id);
    }

    if (auditDateFilter) {
      const filterDate = new Date(auditDateFilter);
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === filterDate.toDateString();
      });
    }

    if (auditActionFilter) {
      filtered = filtered.filter((log) => log.action === auditActionFilter);
    }

    if (auditSearchQuery) {
      const query = auditSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.fieldName?.toLowerCase().includes(query) ||
          String(log.oldValue)?.toLowerCase().includes(query) ||
          String(log.newValue)?.toLowerCase().includes(query) ||
          log.userId.toLowerCase().includes(query) ||
          getSeriesNameById(log.seriesId).toLowerCase().includes(query)
      );
    }

    setFilteredAuditLogs(filtered);
    setAuditPage(1); // Reset to first page when filtering
  };

  useEffect(() => {
    applySeriesFilters(series);
  }, [series, seriesSearchQuery]);

  useEffect(() => {
    applyAuditFilters(auditLogs);
  }, [
    auditLogs,
    auditDateFilter,
    auditActionFilter,
    auditSearchQuery,
    form._id,
  ]);

  const logAudit = async (
    action: "create" | "read" | "update" | "delete",
    fieldName?: string,
    oldValue?: any,
    newValue?: any,
    seriesId?: string
  ) => {
    if (!session?.user?.userId || !selectedCompanyId || !selectedLocationId)
      return;

    const auditLog = {
      userId: session.user.userId,
      action,
      fieldName,
      oldValue,
      newValue,
      timestamp: new Date(),
      seriesId: seriesId || form._id || "",
      companyId: selectedCompanyId,
      locationId: selectedLocationId,
    };

    try {
      const response = await fetch("/api/admin/series/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(auditLog),
      });
      const result = await response.json();
      if (!response.ok) {
        console.warn("Audit logging failed:", result);
      }
    } catch (error) {
      console.warn("Audit logging failed (non-critical):", error);
    }
  };

  const getSeriesNameById = (seriesId: string | undefined) => {
    if (!seriesId) return "N/A";
    const foundSeries = series.find((s) => s._id === seriesId);
    return foundSeries
      ? foundSeries.name
      : `Series (${seriesId.substring(0, 8)}...)`;
  };

  const getFormattedSeriesNumber = (s: Series) => {
    return `${s.currentNumber} (${s.prefix}${s.currentNumber.toString().padStart(s.padding, "0")}${s.suffix})`;
  };

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm({ ...form, name: value });
    if (value) {
      const filtered = series.filter((s) =>
        s.name.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredSeries(filtered);
      setShowDropdown(true);
      setSelectedDropdownIndex(0);
    } else {
      setShowDropdown(false);
      setFilteredSeries([]);
    }
  };

  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      setSelectedDropdownIndex((prev) =>
        prev < filteredSeries.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      setSelectedDropdownIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && selectedDropdownIndex >= 0) {
      selectSeries(filteredSeries[selectedDropdownIndex]);
    }
  };

  const selectSeries = async (selected: Series) => {
    setForm(selected);
    setShowDropdown(false);
    setFilteredSeries([]);
    setSelectedDropdownIndex(-1);
    await logAudit("read", undefined, undefined, undefined, selected._id);
  };

  const handleAddNew = () => {
    setForm({
      _id: "",
      name: "",
      prefix: "",
      suffix: "",
      currentNumber: 1,
      endNumber: 0,
      padding: 4,
      isActive: true,
      resetFrequency: "none",
    });
    setIsFormEnabled(true);
    nameInputRef.current?.focus();
  };

  const handleSave = async () => {
    if (!form.name || !form.prefix || form.endNumber < form.currentNumber) {
      setError("Please fill in all required fields (Name, Prefix, End Number) and ensure End Number is not less than Current Number");
      return;
    }
    if (!selectedCompanyId || !selectedLocationId) {
      setError("Company ID and Location ID are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const method = form._id ? "PUT" : "POST";
      const url = form._id
        ? `/api/admin/series?companyId=${selectedCompanyId}&locationId=${selectedLocationId}`
        : "/api/admin/series";
      const oldSeries = series.find((s) => s._id === form._id);
      const payload = form._id
        ? {
            id: form._id,
            ...form,
            name: oldSeries?.name || form.name, // Preserve original name when updating
            companyId: selectedCompanyId,
            locationId: selectedLocationId,
          }
        : {
            ...form,
            companyId: selectedCompanyId,
            locationId: selectedLocationId,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        const action = form._id ? "update" : "create";
        if (action === "update" && oldSeries) {
          Object.keys(form).forEach((key) => {
            if (key !== "name" && form[key as keyof Series] !== oldSeries[key as keyof Series]) {
              logAudit(
                "update",
                key,
                oldSeries[key as keyof Series],
                form[key as keyof Series],
                form._id
              );
            }
          });
        } else if (action === "create") {
          logAudit("create", undefined, undefined, form, result.data._id);
        }

        await fetchSeries();
        setIsFormEnabled(false);
      } else {
        setError(result.error || "Failed to save series");
      }
    } catch (err) {
      console.error("Error saving series:", err);
      setError("Network error while saving series");
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async () => {
    if (!form._id || !selectedCompanyId || !selectedLocationId) {
      setError("Please select a series and ensure Company ID and Location ID are set");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/series/increment?seriesId=${form._id}&companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const result = await response.json();

      if (result.success) {
        await logAudit(
          "update",
          "currentNumber",
          form.currentNumber,
          result.data.currentNumber,
          form._id
        );
        await fetchSeries();
      } else {
        setError(result.error || "Failed to increment series number");
      }
    } catch (err) {
      console.error("Error incrementing series:", err);
      setError("Network error while incrementing series");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setForm({
      _id: "",
      name: "",
      prefix: "",
      suffix: "",
      currentNumber: 1,
      endNumber: 0,
      padding: 4,
      isActive: true,
      resetFrequency: "none",
    });
    setIsFormEnabled(false);
    setShowDropdown(false);
    setFilteredSeries([]);
    setSeriesSearchQuery("");
    setError(null);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleNavigation = async (direction: "up" | "down") => {
    const currentIndex = series.findIndex((s) => s._id === form._id);
    let newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < series.length) {
      setForm(series[newIndex]);
      await logAudit(
        "read",
        undefined,
        undefined,
        undefined,
        series[newIndex]._id
      );
    }
  };

  const handleSearch = () => {
    setShowSearchPopup(true);
    setSearchPopupIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchPopup) return;
    if (e.key === "ArrowDown") {
      setSearchPopupIndex((prev) =>
        prev < series.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      setSearchPopupIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && searchPopupIndex >= 0) {
      selectSeries(series[searchPopupIndex]);
      setShowSearchPopup(false);
    } else if (e.key === "Escape") {
      setShowSearchPopup(false);
    }
  };

  const handleEdit = () => {
    if (form._id) {
      setIsFormEnabled(true);
      nameInputRef.current?.focus();
    }
  };

  const handleDelete = async () => {
    if (!form._id || !selectedCompanyId || !selectedLocationId) return;

    if (!confirm("Are you sure you want to delete this series?")) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/series`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: form._id,
          companyId: selectedCompanyId,
          locationId: selectedLocationId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        logAudit("delete", undefined, undefined, form, form._id);
        await fetchSeries();
        handleClear();
      } else {
        setError(result.error || "Failed to delete series");
      }
    } catch (err) {
      console.error("Error deleting series:", err);
      setError("Network error while deleting series");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Series Print</title>
            <style>
              body { font-family: Segoe UI, Arial, sans-serif; padding: 20px; background: linear-gradient(to bottom, #f0f4f8, #d9e2ec); }
              .header { border-bottom: 2px solid #3b5998; margin-bottom: 20px; padding-bottom: 10px; }
              .field { margin-bottom: 10px; padding: 8px; background: #fff; border: 1px solid #a0b3d6; border-radius: 3px; }
              .label { font-weight: bold; color: #3b5998; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Series Details</h1>
            </div>
            <div class="field"><span class="label">Name:</span> ${form.name}</div>
            <div class="field"><span class="label">Format:</span> ${form.prefix}${form.currentNumber.toString().padStart(form.padding, "0")}${form.suffix}</div>
            <div class="field"><span class="label">Ongoing Series Number:</span> ${getFormattedSeriesNumber(form)}</div>
            <div class="field"><span class="label">Current Number:</span> ${form.currentNumber}</div>
            <div class="field"><span class="label">End Number:</span> ${form.endNumber}</div>
            <div class="field"><span class="label">Padding:</span> ${form.padding}</div>
            <div class="field"><span class="label">Reset Frequency:</span> ${form.resetFrequency}</div>
            <div class="field"><span class="label">Status:</span> ${form.isActive ? "Active" : "Inactive"}</div>
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

  const handleAudit = async () => {
    await fetchAuditLogs();
    setShowAuditModal(true);
  };

  // Pagination for series
  const totalSeriesPages = Math.ceil(filteredSeries.length / itemsPerPage);
  const paginatedSeries = filteredSeries.slice(
    (seriesPage - 1) * itemsPerPage,
    seriesPage * itemsPerPage
  );

  // Pagination for audit logs
  const totalAuditPages = Math.ceil(filteredAuditLogs.length / itemsPerPage);
  const paginatedAuditLogs = filteredAuditLogs.slice(
    (auditPage - 1) * itemsPerPage,
    auditPage * itemsPerPage
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec] font-segoe">
        <div className="container mx-auto p-6 pl-20">
          <WindowsToolbar
            modulePath="/series"
            onAddNew={handleAddNew}
            onSave={handleSave}
            onClear={handleClear}
            onExit={handleExit}
            onUp={() => handleNavigation("up")}
            onDown={() => handleNavigation("down")}
            onSearch={handleSearch}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAudit={handleAudit}
            onPrint={handlePrint}
            onHelp={handleHelp}
          />

          {/* Error Alert */}
          {error && (
            <div className="bg-[#fff3cd] border border-[#ffeeba] rounded-[3px] p-4 mb-6 shadow-sm">
              <div className="flex">
                <div className="text-[#856404]">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-[#856404] hover:text-[#664d03]"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="fixed inset-0 backdrop-blur-sm bg-opacity-25 flex items-center justify-center z-50">
              <div className="bg-white rounded-[3px] p-6 shadow-lg border border-[#a0b3d6]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b5998] mx-auto"></div>
                <p className="mt-2 text-[#3b5998]">Loading...</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-lg shadow-md border border-[#a0b3d6] mb-6">
            <div className="px-6 py-4">
              <div className="relative">
                <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      Series Name *
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="Enter series name"
                      value={form.name}
                      onChange={handleNameInput}
                      onKeyDown={handleDropdownKeyDown}
                      disabled={!isFormEnabled || !!form._id}
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-white focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
                    />
                    {showDropdown && filteredSeries.length > 0 && (
                      <ul className="absolute z-10 bg-white border border-[#a0b3d6] rounded-[3px] shadow-lg max-h-60 overflow-auto w-full mt-1">
                        {filteredSeries.map((s, index) => (
                          <li
                            key={s._id}
                            onClick={() => selectSeries(s)}
                            className={`px-4 py-2 cursor-pointer ${
                              index === selectedDropdownIndex
                                ? "bg-[#d9e2ec] text-[#3b5998]"
                                : "hover:bg-[#f0f4f8]"
                            }`}
                          >
                            {s.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      Prefix *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., INV-"
                      value={form.prefix}
                      onChange={(e) =>
                        setForm({ ...form, prefix: e.target.value })
                      }
                      disabled={!isFormEnabled}
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-white focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      Suffix
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., -IN"
                      value={form.suffix}
                      onChange={(e) =>
                        setForm({ ...form, suffix: e.target.value })
                      }
                      disabled={!isFormEnabled}
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-white focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      Ongoing Series Number
                    </label>
                    <input
                      type="text"
                      value={getFormattedSeriesNumber(form)}
                      disabled
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-gray-100 text-[#3b5998] shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      Current Number
                    </label>
                    <input
                      type="number"
                      placeholder="1"
                      value={form.currentNumber}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          currentNumber: parseInt(e.target.value) || 1,
                        })
                      }
                      disabled={!isFormEnabled}
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-white focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      End Number *
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 599"
                      value={form.endNumber || 0}

                      onChange={(e) =>
  setForm({
    ...form,
    endNumber: e.target.value === '' ? 0 : parseInt(e.target.value) || 0,
  })
}
                      disabled={!isFormEnabled}
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-white focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      Padding (Digits)
                    </label>
                    <input
                      type="number"
                      placeholder="4"
                      value={form.padding}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          padding: parseInt(e.target.value) || 4,
                        })
                      }
                      disabled={!isFormEnabled}
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-white focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3b5998] mb-2">
                      Reset Frequency
                    </label>
                    <select
                      value={form.resetFrequency}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          resetFrequency: e.target.value as any,
                        })
                      }
                      disabled={!isFormEnabled}
                      className="w-full px-4 py-2 border border-[#a0b3d6] rounded-[3px] bg-white focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] disabled:bg-gray-100 disabled:text-gray-500 shadow-sm"
                    >
                      <option value="none">No Reset</option>
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm({ ...form, isActive: e.target.checked })
                        }
                        disabled={!isFormEnabled}
                        className="h-4 w-4 text-[#3b5998] focus:ring-[#3b5998] border-[#a0b3d6] rounded disabled:opacity-50"
                      />
                      <span className="ml-2 text-sm font-medium text-[#3b5998]">
                        Active Series
                      </span>
                    </label>
                  </div>
                </form>

                {(form.prefix || form.suffix || form.currentNumber) && (
                  <div className="mt-6 p-4 bg-[#e6effa] border border-[#a0b3d6] rounded-[3px] shadow-sm">
                    <h3 className="text-sm font-medium text-[#3b5998] mb-2">
                      Preview Format:
                    </h3>
                    <p className="text-lg font-mono text-[#3b5998]">
                      {form.prefix}
                      {form.currentNumber
                        .toString()
                        .padStart(form.padding, "0")}
                      {form.suffix}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Series List */}
          <div className="bg-white rounded-lg shadow-md border border-[#a0b3d6]">
            <div className="px-6 py-4 border-b border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec] flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[#3b5998]">
                Series List ({filteredSeries.length})
              </h2>
              <div className="flex items-center gap-2">
                <input
                  ref={seriesSearchRef}
                  type="text"
                  placeholder="Search series..."
                  value={seriesSearchQuery}
                  onChange={(e) => setSeriesSearchQuery(e.target.value)}
                  className="px-3 py-1 border border-[#a0b3d6] rounded-[3px] text-sm focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] bg-white shadow-sm"
                />
                {seriesSearchQuery && (
                  <button
                    onClick={() => setSeriesSearchQuery("")}
                    className="text-[#5f7a9d] hover:text-[#3b5998]"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-[#a0b3d6]">
              {paginatedSeries.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-[#5f7a9d]">
                    {series.length === 0
                      ? "No series found. Create your first series using the toolbar."
                      : "No series match the current search."}
                  </p>
                </div>
              ) : (
                paginatedSeries.map((s) => (
                  <div
                    key={s._id}
                    className={`px-6 py-4 hover:bg-[#f0f4f8] cursor-pointer transition-colors ${
                      form._id === s._id
                        ? "bg-[#e6effa] border-l-4 border-[#3b5998]"
                        : ""
                    }`}
                    onClick={() => selectSeries(s)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-[#3b5998]">
                          {s.name}
                        </h3>
                        <p className="text-sm text-[#5f7a9d] mt-1">
                          Format:{" "}
                          <span className="font-mono bg-[#e6effa] px-2 py-1 rounded-[3px]">
                            {s.prefix}
                            {s.currentNumber
                              .toString()
                              .padStart(s.padding, "0")}
                            {s.suffix}
                          </span>
                        </p>
                        <p className="text-sm text-[#5f7a9d] mt-1">
                          Ongoing Series Number:{" "}
                          <span className="font-mono bg-[#e6effa] px-2 py-1 rounded-[3px]">
                            {getFormattedSeriesNumber(s)}
                          </span>
                        </p>
                        <p className="text-sm text-[#5f7a9d] mt-1">
                          End Number:{" "}
                          <span className="font-mono bg-[#e6effa] px-2 py-1 rounded-[3px]">
                            {s.endNumber}
                          </span>
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-[#5f7a9d]">
                          <span>Reset: {s.resetFrequency}</span>
                          <span
                            className={`px-2 py-1 rounded-[3px] text-xs ${
                              s.isActive
                                ? "bg-[#dff0d8] text-[#3c763d]"
                                : "bg-[#f2dede] text-[#a94442]"
                            }`}
                          >
                            {s.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {totalSeriesPages > 1 && (
              <div className="px-6 py-4 border-t border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec] flex justify-between items-center">
                <div className="text-sm text-[#5f7a9d]">
                  Page {seriesPage} of {totalSeriesPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSeriesPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={seriesPage === 1}
                    className="px-3 py-1 bg-[#e6effa] text-[#3b5998] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9e2ec] shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setSeriesPage((prev) =>
                        Math.min(prev + 1, totalSeriesPages)
                      )
                    }
                    disabled={seriesPage === totalSeriesPages}
                    className="px-3 py-1 bg-[#e6effa] text-[#3b5998] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9e2ec] shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Popup */}
          {showSearchPopup && (
            <div
              className="fixed inset-0 backdrop-blur-sm bg-opacity-25 flex items-center justify-center z-50"
              onKeyDown={handleSearchKeyDown}
              tabIndex={0}
            >
              <div className="bg-white rounded-[3px] shadow-xl max-h-[80vh] overflow-auto w-full max-w-2xl mx-4 border border-[#a0b3d6]">
                <div className="px-6 py-4 border-b border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec]">
                  <h2 className="text-lg font-semibold text-[#3b5998]">
                    Search Series
                  </h2>
                </div>
                <div className="max-h-96 overflow-auto">
                  {series.map((s, index) => (
                    <div
                      key={s._id}
                      onClick={() => {
                        selectSeries(s);
                        setShowSearchPopup(false);
                      }}
                      className={`px-6 py-3 cursor-pointer border-b border-[#a0b3d6] ${
                        index === searchPopupIndex
                          ? "bg-[#d9e2ec]"
                          : "hover:bg-[#f0f4f8]"
                      }`}
                    >
                      <div className="font-medium text-[#3b5998]">{s.name}</div>
                      <div className="text-sm text-[#5f7a9d] font-mono">
                        {s.prefix}
                        {s.currentNumber.toString().padStart(s.padding, "0")}
                        {s.suffix}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec]">
                  <button
                    onClick={() => setShowSearchPopup(false)}
                    className="px-4 py-2 text-[#3b5998] hover:text-[#2a4373] font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audit Modal */}
          {showAuditModal && (
            <div className="fixed inset-0 backdrop-blur-sm bg-opacity-25 flex items-center justify-center z-50">
              <div className="bg-white rounded-[3px] shadow-xl max-w-5xl mx-4 max-h-[85vh] overflow-hidden border border-[#a0b3d6]">
                <div className="px-6 py-4 border-b border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec]">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-[#3b5998]">
                      Audit Logs ({filteredAuditLogs.length} of {auditLogs.length})
                    </h2>
                    <button
                      onClick={() => setShowAuditModal(false)}
                      className="text-[#5f7a9d] hover:text-[#3b5998]"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-4 flex gap-4 items-center flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-[#3b5998]">
                        Search:
                      </label>
                      <div className="relative">
                        <input
                          ref={auditSearchRef}
                          type="text"
                          placeholder="Search audit logs..."
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          className="px-3 py-1 border border-[#a0b3d6] rounded-[3px] text-sm focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] bg-white shadow-sm pr-8"
                        />
                        {auditSearchQuery && (
                          <button
                            onClick={() => setAuditSearchQuery("")}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#5f7a9d] hover:text-[#3b5998]"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-[#3b5998]">
                        Date:
                      </label>
                      <input
                        type="date"
                        value={auditDateFilter}
                        onChange={(e) => setAuditDateFilter(e.target.value)}
                        className="px-3 py-1 border border-[#a0b3d6] rounded-[3px] text-sm focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] bg-white shadow-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-[#3b5998]">
                        Action:
                      </label>
                      <select
                        value={auditActionFilter}
                        onChange={(e) => setAuditActionFilter(e.target.value)}
                        className="px-3 py-1 border border-[#a0b3d6] rounded-[3px] text-sm focus:ring-2 focus:ring-[#3b5998] focus:border-[#3b5998] text-[#3b5998] bg-white shadow-sm"
                      >
                        <option value="">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        setAuditDateFilter("");
                        setAuditActionFilter("");
                        setAuditSearchQuery("");
                      }}
                      className="px-3 py-1 bg-[#e6effa] text-[#3b5998] rounded-[3px] text-sm hover:bg-[#d9e2ec] focus:ring-2 focus:ring-[#3b5998] shadow-sm"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                <div className="overflow-auto max-h-[65vh]">
                  {paginatedAuditLogs.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-[#5f7a9d]">
                        {auditLogs.length === 0
                          ? "No audit logs found."
                          : "No logs match the current filters."}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-[#f0f4f8] sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#3b5998] uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#3b5998] uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#3b5998] uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#3b5998] uppercase tracking-wider">
                            Series
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#3b5998] uppercase tracking-wider">
                            Field Changed
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#3b5998] uppercase tracking-wider">
                            Old Value
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#3b5998] uppercase tracking-wider">
                            New Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#a0b3d6]">
                        {paginatedAuditLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-[#f0f4f8]">
                            <td className="px-4 py-4 text-sm text-[#5f7a9d] whitespace-nowrap">
                              <div>
                                <div className="font-medium">
                                  {new Date(log.timestamp).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-[#5f7a9d]">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#5f7a9d]">
                              <span className="font-medium">{log.userId}</span>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#5f7a9d]">
                              <span
                                className={`px-2 py-1 rounded-[3px] text-xs font-medium ${
                                  log.action === "create"
                                    ? "bg-[#dff0d8] text-[#3c763d]"
                                    : log.action === "update"
                                    ? "bg-[#d9e2ec] text-[#3b5998]"
                                    : log.action === "delete"
                                    ? "bg-[#f2dede] text-[#a94442]"
                                    : "bg-[#e6effa] text-[#3b5998]"
                                }`}
                              >
                                {log.action.charAt(0).toUpperCase() +
                                  log.action.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#3b5998] max-w-40">
                              <div
                                className="font-medium truncate"
                                title={getSeriesNameById(log.seriesId)}
                              >
                                {log.action === "create"
                                  ? log.newValue &&
                                    typeof log.newValue === "string"
                                    ? log.newValue
                                    : getSeriesNameById(log.seriesId)
                                  : getSeriesNameById(log.seriesId)}
                              </div>
                              {log.action === "create" && (
                                <div className="text-xs text-[#3c763d]">
                                  New series created
                                </div>
                              )}
                              {log.action === "delete" && (
                                <div className="text-xs text-[#a94442]">
                                  Series deleted
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#5f7a9d]">
                              {log.fieldName && log.fieldName !== "series" ? (
                                <span className="font-medium capitalize">
                                  {log.fieldName
                                    .replace(/([A-Z])/g, " $1")
                                    .trim()}
                                </span>
                              ) : log.action === "create" ? (
                                "All fields"
                              ) : log.action === "delete" ? (
                                "Entire record"
                              ) : (
                                "N/A"
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#5f7a9d] max-w-32">
                              {log.action === "create" ? (
                                <span className="text-gray-400 italic">None</span>
                              ) : log.action === "delete" ? (
                                <span className="text-[#a94442] font-medium">
                                  Existed
                                </span>
                              ) : (
                                <div
                                  className="truncate"
                                  title={
                                    log.oldValue !== null &&
                                    log.oldValue !== undefined
                                      ? String(log.oldValue)
                                      : "N/A"
                                  }
                                >
                                  {log.oldValue !== null &&
                                  log.oldValue !== undefined
                                    ? String(log.oldValue)
                                    : "N/A"}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm text-[#5f7a9d] max-w-32">
                              {log.action === "delete" ? (
                                <span className="text-[#a94442] font-medium">
                                  Deleted
                                </span>
                              ) : log.action === "create" ? (
                                <span className="text-[#3c763d] font-medium">
                                  Created
                                </span>
                              ) : (
                                <div
                                  className="truncate"
                                  title={
                                    log.newValue !== null &&
                                    log.newValue !== undefined
                                      ? String(log.newValue)
                                      : "N/A"
                                  }
                                >
                                  {log.newValue !== null &&
                                  log.newValue !== undefined
                                    ? String(log.newValue)
                                    : "N/A"
                                  }
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec] flex justify-between items-center">
                  <div className="text-sm text-[#5f7a9d]">
                    Showing {paginatedAuditLogs.length} of{" "}
                    {filteredAuditLogs.length} audit logs (Page {auditPage} of{" "}
                    {totalAuditPages})
                    {(auditDateFilter ||
                      auditActionFilter ||
                      auditSearchQuery ||
                      form._id) &&
                      " (filtered)"}
                  </div>
                  {totalAuditPages > 1 && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setAuditPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={auditPage === 1}
                        className="px-3 py-1 bg-[#e6effa] text-[#3b5998] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9e2ec] shadow-sm"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setAuditPage((prev) =>
                            Math.min(prev + 1, totalAuditPages)
                          )
                        }
                        disabled={auditPage === totalAuditPages}
                        className="px-3 py-1 bg-[#e6effa] text-[#3b5998] rounded-[3px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d9e2ec] shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Help Modal */}
          {showHelpModal && (
            <div className="fixed inset-0 backdrop-blur-sm bg-opacity-25 flex items-center justify-center z-50">
              <div className="bg-white rounded-[3px] shadow-xl max-w-2xl mx-4 border border-[#a0b3d6]">
                <div className="px-6 py-4 border-b border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec]">
                  <h2 className="text-lg font-semibold text-[#3b5998]">
                    Series Master Help
                  </h2>
                </div>
                <div className="px-6 py-4 max-h-96 overflow-auto">
                  <div className="space-y-4">
                    <p className="text-[#5f7a9d]">
                      The Series Master manages unique identifiers for documents
                      or transactions. Each series generates sequential numbers
                      with customizable formatting. Series names cannot be updated
                      once created.
                    </p>

                    <div className="bg-[#e6effa] p-4 rounded-[3px] border border-[#a0b3d6]">
                      <h3 className="font-medium text-[#3b5998] mb-2">
                        Field Descriptions:
                      </h3>
                      <ul className="space-y-2 text-sm text-[#5f7a9d]">
                        <li>
                          <strong>Series Name:</strong> Unique identifier for the
                          series (e.g., "Invoice Series"). Cannot be changed after creation.
                        </li>
                        <li>
                          <strong>Prefix:</strong> Text that appears before the
                          number (e.g., "INV-")
                        </li>
                        <li>
                          <strong>Suffix:</strong> Optional text that appears
                          after the number (e.g., "-IN")
                        </li>
                        <li>
                          <strong>Ongoing Series Number:</strong> The current counter
                          value and its formatted version (e.g., "50 (INV-0050-IN)")
                        </li>
                        <li>
                          <strong>Current Number:</strong> The current counter
                          value
                        </li>
                        <li>
                          <strong>End Number:</strong> The maximum number the series
                          can reach (e.g., 599)
                        </li>
                        <li>
                          <strong>Padding:</strong> Number of digits for the
                          counter (e.g., 4 for "0001")
                        </li>
                        <li>
                          <strong>Reset Frequency:</strong> When the counter
                          resets to 1
                        </li>
                        <li>
                          <strong>Active:</strong> Whether the series is currently
                          usable
                        </li>
                      </ul>
                    </div>

                    <div className="bg-[#d9e2ec] p-4 rounded-[3px] border border-[#a0b3d6]">
                      <h3 className="font-medium text-[#3b5998] mb-2">
                        Example:
                      </h3>
                      <p className="text-sm text-[#5f7a9d]">
                        With Prefix: "INV-", Current Number: 50, End Number: 599, Padding: 4,
                        Suffix: "-IN"
                      </p>
                      <p className="font-mono text-[#3b5998] mt-1">
                        Result: INV-0050-IN (Ongoing Series Number: 50 (INV-0050-IN))
                      </p>
                    </div>

                    <div className="bg-[#fff3cd] p-4 rounded-[3px] border border-[#ffeeba]">
                      <h3 className="font-medium text-[#856404] mb-2">Tips:</h3>
                      <ul className="space-y-1 text-sm text-[#856404]">
                        <li>
                          • Use keyboard arrows to navigate dropdown suggestions
                        </li>
                        <li>• Press Enter to select from dropdown</li>
                        <li>
                          • Use the search function (Ctrl+F) to quickly find
                          series
                        </li>
                        <li>
                          • Use the Increment button to advance the series number
                        </li>
                        <li>
                          • Reset frequencies help organize numbers by time
                          periods
                        </li>
                        <li>
                          • End Number prevents the series from exceeding a specified limit
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#a0b3d6] bg-gradient-to-b from-[#f0f4f8] to-[#d9e2ec] flex justify-end">
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="px-4 py-2 bg-[#3b5998] text-white rounded-[3px] hover:bg-[#2a4373] focus:ring-2 focus:ring-[#3b5998] focus:ring-offset-2 shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}