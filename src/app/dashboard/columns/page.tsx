"use client";
import { useState, useEffect, useRef } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ColumnDescription {
  prefix: string;
  carbonType: string;
  innerDiameter: string | number;
  length: string | number;
  particleSize: string | number;
  suffix: string;
  make: string;
}

interface Column {
  _id: string;
  columnCode: string;
  descriptions: ColumnDescription[];
  companyId: string;
  locationId: string;
}

interface Make {
  _id: string;
  make: string;
  companyId: string;
  locationId: string;
}

interface Audit {
  _id: string;
  action: string;
  userId: string;
  module: string;
  companyId: string;
  locationId: string;
  changes: any;
  timestamp: string;
}

export default function MasterColumn() {
  const { data: session } = useSession();
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [form, setForm] = useState({
    columnCode: "",
    descriptions: [
      {
        prefix: "",
        carbonType: "",
        innerDiameter: "",
        length: "",
        particleSize: "",
        suffix: "",
        make: "",
      },
    ],
  });
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [columnCodeFilter, setColumnCodeFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const columnCodeInputRef = useRef<HTMLInputElement>(null);
  const [carbonTypeDropdowns, setCarbonTypeDropdowns] = useState<{
    [key: number]: boolean;
  }>({});
  const [carbonTypeFilters, setCarbonTypeFilters] = useState<{
    [key: number]: string;
  }>({});
  const [carbonTypeSelectedIndex, setCarbonTypeSelectedIndex] = useState<{
    [key: number]: number;
  }>({});

  useEffect(() => {
    if (session?.user?.companies?.length) {
      setSelectedCompanyId(session.user.companies[0].companyId);
      setSelectedLocationId(session.user.companies[0].locations[0].locationId);
    }
  }, [session]);

  useEffect(() => {
    if (selectedCompanyId && selectedLocationId) {
      fetchColumns();
      fetchMakes();
    }
  }, [selectedCompanyId, selectedLocationId]);

  const fetchColumns = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/column?companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setColumns(data.data);
        const maxNum = data.data.reduce((max: number, col: Column) => {
          const num = parseInt(col.columnCode.replace("cl", "")) || 0;
          return Math.max(max, num);
        }, 0);
        setForm((prev) => ({
          ...prev,
          columnCode: `cl${(maxNum + 1).toString().padStart(2, "0")}`,
        }));
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMakes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/column/make?companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        const validMakes = data.data
          .filter(
            (make: Make) =>
              make &&
              typeof make.make === "string" &&
              make.make.trim().length > 0 &&
              make.companyId === selectedCompanyId &&
              make.locationId === selectedLocationId
          )
          .sort((a: Make, b: Make) => a.make.localeCompare(b.make));
        setMakes(validMakes);
        if (validMakes.length === 0) {
          setError("No makes found for the selected company and location.");
        }
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAudits = async () => {
    try {
      const response = await fetch(
        `/api/admin/column/audit?companyId=${selectedCompanyId}&locationId=${selectedLocationId}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setAudits(data.data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!form.columnCode.trim()) {
      errors.columnCode = "Column Code is required";
    }
    form.descriptions.forEach((desc, index) => {
      if (!desc.carbonType.trim())
        errors[`carbonType_${index}`] = "Carbon Type is required";
      if (desc.innerDiameter !== "" && isNaN(Number(desc.innerDiameter)))
        errors[`innerDiameter_${index}`] =
          "Inner Diameter must be a valid number";
      if (desc.innerDiameter !== "" && Number(desc.innerDiameter) <= 0)
        errors[`innerDiameter_${index}`] =
          "Inner Diameter must be greater than 0";
      if (desc.length !== "" && isNaN(Number(desc.length)))
        errors[`length_${index}`] = "Length must be a valid number";
      if (desc.length !== "" && Number(desc.length) <= 0)
        errors[`length_${index}`] = "Length must be greater than 0";
      if (desc.particleSize !== "" && isNaN(Number(desc.particleSize)))
        errors[`particleSize_${index}`] =
          "Particle Size must be a valid number";
      if (desc.particleSize !== "" && Number(desc.particleSize) <= 0)
        errors[`particleSize_${index}`] =
          "Particle Size must be greater than 0";
      if (!desc.make) errors[`make_${index}`] = "Make is required";
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = () => {
    setIsFormEnabled(true);
    setSelectedColumnId("");
    setForm({
      columnCode: form.columnCode,
      descriptions: [
        {
          prefix: "",
          carbonType: "",
          innerDiameter: "",
          length: "",
          particleSize: "",
          suffix: "",
          make: "",
        },
      ],
    });
    setFormErrors({});
    columnCodeInputRef.current?.focus();
    setShowTable(true); // Enable table button after Add
  };

  const carbonTypeMap: { [key: string]: string } = {
    C18: "L1",
    C8: "L7",
    L1: "C18",
    L7: "C8",
  };

  const handleSave = async () => {
    if (!isFormEnabled) return;
    if (!validateForm()) return;
    setLoading(true);
    try {
      const method = selectedColumnId ? "PUT" : "POST";
      const body = selectedColumnId ? { id: selectedColumnId, ...form } : form;
      const response = await fetch("/api/admin/column", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        await fetchColumns();
        handleClear();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setIsFormEnabled(false);
    setSelectedColumnId("");
    setForm({
      columnCode: form.columnCode,
      descriptions: [
        {
          prefix: "",
          carbonType: "",
          innerDiameter: "",
          length: "",
          particleSize: "",
          suffix: "",
          make: "",
        },
      ],
    });
    setFormErrors({});
    setColumnCodeFilter("");
    setSelectedIndex(-1);
    setShowTable(false); // Disable table button after Clear
  };

  const carbonTypeOptions = ["C18", "C8", "L1", "L7"];

  const getFilteredCarbonTypes = (filter: string) => {
    if (!filter) return carbonTypeOptions;
    return carbonTypeOptions.filter((option) =>
      option.toLowerCase().startsWith(filter.toLowerCase())
    );
  };

  const handleCarbonTypeChange = (index: number, value: string) => {
    handleDescriptionChange(index, "carbonType", value);
    setCarbonTypeFilters((prev) => ({ ...prev, [index]: value }));
    setCarbonTypeSelectedIndex((prev) => ({ ...prev, [index]: -1 }));
    const shouldShowDropdown =
      value.toLowerCase() === "c" ||
      value.toLowerCase() === "l" ||
      carbonTypeOptions.some((option) =>
        option.toLowerCase().startsWith(value.toLowerCase())
      );
    setCarbonTypeDropdowns((prev) => ({
      ...prev,
      [index]: shouldShowDropdown,
    }));
  };

  const handleCarbonTypeKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    const filter = carbonTypeFilters[index] || "";
    const filteredOptions = getFilteredCarbonTypes(filter);
    const currentSelectedIndex = carbonTypeSelectedIndex[index] || -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex =
        currentSelectedIndex < filteredOptions.length - 1
          ? currentSelectedIndex + 1
          : 0;
      setCarbonTypeSelectedIndex((prev) => ({ ...prev, [index]: newIndex }));
      setCarbonTypeDropdowns((prev) => ({ ...prev, [index]: true }));
      setShowTable(true); // Enable table button after ArrowDown
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex =
        currentSelectedIndex > 0
          ? currentSelectedIndex - 1
          : filteredOptions.length - 1;
      setCarbonTypeSelectedIndex((prev) => ({ ...prev, [index]: newIndex }));
      setCarbonTypeDropdowns((prev) => ({ ...prev, [index]: true }));
      setShowTable(true); // Enable table button after ArrowUp
    } else if (e.key === "Enter" && currentSelectedIndex >= 0) {
      e.preventDefault();
      const selectedOption = filteredOptions[currentSelectedIndex];
      handleDescriptionChange(index, "carbonType", selectedOption);
      setCarbonTypeFilters((prev) => ({ ...prev, [index]: selectedOption }));
      setCarbonTypeDropdowns((prev) => ({ ...prev, [index]: false }));
      setCarbonTypeSelectedIndex((prev) => ({ ...prev, [index]: -1 }));
    } else if (e.key === "Escape") {
      setCarbonTypeDropdowns((prev) => ({ ...prev, [index]: false }));
      setCarbonTypeSelectedIndex((prev) => ({ ...prev, [index]: -1 }));
    }
  };

  const handleCarbonTypeSelect = (index: number, option: string) => {
    handleDescriptionChange(index, "carbonType", option);
    setCarbonTypeFilters((prev) => ({ ...prev, [index]: option }));
    setCarbonTypeDropdowns((prev) => ({ ...prev, [index]: false }));
    setCarbonTypeSelectedIndex((prev) => ({ ...prev, [index]: -1 }));
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (!columns.length) return;
    const currentIndex = columns.findIndex(
      (col) => col._id === selectedColumnId
    );
    const nextIndex = currentIndex > 0 ? currentIndex - 1 : columns.length - 1;
    const selectedColumn = columns[nextIndex];
    setSelectedColumnId(selectedColumn._id);
    setForm({
      ...selectedColumn,
      descriptions: selectedColumn.descriptions.map((desc) => ({
        ...desc,
        innerDiameter: desc.innerDiameter.toString(),
        length: desc.length.toString(),
        particleSize: desc.particleSize.toString(),
      })),
    });
    setShowTable(true); // Enable table button after Up
  };

  const handleDown = () => {
    if (!columns.length) return;
    const currentIndex = columns.findIndex(
      (col) => col._id === selectedColumnId
    );
    const nextIndex = currentIndex < columns.length - 1 ? currentIndex + 1 : 0;
    const selectedColumn = columns[nextIndex];
    setSelectedColumnId(selectedColumn._id);
    setForm({
      ...selectedColumn,
      descriptions: selectedColumn.descriptions.map((desc) => ({
        ...desc,
        innerDiameter: desc.innerDiameter.toString(),
        length: desc.length.toString(),
        particleSize: desc.particleSize.toString(),
      })),
    });
    setShowTable(true); // Enable table button after Down
  };

  const handleSearch = () => {
    setShowSearchModal(true);
    setColumnCodeFilter("");
    setSelectedIndex(-1);
  };

  const handleEdit = () => {
    if (selectedColumnId) {
      setIsFormEnabled(true);
      const column = columns.find((col) => col._id === selectedColumnId);
      if (column) {
        setForm({
          ...column,
          descriptions: column.descriptions.map((desc) => ({
            ...desc,
            innerDiameter: desc.innerDiameter.toString(),
            length: desc.length.toString(),
            particleSize: desc.particleSize.toString(),
          })),
        });
      }
    }
    setShowTable(true); // Enable table button after Edit
  };

  const handleDelete = async () => {
    if (!selectedColumnId) return;
    if (!confirm("Are you sure you want to delete this column?")) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/column", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedColumnId }),
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        await fetchColumns();
        handleClear();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAudit = async () => {
    await fetchAudits();
    setShowAuditModal(true);
  };

  const handlePrint = () => {
    const printContent = `
      <h1>Column Master</h1>
      <table border="1">
        <thead>
          <tr>
            <th>Serial No</th>
            <th>Column Code</th>
            <th>Column Description</th>
            <th>Make</th>
          </tr>
        </thead>
        <tbody>
          ${columns
            .flatMap((column, index) =>
              column.descriptions.map(
                (desc) => `
            <tr>
              <td>${index + 1}</td>
              <td>${column.columnCode}</td>
              <td>${desc.prefix} ${desc.carbonType} ${desc.innerDiameter} x ${desc.length} ${desc.particleSize}µm ${desc.suffix}</td>
              <td>${desc.make}</td>
            </tr>
          `
              )
            )
            .join("")}
        </tbody>
      </table>
    `;
    const printWindow = window.open("", "_blank");
    printWindow?.document.write(`
      <html>
        <head><title>Print Column Master</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  const handleAddDescription = () => {
    setForm((prev) => ({
      ...prev,
      descriptions: [
        ...prev.descriptions,
        {
          prefix: "",
          carbonType: "",
          innerDiameter: "",
          length: "",
          particleSize: "",
          suffix: "",
          make: "",
        },
      ],
    }));
    setFormErrors({});
  };

  const handleCopyDescription = (index: number) => {
    if (index > 0) {
      const prevDesc = form.descriptions[index - 1];
      setForm((prev) => {
        const newDescriptions = [...prev.descriptions];
        newDescriptions[index] = { ...prevDesc };
        return { ...prev, descriptions: newDescriptions };
      });
    } else {
      setError("No previous description to copy from. Please add a description above first.");
    }
  };

  const handleRemoveDescription = (index: number) => {
    if (form.descriptions.length === 1) {
      setError("At least one description is required.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      descriptions: prev.descriptions.filter((_, i) => i !== index),
    }));
    setFormErrors({});
  };

  const handleDescriptionChange = (
    index: number,
    field: keyof ColumnDescription,
    value: string | number
  ) => {
    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = { ...newDescriptions[index], [field]: value };
      return { ...prev, descriptions: newDescriptions };
    });
    setFormErrors((prev) => ({ ...prev, [`${field}_${index}`]: "" }));
  };

  const handleColumnCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColumnCodeFilter(e.target.value);
    setForm((prev) => ({ ...prev, columnCode: e.target.value }));
    setSelectedIndex(-1);
    setFormErrors((prev) => ({ ...prev, columnCode: "" }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filteredColumns = columns.filter((col) =>
      col.columnCode.toLowerCase().startsWith(columnCodeFilter.toLowerCase())
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredColumns.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredColumns.length - 1
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const selectedColumn = filteredColumns[selectedIndex];
      setForm({
        ...selectedColumn,
        descriptions: selectedColumn.descriptions.map((desc) => ({
          ...desc,
          innerDiameter: desc.innerDiameter.toString(),
          length: desc.length.toString(),
          particleSize: desc.particleSize.toString(),
        })),
      });
      setSelectedColumnId(selectedColumn._id);
      setColumnCodeFilter("");
      setSelectedIndex(-1);
    }
  };

  const handleSearchSelect = (column: Column) => {
    setForm({
      ...column,
      descriptions: column.descriptions.map((desc) => ({
        ...desc,
        innerDiameter: desc.innerDiameter.toString(),
        length: desc.length.toString(),
        particleSize: desc.particleSize.toString(),
      })),
    });
    setSelectedColumnId(column._id);
    setShowSearchModal(false);
    setColumnCodeFilter("");
    setSelectedIndex(-1);
  };

  const handleTableRowClick = (column: Column) => {
    setSelectedColumnId(column._id);
    setForm({
      ...column,
      descriptions: column.descriptions.map((desc) => ({
        ...desc,
        innerDiameter: desc.innerDiameter.toString(),
        length: desc.length.toString(),
        particleSize: desc.particleSize.toString(),
      })),
    });
  };

  const handleShowTable = () => {
    setShowTable(true);
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <div
        className="min-h-screen bg-gradient-to-b from-[#d7e6f5] to-[#a0b7d0] ml-[60px] p-4"
        style={{ fontFamily: "Verdana, Arial, sans-serif" }}
      >
        <WindowsToolbar
          modulePath="/dashboard/columns"
          onAddNew={handleAdd}
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
        <div className="max-w-5xl mx-auto bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.2)] p-6 backdrop-blur-sm bg-opacity-80">
          <h1 className="text-2xl font-bold mb-4 text-[#003087] text-shadow-sm">
            Column Master
          </h1>
          {error && (
            <p className="text-red-500 mb-4 bg-[#ffe6e6] p-2 rounded border border-red-300">
              {error}
            </p>
          )}
          {loading && (
            <p className="text-[#0052cc] mb-4 bg-[#e6f0ff] p-2 rounded border border-[#add8e6]">
              Loading...
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="mb-8"
          >
            {session?.user.role === "admin" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#003087] mb-1">
                    Company
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      const company = session?.user.companies.find(
                        (c: any) => c.companyId === e.target.value
                      );
                      setSelectedLocationId(
                        company?.locations[0]?.locationId || ""
                      );
                    }}
                    className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                    disabled={!isFormEnabled}
                  >
                    {session?.user.companies.map((company: any) => (
                      <option key={company.companyId} value={company.companyId}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#003087] mb-1">
                    Location
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                    disabled={!isFormEnabled}
                  >
                    {session?.user.companies
                      .find((c: any) => c.companyId === selectedCompanyId)
                      ?.locations.map((location: any) => (
                        <option
                          key={location.locationId}
                          value={location.locationId}
                        >
                          {location.name}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}
            <div className="mb-4 relative">
              <label className="block text-sm font-medium text-[#003087] mb-1">
                Column Code
              </label>
              <input
                type="text"
                value={form.columnCode}
                onChange={handleColumnCodeChange}
                onKeyDown={handleKeyDown}
                ref={columnCodeInputRef}
                className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                disabled={!isFormEnabled}
                required
              />
              {formErrors.columnCode && (
                <p className="text-red-500 text-xs mt-1">
                  {formErrors.columnCode}
                </p>
              )}
              {columnCodeFilter && (
                <div className="absolute z-10 w-full bg-[#f8f8f8] border-2 border-[#3a6ea5] rounded-lg mt-1 max-h-40 overflow-y-auto shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                  {columns
                    .filter((col) =>
                      col.columnCode
                        .toLowerCase()
                        .startsWith(columnCodeFilter.toLowerCase())
                    )
                    .map((col, index) => (
                      <div
                        key={col._id}
                        className={`p-2 cursor-pointer ${
                          index === selectedIndex
                            ? "bg-[#add8e6]"
                            : "hover:bg-[#d7e6f5]"
                        }`}
                        onClick={() => handleSearchSelect(col)}
                      >
                        {col.columnCode}
                      </div>
                    ))}
                </div>
              )}
            </div>
            {form.descriptions.map((desc, index) => (
              <div
                key={index}
                className="mb-4 border-2 border-[#3a6ea5] p-4 rounded-lg bg-[#f8f8f8] shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-[#003087]">
                    Description {index + 1}
                  </h3>
                  {isFormEnabled && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyDescription(index)}
                        className="bg-[#0052cc] text-white px-3 py-1 rounded hover:bg-[#003087] active:bg-[#002060] transition-all shadow-sm"
                        title="Copy from previous description"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDescription(index)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 active:bg-red-700 transition-all shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      value={desc.prefix}
                      onChange={(e) =>
                        handleDescriptionChange(index, "prefix", e.target.value)
                      }
                      className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                      disabled={!isFormEnabled}
                    />
                    {formErrors[`prefix_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`prefix_${index}`]}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Carbon Type
                    </label>
                    <input
                      type="text"
                      value={desc.carbonType}
                      onChange={(e) =>
                        handleCarbonTypeChange(index, e.target.value)
                      }
                      onKeyDown={(e) => handleCarbonTypeKeyDown(e, index)}
                      onFocus={() => {
                        const filter = desc.carbonType;
                        setCarbonTypeFilters((prev) => ({
                          ...prev,
                          [index]: filter,
                        }));
                        const shouldShow =
                          filter.toLowerCase() === "c" ||
                          filter.toLowerCase() === "l" ||
                          carbonTypeOptions.some((option) =>
                            option
                              .toLowerCase()
                              .startsWith(filter.toLowerCase())
                          );
                        setCarbonTypeDropdowns((prev) => ({
                          ...prev,
                          [index]: shouldShow,
                        }));
                      }}
                      onBlur={(e) => {
                        setTimeout(() => {
                          setCarbonTypeDropdowns((prev) => ({
                            ...prev,
                            [index]: false,
                          }));
                        }, 150);
                      }}
                      className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                      disabled={!isFormEnabled}
                      required
                      placeholder="Type C or L to see options"
                    />
                    {formErrors[`carbonType_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`carbonType_${index}`]}
                      </p>
                    )}
                    {carbonTypeDropdowns[index] && isFormEnabled && (
                      <div className="absolute z-10 w-full bg-[#f8f8f8] border-2 border-[#3a6ea5] rounded-lg mt-1 max-h-32 overflow-y-auto shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                        {getFilteredCarbonTypes(
                          carbonTypeFilters[index] || ""
                        ).map((option, optionIndex) => (
                          <div
                            key={option}
                            className={`p-2 cursor-pointer ${
                              optionIndex ===
                              (carbonTypeSelectedIndex[index] || -1)
                                ? "bg-[#add8e6]"
                                : "hover:bg-[#d7e6f5]"
                            }`}
                            onClick={() =>
                              handleCarbonTypeSelect(index, option)
                            }
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Inner Diameter (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={desc.innerDiameter}
                      onChange={(e) =>
                        handleDescriptionChange(
                          index,
                          "innerDiameter",
                          e.target.value
                        )
                      }
                      className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                      disabled={!isFormEnabled}
                      required
                    />
                    {formErrors[`innerDiameter_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`innerDiameter_${index}`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={desc.length}
                      onChange={(e) =>
                        handleDescriptionChange(index, "length", e.target.value)
                      }
                      className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                      disabled={!isFormEnabled}
                      required
                    />
                    {formErrors[`length_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`length_${index}`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Particle Size (µm)
                    </label>
                    <input
                      type="number"
                      value={desc.particleSize}
                      onChange={(e) =>
                        handleDescriptionChange(
                          index,
                          "particleSize",
                          e.target.value
                        )
                      }
                      className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                      disabled={!isFormEnabled}
                      required
                    />
                    {formErrors[`particleSize_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`particleSize_${index}`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Suffix
                    </label>
                    <input
                      type="text"
                      value={desc.suffix}
                      onChange={(e) =>
                        handleDescriptionChange(index, "suffix", e.target.value)
                      }
                      className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                      disabled={!isFormEnabled}
                    />
                    {formErrors[`suffix_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`suffix_${index}`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Make
                    </label>
                    <select
                      value={desc.make}
                      onChange={(e) =>
                        handleDescriptionChange(index, "make", e.target.value)
                      }
                      className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] disabled:bg-[#e0e0e0] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                      disabled={!isFormEnabled}
                      required
                    >
                      <option value="">Select Make</option>
                      {makes.map((make) => (
                        <option key={make._id} value={make.make}>
                          {make.make}
                        </option>
                      ))}
                    </select>
                    {formErrors[`make_${index}`] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors[`make_${index}`]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isFormEnabled && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddDescription}
                  className="bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] active:bg-[#002060] transition-all shadow-sm"
                >
                  Add Description
                </button>
              </div>
            )}
          </form>
          <div className="mb-4">
            <button
              type="button"
              onClick={handleShowTable}
              className={`bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] active:bg-[#002060] transition-all shadow-sm ${
                !showTable && !isFormEnabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!showTable && !isFormEnabled}
            >
              Show Table
            </button>
          </div>
          {showTable && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-[#003087] text-shadow-sm">
                Columns
              </h2>
              <div className="overflow-x-auto border-2 border-gray-300 rounded-lg shadow-sm">
                <table className="w-full border-collapse border border-gray-300 bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-gray-700 font-semibold">Serial No</th>
                      <th className="border border-gray-300 p-2 text-gray-700 font-semibold">Column Code</th>
                      <th className="border border-gray-300 p-2 text-gray-700 font-semibold">Column Description</th>
                      <th className="border border-gray-300 p-2 text-gray-700 font-semibold">Make</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.flatMap((column, colIndex) =>
                      column.descriptions.map((desc, descIndex) => (
                        <tr
                          key={`${column._id}-${descIndex}`}
                          className={`cursor-pointer ${
                            column._id === selectedColumnId
                              ? "bg-gray-200"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => handleTableRowClick(column)}
                        >
                          <td className="border border-gray-300 p-2">{colIndex + 1}</td>
                          <td className="border border-gray-300 p-2">{column.columnCode}</td>
                          <td className="border border-gray-300 p-2">
                            {desc.prefix} {desc.carbonType} {desc.innerDiameter} x {desc.length} {desc.particleSize}µm {desc.suffix}
                          </td>
                          <td className="border border-gray-300 p-2">
                            {desc.make}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-md w-full shadow-[0_4px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm bg-opacity-80">
              <h2 className="text-lg font-bold mb-2 text-[#003087] text-shadow-sm">
                Search Columns
              </h2>
              <input
                type="text"
                value={columnCodeFilter}
                onChange={(e) => setColumnCodeFilter(e.target.value)}
                onKeyDown={(e) => {
                  const filteredColumns = columns.filter((col) =>
                    col.columnCode
                      .toLowerCase()
                      .includes(columnCodeFilter.toLowerCase())
                  );
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                      prev < filteredColumns.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                      prev > 0 ? prev - 1 : filteredColumns.length - 1
                    );
                  } else if (e.key === "Enter" && selectedIndex >= 0) {
                    e.preventDefault();
                    handleSearchSelect(filteredColumns[selectedIndex]);
                  }
                }}
                className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] focus:outline-none focus:ring-2 focus:ring-[#add8e6] transition-all"
                placeholder="Search column code..."
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto mt-2">
                {columns
                  .filter((col) =>
                    col.columnCode
                      .toLowerCase()
                      .includes(columnCodeFilter.toLowerCase())
                  )
                  .map((col, index) => (
                    <div
                      key={col._id}
                      className={`p-2 cursor-pointer ${
                        index === selectedIndex
                          ? "bg-[#add8e6]"
                          : "hover:bg-[#d7e6f5]"
                      }`}
                      onClick={() => handleSearchSelect(col)}
                    >
                      {col.columnCode}
                    </div>
                  ))}
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="mt-2 bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] active:bg-[#002060] transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
        {showAuditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-[0_4px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm bg-opacity-80">
              <h2 className="text-lg font-bold mb-2 text-[#003087] text-shadow-sm">
                Audit Logs
              </h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#add8e6] to-[#8ab4f8]">
                    <th className="border border-[#3a6ea5] p-2 text-[#003087] font-semibold">
                      Timestamp
                    </th>
                    <th className="border border-[#3a6ea5] p-2 text-[#003087] font-semibold">
                      Action
                    </th>
                    <th className="border border-[#3a6ea5] p-2 text-[#003087] font-semibold">
                      User ID
                    </th>
                    <th className="border border-[#3a6ea5] p-2 text-[#003087] font-semibold">
                      Changes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit._id}>
                      <td className="border border-[#3a6ea5] p-2">
                        {new Date(audit.timestamp).toLocaleString()}
                      </td>
                      <td className="border border-[#3a6ea5] p-2">
                        {audit.action}
                      </td>
                      <td className="border border-[#3a6ea5] p-2">
                        {audit.userId}
                      </td>
                      <td className="border border-[#3a6ea5] p-2">
                        <pre>{JSON.stringify(audit.changes, null, 2)}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => setShowAuditModal(false)}
                className="mt-2 bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] active:bg-[#002060] transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-md w-full shadow-[0_4px_8px_rgba(0,0,0,0.2)] backdrop-blur-sm bg-opacity-80">
              <h2 className="text-lg font-bold mb-2 text-[#003087] text-shadow-sm">
                Help
              </h2>
              <p className="mb-2">
                Use the Column Master to manage column data:
              </p>
              <ul className="list-disc pl-5 mb-4">
                <li>
                  <strong>Add (F1)</strong>: Enable form to add a new column.
                </li>
                <li>
                  <strong>Save (F2)</strong>: Save the current form data.
                </li>
                <li>
                  <strong>Clear (F3)</strong>: Reset the form and disable inputs.
                </li>
                <li>
                  <strong>Exit (F4)</strong>: Return to dashboard.
                </li>
                <li>
                  <strong>Up (F5) / Down (F6)</strong>: Navigate through columns.
                </li>
                <li>
                  <strong>Search (F7)</strong>: Open search modal to select a column.
                </li>
                <li>
                  <strong>Edit (F9)</strong>: Enable form to edit selected column.
                </li>
                <li>
                  <strong>Delete (F10)</strong>: Delete the selected column.
                </li>
                <li>
                  <strong>Audit (F11)</strong>: View audit logs of CRUD operations.
                </li>
                <li>
                  <strong>Print (F12)</strong>: Print the column list.
                </li>
                <li>
                  <strong>Help (Ctrl+H)</strong>: Show this help dialog.
                </li>
              </ul>
              <button
                onClick={() => setShowHelpModal(false)}
                className="bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] active:bg-[#002060] transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}