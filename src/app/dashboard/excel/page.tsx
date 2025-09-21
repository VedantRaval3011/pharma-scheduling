'use client'
import React, { useState } from 'react';
import * as XLSX from 'xlsx';

interface ApiToExcelProps {
  className?: string;
}

const ApiToExcelGenerator: React.FC<ApiToExcelProps> = ({ className = '' }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const flattenObject = (obj: any, prefix = ''): any => {
    const flattened: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (obj[key] === null || obj[key] === undefined) {
          flattened[newKey] = '';
        } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, flattenObject(obj[key], newKey));
        } else if (Array.isArray(obj[key])) {
          flattened[newKey] = obj[key].join(', ');
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  };

  const processApiData = (data: any): any[] => {
    // Handle different response structures
    let processedData: any[] = [];
    
    if (Array.isArray(data)) {
      processedData = data;
    } else if (data && typeof data === 'object') {
      // Look for common array properties
      const possibleArrayKeys = ['data', 'results', 'items', 'records', 'response'];
      const arrayKey = possibleArrayKeys.find(key => Array.isArray(data[key]));
      
      if (arrayKey) {
        processedData = data[arrayKey];
      } else {
        // If no array found, treat the object as a single record
        processedData = [data];
      }
    } else {
      throw new Error('API response is not in a supported format');
    }

    // Flatten nested objects
    return processedData.map(item => flattenObject(item));
  };

  const generateExcel = async () => {
    if (!apiUrl.trim()) {
      setError('Please enter an API URL');
      return;
    }

    if (!validateUrl(apiUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processedData = processApiData(data);

      if (processedData.length === 0) {
        throw new Error('No data found in API response');
      }

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(processedData);

      // Auto-size columns
      const colWidths = Object.keys(processedData[0] || {}).map(key => ({
        wch: Math.max(key.length, 10)
      }));
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'API Data');

      // Generate filename
      const urlObject = new URL(apiUrl);
      const hostname = urlObject.hostname.replace(/\./g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${hostname}_${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      setSuccess(`Excel file "${filename}" has been downloaded successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to generate Excel file: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          API to Excel Generator
        </h2>
        <p className="text-gray-600">
          Enter an API endpoint URL to fetch data and generate an Excel file
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-2">
            API URL
          </label>
          <input
            id="apiUrl"
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.example.com/data"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        <button
          onClick={generateExcel}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Excel...
            </span>
          ) : (
            'Generate Excel File'
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Supported API Formats:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Arrays of objects: <code>[{"{}"}, {"{}"}, ...]</code></li>
          <li>• Objects with array properties: <code>{"{data: [...]}"}</code></li>
          <li>• Single objects: <code>{"{key: value}"}</code></li>
          <li>• Nested objects will be flattened</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiToExcelGenerator;