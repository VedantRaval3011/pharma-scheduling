"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";

interface DropdownSelectedIndex {
  bufferName: number;
  solventName: number;
  chemicals: number[];
  search: number;
}

interface Chemical {
  _id: string;
  chemicalName: string;
  isSolvent: boolean;
  isBuffer: boolean;
}

interface MobilePhase {
  _id: string;
  mobilePhaseId: string;
  mobilePhaseCode: string;
  isSolvent: boolean;
  isBuffer: boolean;
  bufferName?: string;
  solventName?: string;
  chemicals: string[];
  dilutionFactor?: number;
  pHValue?: number;
  description?: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function MobilePhaseMaster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobilePhases, setMobilePhases] = useState<MobilePhase[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    mobilePhaseId: "",
    mobilePhaseCode: "",
    isSolvent: false,
    isBuffer: false,
    bufferName: "",
    solventName: "",
    chemicals: ["", "", "", "", ""], // Default 5 slots
    dilutionFactor: "",
    pHValue: "",
    description: "",
  });
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMobilePhaseIndex, setCurrentMobilePhaseIndex] = useState(-1);
  const [selectedMobilePhase, setSelectedMobilePhase] =
    useState<MobilePhase | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState({
    bufferName: false,
    solventName: false,
    chemicals: [false, false, false, false, false],
  });
  const [dropdownSelectedIndex, setDropdownSelectedIndex] =
    useState<DropdownSelectedIndex>({
      bufferName: -1,
      solventName: -1,
      chemicals: [-1, -1, -1, -1, -1],
      search: -1,
    });
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [filterSolvent, setFilterSolvent] = useState(false);
  const [filterBuffer, setFilterBuffer] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'mobilePhaseCode'>('name'); // Default to name
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');


  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const auditSearchInputRef = useRef<HTMLInputElement>(null);
  const bufferNameRef = useRef<HTMLInputElement>(null);
  const solventNameRef = useRef<HTMLInputElement>(null);
  const chemicalRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      const storedCompanyId = localStorage.getItem("companyId");
      const storedLocationId = localStorage.getItem("locationId");
      if (storedCompanyId && storedLocationId) {
        setCompanyId(storedCompanyId);
        setLocationId(storedLocationId);
      } else {
        setError("Company ID or Location ID not found in localStorage");
        setLoading(false);
      }
    }
  }, [status, router]);

 


  const fetchChemicals = async () => {
    try {
      if (!companyId || !locationId) return;
      const response = await fetch(
        `/api/admin/chemical?companyId=${companyId}&locationId=${locationId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setChemicals(data.data);
      } else {
        setError(data.error || "Failed to fetch chemicals");
      }
    } catch (err: any) {
      setError(`Failed to fetch chemicals: ${err.message}`);
    }
  };

  const fetchMobilePhases = async () => {
    if (!companyId || !locationId) {
      setError("Please ensure company and location are set in localStorage");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/mobile-phase?companyId=${companyId}&locationId=${locationId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        const validMobilePhases = data.data
          .filter(
            (mp: MobilePhase) =>
              mp.mobilePhaseId &&
              mp.mobilePhaseCode &&
              mp.companyId === companyId &&
              mp.locationId === locationId
          )
          ;
        setMobilePhases(validMobilePhases);
        if (validMobilePhases.length < data.data.length) {
          setError(
            `Warning: ${
              data.data.length - validMobilePhases.length
            } invalid mobile phases filtered out.`
          );
        } else if (validMobilePhases.length === 0) {
          setError(
            "No mobile phases found for the selected company and location."
          );
        }
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err: any) {
      setError(
        err.message.includes("401")
          ? "Unauthorized access. Please log in again."
          : `Failed to fetch mobile phases: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const generateMobilePhaseId = async () => {
    try {
      const response = await fetch(
        `/api/admin/mobile-phase?companyId=${companyId}&locationId=${locationId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        const count = data.data.length + 1;
        return `MP${count.toString().padStart(2, "0")}`;
      }
      return "MP01";
    } catch {
      return "MP01";
    }
  };

  const logAuditAction = async (
    action: string,
    data: any,
    previousData?: any
  ) => {
    try {
      if (!companyId || !locationId) return;
      await fetch("/api/admin/mobile-phase/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id || "system",
          action,
          mobilePhaseId: data.mobilePhaseId,
          data,
          previousData,
          companyId,
          locationId,
          timestamp: new Date().toISOString(),
        }),
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to log audit action:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      if (!companyId || !locationId) return;
      const queryParams = new URLSearchParams({ companyId, locationId });
      if (selectedMobilePhase)
        queryParams.append("mobilePhaseId", selectedMobilePhase.mobilePhaseId);
      if (auditSearchTerm) queryParams.append("searchTerm", auditSearchTerm);
      if (auditActionFilter) queryParams.append("action", auditActionFilter);
      if (auditStartDate) queryParams.append("startDate", auditStartDate);
      if (auditEndDate) queryParams.append("endDate", auditEndDate);

      const response = await fetch(
        `/api/admin/mobile-phase/audit?${queryParams.toString()}`
      );
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.data);
      } else {
        setError(data.error || "Failed to fetch audit logs");
      }
    } catch {
      setError("Failed to fetch audit logs");
    }
  };

  useEffect(() => {
    if (companyId && locationId) {
      fetchChemicals();
      fetchMobilePhases();
    }
  }, [companyId, locationId]);

  const displayedMobilePhases = mobilePhases.filter((mp) => {
    if (!filterSolvent && !filterBuffer) return true;
    if (filterSolvent && filterBuffer) return mp.isSolvent && mp.isBuffer;
    if (filterSolvent) return mp.isSolvent;
    if (filterBuffer) return mp.isBuffer;
    return false;
  });

   const sortedMobilePhases = displayedMobilePhases.sort((a, b) => {
  let aValue: string;
  let bValue: string;
  
  if (sortBy === 'name') {
    // Sort by buffer name or solvent name
    aValue = (a.bufferName || a.solventName || '').toLowerCase();
    bValue = (b.bufferName || b.solventName || '').toLowerCase();
  } else {
    // Sort by mobile phase code
    aValue = a.mobilePhaseCode.toLowerCase();
    bValue = b.mobilePhaseCode.toLowerCase();
  }
  
  const comparison = aValue.localeCompare(bValue);
  return sortOrder === 'asc' ? comparison : -comparison;
});

  const handleAddNew = async () => {
    const newMobilePhaseId = await generateMobilePhaseId();
    setIsFormEnabled(true);
    setIsEditMode(false);
    setFormData({
      mobilePhaseId: newMobilePhaseId,
      mobilePhaseCode: newMobilePhaseId,
      isSolvent: false,
      isBuffer: false,
      bufferName: "",
      solventName: "",
      chemicals: ["", "", "", "", ""],
      dilutionFactor: "",
      pHValue: "",
      description: "",
    });
    setSelectedMobilePhase(null);
    setCurrentMobilePhaseIndex(-1);
    setShowFormModal(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (
      !isFormEnabled ||
      !formData.mobilePhaseId ||
      !formData.mobilePhaseCode
    ) {
      setError("Mobile Phase ID and Code are required");
      return;
    }
    if (formData.isBuffer && !formData.chemicals[0]) {
      setError(
        "Buffer Name, pH Value, and at least one chemical are required for buffers"
      );
      return;
    }
    if (formData.isSolvent && !formData.solventName) {
      setError("Solvent Name is required for solvents");
      return;
    }
    if (!formData.isSolvent && !formData.isBuffer) {
      setError("Please select either Solvent or Buffer");
      return;
    }

    try {
      if (!companyId || !locationId) {
        setError("Company ID or Location ID not found in localStorage");
        return;
      }

      const url = "/api/admin/mobile-phase";
      const method = isEditMode && selectedMobilePhase ? "PUT" : "POST";
      const body = {
        id:
          isEditMode && selectedMobilePhase
            ? selectedMobilePhase._id
            : undefined,
        mobilePhaseId: formData.mobilePhaseId,
        mobilePhaseCode: formData.mobilePhaseCode,
        isSolvent: formData.isSolvent,
        isBuffer: formData.isBuffer,
        bufferName: formData.isBuffer ? formData.bufferName : undefined,
        solventName: formData.isSolvent ? formData.solventName : undefined,
        chemicals: formData.chemicals.filter((id) => id), // Only include non-empty chemical IDs
        dilutionFactor: formData.dilutionFactor
          ? parseFloat(formData.dilutionFactor)
          : undefined,
        pHValue:
          formData.isBuffer && formData.pHValue
            ? parseFloat(formData.pHValue)
            : undefined,
        description: formData.description,
        companyId,
        locationId,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await logAuditAction(
          isEditMode && selectedMobilePhase ? "UPDATE" : "CREATE",
          body,
          isEditMode && selectedMobilePhase
            ? {
                mobilePhaseId: selectedMobilePhase.mobilePhaseId,
                mobilePhaseCode: selectedMobilePhase.mobilePhaseCode,
                isSolvent: selectedMobilePhase.isSolvent,
                isBuffer: selectedMobilePhase.isBuffer,
                bufferName: selectedMobilePhase.bufferName,
                solventName: selectedMobilePhase.solventName,
                chemicals: selectedMobilePhase.chemicals,
                dilutionFactor: selectedMobilePhase.dilutionFactor,
                pHValue: selectedMobilePhase.pHValue,
                description: selectedMobilePhase.description,
                companyId: selectedMobilePhase.companyId,
                locationId: selectedMobilePhase.locationId,
              }
            : null
        );

        setFormData({
          mobilePhaseId: "",
          mobilePhaseCode: "",
          isSolvent: false,
          isBuffer: false,
          bufferName: "",
          solventName: "",
          chemicals: ["", "", "", "", ""],
          dilutionFactor: "",
          pHValue: "",
          description: "",
        });
        setIsFormEnabled(false);
        setIsEditMode(false);
        setSelectedMobilePhase(null);
        setCurrentMobilePhaseIndex(-1);
        setShowFormModal(false);
        await fetchMobilePhases();
      } else {
        setError(data.error || "Failed to save mobile phase");
      }
    } catch (err: any) {
      setError(`Failed to save mobile phase: ${err.message}`);
    }
  };

  const handleClear = () => {
    setFormData({
      mobilePhaseId: "",
      mobilePhaseCode: "",
      isSolvent: false,
      isBuffer: false,
      bufferName: "",
      solventName: "",
      chemicals: ["", "", "", "", ""],
      dilutionFactor: "",
      pHValue: "",
      description: "",
    });
    setIsFormEnabled(false);
    setIsEditMode(false);
    setSelectedMobilePhase(null);
    setCurrentMobilePhaseIndex(-1);
    setShowDropdown({
      bufferName: false,
      solventName: false,
      chemicals: [false, false, false, false, false],
    });
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentMobilePhaseIndex > 0) {
      const newIndex = currentMobilePhaseIndex - 1;
      setCurrentMobilePhaseIndex(newIndex);
      const mp = displayedMobilePhases[newIndex];
      setSelectedMobilePhase(mp);
      setFormData({
        mobilePhaseId: mp.mobilePhaseId,
        mobilePhaseCode: mp.mobilePhaseCode,
        isSolvent: mp.isSolvent,
        isBuffer: mp.isBuffer,
        bufferName: mp.bufferName || "",
        solventName: mp.solventName || "",
        chemicals: [
          ...mp.chemicals,
          ...Array(5 - mp.chemicals.length).fill(""),
        ],
        dilutionFactor: mp.dilutionFactor?.toString() || "",
        pHValue: mp.pHValue?.toString() || "",
        description: mp.description || "",
      });
    }
  };

  const handleDown = () => {
    if (currentMobilePhaseIndex < displayedMobilePhases.length - 1) {
      const newIndex = currentMobilePhaseIndex + 1;
      setCurrentMobilePhaseIndex(newIndex);
      const mp = displayedMobilePhases[newIndex];
      setSelectedMobilePhase(mp);
      setFormData({
        mobilePhaseId: mp.mobilePhaseId,
        mobilePhaseCode: mp.mobilePhaseCode,
        isSolvent: mp.isSolvent,
        isBuffer: mp.isBuffer,
        bufferName: mp.bufferName || "",
        solventName: mp.solventName || "",
        chemicals: [
          ...mp.chemicals,
          ...Array(5 - mp.chemicals.length).fill(""),
        ],
        dilutionFactor: mp.dilutionFactor?.toString() || "",
        pHValue: mp.pHValue?.toString() || "",
        description: mp.description || "",
      });
    } else if (
      currentMobilePhaseIndex === -1 &&
      displayedMobilePhases.length > 0
    ) {
      setCurrentMobilePhaseIndex(0);
      const mp = displayedMobilePhases[0];
      setSelectedMobilePhase(mp);
      setFormData({
        mobilePhaseId: mp.mobilePhaseId,
        mobilePhaseCode: mp.mobilePhaseCode,
        isSolvent: mp.isSolvent,
        isBuffer: mp.isBuffer,
        bufferName: mp.bufferName || "",
        solventName: mp.solventName || "",
        chemicals: [
          ...mp.chemicals,
          ...Array(5 - mp.chemicals.length).fill(""),
        ],
        dilutionFactor: mp.dilutionFactor?.toString() || "",
        pHValue: mp.pHValue?.toString() || "",
        description: mp.description || "",
      });
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
    setSearchTerm("");
    setDropdownSelectedIndex({ ...dropdownSelectedIndex, search: -1 });
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleEdit = () => {
    if (selectedMobilePhase) {
      setIsFormEnabled(true);
      setIsEditMode(true);
      setFormData({
        mobilePhaseId: selectedMobilePhase.mobilePhaseId,
        mobilePhaseCode: selectedMobilePhase.mobilePhaseCode,
        isSolvent: selectedMobilePhase.isSolvent,
        isBuffer: selectedMobilePhase.isBuffer,
        bufferName: selectedMobilePhase.bufferName || "",
        solventName: selectedMobilePhase.solventName || "",
        chemicals: [
          ...selectedMobilePhase.chemicals,
          ...Array(5 - selectedMobilePhase.chemicals.length).fill(""),
        ],
        dilutionFactor: selectedMobilePhase.dilutionFactor?.toString() || "",
        pHValue: selectedMobilePhase.pHValue?.toString() || "",
        description: selectedMobilePhase.description || "",
      });
      setShowFormModal(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDelete = async () => {
    if (!selectedMobilePhase) return;
    if (
      !confirm(
        `Are you sure you want to delete "${selectedMobilePhase.mobilePhaseCode}"?`
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/admin/mobile-phase?id=${selectedMobilePhase._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        await logAuditAction("DELETE", {
          mobilePhaseId: selectedMobilePhase.mobilePhaseId,
          mobilePhaseCode: selectedMobilePhase.mobilePhaseCode,
          isSolvent: selectedMobilePhase.isSolvent,
          isBuffer: selectedMobilePhase.isBuffer,
          bufferName: selectedMobilePhase.bufferName,
          solventName: selectedMobilePhase.solventName,
          chemicals: selectedMobilePhase.chemicals,
          dilutionFactor: selectedMobilePhase.dilutionFactor,
          pHValue: selectedMobilePhase.pHValue,
          description: selectedMobilePhase.description,
          companyId: selectedMobilePhase.companyId,
          locationId: selectedMobilePhase.locationId,
        });

        await fetchMobilePhases();
        setFormData({
          mobilePhaseId: "",
          mobilePhaseCode: "",
          isSolvent: false,
          isBuffer: false,
          bufferName: "",
          solventName: "",
          chemicals: ["", "", "", "", ""],
          dilutionFactor: "",
          pHValue: "",
          description: "",
        });
        setSelectedMobilePhase(null);
        setCurrentMobilePhaseIndex(-1);
        setIsFormEnabled(false);
        setIsEditMode(false);
      } else {
        setError(data.error || "Failed to delete mobile phase");
      }
    } catch {
      setError("Failed to delete mobile phase");
    }
  };

  const handleAudit = async () => {
    await fetchAuditLogs();
    setShowAuditModal(true);
    setTimeout(() => auditSearchInputRef.current?.focus(), 100);
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Mobile Phase Database Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5faff; }
            h1 { text-align: center; color: #0055a4; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #a6c8ff; }
            th, td { border: 1px solid #a6c8ff; padding: 8px; text-align: left; }
            th { background: linear-gradient(to bottom, #f0f0f0, #ffffff); color: #333; }
            .date { margin-bottom: 20px; color: #333; }
          </style>
        </head>
        <body>
          <h1>Mobile Phase Database Report</h1>
          <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <tr><th>Mobile Phase Code</th><th>Solvent</th><th>Buffer</th><th>Buffer Name</th><th>Solvent Name</th><th>Chemicals</th><th>Dilution Factor</th><th>pH Value</th><th>Description</th><th>Created Date</th></tr>
            ${displayedMobilePhases
              .map(
                (mp) =>
                  `<tr><td>${mp.mobilePhaseCode}</td><td>${
                    mp.isSolvent ? "Yes" : "No"
                  }</td><td>${mp.isBuffer ? "Yes" : "No"}</td><td>${
                    mp.bufferName || "—"
                  }</td><td>${mp.solventName || "—"}</td><td>${mp.chemicals
                    .map(
                      (id) =>
                        chemicals.find((c) => c._id === id)?.chemicalName || "—"
                    )
                    .join(", ")}</td><td>${mp.dilutionFactor || "—"}</td><td>${
                    mp.pHValue || "—"
                  }</td><td>${mp.description || "—"}</td><td>${new Date(
                    mp.createdAt
                  ).toLocaleDateString()}</td></tr>`
              )
              .join("")}
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent,
    field: string,
    index?: number
  ) => {
    // Determine the chemicals to filter based on the field
    const dropdownChemicals =
      field === "bufferName"
        ? chemicals.filter((c) => c.isBuffer)
        : field === "solventName"
        ? chemicals.filter((c) => c.isSolvent)
        : chemicals; // Show ALL chemicals for the chemicals array, not just buffer chemicals

    // Get the current input value based on field and index
    const inputValue =
      field === "chemicals" && index !== undefined
        ? chemicals.find((c) => c._id === formData.chemicals[index])
            ?.chemicalName || ""
        : (formData[field as "bufferName" | "solventName"] as string);

    // Filter chemicals based on the input value
    const filteredChemicals = dropdownChemicals.filter((c) =>
      c.chemicalName.toLowerCase().startsWith(inputValue.toLowerCase())
    );

    const dropdownIndex =
      index !== undefined
        ? dropdownSelectedIndex.chemicals[index]
        : dropdownSelectedIndex[field as "bufferName" | "solventName"];

    const setDropdownIndex = (value: number) => {
      if (index !== undefined) {
        setDropdownSelectedIndex({
          ...dropdownSelectedIndex,
          chemicals: dropdownSelectedIndex.chemicals.map((v, i) =>
            i === index ? value : v
          ),
        });
      } else {
        setDropdownSelectedIndex({ ...dropdownSelectedIndex, [field]: value });
      }
    };

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropdownIndex(
          dropdownIndex < filteredChemicals.length - 1
            ? dropdownIndex + 1
            : dropdownIndex
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownIndex(dropdownIndex > 0 ? dropdownIndex - 1 : dropdownIndex);
        break;
      case "Enter":
        e.preventDefault();
        if (dropdownIndex >= 0 && filteredChemicals[dropdownIndex]) {
          const chemical = filteredChemicals[dropdownIndex];
          if (index !== undefined) {
            const newChemicals = [...formData.chemicals];
            newChemicals[index] = chemical._id;
            setFormData({ ...formData, chemicals: newChemicals });
            setShowDropdown({
              ...showDropdown,
              chemicals: showDropdown.chemicals.map((v, i) =>
                i === index ? false : v
              ),
            });
            setDropdownSelectedIndex({
              ...dropdownSelectedIndex,
              chemicals: dropdownSelectedIndex.chemicals.map((v, i) =>
                i === index ? -1 : v
              ),
            });
          } else {
            setFormData({ ...formData, [field]: chemical.chemicalName });
            setShowDropdown({ ...showDropdown, [field]: false });
            setDropdownSelectedIndex({ ...dropdownSelectedIndex, [field]: -1 });
          }
        }
        break;
      case "Escape":
        setShowDropdown({
          ...showDropdown,
          [field]: false,
          chemicals: showDropdown.chemicals.map((v, i) =>
            i === index ? false : v
          ),
        });
        setDropdownIndex(-1);
        break;
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const searchResults = displayedMobilePhases.filter(
      (mp) =>
        mp.mobilePhaseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mp.description &&
          mp.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => ({
          ...prev,
          search:
            prev.search < searchResults.length - 1
              ? prev.search + 1
              : prev.search,
        }));
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => ({
          ...prev,
          search: prev.search > 0 ? prev.search - 1 : prev.search,
        }));
        break;
      case "Enter":
        e.preventDefault();
        if (
          dropdownSelectedIndex.search >= 0 &&
          searchResults[dropdownSelectedIndex.search]
        ) {
          const mp = searchResults[dropdownSelectedIndex.search];
          setFormData({
            mobilePhaseId: mp.mobilePhaseId,
            mobilePhaseCode: mp.mobilePhaseCode,
            isSolvent: mp.isSolvent,
            isBuffer: mp.isBuffer,
            bufferName: mp.bufferName || "",
            solventName: mp.solventName || "",
            chemicals: [
              ...mp.chemicals,
              ...Array(5 - mp.chemicals.length).fill(""),
            ],
            dilutionFactor: mp.dilutionFactor?.toString() || "",
            pHValue: mp.pHValue?.toString() || "",
            description: mp.description || "",
          });
          setSelectedMobilePhase(mp);
          setCurrentMobilePhaseIndex(
            displayedMobilePhases.findIndex((c) => c._id === mp._id)
          );
          setShowSearchModal(false);
          setDropdownSelectedIndex({ ...dropdownSelectedIndex, search: -1 });
          setSearchTerm("");
        }
        break;
      case "Escape":
        setShowSearchModal(false);
        setDropdownSelectedIndex({ ...dropdownSelectedIndex, search: -1 });
        setSearchTerm("");
        break;
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#c0dcff] flex items-center justify-center">
        <div className="text-lg font-segoe text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#c0dcff] font-segoe"
      style={{
        backgroundImage: "linear-gradient(to bottom, #e6f0fa, #c0dcff)",
      }}
    >
      <WindowsToolbar
        modulePath="/dashboard/mobilephase-master"
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

      <div>
        <div
          className="bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white px-4 py-2 flex items-center shadow-md"
          style={{ border: "1px solid #004080" }}
        >
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 bg-white rounded-sm flex items-center justify-center"
              style={{ border: "1px solid #004080" }}
            >
              <span className="text-[#0055a4] text-xs font-bold">M</span>
            </div>
            <span className="font-semibold text-sm">Mobile Phase Master</span>
          </div>
        </div>

        <div className="container mx-auto p-6 px-2 max-w-7xl">
          {error && (
            <div
              className="bg-[#ffe6e6] border border-[#cc0000] text-[#cc0000] px-4 py-3 rounded mb-4 shadow-inner"
              style={{ borderStyle: "inset" }}
            >
              {error}
            </div>
          )}

          {/* Status Bar */}
          {(selectedMobilePhase || isFormEnabled) && (
            <div
              className="bg-white rounded-lg shadow-md p-4 mb-6"
              style={{
                border: "1px solid #a6c8ff",
                backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              }}
            >
              <div className="text-sm text-gray-600">
                {selectedMobilePhase && (
                  <div>
                    <span className="font-medium">Selected:</span>{" "}
                    {selectedMobilePhase.mobilePhaseCode}
                    <span className="ml-4 font-medium">Index:</span>{" "}
                    {currentMobilePhaseIndex + 1} of{" "}
                    {displayedMobilePhases.length}
                  </div>
                )}
                {isFormEnabled && (
                  <div className="text-[#008800] font-medium mt-1">
                    {isEditMode
                      ? "Edit Mode - Modify the selected mobile phase"
                      : "Add Mode - Enter new mobile phase details"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="bg-white rounded-lg shadow-md"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <div className="p-4 border-b border-[#a6c8ff]" style={{
  backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)",
}}>
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold text-gray-800">
      Mobile Phases ({sortedMobilePhases.length})
    </h2>
    <div className="flex items-center space-x-4">
      {/* Sort Controls */}
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Sort by:</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'mobilePhaseCode')}
          className="px-2 py-1 border border-[#a6c8ff] rounded text-sm focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
        >
          <option value="name">Name</option>
          <option value="mobilePhaseCode">Mobile Phase Code</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-2 py-1 bg-white border border-[#a6c8ff] rounded hover:bg-[#e6f0fa] text-sm focus:ring-2 focus:ring-[#66a3ff] focus:outline-none"
          title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>
      
      {/* Existing Filter Controls */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={filterSolvent}
          onChange={(e) => setFilterSolvent(e.target.checked)}
          className="h-5 w-5 text-[#0055a4] border-[#a6c8ff] rounded focus:ring-[#66a3ff]"
        />
        <label className="text-sm font-medium text-gray-700">
          Show Solvents
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={filterBuffer}
          onChange={(e) => setFilterBuffer(e.target.checked)}
          className="h-5 w-5 text-[#0055a4] border-[#a6c8ff] rounded focus:ring-[#66a3ff]"
        />
        <label className="text-sm font-medium text-gray-700">
          Show Buffers
        </label>
      </div>
    </div>
  </div>
</div>


            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0055a4] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading mobile phases...</p>
              </div>
            ) : displayedMobilePhases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl text-gray-400">📋</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      No Mobile Phases Found
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {!filterSolvent && !filterBuffer
                        ? "No mobile phases have been entered yet."
                        : "No mobile phases match the selected filters."}
                    </p>
                    {!filterSolvent && !filterBuffer ? (
                      <button
                        onClick={handleAddNew}
                        className="px-4 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] text-sm font-medium"
                        style={{
                          border: "1px solid #004080",
                          boxShadow: "0 2px 4px rgba(0,85,164,0.3)",
                        }}
                      >
                        Add First Mobile Phase
                      </button>
                    ) : (
                      <p className="text-xs text-gray-400">
                        Clear filters to see all mobile phases
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff]"
                    style={{ borderBottom: "1px solid #a6c8ff" }}
                  >
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Mobile Phase Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Chemicals
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        pH Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a6c8ff]">
                    {displayedMobilePhases.map((mp, index) => (
                      <tr
                        key={mp._id}
                        className={`cursor-pointer ${
                          selectedMobilePhase?._id === mp._id
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          if (!isFormEnabled) {
                            setSelectedMobilePhase(mp);
                            setCurrentMobilePhaseIndex(index);
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-800">
                            {mp.mobilePhaseCode}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">
                            {mp.isSolvent
                              ? "Solvent"
                              : mp.isBuffer
                              ? "Buffer"
                              : "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">
                            {mp.bufferName || mp.solventName || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {mp.chemicals
                              .map(
                                (id) =>
                                  chemicals.find((c) => c._id === id)
                                    ?.chemicalName || "—"
                              )
                              .join(", ")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">
                            {mp.pHValue || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {mp.description || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(mp.createdAt).toLocaleDateString()}
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

      {/* Mobile Phase Form Modal - SMALLER VERSION */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-3 w-full max-w-4xl max-h-[80vh] overflow-y-auto mx-4"
            style={{
              border: "1px solid #0055a4",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 3px 15px rgba(0,85,164,0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gradient-to-b from-[#0055a4] to-[#0088d1] rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">M</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {isEditMode ? "Edit Mobile Phase" : "Add New Mobile Phase"}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {/* Mobile Phase Code */}
              <div className="flex items-center justify-between space-x-2">
                <div className="bg-gray-50 p-2 rounded border border-gray-200 w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile Phase Code *
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={formData.mobilePhaseCode}
                    disabled={true}
                    className="w-full px-2 border border-gray-300 rounded bg-gray-100 text-gray-600 font-medium text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-generated and read-only
                  </p>
                </div>

                {/* Type Selection */}
                <div className="bg-blue-50 p-2 rounded border border-blue-200 w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1 m-1.5">
                    Type Selection *
                  </label>
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isSolvent}
                        disabled={!isFormEnabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isSolvent: e.target.checked,
                            solventName: e.target.checked
                              ? formData.solventName
                              : "",
                            isBuffer: e.target.checked
                              ? false
                              : formData.isBuffer,
                            bufferName: e.target.checked
                              ? ""
                              : formData.bufferName,
                            pHValue: e.target.checked ? "" : formData.pHValue,
                          })
                        }
                        className="h-4 w-4 text-[#0055a4] border-2 border-blue-300 rounded focus:ring-2 focus:ring-[#66a3ff]"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Solvent
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isBuffer}
                        disabled={!isFormEnabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isBuffer: e.target.checked,
                            bufferName: e.target.checked
                              ? formData.bufferName
                              : "",
                            pHValue: e.target.checked ? formData.pHValue : "",
                            isSolvent: e.target.checked
                              ? false
                              : formData.isSolvent,
                            solventName: e.target.checked
                              ? ""
                              : formData.solventName,
                          })
                        }
                        className="h-4 w-4 text-[#0055a4] border-2 border-blue-300 rounded focus:ring-2 focus:ring-[#66a3ff]"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Buffer
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Select either Solvent or Buffer (mutually exclusive)
                  </p>
                </div>
              </div>
              {/* Rest of the form fields in a grid */}
              <div className="grid gap-3">
                {/* Buffer Name */}
                {formData.isBuffer && (
                  <div className="relative bg-green-50 p-2 rounded border border-green-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Buffer Name *
                    </label>
                    <input
                      ref={bufferNameRef}
                      type="text"
                      value={formData.bufferName}
                      disabled={!isFormEnabled}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          bufferName: e.target.value,
                        });
                        if (e.target.value && isFormEnabled)
                          setShowDropdown({
                            ...showDropdown,
                            bufferName: true,
                          });
                        else
                          setShowDropdown({
                            ...showDropdown,
                            bufferName: false,
                          });
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, "bufferName")}
                      className={`w-full px-2 py-1 border border-green-300 rounded focus:ring-2 focus:ring-green-400 focus:outline-none ${
                        isFormEnabled ? "bg-white" : "bg-gray-100"
                      } text-sm`}
                      placeholder="Select buffer name"
                    />
                    {showDropdown.bufferName && isFormEnabled && (
                      <div className="absolute z-10 mt-1 bg-white border border-green-300 rounded-md shadow-lg overflow-y-auto">
                        {chemicals
                          .filter(
                            (c) =>
                              c.isBuffer &&
                              c.chemicalName
                                .toLowerCase()
                                .startsWith(formData.bufferName.toLowerCase())
                          )
                          .map((chemical, index) => (
                            <div
                              key={chemical._id}
                              className={`px-2 py-1 cursor-pointer text-sm ${
                                index === dropdownSelectedIndex.bufferName
                                  ? "bg-green-100"
                                  : "hover:bg-green-50"
                              }`}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  bufferName: chemical.chemicalName,
                                });
                                setShowDropdown({
                                  ...showDropdown,
                                  bufferName: false,
                                });
                                setDropdownSelectedIndex({
                                  ...dropdownSelectedIndex,
                                  bufferName: -1,
                                });
                              }}
                            >
                              {chemical.chemicalName}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Solvent Name */}
                {formData.isSolvent && (
                  <div className="relative bg-yellow-50 p-2 rounded border border-yellow-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Solvent Name *
                    </label>
                    <input
                      ref={solventNameRef}
                      type="text"
                      value={formData.solventName}
                      disabled={!isFormEnabled}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          solventName: e.target.value,
                        });
                        if (e.target.value && isFormEnabled)
                          setShowDropdown({
                            ...showDropdown,
                            solventName: true,
                          });
                        else
                          setShowDropdown({
                            ...showDropdown,
                            solventName: false,
                          });
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, "solventName")}
                      className={`w-full px-2 py-1 border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none ${
                        isFormEnabled ? "bg-white" : "bg-gray-100"
                      } text-sm`}
                      placeholder="Select solvent name"
                    />
                    {showDropdown.solventName && isFormEnabled && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-yellow-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {chemicals
                          .filter(
                            (c) =>
                              c.isSolvent &&
                              c.chemicalName
                                .toLowerCase()
                                .startsWith(formData.solventName.toLowerCase())
                          )
                          .map((chemical, index) => (
                            <div
                              key={chemical._id}
                              className={`px-2 py-1 cursor-pointer text-sm ${
                                index === dropdownSelectedIndex.solventName
                                  ? "bg-yellow-100"
                                  : "hover:bg-yellow-50"
                              }`}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  solventName: chemical.chemicalName,
                                });
                                setShowDropdown({
                                  ...showDropdown,
                                  solventName: false,
                                });
                                setDropdownSelectedIndex({
                                  ...dropdownSelectedIndex,
                                  solventName: -1,
                                });
                              }}
                            >
                              {chemical.chemicalName}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Chemicals */}
                {formData.isBuffer && (
                  <div className="bg-purple-50 p-2 rounded border border-purple-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Chemicals *
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {formData.chemicals
                        .slice(0, 5)
                        .map((chemicalId, index) => (
                          <div key={index} className="relative">
                            <input
                              ref={chemicalRefs[index]}
                              type="text"
                              value={
                                chemicals.find((c) => c._id === chemicalId)
                                  ?.chemicalName || ""
                              }
                              disabled={!isFormEnabled}
                              onChange={(e) => {
                                const typedValue = e.target.value;
                                const foundChemical = chemicals.find(
                                  (c) =>
                                    c.chemicalName
                                      .toLowerCase()
                                      .startsWith(typedValue.toLowerCase()) // Remove the && c.isBuffer filter
                                );
                                const newChemicals = [...formData.chemicals];
                                if (typedValue === "") {
                                  newChemicals[index] = "";
                                } else if (foundChemical) {
                                  newChemicals[index] = foundChemical._id;
                                }
                                setFormData({
                                  ...formData,
                                  chemicals: newChemicals,
                                });
                                if (typedValue && isFormEnabled) {
                                  setShowDropdown({
                                    ...showDropdown,
                                    chemicals: showDropdown.chemicals.map(
                                      (v, i) => (i === index ? true : v)
                                    ),
                                  });
                                } else {
                                  setShowDropdown({
                                    ...showDropdown,
                                    chemicals: showDropdown.chemicals.map(
                                      (v, i) => (i === index ? false : v)
                                    ),
                                  });
                                }
                              }}
                              onKeyDown={(e) =>
                                handleInputKeyDown(e, "chemicals", index)
                              }
                              className={`w-full px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-400 focus:outline-none text-sm ${
                                isFormEnabled ? "bg-white" : "bg-gray-100"
                              }`}
                              placeholder={`Chemical ${index + 1}${
                                index === 0 ? " *" : ""
                              }`}
                            />
                            {showDropdown.chemicals[index] && isFormEnabled && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-purple-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {chemicals // Show ALL chemicals, not just buffer chemicals
                                  .filter((c) =>
                                    c.chemicalName
                                      .toLowerCase()
                                      .includes(
                                        (
                                          chemicals.find(
                                            (c) => c._id === chemicalId
                                          )?.chemicalName || ""
                                        ).toLowerCase()
                                      )
                                  )
                                  .map((chemical, cIndex) => (
                                    <div
                                      key={chemical._id}
                                      className={`px-2 py-1 cursor-pointer text-sm ${
                                        cIndex ===
                                        dropdownSelectedIndex.chemicals[index]
                                          ? "bg-purple-100"
                                          : "hover:bg-purple-50"
                                      }`}
                                      onClick={() => {
                                        const newChemicals = [
                                          ...formData.chemicals,
                                        ];
                                        newChemicals[index] = chemical._id;
                                        setFormData({
                                          ...formData,
                                          chemicals: newChemicals,
                                        });
                                        setShowDropdown({
                                          ...showDropdown,
                                          chemicals: showDropdown.chemicals.map(
                                            (v, i) => (i === index ? false : v)
                                          ),
                                        });
                                        setDropdownSelectedIndex({
                                          ...dropdownSelectedIndex,
                                          chemicals:
                                            dropdownSelectedIndex.chemicals.map(
                                              (v, i) => (i === index ? -1 : v)
                                            ),
                                        });
                                      }}
                                    >
                                      {chemical.chemicalName}
                                      {/* Optional: Show chemical type indicator */}
                                      <span className="ml-2 text-xs text-gray-500">
                                        {chemical.isBuffer && chemical.isSolvent
                                          ? "(Buffer/Solvent)"
                                          : chemical.isBuffer
                                          ? "(Buffer)"
                                          : chemical.isSolvent
                                          ? "(Solvent)"
                                          : ""}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      At least the first chemical is required
                    </p>
                  </div>
                )}

                {/* pH Value */}
                {formData.isBuffer && (
                  <div className="bg-orange-50 p-2 rounded border border-orange-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      pH Value *
                    </label>
                    <input
                      type="number"
                      value={formData.pHValue}
                      disabled={!isFormEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, pHValue: e.target.value })
                      }
                      className={`w-full px-2 py-1 border border-orange-300 rounded focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm ${
                        isFormEnabled ? "bg-white" : "bg-gray-100"
                      }`}
                      placeholder="pH (0-14)"
                      min="0"
                      max="14"
                      step="0.1"
                    />
                  </div>
                )}
              </div>

              {/* Description - Full width */}
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  disabled={!isFormEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm ${
                    isFormEnabled ? "bg-white" : "bg-gray-100"
                  }`}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-1 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] font-medium text-sm"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              >
                Cancel
              </button>
              {isFormEnabled && (
                <button
                  onClick={async () => {
                    await handleSave();
                  }}
                  className="px-4 py-1 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] font-medium text-sm"
                  style={{
                    border: "1px solid #004080",
                    boxShadow: "0 1px 3px rgba(0,85,164,0.3)",
                  }}
                >
                  {isEditMode ? "Update" : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-96 max-h-96"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Search Mobile Phases
            </h3>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownSelectedIndex({
                  ...dropdownSelectedIndex,
                  search: -1,
                });
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
              style={{
                borderStyle: "inset",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
              }}
              placeholder="Type to search..."
            />
            <div
              className="max-h-48 overflow-y-auto border border-[#a6c8ff] rounded mt-2"
              style={{
                backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              }}
            >
              {displayedMobilePhases
                .filter(
                  (mp) =>
                    mp.mobilePhaseCode
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    (mp.description &&
                      mp.description
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()))
                )
                .map((mp, index) => (
                  <div
                    key={mp._id}
                    className={`px-3 py-2 cursor-pointer ${
                      index === dropdownSelectedIndex.search
                        ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                        : "hover:bg-[#e6f0fa]"
                    }`}
                    onClick={() => {
                      setFormData({
                        mobilePhaseId: mp.mobilePhaseId,
                        mobilePhaseCode: mp.mobilePhaseCode,
                        isSolvent: mp.isSolvent,
                        isBuffer: mp.isBuffer,
                        bufferName: mp.bufferName || "",
                        solventName: mp.solventName || "",
                        chemicals: [
                          ...mp.chemicals,
                          ...Array(5 - mp.chemicals.length).fill(""),
                        ],
                        dilutionFactor: mp.dilutionFactor?.toString() || "",
                        pHValue: mp.pHValue?.toString() || "",
                        description: mp.description || "",
                      });
                      setSelectedMobilePhase(mp);
                      setCurrentMobilePhaseIndex(
                        displayedMobilePhases.findIndex((c) => c._id === mp._id)
                      );
                      setShowSearchModal(false);
                      setDropdownSelectedIndex({
                        ...dropdownSelectedIndex,
                        search: -1,
                      });
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium text-gray-800">
                      {mp.mobilePhaseCode}
                    </div>
                    {mp.description && (
                      <div className="text-sm text-gray-500">
                        {mp.description}
                      </div>
                    )}
                  </div>
                ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setDropdownSelectedIndex({
                    ...dropdownSelectedIndex,
                    search: -1,
                  });
                  setSearchTerm("");
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] active:bg-gradient-to-b active:from-[#b3b3b3] active:to-[#999999]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-4/5 max-w-4xl max-h-[80vh] overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Audit Trail{" "}
              {selectedMobilePhase
                ? `for ${selectedMobilePhase.mobilePhaseCode}`
                : "(All Mobile Phases)"}
            </h3>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  ref={auditSearchInputRef}
                  type="text"
                  value={auditSearchTerm}
                  onChange={(e) => {
                    setAuditSearchTerm(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                  placeholder="Search mobile phase code or description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={auditStartDate}
                  onChange={(e) => {
                    setAuditStartDate(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={auditEndDate}
                  onChange={(e) => {
                    setAuditEndDate(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
            </div>
            <div
              className="max-h-64 overflow-y-auto border border-[#a6c8ff] rounded"
              style={{
                backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              }}
            >
              <table className="w-full text-sm">
                <thead
                  className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] sticky top-0"
                  style={{ borderBottom: "1px solid #a6c8ff" }}
                >
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Timestamp
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">User</th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Action
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Mobile Phase Code
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">Type</th>
                    <th className="px-3 py-2 text-left text-gray-700">Name</th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Chemicals
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      pH Value
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a6c8ff]">
                  {auditLogs.map((log: any, index) => (
                    <tr key={index} className="hover:bg-[#e6f0fa]">
                      <td className="px-3 py-2">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{log.userId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.action === "CREATE"
                              ? "bg-[#ccffcc] text-[#008800]"
                              : log.action === "UPDATE"
                              ? "bg-[#ffffcc] text-[#666600]"
                              : "bg-[#ffe6e6] text-[#cc0000]"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.mobilePhaseCode || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.isSolvent
                            ? "Solvent"
                            : log.data.isBuffer
                            ? "Buffer"
                            : "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.bufferName || log.data.solventName || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.chemicals
                            ?.map(
                              (id: string) =>
                                chemicals.find((c) => c._id === id)
                                  ?.chemicalName || "—"
                            )
                            .join(", ") || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.pHValue || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.description || "—"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setAuditSearchTerm("");
                  setAuditActionFilter("");
                  setAuditStartDate("");
                  setAuditEndDate("");
                  setAuditLogs([]);
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] active:bg-gradient-to-b active:from-[#b3b3b3] active:to-[#999999]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-4/5 max-w-2xl max-h-96 overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Mobile Phase Master - Help
            </h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-[#0055a4]">
                  Keyboard Shortcuts:
                </h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F1
                    </kbd>{" "}
                    - Add New Mobile Phase
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F2
                    </kbd>{" "}
                    - Save Current Entry
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F3
                    </kbd>{" "}
                    - Clear Form
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F4
                    </kbd>{" "}
                    - Exit to Dashboard
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F5
                    </kbd>{" "}
                    - Navigate Up
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F6
                    </kbd>{" "}
                    - Navigate Down
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F7
                    </kbd>{" "}
                    - Search Mobile Phases
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F9
                    </kbd>{" "}
                    - Edit Selected Mobile Phase
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F10
                    </kbd>{" "}
                    - Delete Selected Mobile Phase
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F11
                    </kbd>{" "}
                    - View Audit Trail
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F12
                    </kbd>{" "}
                    - Print Report
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      Ctrl+H
                    </kbd>{" "}
                    - Show Help
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[#0055a4]">How to Use:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • Use <b>Add (F1)</b> to open form for new mobile phase
                    entry
                  </li>
                  <li>
                    • Use <b>Edit (F9)</b> to modify selected mobile phase
                  </li>
                  <li>
                    • Use <b>Save (F2)</b> to save new or edited mobile phase
                  </li>
                  <li>
                    • Use <b>Clear (F3)</b> to reset form and disable inputs
                  </li>
                  <li>
                    • Use <b>Up (F5)/Down (F6)</b> to navigate mobile phases
                  </li>
                  <li>
                    • Use <b>Search (F7)</b> for full-text search with keyboard
                    navigation
                  </li>
                  <li>
                    • Use <b>Delete (F10)</b> to remove selected mobile phase
                  </li>
                  <li>
                    • Use <b>Audit (F11)</b> to view all changes
                  </li>
                  <li>
                    • Use <b>Print (F12)</b> to generate mobile phase report
                  </li>
                  <li>
                    • Use <b>Exit (F4)</b> to return to dashboard
                  </li>
                  <li>
                    • Use <b>Filter Checkboxes</b> to show only Solvents,
                    Buffers, or both
                  </li>
                  <li>
                    • Select <b>Solvent</b> or <b>Buffer</b> to enable relevant
                    fields
                  </li>
                  <li>• At least one chemical is required for buffers</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[#0055a4]">Tips:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Mobile Phase Code is auto-generated and read-only</li>
                  <li>• Buffer Name and pH Value are required for buffers</li>
                  <li>• Solvent Name is required for solvents</li>
                  <li>
                    • Use dropdowns to select chemicals from Chemical Master
                  </li>
                  <li>• At least one chemical is required for buffers</li>
                  <li>
                    • Audit trail shows all create, update, and delete actions
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] active:bg-gradient-to-b active:from-[#b3b3b3] active:to-[#999999]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedPharmacopeialMaster() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <MobilePhaseMaster />
    </ProtectedRoute>
  );
}
