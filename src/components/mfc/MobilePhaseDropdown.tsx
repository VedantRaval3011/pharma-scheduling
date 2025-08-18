// components/MobilePhaseDropdown.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MOBILE_PHASES, MobilePhase } from '@/data/mobile-phase';

interface MobilePhaseDropdownProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const MobilePhaseDropdown: React.FC<MobilePhaseDropdownProps> = ({
  value,
  onChange,
  placeholder = "Select Mobile Phase",
  required = false,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 5;

  // Filter mobile phases based on search term
  const filteredPhases = MOBILE_PHASES.filter(phase =>
    phase.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    phase.baseSolvent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    phase.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate filtered results
  const totalPages = Math.ceil(filteredPhases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPhases = filteredPhases.slice(startIndex, startIndex + itemsPerPage);

  // Get selected phase details
  const selectedPhase = MOBILE_PHASES.find(phase => phase.code === value);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setCurrentPage(1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
        setCurrentPage(1);
      }
    };
    
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (phase: MobilePhase) => {
    onChange(phase.code);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Field - Matching MFCMasterForm style */}
      <div className="relative">
        <input
          type="text"
          value={selectedPhase ? `${selectedPhase.code} - ${selectedPhase.baseSolvent}` : ''}
          placeholder={placeholder}
          readOnly
          onClick={handleInputClick}
          className={`w-full px-2 py-1 text-xs border border-gray-400 rounded-sm bg-gradient-to-b from-white to-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-500 shadow-sm transition-all duration-200 cursor-pointer ${
            error ? "border-red-400 shadow-none" : ""
          }`}
        />
        {/* Dropdown Arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-0.5 text-xs text-red-500 font-medium">{error}</p>
      )}

      {/* Popup Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 backdrop-blur-sm bg-opacity-20 z-40" />
          
          {/* Popup Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-gray-200 to-gray-300 rounded-md shadow-[0_0_15px_rgba(0,0,0,0.5)] w-full max-w-4xl max-h-[80vh] border border-gray-500 flex flex-col">
              {/* Modal Header */}
              <div className="px-4 py-2 border-b border-gray-500 bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-sm flex-shrink-0 flex justify-between items-center">
                <h3 className="text-sm font-semibold tracking-wide">Select Mobile Phase</h3>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden p-3 bg-gradient-to-b from-gray-100 to-gray-200">
                <div className="bg-white rounded-sm border border-gray-400 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] h-full flex flex-col">
                  {/* Search Input */}
                  <div className="p-3 border-b border-gray-300">
                    <input
                      type="text"
                      placeholder="Search mobile phases..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-400 rounded-sm bg-gradient-to-b from-white to-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-500 shadow-sm transition-all duration-200"
                      autoFocus
                    />
                  </div>

                  {/* Clear Selection Option */}
                  {value && (
                    <div
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 text-xs text-gray-500 italic"
                      onClick={handleClear}
                    >
                      Clear selection
                    </div>
                  )}

                  {/* Mobile Phase Table */}
                  <div className="flex-1 overflow-y-auto">
                    {paginatedPhases.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b border-gray-300">
                              Sr. No
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b border-gray-300">
                              Code
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b border-gray-300">
                              Base Solvent
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b border-gray-300">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedPhases.map((phase) => (
                            <tr
                              key={phase.srNo}
                              className={`hover:bg-blue-50 cursor-pointer text-xs transition-colors ${
                                value === phase.code ? 'bg-blue-100' : ''
                              }`}
                              onClick={() => handleSelect(phase)}
                            >
                              <td className="px-3 py-2 text-gray-900">{phase.srNo}</td>
                              <td className="px-3 py-2 font-medium text-gray-900">{phase.code}</td>
                              <td className="px-3 py-2 text-gray-900">{phase.baseSolvent}</td>
                              <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={phase.description}>
                                {phase.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-xs">
                        No mobile phases found
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {filteredPhases.length > itemsPerPage && (
                    <div className="px-3 py-2 border-t border-gray-300 flex justify-between items-center bg-gray-50">
                      <span className="text-xs text-gray-600">
                        Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPhases.length)} of {filteredPhases.length}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs border border-gray-400 rounded-sm bg-gradient-to-b from-gray-200 to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gradient-to-b hover:from-gray-300 hover:to-gray-400 shadow-sm transition-all duration-200"
                        >
                          Previous
                        </button>
                        <span className="px-2 py-1 text-xs text-gray-600">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 text-xs border border-gray-400 rounded-sm bg-gradient-to-b from-gray-200 to-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gradient-to-b hover:from-gray-300 hover:to-gray-400 shadow-sm transition-all duration-200"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 py-2 border-t border-gray-500 bg-gradient-to-r from-blue-400 to-blue-600 flex justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="px-4 py-1.5 text-xs font-medium text-gray-800 bg-gradient-to-b from-gray-200 to-gray-400 border border-gray-500 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:bg-gradient-to-b hover:from-gray-300 hover:to-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MobilePhaseDropdown;