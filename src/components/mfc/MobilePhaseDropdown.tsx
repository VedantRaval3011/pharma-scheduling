// components/MobilePhaseDropdown.tsx
'use client';

import React, { useState, useEffect } from 'react';
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

  return (
    <div className="relative">
      {/* Selected Value Display */}
      <div
        className={`w-full p-3 border rounded-lg cursor-pointer bg-white ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${isOpen ? 'border-blue-500' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <span className={selectedPhase ? 'text-gray-900' : 'text-gray-500'}>
            {selectedPhase 
              ? `${selectedPhase.code} - ${selectedPhase.baseSolvent}`
              : placeholder
            }
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search mobile phases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Clear Selection Option */}
          {value && (
            <div
              className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
              onClick={handleClear}
            >
              <span className="text-gray-500 italic">Clear selection</span>
            </div>
          )}

          {/* Mobile Phase Table */}
          <div className="max-h-80 overflow-y-auto">
            {paginatedPhases.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sr. No
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Solvent
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedPhases.map((phase) => (
                    <tr
                      key={phase.srNo}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        value === phase.code ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelect(phase)}
                    >
                      <td className="px-3 py-2 text-sm text-gray-900">{phase.srNo}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{phase.code}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{phase.baseSolvent}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={phase.description}>
                        {phase.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No mobile phases found
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredPhases.length > itemsPerPage && (
            <div className="p-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPhases.length)} of {filteredPhases.length}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobilePhaseDropdown;