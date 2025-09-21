"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";

// Updated interface to handle both populated and non-populated detector data
interface DetectorData {
  _id: string;
  detectorType?: string;
}

interface HPLC {
  _id: string;
  type: string;
  detector: (string | DetectorData)[]; // Can be either string IDs or populated objects
  internalCode: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface DetectorType {
  _id: string;
  detectorType: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  type: string;
  detector: string[];
  internalCode: string;
  isActive: boolean;
}

function HPLCMaster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hplcs, setHPLCs] = useState<HPLC[]>([]);
  const [detectorTypes, setDetectorTypes] = useState<DetectorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({ type: "", detector: [], internalCode: "", isActive: true });
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentHPLCIndex, setCurrentHPLCIndex] = useState(-1);
  const [selectedHPLC, setSelectedHPLC] = useState<HPLC | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const auditSearchInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to extract detector ID from either string or object
  const getDetectorId = (detector: string | DetectorData): string => {
    if (typeof detector === 'string') {
      return detector;
    }
    return detector._id;
  };

  // Helper function to extract detector IDs array
  const getDetectorIds = (detectors: (string | DetectorData)[]): string[] => {
    return detectors.map(d => getDetectorId(d));
  };

  const fetchDetectorTypes = async () => {
    if (!companyId || !locationId) return;
    try {
      const response = await fetch(`/api/admin/detector-type?companyId=${companyId}&locationId=${locationId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setDetectorTypes(data.data);
      } else {
        setError(data.error || "Failed to fetch detector types");
      }
    } catch (err: any) {
      setError(`Failed to fetch detector types: ${err.message}`);
    }
  };

  const fetchHPLCs = async () => {
    if (!companyId || !locationId) {
      setError("Please ensure company and location are set in localStorage");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = `/api/admin/hplc?companyId=${companyId}&locationId=${locationId}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-cache",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Enhanced validation with support for populated detector objects
        const validHPLCs = data.data
          .filter((hplc: HPLC) => {
            // Basic existence check
            if (!hplc) {
              console.log('Null/undefined HPLC found');
              return false;
            }

            // Type validation
            if (!hplc.type || typeof hplc.type !== "string" || !["HPLC", "UPLC"].includes(hplc.type)) {
              console.log('Invalid type for HPLC:', hplc._id, 'Type:', hplc.type);
              return false;
            }

            // Detector validation - handle both populated and non-populated
            if (!Array.isArray(hplc.detector)) {
              console.log('Detector is not array for HPLC:', hplc._id, 'Detector:', hplc.detector);
              return false;
            }

            if (hplc.detector.length === 0) {
              console.log('Empty detector array for HPLC:', hplc._id);
              return false;
            }

            // Check each detector - handle both string IDs and populated objects
            const hasInvalidDetector = hplc.detector.some((detector: any, index: number) => {
              let detectorIdString: string;
              
              if (typeof detector === "string") {
                detectorIdString = detector;
              } else if (detector && typeof detector === "object" && detector._id) {
                // Handle populated detector object
                detectorIdString = detector._id;
              } else {
                console.log(`Invalid detector format for HPLC: ${hplc._id} at index ${index}. Detector:`, detector, 'Type:', typeof detector);
                return true;
              }

              if (!detectorIdString || detectorIdString.trim().length === 0) {
                console.log(`Empty detector ID for HPLC: ${hplc._id} at index ${index}`);
                return true;
              }

              // Basic ObjectId format check (24 hex characters)
              if (!/^[0-9a-fA-F]{24}$/.test(detectorIdString.trim())) {
                console.log(`Invalid ObjectId format for detector in HPLC: ${hplc._id} at index ${index}. Detector ID: "${detectorIdString}"`);
                return true;
              }
              return false;
            });

            if (hasInvalidDetector) {
              return false;
            }

            // Internal code validation
            if (!hplc.internalCode || typeof hplc.internalCode !== "string" || hplc.internalCode.trim().length === 0) {
              console.log('Invalid internal code for HPLC:', hplc._id, 'Internal Code:', hplc.internalCode);
              return false;
            }

            // Active status validation
            if (typeof hplc.isActive !== "boolean") {
              console.log('Invalid isActive status for HPLC:', hplc._id, 'isActive:', hplc.isActive, 'Type:', typeof hplc.isActive);
              return false;
            }

            // Company and Location validation
            if (hplc.companyId !== companyId) {
              console.log('Company ID mismatch for HPLC:', hplc._id, 'Expected:', companyId, 'Got:', hplc.companyId);
              return false;
            }

            if (hplc.locationId !== locationId) {
              console.log('Location ID mismatch for HPLC:', hplc._id, 'Expected:', locationId, 'Got:', hplc.locationId);
              return false;
            }

            return true;
          })
          .sort((a: HPLC, b: HPLC) =>
            a.internalCode.toLowerCase().localeCompare(b.internalCode.toLowerCase())
          );

        setHPLCs(validHPLCs);

        // Clear any previous errors if all records are valid
        if (validHPLCs.length === data.data.length) {
          setError("");
        } else if (validHPLCs.length === 0) {
          setError("No valid HPLCs found for the selected company and location.");
        }
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err: any) {
      console.error('fetchHPLCs error:', err);
      
      if (err.message.includes("401")) {
        setError("Unauthorized access. Please log in again.");
      } else if (err.message.includes("404")) {
        setError("HPLC API endpoint not found. Please contact support.");
      } else if (err.message.includes("500")) {
        setError("Server error occurred. Please try again later.");
      } else if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(`Failed to fetch HPLCs: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (action: string, data: any, previousData?: any) => {
    try {
      if (!companyId || !locationId) return;

      const response = await fetch("/api/admin/hplc/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id || "system",
          action,
          data,
          previousData,
          companyId,
          locationId,
          timestamp: new Date().toISOString(),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to log audit action:", await response.json());
      }
    } catch (err) {
      console.error("Failed to log audit action:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      if (!companyId || !locationId) return;

      const queryParams = new URLSearchParams({ companyId, locationId });
      if (selectedHPLC) {
        queryParams.append("type", selectedHPLC.type);
      }
      if (auditSearchTerm) {
        queryParams.append("searchTerm", auditSearchTerm);
      }
      if (auditActionFilter) {
        queryParams.append("action", auditActionFilter);
      }
      if (auditStartDate) {
        queryParams.append("startDate", auditStartDate);
      }
      if (auditEndDate) {
        queryParams.append("endDate", auditEndDate);
      }

      const response = await fetch(`/api/admin/hplc/audit?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data);
      } else {
        setError(data.error || "Failed to fetch audit logs");
      }
    } catch (err) {
      setError("Failed to fetch audit logs");
    }
  };

  useEffect(() => {
    if (companyId && locationId) {
      fetchHPLCs();
      fetchDetectorTypes();
    }
  }, [companyId, locationId]);

  // Updated function to get detector name - handles both populated and non-populated data
  const getDetectorName = (detectors: (string | DetectorData)[]): string => {
    if (!detectors || detectors.length === 0) return "None";
    
    const names = detectors
      .map((detector) => {
        // If it's already a populated object with detectorType
        if (typeof detector === 'object' && detector.detectorType) {
          return detector.detectorType;
        }
        
        // If it's a string ID, look it up in detectorTypes
        const detectorId = typeof detector === 'string' ? detector : detector._id;
        const detectorType = detectorTypes.find((dt) => dt._id === detectorId);
        return detectorType ? detectorType.detectorType : "Unknown";
      })
      .filter((name) => name !== "Unknown");
    
    return names.length > 0 ? names.join(", ") : "Unknown";
  };

  const handleAddNew = () => {
    setIsFormEnabled(true);
    setIsEditMode(false);
    setFormData({ type: "", detector: [], internalCode: "", isActive: true });
    setSelectedHPLC(null);
    setCurrentHPLCIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (
      !isFormEnabled ||
      !formData.type ||
      formData.type.trim() === "" ||
      !formData.detector.length ||
      !formData.internalCode ||
      formData.internalCode.trim() === ""
    ) {
      setError("Type, at least one detector, and internal code are required");
      return;
    }
    
    try {
      if (!companyId || !locationId) {
        setError("Company ID or Location ID not found in localStorage");
        return;
      }

      const url = "/api/admin/hplc";
      const method = isEditMode && selectedHPLC ? "PUT" : "POST";
      const body = {
        id: isEditMode && selectedHPLC ? selectedHPLC._id : undefined,
        type: formData.type,
        detector: formData.detector,
        internalCode: formData.internalCode,
        isActive: formData.isActive,
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
          isEditMode && selectedHPLC ? "UPDATE" : "CREATE",
          {
            type: formData.type,
            detector: getDetectorName(formData.detector.map(id => ({ _id: id }))),
            internalCode: formData.internalCode,
            isActive: formData.isActive,
            companyId,
            locationId,
          },
          isEditMode && selectedHPLC
            ? {
                type: selectedHPLC.type,
                detector: getDetectorName(selectedHPLC.detector),
                internalCode: selectedHPLC.internalCode,
                isActive: selectedHPLC.isActive,
                companyId: selectedHPLC.companyId,
                locationId: selectedHPLC.locationId,
              }
            : null
        );

        setFormData({ type: "", detector: [], internalCode: "", isActive: true });
        setIsFormEnabled(false);
        setIsEditMode(false);
        setSelectedHPLC(null);
        setCurrentHPLCIndex(-1);
        await fetchHPLCs();
      } else {
        setError(data.error || "Failed to save HPLC");
      }
    } catch (err: any) {
      setError(`Failed to save HPLC: ${err.message}`);
    }
  };

  const handleClear = () => {
    setFormData({ type: "", detector: [], internalCode: "", isActive: true });
    setIsFormEnabled(false);
    setIsEditMode(false);
    setSelectedHPLC(null);
    setCurrentHPLCIndex(-1);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentHPLCIndex > 0) {
      const newIndex = currentHPLCIndex - 1;
      setCurrentHPLCIndex(newIndex);
      const hplc = hplcs[newIndex];
      setSelectedHPLC(hplc);
      setFormData({
        type: hplc.type,
        detector: getDetectorIds(hplc.detector),
        internalCode: hplc.internalCode,
        isActive: hplc.isActive,
      });
    }
  };

  const handleDown = () => {
    if (currentHPLCIndex < hplcs.length - 1) {
      const newIndex = currentHPLCIndex + 1;
      setCurrentHPLCIndex(newIndex);
      const hplc = hplcs[newIndex];
      setSelectedHPLC(hplc);
      setFormData({
        type: hplc.type,
        detector: getDetectorIds(hplc.detector),
        internalCode: hplc.internalCode,
        isActive: hplc.isActive,
      });
    } else if (currentHPLCIndex === -1 && hplcs.length > 0) {
      setCurrentHPLCIndex(0);
      const hplc = hplcs[0];
      setSelectedHPLC(hplc);
      setFormData({
        type: hplc.type,
        detector: getDetectorIds(hplc.detector),
        internalCode: hplc.internalCode,
        isActive: hplc.isActive,
      });
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
    setSearchTerm("");
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleEdit = () => {
    if (selectedHPLC) {
      setIsFormEnabled(true);
      setIsEditMode(true);
      setFormData({
        type: selectedHPLC.type,
        detector: getDetectorIds(selectedHPLC.detector),
        internalCode: selectedHPLC.internalCode,
        isActive: selectedHPLC.isActive,
      });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleDelete = async () => {
    if (!selectedHPLC) return;

    if (!confirm(`Are you sure you want to delete HPLC with code "${selectedHPLC.internalCode}"?`)) return;

    try {
      const response = await fetch(`/api/admin/hplc?id=${selectedHPLC._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await logAuditAction("DELETE", {
          type: selectedHPLC.type,
          detector: getDetectorName(selectedHPLC.detector),
          internalCode: selectedHPLC.internalCode,
          isActive: selectedHPLC.isActive,
          companyId: selectedHPLC.companyId,
          locationId: selectedHPLC.locationId,
        });

        await fetchHPLCs();
        setFormData({ type: "", detector: [], internalCode: "", isActive: true });
        setSelectedHPLC(null);
        setCurrentHPLCIndex(-1);
        setIsFormEnabled(false);
        setIsEditMode(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete HPLC");
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
          <title>HPLC Database Report</title>
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
          <h1>HPLC Database Report</h1>
          <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <tr><th>Type</th><th>Detector</th><th>Internal Code</th><th>Active</th><th>Created Date</th></tr>
            ${hplcs
              .map(
                (hplc) =>
                  `<tr><td>${hplc.type}</td><td>${getDetectorName(hplc.detector)}</td><td>${hplc.internalCode}</td><td>${hplc.isActive ? "Yes" : "No"}</td><td>${new Date(
                    hplc.createdAt
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

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const searchResults = hplcs.filter(
      (hplc) =>
        hplc.internalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDetectorName(hplc.detector).toLowerCase().includes(searchTerm.toLowerCase()) ||
        hplc.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setCurrentHPLCIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setCurrentHPLCIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (currentHPLCIndex >= 0 && searchResults[currentHPLCIndex]) {
          const hplc = searchResults[currentHPLCIndex];
          setFormData({
            type: hplc.type,
            detector: getDetectorIds(hplc.detector),
            internalCode: hplc.internalCode,
            isActive: hplc.isActive,
          });
          setSelectedHPLC(hplc);
          setCurrentHPLCIndex(hplcs.findIndex((c) => c._id === hplc._id));
          setShowSearchModal(false);
          setSearchTerm("");
        }
        break;
      case "Escape":
        setShowSearchModal(false);
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
        modulePath="/dashboard/hplc-master"
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
              <span className="text-[#0055a4] text-xs font-bold">H</span>
            </div>
            <span className="font-semibold text-sm">HPLC Master</span>
          </div>
        </div>

        <div className="container mx-auto p-6 px-2 max-w-7xl">
          {error && (
            <div
              className="bg-[#ffe6e6] border border-[#cc0000] text-[#cc0000] px-4 py-3 rounded mb-4 shadow-inner"
              style={{ borderStyle: "inset" }}
            >
              <pre className="whitespace-pre-wrap text-sm">{error}</pre>
            </div>
          )}
          
          <div
            className="bg-white rounded-lg shadow-md p-6 mb-6"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              HPLC Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  disabled={!isFormEnabled}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  <option value="">Select Type</option>
                  <option value="HPLC">HPLC</option>
                  <option value="UPLC">UPLC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detector *
                </label>

                <div
                  className={`border border-[#a6c8ff] rounded p-2 space-y-2 ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                    maxHeight: "150px",
                    overflowY: "auto",
                  }}
                >
                  {detectorTypes.map((dt) => (
                    <label key={dt._id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={dt._id}
                        disabled={!isFormEnabled}
                        checked={formData.detector.includes(dt._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              detector: [...formData.detector, dt._id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              detector: formData.detector.filter((id) => id !== dt._id),
                            });
                          }
                        }}
                        className="h-4 w-4 text-[#66a3ff] border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{dt.detectorType}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Code *
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={formData.internalCode}
                  disabled={!isFormEnabled}
                  onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
                  }}
                  placeholder="Enter internal code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active Status
                </label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  disabled={!isFormEnabled}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mt-2 h-5 w-5 text-[#0055a4] focus:ring-[#66a3ff] border-[#a6c8ff] rounded"
                />
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {selectedHPLC && (
                <div>
                  <span className="font-medium">Selected:</span>{" "}
                  {selectedHPLC.internalCode} ({selectedHPLC.isActive ? "Active" : "Inactive"})
                  <span className="ml-4 font-medium">Index:</span>{" "}
                  {currentHPLCIndex + 1} of {hplcs.length}
                </div>
              )}
              {isFormEnabled && (
                <div className="text-[#008800] font-medium">
                  {isEditMode
                    ? "Edit Mode - Modify the selected HPLC"
                    : "Add Mode - Enter new HPLC details"}
                </div>
              )}
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-md"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <div
              className="p-4 border-b border-[#a6c8ff]"
              style={{ backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)" }}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                HPLCs ({hplcs.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0055a4] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading HPLCs...</p>
              </div>
            ) : hplcs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No HPLCs found. Add your first HPLC!
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
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Detector
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Internal Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a6c8ff]">
                    {hplcs.map((hplc, index) => (
                      <tr
                        key={hplc._id}
                        className={`cursor-pointer ${
                          selectedHPLC?._id === hplc._id
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          if (!isFormEnabled) {
                            setSelectedHPLC(hplc);
                            setCurrentHPLCIndex(index);
                            setFormData({
                              type: hplc.type,
                              detector: getDetectorIds(hplc.detector),
                              internalCode: hplc.internalCode,
                              isActive: hplc.isActive,
                            });
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-800">{hplc.type}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {getDetectorName(hplc.detector)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">{hplc.internalCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-600">{hplc.isActive ? "Yes" : "No"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(hplc.createdAt).toLocaleDateString()}
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Search HPLCs</h3>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
            >
              {hplcs
                .filter(
                  (hplc) =>
                    hplc.internalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    getDetectorName(hplc.detector).toLowerCase().includes(searchTerm.toLowerCase()) ||
                    hplc.type.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((hplc, index) => (
                  <div
                    key={hplc._id}
                    className={`px-3 py-2 cursor-pointer ${
                      index === currentHPLCIndex
                        ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                        : "hover:bg-[#e6f0fa]"
                    }`}
                    onClick={() => {
                      setFormData({
                        type: hplc.type,
                        detector: getDetectorIds(hplc.detector),
                        internalCode: hplc.internalCode,
                        isActive: hplc.isActive,
                      });
                      setSelectedHPLC(hplc);
                      setCurrentHPLCIndex(hplcs.findIndex((c) => c._id === hplc._id));
                      setShowSearchModal(false);
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium text-gray-800">{hplc.internalCode}</div>
                    <div className="text-sm text-gray-500">
                      {hplc.type} | {getDetectorName(hplc.detector)} | {hplc.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowSearchModal(false);
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
              Audit Trail {selectedHPLC ? `for ${selectedHPLC.internalCode}` : "(All HPLCs)"}
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
                  placeholder="Search type, detector, or internal code..."
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
              style={{ backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)" }}
            >
              <table className="w-full text-sm">
                <thead
                  className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] sticky top-0"
                  style={{ borderBottom: "1px solid #a6c8ff" }}
                >
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700">Timestamp</th>
                    <th className="px-3 py-2 text-left text-gray-700">User</th>
                    <th className="px-3 py-2 text-left text-gray-700">Action</th>
                    <th className="px-3 py-2 text-left text-gray-700">Type</th>
                    <th className="px-3 py-2 text-left text-gray-700">Detector</th>
                    <th className="px-3 py-2 text-left text-gray-700">Internal Code</th>
                    <th className="px-3 py-2 text-left text-gray-700">Active</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Type</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Detector</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Internal Code</th>
                    <th className="px-3 py-2 text-left text-gray-700">Previous Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a6c8ff]">
                  {auditLogs.map((log: any, index) => (
                    <tr key={index} className="hover:bg-[#e6f0fa]">
                      <td className="px-3 py-2">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">{log.userId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.action === "CREATE"
                              ? "bg-[#ccffcc] text-[#008800]"
                              : log.action === "UPDATE"
                              ? "bg-[#ffffcc] text-[#666600]"
                              : log.action === "DELETE"
                              ? "bg-[#ffe6e6] text-[#cc0000]"
                              : "bg-[#f0f0f0]"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.type || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.detector || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.internalCode || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.data.isActive !== undefined ? (log.data.isActive ? "Yes" : "No") : "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.type || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.detector || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.internalCode || "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">{log.previousData?.isActive !== undefined ? (log.previousData.isActive ? "Yes" : "No") : "—"}</div>
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
              HPLC Master - Help
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-[#0055a4]">Keyboard Shortcuts:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F1</kbd> - Add New HPLC</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F2</kbd> - Save Current Entry</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F3</kbd> - Clear Form</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F4</kbd> - Exit to Dashboard</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F5</kbd> - Navigate Up</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F6</kbd> - Navigate Down</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F7</kbd> - Search HPLCs</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F9</kbd> - Edit Selected HPLC</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F10</kbd> - Delete Selected HPLC</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F11</kbd> - View Audit Trail</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">F12</kbd> - Print Report</li>
                  <li><kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">Ctrl+H</kbd> - Show Help</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">How to Use:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Use <b>Add (F1)</b> to enable form for new HPLC entry</li>
                  <li>• Use <b>Edit (F9)</b> to modify selected HPLC</li>
                  <li>• Use <b>Save (F2)</b> to save new or edited HPLC</li>
                  <li>• Use <b>Clear (F3)</b> to reset form and disable inputs</li>
                  <li>• Use <b>Up (F5)/Down (F6)</b> to navigate HPLCs by internal code</li>
                  <li>• Use <b>Search (F7)</b> for full-text search with keyboard navigation</li>
                  <li>• Use <b>Delete (F10)</b> to remove selected HPLC</li>
                  <li>• Use <b>Audit (F11)</b> to view all changes</li>
                  <li>• Use <b>Print (F12)</b> to generate HPLC report</li>
                  <li>• Use <b>Exit (F4)</b> to return to dashboard</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Status Indicators:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li><span className="text-[#008800]">Green text</span> - Form is enabled for input</li>
                  <li><span className="text-[#0055a4]">Blue background</span> - Selected HPLC in list</li>
                  <li><span className="text-gray-500">Gray fields</span> - Read-only mode</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Tips:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• All fields are disabled by default until Add/Edit</li>
                  <li>• Type, detector, and internal code are required for saving</li>
                  <li>• Use arrow keys in search modal for quick navigation</li>
                  <li>• All actions are logged in audit trail</li>
                  <li>• Contact support at support@company.com for issues</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] active:bg-gradient-to-b active:from-[#004080] active:to-[#0066b3]"
                style={{
                  border: "1px solid #004080",
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

export default function ProtectedHPLCMaster() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <HPLCMaster />
    </ProtectedRoute>
  );
}