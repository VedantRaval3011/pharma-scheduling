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
  desc: string;
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
  bufferDesc?: string;
  solventDesc?: string;
}

function MobilePhaseMaster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobilePhases, setMobilePhases] = useState<MobilePhase[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Add these missing state variables for search functionality
  const [searchResults, setSearchResults] = useState<MobilePhase[]>([]);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);

  const [formData, setFormData] = useState({
    mobilePhaseId: "",
    mobilePhaseCode: "",
    isSolvent: false,
    isBuffer: false,
    bufferName: "",
    bufferDesc: "", // Add this
    solventName: "",
    solventDesc: "", // Add this
    chemicals: ["", "", "", "", ""],
    chemicalsDesc: ["", "", "", "", ""], // Add this array for chemical descriptions
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

  const [showDescDropdown, setShowDescDropdown] = useState({
    bufferDesc: false,
    solventDesc: false,
    chemicalsDesc: [false, false, false, false, false],
  });
  const bufferNameDropdownRef = useRef<HTMLDivElement>(null);
  const bufferDescDropdownRef = useRef<HTMLDivElement>(null);
  const solventNameDropdownRef = useRef<HTMLDivElement>(null);
  const solventDescDropdownRef = useRef<HTMLDivElement>(null);
  const chemicalDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chemicalDescDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [dropdownSelectedIndex, setDropdownSelectedIndex] =
  useState<DropdownSelectedIndex>({
    bufferName: -1,
    solventName: -1,
    chemicals: [-1, -1, -1, -1, -1],
    search: -1,
  });

  const [descDropdownSelectedIndex, setDescDropdownSelectedIndex] = useState({
    bufferDesc: -1,
    solventDesc: -1,
    chemicalsDesc: [-1, -1, -1, -1, -1],
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
  const [sortBy, setSortBy] = useState<"name" | "mobilePhaseCode">("name"); // Default to name
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  useEffect(() => {
  // Reset selected indices when dropdowns are closed
  if (!showDropdown.bufferName) {
    setDropdownSelectedIndex(prev => ({ ...prev, bufferName: -1 }));
  }
  if (!showDropdown.solventName) {
    setDropdownSelectedIndex(prev => ({ ...prev, solventName: -1 }));
  }
  showDropdown.chemicals.forEach((isOpen, index) => {
    if (!isOpen) {
      setDropdownSelectedIndex(prev => ({
        ...prev,
        chemicals: prev.chemicals.map((v, i) => i === index ? -1 : v)
      }));
    }
  });
  
  // Also reset desc dropdown indices
  if (!showDescDropdown.bufferDesc) {
    setDescDropdownSelectedIndex(prev => ({ ...prev, bufferDesc: -1 }));
  }
  if (!showDescDropdown.solventDesc) {
    setDescDropdownSelectedIndex(prev => ({ ...prev, solventDesc: -1 }));
  }
  showDescDropdown.chemicalsDesc.forEach((isOpen, index) => {
    if (!isOpen) {
      setDescDropdownSelectedIndex(prev => ({
        ...prev,
        chemicalsDesc: prev.chemicalsDesc.map((v, i) => i === index ? -1 : v)
      }));
    }
  });
}, [showDropdown, showDescDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Buffer name dropdown
      if (
        bufferNameDropdownRef.current &&
        !bufferNameDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown((prev) => ({ ...prev, bufferName: false }));
        setDropdownSelectedIndex((prev) => ({ ...prev, bufferName: -1 }));
      }

      // Buffer desc dropdown
      if (
        bufferDescDropdownRef.current &&
        !bufferDescDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDescDropdown((prev) => ({ ...prev, bufferDesc: false }));
        setDescDropdownSelectedIndex((prev) => ({ ...prev, bufferDesc: -1 }));
      }

      // Solvent name dropdown
      if (
        solventNameDropdownRef.current &&
        !solventNameDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown((prev) => ({ ...prev, solventName: false }));
        setDropdownSelectedIndex((prev) => ({ ...prev, solventName: -1 }));
      }

      // Solvent desc dropdown
      if (
        solventDescDropdownRef.current &&
        !solventDescDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDescDropdown((prev) => ({ ...prev, solventDesc: false }));
        setDescDropdownSelectedIndex((prev) => ({ ...prev, solventDesc: -1 }));
      }

      // Chemical dropdowns
      chemicalDropdownRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target as Node)) {
          setShowDropdown((prev) => ({
            ...prev,
            chemicals: prev.chemicals.map((v, i) => (i === index ? false : v)),
          }));
          setDropdownSelectedIndex((prev) => ({
            ...prev,
            chemicals: prev.chemicals.map((v, i) => (i === index ? -1 : v)),
          }));
        }
      });

      // Chemical desc dropdowns
      chemicalDescDropdownRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target as Node)) {
          setShowDescDropdown((prev) => ({
            ...prev,
            chemicalsDesc: prev.chemicalsDesc.map((v, i) =>
              i === index ? false : v
            ),
          }));
          setDescDropdownSelectedIndex((prev) => ({
            ...prev,
            chemicalsDesc: prev.chemicalsDesc.map((v, i) =>
              i === index ? -1 : v
            ),
          }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper function to create display options for chemicals
  const createChemicalDisplayOptions = (chemical: Chemical) => {
    const options = [];

    // Add chemical name option
    if (chemical.chemicalName) {
      options.push({
        id: chemical._id,
        display: chemical.chemicalName,
        type: "name",
        chemical: chemical,
      });
    }

    // Add description option (if different from chemical name)
    if (chemical.desc && chemical.desc !== chemical.chemicalName) {
      options.push({
        id: chemical._id,
        display: chemical.desc,
        type: "desc",
        chemical: chemical,
      });
    }

    return options;
  };
  

  // Helper function to get all chemical display options
  const getAllChemicalOptions = (chemicalsList: Chemical[]) => {
    return chemicalsList.flatMap((chemical) =>
      createChemicalDisplayOptions(chemical)
    );
  };

  // Enhanced function to sync chemical name with description (when selecting from name dropdown)
  const syncChemicalNameToDesc = (chemicalName: string, field: string) => {
    const foundChemical = chemicals.find(
      (c) => c.chemicalName === chemicalName
    );
    if (foundChemical) {
      if (field === "bufferName") {
        setFormData((prev) => ({
          ...prev,
          bufferDesc: foundChemical.desc || "",
        }));
      } else if (field === "solventName") {
        setFormData((prev) => ({
          ...prev,
          solventDesc: foundChemical.desc || "",
        }));
      }
    }
  };

  // Enhanced function to sync description to chemical name (when typing or selecting desc)
  const syncDescToChemicalName = (desc: string, field: string) => {
    const foundChemical = chemicals.find(
      (c) => c.desc && c.desc.toLowerCase() === desc.toLowerCase()
    );
    if (foundChemical) {
      if (field === "bufferDesc") {
        setFormData((prev) => ({
          ...prev,
          bufferName: foundChemical.chemicalName,
        }));
      } else if (field === "solventDesc") {
        setFormData((prev) => ({
          ...prev,
          solventName: foundChemical.chemicalName,
        }));
      }
    }
  };

  // Enhanced function for chemicals array with auto-sync
  const syncChemicalArrayDesc = (
    index: number,
    desc: string,
    isDescInput: boolean = false
  ) => {
    if (isDescInput) {
      // User typed in description field, find chemical by desc
      const foundChemical = chemicals.find(
        (c) => c.desc && c.desc.toLowerCase() === desc.toLowerCase()
      );
      if (foundChemical) {
        const newChemicals = [...formData.chemicals];
        newChemicals[index] = foundChemical._id;
        setFormData((prev) => ({ ...prev, chemicals: newChemicals }));
      }
    } else {
      // User selected chemical, update description
      const foundChemical = chemicals.find((c) => c._id === desc);
      if (foundChemical) {
        const newChemicalsDesc = [...formData.chemicalsDesc];
        newChemicalsDesc[index] = foundChemical.desc || "";
        setFormData((prev) => ({ ...prev, chemicalsDesc: newChemicalsDesc }));
      }
    }
  };

  // Function to get filtered description options
  const getDescriptionOptions = (inputValue: string, chemicalType: string) => {
    return chemicals.filter((c) => {
      const hasCorrectType =
        chemicalType === "buffer"
          ? c.isBuffer
          : chemicalType === "solvent"
          ? c.isSolvent
          : true;
      const hasDesc = c.desc && c.desc.trim() !== "";
      const matchesInput = c.desc
        ?.toLowerCase()
        .includes(inputValue.toLowerCase());
      return hasCorrectType && hasDesc && matchesInput;
    });
  };

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
        const validMobilePhases = data.data.filter(
          (mp: MobilePhase) =>
            mp.mobilePhaseId &&
            mp.mobilePhaseCode &&
            mp.companyId === companyId &&
            mp.locationId === locationId
        );
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

    if (sortBy === "name") {
      // Sort by buffer name or solvent name
      aValue = (a.bufferName || a.solventName || "").toLowerCase();
      bValue = (b.bufferName || b.solventName || "").toLowerCase();
    } else {
      // Sort by mobile phase code
      aValue = a.mobilePhaseCode.toLowerCase();
      bValue = b.mobilePhaseCode.toLowerCase();
    }

    const comparison = aValue.localeCompare(bValue);
    return sortOrder === "asc" ? comparison : -comparison;
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
      chemicalsDesc: ["", "", "", "", ""],
      dilutionFactor: "",
      pHValue: "",
      description: "",
      bufferDesc: "",
      solventDesc: "",
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
          bufferDesc: "",
          solventDesc: "",
          chemicalsDesc: ["", "", "", "", ""],
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
      bufferDesc: "",
      solventName: "",
      solventDesc: "",
      chemicals: ["", "", "", "", ""],
      chemicalsDesc: ["", "", "", "", ""],
      dilutionFactor: "",
      pHValue: "",
      description: "",
    });
    // ... existing code ...
    setShowDescDropdown({
      bufferDesc: false,
      solventDesc: false,
      chemicalsDesc: [false, false, false, false, false],
    });
    setDescDropdownSelectedIndex({
      bufferDesc: -1,
      solventDesc: -1,
      chemicalsDesc: [-1, -1, -1, -1, -1],
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
        chemicalsDesc: mp.chemicals
          .map((id) => chemicals.find((c) => c._id === id)?.desc || "")
          .concat(Array(5 - mp.chemicals.length).fill("")),
        bufferDesc: mp.bufferDesc || "",
        solventDesc: mp.solventDesc || "",
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
        chemicalsDesc: mp.chemicals
          .map((id) => chemicals.find((c) => c._id === id)?.desc || "")
          .concat(Array(5 - mp.chemicals.length).fill("")),
        solventDesc: mp.solventDesc || "",
        bufferDesc: mp.bufferDesc || "",
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
        chemicalsDesc: mp.chemicals
          .map((id) => chemicals.find((c) => c._id === id)?.desc || "")
          .concat(Array(5 - mp.chemicals.length).fill("")),
        solventDesc: mp.solventDesc || "",
        bufferDesc: mp.bufferDesc || "",
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
        chemicalsDesc: selectedMobilePhase.chemicals
          .map((id) => chemicals.find((c) => c._id === id)?.desc || "")
          .concat(Array(5 - selectedMobilePhase.chemicals.length).fill("")),
        bufferDesc: selectedMobilePhase.bufferDesc || "",
        solventDesc: selectedMobilePhase.solventDesc || "",
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
          chemicalsDesc: ["", "", "", "", ""],
          solventDesc: "",
          bufferDesc: "",
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
  // Only handle special keys, allow normal typing
  if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
    return; // Allow normal typing behavior
  }

  e.preventDefault(); // Prevent default only for navigation keys

  // Determine the options based on field type
  const getOptions = () => {
    if (field === "bufferName") {
      const searchValue = formData.bufferName.toLowerCase();
      return chemicals.filter(
        (c) =>
          c.isBuffer &&
          (searchValue === "" ||
            c.chemicalName.toLowerCase().includes(searchValue))
      );
    } else if (field === "solventName") {
      const searchValue = formData.solventName.toLowerCase();
      return chemicals.filter(
        (c) =>
          c.isSolvent &&
          (searchValue === "" ||
            c.chemicalName.toLowerCase().includes(searchValue))
      );
    } else if (field === "chemicals") {
      const currentValue =
        chemicals.find((c) => c._id === formData.chemicals[index || 0])
          ?.chemicalName || "";
      return chemicals.filter(
        (c) =>
          currentValue === "" ||
          c.chemicalName.toLowerCase().includes(currentValue.toLowerCase())
      );
    } else if (field === "bufferDesc") {
      return chemicals.filter(
        (c) =>
          c.isBuffer &&
          c.desc &&
          c.desc.trim() !== "" &&
          (formData.bufferDesc === "" ||
            c.desc.toLowerCase().includes(formData.bufferDesc.toLowerCase()))
      );
    } else if (field === "solventDesc") {
      return chemicals.filter(
        (c) =>
          c.isSolvent &&
          c.desc &&
          c.desc.trim() !== "" &&
          (formData.solventDesc === "" ||
            c.desc.toLowerCase().includes(formData.solventDesc.toLowerCase()))
      );
    } else if (field === "chemicalsDesc") {
      const currentDesc = formData.chemicalsDesc[index || 0] || "";
      return chemicals.filter(
        (c) =>
          c.desc &&
          c.desc.trim() !== "" &&
          (currentDesc === "" ||
            c.desc.toLowerCase().includes(currentDesc.toLowerCase()))
      );
    }
    return [];
  };

  const options = getOptions();
  if (options.length === 0) return; // No options to navigate

  // Get current selected index
  const getCurrentSelectedIndex = () => {
    if (field.includes("Desc")) {
      if (field === "bufferDesc") return descDropdownSelectedIndex.bufferDesc;
      if (field === "solventDesc") return descDropdownSelectedIndex.solventDesc;
      if (field === "chemicalsDesc")
        return descDropdownSelectedIndex.chemicalsDesc[index || 0];
    } else {
      if (field === "bufferName") return dropdownSelectedIndex.bufferName;
      if (field === "solventName") return dropdownSelectedIndex.solventName;
      if (field === "chemicals")
        return dropdownSelectedIndex.chemicals[index || 0];
    }
    return -1;
  };

  // Set selected index with scrolling
  const setSelectedIndexWithScroll = (newIndex: number) => {
    if (field.includes("Desc")) {
      if (field === "bufferDesc") {
        setDescDropdownSelectedIndex((prev) => ({
          ...prev,
          bufferDesc: newIndex,
        }));
      } else if (field === "solventDesc") {
        setDescDropdownSelectedIndex((prev) => ({
          ...prev,
          solventDesc: newIndex,
        }));
      } else if (field === "chemicalsDesc" && typeof index === "number") {
        setDescDropdownSelectedIndex((prev) => ({
          ...prev,
          chemicalsDesc: prev.chemicalsDesc.map((v, i) =>
            i === index ? newIndex : v
          ),
        }));
      }
    } else {
      if (field === "bufferName") {
        setDropdownSelectedIndex((prev) => ({
          ...prev,
          bufferName: newIndex,
        }));
      } else if (field === "solventName") {
        setDropdownSelectedIndex((prev) => ({
          ...prev,
          solventName: newIndex,
        }));
      } else if (field === "chemicals" && typeof index === "number") {
        setDropdownSelectedIndex((prev) => ({
          ...prev,
          chemicals: prev.chemicals.map((v, i) => (i === index ? newIndex : v)),
        }));
      }
    }

    // Auto-scroll the selected item into view - FIXED VERSION
    setTimeout(() => {
      // Find the dropdown container
      const dropdownContainers = document.querySelectorAll('.dropdown-active, .absolute.z-30');
      
      // For each dropdown, check if it has the selected item
      dropdownContainers.forEach(dropdown => {
        const items = dropdown.querySelectorAll('[class*="cursor-pointer"][class*="border-b"]');
        if (items.length > newIndex && newIndex >= 0) {
          const selectedItem = items[newIndex];
          if (selectedItem && (
            selectedItem.classList.contains('bg-green-100') ||
            selectedItem.classList.contains('bg-yellow-100') ||
            selectedItem.classList.contains('bg-purple-100')
          )) {
            selectedItem.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }
        }
      });
    }, 50);
  };

  const currentSelectedIndex = getCurrentSelectedIndex();

  switch (e.key) {
    case "ArrowDown":
      const nextIndex = currentSelectedIndex < options.length - 1 
        ? currentSelectedIndex + 1 
        : 0; // Wrap to top
      setSelectedIndexWithScroll(nextIndex);
      break;

    case "ArrowUp":
      const prevIndex = currentSelectedIndex > 0 
        ? currentSelectedIndex - 1 
        : options.length - 1; // Wrap to bottom
      setSelectedIndexWithScroll(prevIndex);
      break;

    case "Enter":
      if (currentSelectedIndex >= 0 && options[currentSelectedIndex]) {
        const selectedOption = options[currentSelectedIndex];

        if (field.includes("Desc")) {
          // Handle description field selection
          if (field === "bufferDesc") {
            setFormData((prev) => ({
              ...prev,
              bufferDesc: selectedOption.desc || "",
              bufferName: selectedOption.chemicalName,
            }));
            setShowDescDropdown((prev) => ({ ...prev, bufferDesc: false }));
            setDescDropdownSelectedIndex((prev) => ({
              ...prev,
              bufferDesc: -1,
            }));
          } else if (field === "solventDesc") {
            setFormData((prev) => ({
              ...prev,
              solventDesc: selectedOption.desc || "",
              solventName: selectedOption.chemicalName,
            }));
            setShowDescDropdown((prev) => ({ ...prev, solventDesc: false }));
            setDescDropdownSelectedIndex((prev) => ({
              ...prev,
              solventDesc: -1,
            }));
          } else if (field === "chemicalsDesc" && typeof index === "number") {
            const newChemicals = [...formData.chemicals];
            const newChemicalsDesc = [...formData.chemicalsDesc];
            newChemicals[index] = selectedOption._id;
            newChemicalsDesc[index] = selectedOption.desc || "";
            setFormData((prev) => ({
              ...prev,
              chemicals: newChemicals,
              chemicalsDesc: newChemicalsDesc,
            }));
            setShowDescDropdown((prev) => ({
              ...prev,
              chemicalsDesc: prev.chemicalsDesc.map((v, i) =>
                i === index ? false : v
              ),
            }));
          }
        } else {
          // Handle name field selection
          if (field === "bufferName") {
            setFormData((prev) => ({
              ...prev,
              bufferName: selectedOption.chemicalName,
              bufferDesc: selectedOption.desc || "",
            }));
            setShowDropdown((prev) => ({ ...prev, bufferName: false }));
            setDropdownSelectedIndex((prev) => ({ ...prev, bufferName: -1 }));
          } else if (field === "solventName") {
            setFormData((prev) => ({
              ...prev,
              solventName: selectedOption.chemicalName,
              solventDesc: selectedOption.desc || "",
            }));
            setShowDropdown((prev) => ({ ...prev, solventName: false }));
            setDropdownSelectedIndex((prev) => ({ ...prev, solventName: -1 }));
          } else if (field === "chemicals" && typeof index === "number") {
            const newChemicals = [...formData.chemicals];
            const newChemicalsDesc = [...formData.chemicalsDesc];
            newChemicals[index] = selectedOption._id;
            newChemicalsDesc[index] = selectedOption.desc || "";
            setFormData((prev) => ({
              ...prev,
              chemicals: newChemicals,
              chemicalsDesc: newChemicalsDesc,
            }));
            setShowDropdown((prev) => ({
              ...prev,
              chemicals: prev.chemicals.map((v, i) =>
                i === index ? false : v
              ),
            }));
          }
        }
      }
      break;

    case "Escape":
      // Close all dropdowns for this field
      if (field.includes("Desc")) {
        if (field === "bufferDesc") {
          setShowDescDropdown((prev) => ({ ...prev, bufferDesc: false }));
          setDescDropdownSelectedIndex((prev) => ({ ...prev, bufferDesc: -1 }));
        } else if (field === "solventDesc") {
          setShowDescDropdown((prev) => ({ ...prev, solventDesc: false }));
          setDescDropdownSelectedIndex((prev) => ({ ...prev, solventDesc: -1 }));
        } else if (field === "chemicalsDesc" && typeof index === "number") {
          setShowDescDropdown((prev) => ({
            ...prev,
            chemicalsDesc: prev.chemicalsDesc.map((v, i) =>
              i === index ? false : v
            ),
          }));
        }
      } else {
        if (field === "bufferName") {
          setShowDropdown((prev) => ({ ...prev, bufferName: false }));
          setDropdownSelectedIndex((prev) => ({ ...prev, bufferName: -1 }));
        } else if (field === "solventName") {
          setShowDropdown((prev) => ({ ...prev, solventName: false }));
          setDropdownSelectedIndex((prev) => ({ ...prev, solventName: -1 }));
        } else if (field === "chemicals" && typeof index === "number") {
          setShowDropdown((prev) => ({
            ...prev,
            chemicals: prev.chemicals.map((v, i) => (i === index ? false : v)),
          }));
        }
      }
      break;
  }
};

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
  // Use searchResults instead of filtering again
  const results = searchResults;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      setSearchSelectedIndex((prev) => {
        const newIndex = prev < results.length - 1 ? prev + 1 : 0;
        
        // Scroll the selected item into view
        setTimeout(() => {
          const searchContainer = document.querySelector('.max-h-80.overflow-y-auto');
          if (searchContainer) {
            const items = searchContainer.querySelectorAll('.cursor-pointer');
            if (items[newIndex]) {
              items[newIndex].scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            }
          }
        }, 0);
        
        return newIndex;
      });
      break;
      
    case "ArrowUp":
      e.preventDefault();
      setSearchSelectedIndex((prev) => {
        const newIndex = prev > 0 ? prev - 1 : results.length - 1;
        
        // Scroll the selected item into view
        setTimeout(() => {
          const searchContainer = document.querySelector('.max-h-80.overflow-y-auto');
          if (searchContainer) {
            const items = searchContainer.querySelectorAll('.cursor-pointer');
            if (items[newIndex]) {
              items[newIndex].scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            }
          }
        }, 0);
        
        return newIndex;
      });
      break;
      
    case "Enter":
      e.preventDefault();
      if (searchSelectedIndex >= 0 && results[searchSelectedIndex]) {
        const mp = results[searchSelectedIndex];
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
          chemicalsDesc: mp.chemicals
            .map((id) => chemicals.find((c) => c._id === id)?.desc || "")
            .concat(Array(5 - mp.chemicals.length).fill("")),
          solventDesc: mp.solventDesc || "",
          bufferDesc: mp.bufferDesc || "",
        });
        setSelectedMobilePhase(mp);
        setCurrentMobilePhaseIndex(
          displayedMobilePhases.findIndex((c) => c._id === mp._id)
        );
        setShowSearchModal(false);
        setSearchSelectedIndex(-1);
        setSearchTerm("");
      }
      break;
      
    case "Escape":
      setShowSearchModal(false);
      setSearchSelectedIndex(-1);
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
        modulePath="/dashboard/mobile-phase"
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
            <div
              className="p-4 border-b border-[#a6c8ff]"
              style={{
                backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)",
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">
                  Mobile Phases ({sortedMobilePhases.length})
                </h2>
                <div className="flex items-center space-x-4">
                  {/* Sort Controls */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">
                      Sort by:
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as "name" | "mobilePhaseCode")
                      }
                      className="px-2 py-1 border border-[#a6c8ff] rounded text-sm focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                    >
                      <option value="name">Name</option>
                      <option value="mobilePhaseCode">Mobile Phase Code</option>
                    </select>
                    <button
                      onClick={() =>
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }
                      className="px-2 py-1 bg-white border border-[#a6c8ff] rounded hover:bg-[#e6f0fa] text-sm focus:ring-2 focus:ring-[#66a3ff] focus:outline-none"
                      title={`Sort ${
                        sortOrder === "asc" ? "Descending" : "Ascending"
                      }`}
                    >
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                  </div>

                  {/* Filter Controls */}
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

      {/* Enhanced Mobile Phase Form Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-4 w-full max-w-5xl max-h-[85vh] overflow-y-auto mx-4"
            style={{
              border: "1px solid #0055a4",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 3px 15px rgba(0,85,164,0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-b from-[#0055a4] to-[#0088d1] rounded-sm flex items-center justify-center">
                  <span className="text-white text-sm font-bold">M</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {isEditMode ? "Edit Mobile Phase" : "Add New Mobile Phase"}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1 hover:bg-gray-100 rounded"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Mobile Phase Code and Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Phase Code *
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={formData.mobilePhaseCode}
                    disabled={true}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-generated and read-only
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            solventDesc: e.target.checked
                              ? formData.solventDesc
                              : "",
                            isBuffer: e.target.checked
                              ? false
                              : formData.isBuffer,
                            bufferName: e.target.checked
                              ? ""
                              : formData.bufferName,
                            bufferDesc: e.target.checked
                              ? ""
                              : formData.bufferDesc,
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
                            bufferDesc: e.target.checked
                              ? formData.bufferDesc
                              : "",
                            pHValue: e.target.checked ? formData.pHValue : "",
                            isSolvent: e.target.checked
                              ? false
                              : formData.isSolvent,
                            solventName: e.target.checked
                              ? ""
                              : formData.solventName,
                            solventDesc: e.target.checked
                              ? ""
                              : formData.solventDesc,
                          })
                        }
                        className="h-4 w-4 text-[#0055a4] border-2 border-blue-300 rounded focus:ring-2 focus:ring-[#66a3ff]"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Buffer
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select either Solvent or Buffer (mutually exclusive)
                  </p>
                </div>
              </div>

              {/* Buffer Name and Description */}
              {formData.isBuffer && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Buffer Name with Enhanced Dropdown */}
                  <div
                    ref={bufferNameDropdownRef}
                    className="relative bg-green-50 p-3 rounded-lg border border-green-200"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buffer Name * <span className="text-green-600">🧪</span>
                    </label>
                    <input
                      ref={bufferNameRef}
                      type="text"
                      value={formData.bufferName}
                      disabled={!isFormEnabled}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFormData({
                          ...formData,
                          bufferName: newValue,
                        });

                        // Auto-sync description when exact match found
                        const exactMatch = chemicals.find(
                          (c) =>
                            c.isBuffer &&
                            c.chemicalName.toLowerCase() ===
                              newValue.toLowerCase()
                        );
                        if (exactMatch) {
                          setFormData((prev) => ({
                            ...prev,
                            bufferDesc: exactMatch.desc || "",
                          }));
                        }

                        setShowDropdown((prev) => ({
                          ...prev,
                          bufferName: true,
                        }));
                        setDropdownSelectedIndex((prev) => ({
                          ...prev,
                          bufferName: -1,
                        }));
                      }}
                      onFocus={() => {
                        setShowDropdown((prev) => ({
                          ...prev,
                          bufferName: true,
                        }));
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, "bufferName")}
                      className={`w-full px-3 py-2 border-2 border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none ${
                        isFormEnabled ? "bg-white" : "bg-gray-100"
                      }`}
                      placeholder="Type or select buffer name..."
                      autoComplete="off"
                    />

                    {/* Enhanced Buffer Name Dropdown */}
                    {showDropdown.bufferName && isFormEnabled && (
  <div className="absolute z-30 mt-1 w-full bg-white border-2 border-green-300 rounded-lg shadow-xl max-h-60 overflow-y-auto dropdown-active">
    <div className="sticky top-0 p-3 bg-green-50 border-b border-green-200">
      <span className="text-sm font-medium text-green-700">
        📋 Available Buffer Chemicals
      </span>
    </div>
    {chemicals
      .filter((c) => c.isBuffer)
      .filter(
        (c) =>
          formData.bufferName === "" ||
          c.chemicalName
            .toLowerCase()
            .includes(formData.bufferName.toLowerCase())
      )
      .map((chemical, index) => (
        <div
          key={chemical._id}
          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
            index === dropdownSelectedIndex.bufferName
              ? "bg-green-100 border-l-4 border-l-green-500 dropdown-selected"
              : "hover:bg-green-50"
          }`}
          onClick={() => {
            setFormData({
              ...formData,
              bufferName: chemical.chemicalName,
              bufferDesc: chemical.desc || "",
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
          <div className="font-semibold text-gray-800 text-sm">
            {chemical.chemicalName}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center">
            <span className="mr-2">📝</span>
            Description: {chemical.desc || "No description available"}
          </div>
          <div className="text-xs text-green-600 mt-2 flex items-center justify-between">
            <span>Click to select • Use ↑↓ keys</span>
            <span className="bg-green-100 px-2 py-1 rounded-full">
              Buffer
            </span>
          </div>
        </div>
      ))}
    {chemicals.filter(
      (c) =>
        c.isBuffer &&
        (formData.bufferName === "" ||
          c.chemicalName
            .toLowerCase()
            .includes(formData.bufferName.toLowerCase()))
    ).length === 0 && (
      <div className="px-4 py-6 text-center text-gray-500">
        <div className="text-lg mb-2">🔍</div>
        <div className="font-medium">No matching buffer chemicals found</div>
        <div className="text-xs mt-1">Try different search terms</div>
      </div>
    )}
  </div>
)}
                  </div>

                  {/* Buffer Description with Enhanced Dropdown */}
                  <div
                    ref={bufferDescDropdownRef}
                    className="relative bg-green-50 p-3 rounded-lg border border-green-200"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buffer Description{" "}
                      <span className="text-green-600">📝</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bufferDesc}
                      disabled={!isFormEnabled}
                      onChange={(e) => {
                        const newDesc = e.target.value;
                        setFormData({
                          ...formData,
                          bufferDesc: newDesc,
                        });

                        // Auto-sync chemical name when exact match found
                        const exactMatch = chemicals.find(
                          (c) =>
                            c.isBuffer &&
                            c.desc &&
                            c.desc.toLowerCase() === newDesc.toLowerCase()
                        );
                        if (exactMatch) {
                          setFormData((prev) => ({
                            ...prev,
                            bufferName: exactMatch.chemicalName,
                          }));
                        }

                        setShowDescDropdown((prev) => ({
                          ...prev,
                          bufferDesc: true,
                        }));
                        setDescDropdownSelectedIndex((prev) => ({
                          ...prev,
                          bufferDesc: -1,
                        }));
                      }}
                      onFocus={() => {
                        setShowDescDropdown((prev) => ({
                          ...prev,
                          bufferDesc: true,
                        }));
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, "bufferDesc")}
                      className={`w-full px-3 py-2 border-2 border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none ${
                        isFormEnabled ? "bg-white" : "bg-gray-100"
                      }`}
                      placeholder="Type or select description..."
                      autoComplete="off"
                    />

                    {/* Enhanced Buffer Description Dropdown */}
                    {showDescDropdown.bufferDesc && isFormEnabled && (
                      <div className="absolute z-30 mt-1 w-full bg-white border-2 border-green-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div className="sticky top-0 p-3 bg-green-50 border-b border-green-200">
                          <span className="text-sm font-medium text-green-700">
                            📝 Available Buffer Descriptions
                          </span>
                        </div>
                        {(() => {
                          const availableDescs = chemicals
                            .filter(
                              (c) =>
                                c.isBuffer && c.desc && c.desc.trim() !== ""
                            )
                            .filter(
                              (c) =>
                                formData.bufferDesc === "" ||
                                c
                                  .desc!.toLowerCase()
                                  .includes(formData.bufferDesc.toLowerCase())
                            );

                          return availableDescs.length > 0 ? (
                            availableDescs.map((chemical, index) => (
                              <div
                                key={chemical._id}
                                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                                  index === descDropdownSelectedIndex.bufferDesc
                                    ? "bg-green-100 border-l-4 border-l-green-500"
                                    : "hover:bg-green-50"
                                }`}
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    bufferDesc: chemical.desc || "",
                                    bufferName: chemical.chemicalName,
                                  });
                                  setShowDescDropdown({
                                    ...showDescDropdown,
                                    bufferDesc: false,
                                  });
                                  setDescDropdownSelectedIndex({
                                    ...descDropdownSelectedIndex,
                                    bufferDesc: -1,
                                  });
                                }}
                              >
                                <div className="font-semibold text-gray-800 text-sm">
                                  {chemical.desc}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                  <span className="mr-2">🧪</span>
                                  Chemical: {chemical.chemicalName}
                                </div>
                                <div className="text-xs text-green-600 mt-2 flex items-center justify-between">
                                  <span>Click to select • Use ↑↓ keys</span>
                                  <span className="bg-green-100 px-2 py-1 rounded-full">
                                    Buffer
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center">
                              <div className="text-gray-500 text-lg mb-2">
                                ✏️
                              </div>
                              <div className="text-gray-500 font-medium mb-1">
                                {formData.bufferDesc
                                  ? "No matching descriptions found"
                                  : "No descriptions available"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formData.bufferDesc
                                  ? `Continue typing "${formData.bufferDesc}" as custom description`
                                  : "Start typing to see available descriptions"}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Solvent Name and Description */}
              {formData.isSolvent && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Solvent Name with Enhanced Dropdown */}
                  <div
                    ref={solventNameDropdownRef}
                    className="relative bg-yellow-50 p-3 rounded-lg border border-yellow-200"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Solvent Name * <span className="text-yellow-600">🧪</span>
                    </label>
                    <input
                      ref={solventNameRef}
                      type="text"
                      value={formData.solventName}
                      disabled={!isFormEnabled}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setFormData({
                          ...formData,
                          solventName: newValue,
                        });

                        // Auto-sync description when exact match found
                        const exactMatch = chemicals.find(
                          (c) =>
                            c.isSolvent &&
                            c.chemicalName.toLowerCase() ===
                              newValue.toLowerCase()
                        );
                        if (exactMatch) {
                          setFormData((prev) => ({
                            ...prev,
                            solventDesc: exactMatch.desc || "",
                          }));
                        }

                        setShowDropdown((prev) => ({
                          ...prev,
                          solventName: true,
                        }));
                        setDropdownSelectedIndex((prev) => ({
                          ...prev,
                          solventName: -1,
                        }));
                      }}
                      onFocus={() => {
                        setShowDropdown((prev) => ({
                          ...prev,
                          solventName: true,
                        }));
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, "solventName")}
                      className={`w-full px-3 py-2 border-2 border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none ${
                        isFormEnabled ? "bg-white" : "bg-gray-100"
                      }`}
                      placeholder="Type or select solvent name..."
                      autoComplete="off"
                    />

                    {/* Enhanced Solvent Name Dropdown */}
                    {showDropdown.solventName && isFormEnabled && (
                      <div className="absolute z-30 mt-1 w-full bg-white border-2 border-yellow-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div className="sticky top-0 p-3 bg-yellow-50 border-b border-yellow-200">
                          <span className="text-sm font-medium text-yellow-700">
                            📋 Available Solvent Chemicals (
                            {chemicals.filter((c) => c.isSolvent).length})
                          </span>
                        </div>
                        {chemicals
                          .filter((c) => c.isSolvent)
                          .filter(
                            (c) =>
                              formData.solventName === "" ||
                              c.chemicalName
                                .toLowerCase()
                                .includes(formData.solventName.toLowerCase())
                          )
                          .map((chemical, index) => (
                            <div
                              key={chemical._id}
                              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                                index === dropdownSelectedIndex.solventName
                                  ? "bg-yellow-100 border-l-4 border-l-yellow-500"
                                  : "hover:bg-yellow-50"
                              }`}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  solventName: chemical.chemicalName,
                                  solventDesc: chemical.desc || "",
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
                              <div className="font-semibold text-gray-800 text-sm">
                                {chemical.chemicalName}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center">
                                <span className="mr-2">📝</span>
                                Description:{" "}
                                {chemical.desc || "No description available"}
                              </div>
                              <div className="text-xs text-yellow-600 mt-2 flex items-center justify-between">
                                <span>Click to select • Use ↑↓ keys</span>
                                <span className="bg-yellow-100 px-2 py-1 rounded-full">
                                  Solvent
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Solvent Description with Enhanced Dropdown */}
                  <div
                    ref={solventDescDropdownRef}
                    className="relative bg-yellow-50 p-3 rounded-lg border border-yellow-200"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Solvent Description{" "}
                      <span className="text-yellow-600">📝</span>
                    </label>
                    <input
                      type="text"
                      value={formData.solventDesc}
                      disabled={!isFormEnabled}
                      onChange={(e) => {
                        const newDesc = e.target.value;
                        setFormData({
                          ...formData,
                          solventDesc: newDesc,
                        });

                        // Auto-sync chemical name when exact match found
                        const exactMatch = chemicals.find(
                          (c) =>
                            c.isSolvent &&
                            c.desc &&
                            c.desc.toLowerCase() === newDesc.toLowerCase()
                        );
                        if (exactMatch) {
                          setFormData((prev) => ({
                            ...prev,
                            solventName: exactMatch.chemicalName,
                          }));
                        }

                        setShowDescDropdown((prev) => ({
                          ...prev,
                          solventDesc: true,
                        }));
                        setDescDropdownSelectedIndex((prev) => ({
                          ...prev,
                          solventDesc: -1,
                        }));
                      }}
                      onFocus={() => {
                        setShowDescDropdown((prev) => ({
                          ...prev,
                          solventDesc: true,
                        }));
                      }}
                      onKeyDown={(e) => handleInputKeyDown(e, "solventDesc")}
                      className={`w-full px-3 py-2 border-2 border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none ${
                        isFormEnabled ? "bg-white" : "bg-gray-100"
                      }`}
                      placeholder="Type or select description..."
                      autoComplete="off"
                    />

                    {/* Enhanced Solvent Description Dropdown */}
                    {showDescDropdown.solventDesc && isFormEnabled && (
                      <div className="absolute z-30 mt-1 w-full bg-white border-2 border-yellow-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        <div className="sticky top-0 p-3 bg-yellow-50 border-b border-yellow-200">
                          <span className="text-sm font-medium text-yellow-700">
                            📝 Available Solvent Descriptions
                          </span>
                        </div>
                        {(() => {
                          const availableDescs = chemicals
                            .filter(
                              (c) =>
                                c.isSolvent && c.desc && c.desc.trim() !== ""
                            )
                            .filter(
                              (c) =>
                                formData.solventDesc === "" ||
                                c
                                  .desc!.toLowerCase()
                                  .includes(formData.solventDesc.toLowerCase())
                            );

                          return availableDescs.length > 0 ? (
                            availableDescs.map((chemical, index) => (
                              <div
                                key={chemical._id}
                                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                                  index ===
                                  descDropdownSelectedIndex.solventDesc
                                    ? "bg-yellow-100 border-l-4 border-l-yellow-500"
                                    : "hover:bg-yellow-50"
                                }`}
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    solventDesc: chemical.desc || "",
                                    solventName: chemical.chemicalName,
                                  });
                                  setShowDescDropdown({
                                    ...showDescDropdown,
                                    solventDesc: false,
                                  });
                                  setDescDropdownSelectedIndex({
                                    ...descDropdownSelectedIndex,
                                    solventDesc: -1,
                                  });
                                }}
                              >
                                <div className="font-semibold text-gray-800 text-sm">
                                  {chemical.desc}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                  <span className="mr-2">🧪</span>
                                  Chemical: {chemical.chemicalName}
                                </div>
                                <div className="text-xs text-yellow-600 mt-2 flex items-center justify-between">
                                  <span>Click to select • Use ↑↓ keys</span>
                                  <span className="bg-yellow-100 px-2 py-1 rounded-full">
                                    Solvent
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center">
                              <div className="text-gray-500 text-lg mb-2">
                                ✏️
                              </div>
                              <div className="text-gray-500 font-medium mb-1">
                                {formData.solventDesc
                                  ? "No matching descriptions found"
                                  : "No descriptions available"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formData.solventDesc
                                  ? `Continue typing "${formData.solventDesc}" as custom description`
                                  : "Start typing to see available descriptions"}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enhanced Chemicals Array */}
              {formData.isBuffer && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <label className="text-lg font-medium text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">🧪</span>
                    Chemicals * (At least first chemical is required)
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {formData.chemicals.slice(0, 5).map((chemicalId, index) => (
                      <div key={index} className="space-y-2">
                        {/* Chemical Name Input with Enhanced Dropdown */}
                        <div
                          ref={(el) => {
                            chemicalDropdownRefs.current[index] = el;
                          }}
                          className="relative"
                        >
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Chemical {index + 1}
                            {index === 0 ? " *" : ""}
                          </label>
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
                              const exactMatch = chemicals.find(
                                (c) =>
                                  c.chemicalName.toLowerCase() ===
                                  typedValue.toLowerCase()
                              );

                              const newChemicals = [...formData.chemicals];
                              const newChemicalsDesc = [
                                ...formData.chemicalsDesc,
                              ];

                              if (typedValue === "") {
                                newChemicals[index] = "";
                                newChemicalsDesc[index] = "";
                              } else if (exactMatch) {
                                newChemicals[index] = exactMatch._id;
                                newChemicalsDesc[index] = exactMatch.desc || "";
                              }

                              setFormData({
                                ...formData,
                                chemicals: newChemicals,
                                chemicalsDesc: newChemicalsDesc,
                              });

                              setShowDropdown({
                                ...showDropdown,
                                chemicals: showDropdown.chemicals.map((v, i) =>
                                  i === index ? true : v
                                ),
                              });
                              setDropdownSelectedIndex({
                                ...dropdownSelectedIndex,
                                chemicals: dropdownSelectedIndex.chemicals.map(
                                  (v, i) => (i === index ? -1 : v)
                                ),
                              });
                            }}
                            onFocus={() => {
                              setShowDropdown({
                                ...showDropdown,
                                chemicals: showDropdown.chemicals.map((v, i) =>
                                  i === index ? true : v
                                ),
                              });
                            }}
                            onKeyDown={(e) =>
                              handleInputKeyDown(e, "chemicals", index)
                            }
                            className={`w-full px-2 py-2 border-2 border-purple-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none text-sm ${
                              isFormEnabled ? "bg-white" : "bg-gray-100"
                            }`}
                            placeholder={`Type chemical...`}
                            autoComplete="off"
                          />

                          {/* Enhanced Chemical Dropdown */}
                          {showDropdown.chemicals[index] && isFormEnabled && (
                            <div className="absolute z-30 w-full mt-1 bg-white border-2 border-purple-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                              <div className="sticky top-0 p-2 bg-purple-50 border-b border-purple-200">
                                <span className="text-xs font-medium text-purple-700">
                                  Available Chemicals
                                </span>
                              </div>
                              {(() => {
                                const currentValue =
                                  chemicals.find((c) => c._id === chemicalId)
                                    ?.chemicalName || "";
                                const filteredChemicals = chemicals.filter(
                                  (c) =>
                                    currentValue === "" ||
                                    c.chemicalName
                                      .toLowerCase()
                                      .includes(currentValue.toLowerCase())
                                );

                                return filteredChemicals.map(
                                  (chemical, cIndex) => (
                                    <div
                                      key={chemical._id}
                                      className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                                        cIndex ===
                                        dropdownSelectedIndex.chemicals[index]
                                          ? "bg-purple-100 border-l-4 border-l-purple-500"
                                          : "hover:bg-purple-50"
                                      }`}
                                      onClick={() => {
                                        const newChemicals = [
                                          ...formData.chemicals,
                                        ];
                                        const newChemicalsDesc = [
                                          ...formData.chemicalsDesc,
                                        ];
                                        newChemicals[index] = chemical._id;
                                        newChemicalsDesc[index] =
                                          chemical.desc || "";
                                        setFormData({
                                          ...formData,
                                          chemicals: newChemicals,
                                          chemicalsDesc: newChemicalsDesc,
                                        });
                                        setShowDropdown({
                                          ...showDropdown,
                                          chemicals: showDropdown.chemicals.map(
                                            (v, i) => (i === index ? false : v)
                                          ),
                                        });
                                      }}
                                    >
                                      <div className="font-medium text-sm">
                                        {chemical.chemicalName}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {chemical.desc || "No description"}
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                                          {chemical.isBuffer &&
                                          chemical.isSolvent
                                            ? "Buffer & Solvent"
                                            : chemical.isBuffer
                                            ? "Buffer"
                                            : chemical.isSolvent
                                            ? "Solvent"
                                            : "Chemical"}
                                        </span>
                                        <span className="text-xs text-purple-600">
                                          ↑↓ • Click
                                        </span>
                                      </div>
                                    </div>
                                  )
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Chemical Description Input - User Editable */}
                        <div
                          ref={(el) => {
                            chemicalDescDropdownRefs.current[index] = el;
                          }}
                          className="relative"
                        >
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={formData.chemicalsDesc[index] || ""}
                            disabled={!isFormEnabled}
                            onChange={(e) => {
                              const newDesc = e.target.value;
                              const newChemicalsDesc = [
                                ...formData.chemicalsDesc,
                              ];
                              newChemicalsDesc[index] = newDesc;
                              setFormData({
                                ...formData,
                                chemicalsDesc: newChemicalsDesc,
                              });

                              // Auto-sync chemical when typing description
                              const foundChemical = chemicals.find(
                                (c) =>
                                  c.desc &&
                                  c.desc.toLowerCase() === newDesc.toLowerCase()
                              );
                              if (foundChemical) {
                                const newChemicals = [...formData.chemicals];
                                newChemicals[index] = foundChemical._id;
                                setFormData((prev) => ({
                                  ...prev,
                                  chemicals: newChemicals,
                                }));
                              }

                              setShowDescDropdown({
                                ...showDescDropdown,
                                chemicalsDesc:
                                  showDescDropdown.chemicalsDesc.map((v, i) =>
                                    i === index ? true : v
                                  ),
                              });
                            }}
                            onFocus={() => {
                              setShowDescDropdown({
                                ...showDescDropdown,
                                chemicalsDesc:
                                  showDescDropdown.chemicalsDesc.map((v, i) =>
                                    i === index ? true : v
                                  ),
                              });
                            }}
                            onKeyDown={(e) =>
                              handleInputKeyDown(e, "chemicalsDesc", index)
                            }
                            className={`w-full px-2 py-2 border border-purple-200 rounded-md focus:ring-2 focus:ring-purple-300 focus:border-purple-300 focus:outline-none text-xs ${
                              isFormEnabled ? "bg-white" : "bg-gray-100"
                            }`}
                            placeholder="Type description..."
                            autoComplete="off"
                          />

                          {/* Chemical Description Dropdown */}
                          {showDescDropdown.chemicalsDesc[index] &&
                            isFormEnabled && (
                              <div className="absolute z-30 w-full mt-1 bg-white border-2 border-purple-300 rounded-lg shadow-xl max-h-36 overflow-y-auto">
                                <div className="sticky top-0 p-2 bg-purple-50 border-b border-purple-200">
                                  <span className="text-xs font-medium text-purple-700">
                                    Available Descriptions
                                  </span>
                                </div>
                                {(() => {
                                  const availableDescs = chemicals
                                    .filter(
                                      (c) => c.desc && c.desc.trim() !== ""
                                    )
                                    .filter(
                                      (c) =>
                                        formData.chemicalsDesc[index] === "" ||
                                        c
                                          .desc!.toLowerCase()
                                          .includes(
                                            formData.chemicalsDesc[
                                              index
                                            ]!.toLowerCase()
                                          )
                                    )
                                    .slice(0, 8); // Limit for performance

                                  return availableDescs.length > 0 ? (
                                    availableDescs.map((chemical, cIndex) => (
                                      <div
                                        key={chemical._id}
                                        className="px-2 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-purple-50 transition-colors"
                                        onClick={() => {
                                          const newChemicals = [
                                            ...formData.chemicals,
                                          ];
                                          const newChemicalsDesc = [
                                            ...formData.chemicalsDesc,
                                          ];
                                          newChemicals[index] = chemical._id;
                                          newChemicalsDesc[index] =
                                            chemical.desc || "";
                                          setFormData({
                                            ...formData,
                                            chemicals: newChemicals,
                                            chemicalsDesc: newChemicalsDesc,
                                          });
                                          setShowDescDropdown({
                                            ...showDescDropdown,
                                            chemicalsDesc:
                                              showDescDropdown.chemicalsDesc.map(
                                                (v, i) =>
                                                  i === index ? false : v
                                              ),
                                          });
                                        }}
                                      >
                                        <div className="font-medium text-xs">
                                          {chemical.desc}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {chemical.chemicalName}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-2 py-3 text-center text-gray-500 text-xs">
                                      No matching descriptions
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-3 flex items-center">
                    <span className="mr-1">💡</span>
                    Descriptions auto-sync with chemical selection but are fully
                    editable
                  </p>
                </div>
              )}

              {/* pH Value */}
              {formData.isBuffer && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <label className=" text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">🧪</span>
                    pH Value *
                  </label>
                  <input
                    type="number"
                    value={formData.pHValue}
                    disabled={!isFormEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, pHValue: e.target.value })
                    }
                    className={`w-full px-3 py-2 border-2 border-orange-300 rounded-md focus:ring-2 focus:ring-orange-400 focus:outline-none ${
                      isFormEnabled ? "bg-white" : "bg-gray-100"
                    }`}
                    placeholder="pH (0-14)"
                    min="0"
                    max="14"
                    step="0.1"
                  />
                </div>
              )}

              {/* Description */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <span className="mr-2">📝</span>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  disabled={!isFormEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={`w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-gray-100"
                  }`}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </div>

            {/* Enhanced Modal Footer */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500 flex items-center">
                <span className="mr-1">💡</span>
                Use Tab/Shift+Tab to navigate • ↑↓ arrows in dropdowns • Esc to
                close
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFormModal(false)}
                  className="px-6 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded-md hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] font-medium transition-all duration-200"
                  style={{
                    border: "1px solid #808080",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  Cancel
                </button>
                {isFormEnabled && (
                  <button
                    onClick={async () => {
                      await handleSave();
                    }}
                    className="px-6 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded-md hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] font-medium transition-all duration-200"
                    style={{
                      border: "1px solid #004080",
                      boxShadow: "0 2px 4px rgba(0,85,164,0.2)",
                    }}
                  >
                    {isEditMode ? "Update" : "Save"} Mobile Phase
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-40"
          style={{ backdropFilter: "blur(3px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4"
            style={{
              border: "2px solid #0055a4",
              boxShadow: "0 10px 25px rgba(0,85,164,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="mr-2">🔍</span>
                Search Mobile Phases
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Terms
                </label>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Search by mobile phase code, name, or description..."
                  autoFocus
                />
              </div>

              {searchResults.length > 0 && (
  <div className="max-h-80 overflow-y-auto border-2 border-gray-200 rounded-lg">
    <div className="sticky top-0 bg-blue-50 p-3 border-b border-blue-200">
      <span className="text-sm font-medium text-blue-700">
        Search Results ({searchResults.length})
      </span>
    </div>
    {searchResults.map((mp, index) => (
      <div
        key={mp._id}
        className={`p-4 border-b border-gray-100 cursor-pointer last:border-b-0 ${
          index === searchSelectedIndex
            ? "bg-blue-100 border-l-4 border-l-blue-500"
            : "hover:bg-gray-50"
        }`}
        onClick={() => {
          setSelectedMobilePhase(mp);
          const originalIndex = displayedMobilePhases.findIndex(
            (phase) => phase._id === mp._id
          );
          setCurrentMobilePhaseIndex(originalIndex);
          setShowSearchModal(false);
          setSearchTerm("");
          setSearchResults([]);
          setSearchSelectedIndex(-1);
        }}
      >
        <div className="font-semibold text-gray-800">
          {mp.mobilePhaseCode}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Type:{" "}
          {mp.isSolvent
            ? "Solvent"
            : mp.isBuffer
            ? "Buffer"
            : "—"}{" "}
          | Name: {mp.bufferName || mp.solventName || "—"}
        </div>
        {mp.description && (
          <div className="text-xs text-gray-500 mt-1">
            Description: {mp.description}
          </div>
        )}
      </div>
    ))}
  </div>
)}

              {searchTerm && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg mb-2">🔍</div>
                  <div>No mobile phases found for "{searchTerm}"</div>
                  <div className="text-sm mt-1">Try different search terms</div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchTerm("");
                  setSearchResults([]);
                  setSearchSelectedIndex(-1);
                }}
                className="px-6 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded-md hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] font-medium"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                Close Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && selectedMobilePhase && (
        <div
          className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-40"
          style={{ backdropFilter: "blur(3px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto"
            style={{
              border: "2px solid #0055a4",
              boxShadow: "0 10px 25px rgba(0,85,164,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="mr-2">📋</span>
                Audit Trail - {selectedMobilePhase.mobilePhaseCode}
              </h3>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Mobile Phase Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Code:</strong> {selectedMobilePhase.mobilePhaseCode}
                  </div>
                  <div>
                    <strong>Type:</strong>{" "}
                    {selectedMobilePhase.isSolvent
                      ? "Solvent"
                      : selectedMobilePhase.isBuffer
                      ? "Buffer"
                      : "—"}
                  </div>
                  <div>
                    <strong>Name:</strong>{" "}
                    {selectedMobilePhase.bufferName ||
                      selectedMobilePhase.solventName ||
                      "—"}
                  </div>
                  <div>
                    <strong>pH Value:</strong>{" "}
                    {selectedMobilePhase.pHValue || "—"}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Audit Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Created At:</strong>{" "}
                    {new Date(selectedMobilePhase.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <strong>Updated At:</strong>{" "}
                    {new Date(selectedMobilePhase.updatedAt).toLocaleString()}
                  </div>
                  <div>
                    <strong>Created By:</strong> {selectedMobilePhase.createdBy}
                  </div>
                  <div>
                    <strong>Company ID:</strong> {selectedMobilePhase.companyId}
                  </div>
                  <div>
                    <strong>Location ID:</strong>{" "}
                    {selectedMobilePhase.locationId}
                  </div>
                </div>
              </div>

              {selectedMobilePhase.chemicals &&
                selectedMobilePhase.chemicals.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2">
                      Associated Chemicals
                    </h4>
                    <div className="space-y-1">
                      {selectedMobilePhase.chemicals.map((chemId, index) => {
                        const chemical = chemicals.find(
                          (c) => c._id === chemId
                        );
                        return chemical ? (
                          <div key={index} className="text-sm">
                            <strong>Chemical {index + 1}:</strong>{" "}
                            {chemical.chemicalName}
                            {chemical.desc && (
                              <span className="text-gray-600">
                                {" "}
                                ({chemical.desc})
                              </span>
                            )}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-6 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded-md hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] font-medium"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
          style={{ backdropFilter: "blur(3px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto"
            style={{
              border: "2px solid #0055a4",
              boxShadow: "0 10px 25px rgba(0,85,164,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <span className="mr-2">❓</span>
                Help - Mobile Phase Master
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">
                  🚀 Getting Started
                </h4>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>• Click "Add New" to create a mobile phase</li>
                  <li>• Select either "Solvent" or "Buffer" type</li>
                  <li>
                    • Use the enhanced dropdowns with arrow key navigation
                  </li>
                  <li>• Descriptions auto-sync with chemical names</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">
                  ⌨️ Keyboard Shortcuts
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                  <div>
                    <div>
                      <strong>↑ ↓</strong> - Navigate dropdown options
                    </div>
                    <div>
                      <strong>Enter</strong> - Select option
                    </div>
                    <div>
                      <strong>Esc</strong> - Close dropdown
                    </div>
                  </div>
                  <div>
                    <div>
                      <strong>Tab</strong> - Next field
                    </div>
                    <div>
                      <strong>Shift+Tab</strong> - Previous field
                    </div>
                    <div>
                      <strong>Backspace</strong> - Clear/edit text
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-3">
                  🔬 Field Descriptions
                </h4>
                <div className="space-y-3 text-sm text-purple-700">
                  <div>
                    <strong>Chemical Name:</strong> Select from available
                    chemicals or type to search
                  </div>
                  <div>
                    <strong>Description:</strong> Auto-syncs with chemical
                    selection but fully editable
                  </div>
                  <div>
                    <strong>pH Value:</strong> Required for buffer types (0-14
                    range)
                  </div>
                  <div>
                    <strong>Chemicals Array:</strong> Up to 5 chemicals for
                    buffer compositions
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-3">
                  💡 Pro Tips
                </h4>
                <ul className="space-y-2 text-sm text-yellow-700">
                  <li>• Click outside dropdowns to close them</li>
                  <li>• Type descriptions to auto-fetch chemical names</li>
                  <li>• Use filters to show only solvents or buffers</li>
                  <li>• Search function supports partial matches</li>
                  <li>• All description fields support custom text</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded-md hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] font-medium"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                Close Help
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
