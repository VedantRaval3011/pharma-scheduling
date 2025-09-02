// components/mfc/MFCSelector.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

interface Mfc {
  _id: string;
  mfcNumber: string;
  genericName?: string;
  companyId?: string;
  locationId?: string;
}

interface MFCSelectorProps {
  selectedMFC: string | null;
  onChange: (selectedMFC: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const getStorageIds = () => {
  if (typeof window === "undefined") return { companyId: null, locationId: null };
  const companyId = localStorage.getItem("companyId");
  const locationId = localStorage.getItem("locationId");
  return { companyId, locationId };
};

const MFCSelector: React.FC<MFCSelectorProps> = ({
  selectedMFC,
  onChange,
  placeholder = "Select MFC record...",
  disabled = false,
  className = "",
}) => {
  const [mfcs, setMfcs] = useState<Mfc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMfcs, setFilteredMfcs] = useState<Mfc[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { companyId, locationId } = getStorageIds();

  // Fetch MFCs from API
  const fetchMfcs = async () => {
    if (!companyId || !locationId) {
      setError("Company ID or Location ID not found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/mfc?companyId=${companyId}&locationId=${locationId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setMfcs(data.data || []);
        setFilteredMfcs(data.data || []);
      } else {
        throw new Error("No MFC data found in response");
      }
    } catch (err: any) {
      console.error("Error fetching MFCs:", err.message || err);
      setError(`Failed to fetch MFCs: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Load MFCs on mount
  useEffect(() => {
    fetchMfcs();
  }, [companyId, locationId]);

  // Filter MFCs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMfcs(mfcs);
    } else {
      const filtered = mfcs.filter(mfc =>
        mfc.mfcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mfc.genericName && mfc.genericName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredMfcs(filtered);
    }
  }, [searchTerm, mfcs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Listen for storage events for real-time updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mfc-product-sync') {
        // MFC was updated, refresh our MFC list
        fetchMfcs();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleToggleDropdown = () => {
    if (disabled || loading) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
    }
  };

  const handleSelectMFC = (mfc: Mfc) => {
    onChange(mfc._id);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const getSelectedMFCDetails = () => {
    if (!selectedMFC) return null;
    return mfcs.find(mfc => mfc._id === selectedMFC);
  };

  const selectedMFCDetails = getSelectedMFCDetails();

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main selector button */}
      <div
        className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none cursor-pointer ${
          disabled ? "bg-[#f0f0f0] cursor-not-allowed" : "bg-white hover:bg-[#f8f9fa]"
        } ${isOpen ? "ring-2 ring-[#66a3ff]" : ""}`}
        style={{
          borderStyle: "inset",
          boxShadow: !disabled ? "inset 1px 1px 2px rgba(0,0,0,0.1)" : "none",
        }}
        onClick={handleToggleDropdown}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {loading ? (
              <span className="text-gray-500">Loading MFCs...</span>
            ) : error ? (
              <span className="text-red-500 text-sm">{error}</span>
            ) : selectedMFCDetails ? (
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 truncate">
                  {selectedMFCDetails.mfcNumber}
                </span>
                {selectedMFCDetails.genericName && (
                  <span className="text-sm text-gray-500 truncate">
                    {selectedMFCDetails.genericName}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-2">
            {selectedMFC && !disabled && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Clear selection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${
                disabled ? "text-gray-400" : "text-gray-600"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-[#a6c8ff] rounded-md shadow-lg max-h-80 overflow-hidden"
          style={{
            backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
          }}
        >
          {/* Search input */}
          <div className="p-3 border-b border-[#a6c8ff]">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
              placeholder="Search MFC records..."
              style={{
                borderStyle: "inset",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
              }}
            />
          </div>

          {/* MFC list */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0055a4] mx-auto mb-2"></div>
                Loading MFCs...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500 text-sm">
                {error}
                <button
                  onClick={fetchMfcs}
                  className="block mx-auto mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            ) : filteredMfcs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "No MFC records found matching your search" : "No MFC records available"}
              </div>
            ) : (
              filteredMfcs.map((mfc) => (
                <div
                  key={mfc._id}
                  className={`px-3 py-3 cursor-pointer hover:bg-[#e6f0fa] ${
                    selectedMFC === mfc._id ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]" : ""
                  }`}
                  onClick={() => handleSelectMFC(mfc)}
                >
                  <div className="flex flex-col">
                    <div className="font-medium text-gray-900">
                      {mfc.mfcNumber}
                    </div>
                    {mfc.genericName && (
                      <div className="text-sm text-gray-600 mt-1">
                        {mfc.genericName}
                      </div>
                    )}
                  </div>
                  
                  {selectedMFC === mfc._id && (
                    <div className="flex justify-end mt-1">
                      <div className="flex items-center text-xs text-blue-600">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Selected
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer with count */}
          {!loading && !error && (
            <div className="p-2 border-t border-[#a6c8ff] bg-gray-50 text-xs text-gray-600 text-center">
              {filteredMfcs.length} of {mfcs.length} MFC records
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MFCSelector;
