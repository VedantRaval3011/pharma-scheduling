"use client";
import React, { useState, useEffect } from "react";
import { X, Calculator, Clock, Beaker } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// All your existing interfaces (unchanged)
interface Test {
  testTypeId: string;
  testName: string;
  columnCode: string;
  mobilePhaseCodes: string[];
  detectorTypeId: string;
  pharmacopoeialId: string[];
  blankInjection: number;
  standardInjection: number;
  sampleInjection: number;
  systemSuitability: number;
  sensitivity: number;
  placebo: number;
  reference1: number;
  reference2: number;
  bracketingFrequency: number;
  runTime: number;
  washTime: number;
  blankRunTime: number;
  standardRunTime: number;
  sampleRunTime: number;
  systemSuitabilityRunTime: number;
  sensitivityRunTime: number;
  placeboRunTime: number;
  reference1RunTime: number;
  reference2RunTime: number;
  outsourced: boolean;
  continueTests: boolean;
  testStatus: string;
  numberOfInjections?: number;
  numberOfInjectionsAMV?: number;
  numberOfInjectionsPV?: number;
  numberOfInjectionsCV?: number;
  uniqueRuntimes?: boolean;
  apiId?: string; 
}

interface Generic {
  genericName: string;
  apis: {
    apiName: string;
    testTypes: Test[];
  }[];
}

interface BatchItem {
  _id: string;
  companyId: string;
  locationId: string;
  productCode: string;
  productName: string;
  genericName: string;
  priority: string;
  batchNumber: string;
  tests: Test[];
  batchStatus: string;
  typeOfSample: string;
  mfcNumber: string;
  pharmacopoeialName: string;
  generics: Generic[];
}

interface CalculationBreakdown {
  injectionCounts: { [key: string]: number };
  runtimes: { [key: string]: number };
  totalCountedInjections: number;
  washCycles: number;
  runtimeMinutes: number;
  washMinutes: number;
  totalMinutes: number;
  hasUniqueRuntimes: boolean;
  washInterval: number;
  formula: string;
  steps: string[];
  bracketingInjections?: number;
}

interface ScheduledTest {
  id: string;
  batchId: string;
  batchNumber: string;
  productCode: string;
  productName: string;
  testName: string;
  columnCode: string;
  detectorTypeId: string;
  mobilePhaseCodes: string[];
  priority: string;
  executionTime: number;
  originalExecutionTime: number;
  washTime: number;
  bracketingFrequency: number;
  groupId?: string;
  groupReason?: string;
  isGrouped: boolean;
  timeSaved?: number;
  originalTest?: Test;
  calculationBreakdown?: CalculationBreakdown;
  sortOrder?: number; // Add this for drag-and-drop ordering
  apiId?: string;
  apiLabel?: string;
}

interface GroupInfo {
  id: string;
  reason: string;
  detectorId: string;
  columnCode: string;
  mobilePhaseKey: string;
  tests: ScheduledTest[];
  totalTime: number;
  originalTotalTime: number;
  timeSaved: number;
}

interface HPLCMaster {
  _id: string;
  hplcName: string;
  hplcModel: string;
  status: string;
  internalCode?: string;
  isActive?: boolean;
  detector: { _id: string; detectorType: string }[];
}
interface HPLCSchedule {
  hplcId: string;
  hplcName: string;
  tests: ScheduledTest[];
  groups: GroupInfo[];
  totalTime: number;
  isDraggedOver?: boolean; // Add this for drag visual feedback
}

// Your existing utility components (unchanged)
const MathFormula: React.FC<{ formula: string; inline?: boolean }> = ({
  formula,
  inline = false,
}) => {
  return (
    <div
      className={`${
        inline ? "inline-block" : "block"
      } font-mono text-xs bg-gray-50 p-1 rounded border`}
    >
      {formula}
    </div>
  );
};

const formatTime = (minutes: number): string => {
  const roundedMinutes = parseFloat(minutes.toFixed(1));
  if (roundedMinutes >= 60) {
    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = (roundedMinutes % 60).toFixed(1);
    return remainingMinutes === "0.0"
      ? `${roundedMinutes} min (${hours} hour${hours > 1 ? "s" : ""})`
      : `${roundedMinutes} min (${hours}h ${remainingMinutes}m)`;
  }
  return `${roundedMinutes} min`;
};

type ApiResolverResult = { apiId: string | null; apiLabel: string };

function normalizePhases(arr?: string[]): string {
  if (!Array.isArray(arr)) return "";
  const seen = new Set<string>();
  return arr
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
    .sort()
    .join("-");
}

function hasOverlap(a?: string[] | string, b?: string[] | string): boolean {
  const toArr = (v?: string[] | string) =>
    Array.isArray(v) ? v : v ? [v] : [];
  const A = new Set(toArr(a));
  return toArr(b).some((x) => A.has(x));
}

// Try to be resilient to API master shape differences
function getApiIdAndLabelFromRawApi(
  rawApi: any,
  apiMaster: Record<string, string>
): { id: string | null; label: string } {
  const id =
    rawApi?.id ?? rawApi?._id ?? rawApi?.apiId ?? rawApi?.apiName ?? null;
  const labelCandidate = rawApi?.api ?? rawApi?.apiName ?? rawApi?.name ?? null;
  const label = (id && apiMaster[id]) || labelCandidate || "NA";
  return { id, label };
}

function resolveApiForTest(
  batch: BatchItem,
  test: Test,
  apiMaster: Record<string, string>,
  testIndex?: number
): ApiResolverResult {
  if (!batch?.generics?.length || !test) return { apiId: null, apiLabel: "NA" };

  // For batches with multiple APIs creating identical tests,
  // we need to map tests to their corresponding APIs
  const allApiTests: Array<{ apiId: string; test: Test; apiLabel: string }> = [];
  
  for (const generic of batch.generics) {
    for (const rawApi of generic.apis ?? []) {
      const apiIdentifier = rawApi?.apiName ||  null;
      if (!apiIdentifier) continue;
      
      for (const tt of rawApi.testTypes ?? []) {
        allApiTests.push({
          apiId: apiIdentifier,
          test: tt,
          apiLabel: apiMaster[apiIdentifier] || apiIdentifier
        });
      }
    }
  }

  // Try to find exact match based on test properties
  const targetPhase = normalizePhases(test.mobilePhaseCodes);
  let bestMatch: ApiResolverResult = { apiId: null, apiLabel: "NA" };
  let bestScore = -Infinity;

  for (const apiTest of allApiTests) {
    const tt = apiTest.test;
    
    // Check if this is an exact match
    const exactMatch = 
      tt?.testName === test.testName &&
      tt?.columnCode === test.columnCode &&
      tt?.detectorTypeId === test.detectorTypeId &&
      normalizePhases(tt?.mobilePhaseCodes) === targetPhase &&
      tt?.runTime === test.runTime &&
      tt?.sampleInjection === test.sampleInjection &&
      tt?.standardInjection === test.standardInjection;
    
    if (exactMatch) {
      // If we have a test index and this is a batch with duplicate tests,
      // use the index to determine which API this test belongs to
      if (testIndex !== undefined && allApiTests.filter(at => 
        at.test.testName === test.testName &&
        at.test.columnCode === test.columnCode
      ).length > 1) {
        // Get all matching API tests
        const matchingApiTests = allApiTests.filter(at => {
          const t = at.test;
          return t?.testName === test.testName &&
                 t?.columnCode === test.columnCode &&
                 t?.detectorTypeId === test.detectorTypeId;
        });
        
        if (matchingApiTests[testIndex]) {
          return {
            apiId: matchingApiTests[testIndex].apiId,
            apiLabel: matchingApiTests[testIndex].apiLabel
          };
        }
      }
      
      // Calculate score for best match
      const ttPhase = normalizePhases(tt?.mobilePhaseCodes);
      const equalPhase = ttPhase === targetPhase;
      const pharmOverlap = hasOverlap(
        tt?.pharmacopoeialId as any,
        test?.pharmacopoeialId as any
      );
      const runtimeClose = Math.abs((tt?.runTime ?? 0) - (test?.runTime ?? 0)) <= 1;

      const score = (exactMatch ? 10 : 0) +
                   (equalPhase ? 5 : 0) +
                   (pharmOverlap ? 1 : 0) +
                   (runtimeClose ? 1 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          apiId: apiTest.apiId,
          apiLabel: apiTest.apiLabel
        };
      }
    }
  }

  return bestMatch;
}

const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === "")
    return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : Math.max(0, num);
};

// Your existing CalculationModal (unchanged)
const CalculationModal: React.FC<{
  test: ScheduledTest;
  isOpen: boolean;
  onClose: () => void;
}> = ({ test, isOpen, onClose }) => {
  if (!isOpen || !test.calculationBreakdown) return null;
  const breakdown = test.calculationBreakdown;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Calculation Details
            </h2>
            <p className="text-gray-600 text-sm">
              {test.testName} - {test.productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
              <Calculator className="w-4 h-4 mr-2" /> Mathematical Formula
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-blue-800">
                <strong>Case {breakdown.hasUniqueRuntimes ? "A" : "B"}:</strong>{" "}
                {breakdown.hasUniqueRuntimes
                  ? "Multiple Runtimes"
                  : "Single Runtime"}
              </p>
              <MathFormula formula={breakdown.formula} />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
              <Beaker className="w-4 h-4 mr-2" /> Injection Counts & Runtimes
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(breakdown.injectionCounts).map(
                ([type, count]) => (
                  <div key={type} className="bg-white rounded p-3 border">
                    <div className="text-xs font-medium text-gray-700 capitalize">
                      {type.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {count}
                    </div>
                    <div className="text-xs text-gray-500">
                      Runtime:{" "}
                      {breakdown.runtimes[type] ||
                        breakdown.runtimes.default ||
                        0}{" "}
                      min
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Step-by-Step Calculation
            </h3>
            <div className="space-y-2">
              {breakdown.steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
                    {index + 1}
                  </span>
                  <span className="text-xs text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Calculation Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-600">Total Injections</div>
                <div className="text-xl font-bold text-gray-900">
                  {breakdown.totalCountedInjections}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Wash Cycles</div>
                <div className="text-xl font-bold text-gray-900">
                  {breakdown.washCycles}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Runtime</div>
                <div className="text-xl font-bold text-blue-700">
                  {breakdown.runtimeMinutes.toFixed(1)} min
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Total Time</div>
                <div className="text-xl font-bold text-green-700">
                  {breakdown.totalMinutes.toFixed(1)} min
                </div>
              </div>
            </div>
          </div>
          {test.isGrouped && test.timeSaved && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-900 mb-3">
                Optimization Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-purple-700">Original Time</div>
                  <div className="text-lg font-bold text-purple-900">
                    {test.originalExecutionTime.toFixed(1)} min
                  </div>
                </div>
                <div>
                  <div className="text-xs text-purple-700">Time Saved</div>
                  <div className="text-lg font-bold text-green-700">
                    {test.timeSaved.toFixed(1)} min
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-purple-700">
                Grouping Reason: {test.groupReason}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// NEW: Draggable Test Row Component - This keeps your exact table structure
const DraggableTestRow: React.FC<{
  test: ScheduledTest;
  index: number;
  batchData: BatchItem[];
  apiMaster: { [key: string]: string };
  columnMaster: { [key: string]: string };
  setSelectedTestForCalculation: (test: ScheduledTest) => void;
  getDetectorName: (value?: string) => string;
}> = ({
  test,
  index,
  batchData,
  apiMaster,
  columnMaster,
  setSelectedTestForCalculation,
  getDetectorName,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: test.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  const batch = batchData.find((b) => b._id === test.batchId);
 let apiName = "N/A";

  // ✅ FIXED: Always use apiId as the primary key for lookup, with no fallbacks that could cause collisions
  if (test.apiId) {
    // Direct lookup from apiMaster using the ID
    apiName = apiMaster[test.apiId] || "Unknown API";
  } 
  // Only if apiId is not available, try to resolve from batch data
  else if (batch?.generics && test.originalTest) {
  // Pass the test index to help with resolution
  const testIndexInBatch = batch.tests.findIndex(t => 
    t.testName === test.originalTest?.testName &&
    t.columnCode === test.originalTest?.columnCode
  );
  const { apiId, apiLabel } = resolveApiForTest(
    batch, 
    test.originalTest, 
    apiMaster,
    testIndexInBatch >= 0 ? testIndexInBatch : undefined
  );
    // If we get an apiId from resolution, use it to look up the name
    if (apiId && apiMaster[apiId]) {
      apiName = apiMaster[apiId];
    } else {
      // Final fallback to the resolved label
      apiName = apiLabel || "N/A";
    }
  }


  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`${
        test.isGrouped ? "bg-green-50" : ""
      } hover:bg-gray-50 transition-colors ${
        isDragging ? "shadow-lg ring-2 ring-blue-400 bg-blue-50" : ""
      }`}
    >
      {/* Sr No. column with drag handle */}
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200 w-12">
        <div className="flex items-center gap-1">
          <div
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 hover:bg-gray-200 rounded transition-colors"
            title="Drag to reorder"
          >
            <div className="flex flex-col items-center">
              <div className="w-1 h-1 bg-gray-400 rounded-full mb-0.5"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full mb-0.5"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>
          <span className="text-xs">{index + 1}</span>
        </div>
      </td>

      {/* ALL YOUR EXISTING COLUMNS EXACTLY AS THEY WERE */}
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
        <div className="font-medium truncate w-20" title={test.productName}>
          {test.productName}
        </div>
      </td>
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={test.productCode}
      >
        {test.productCode}
      </td>
      <td
        className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
        title={batch?.mfcNumber}
      >
        {batch?.mfcNumber || "N/A"}
      </td>
      <td
        className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
        title={apiName}
      >
        {apiName}
      </td>
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={batch?.pharmacopoeialName}
      >
        {batch?.pharmacopoeialName || "N/A"}
      </td>
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={batch?.typeOfSample}
      >
        {batch?.typeOfSample || "N/A"}
      </td>
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
        {(() => {
          const mobilePhases = test.mobilePhaseCodes
            .slice(0, 4)
            .filter((code) => code !== "")
            .join(", ");
          return <span title={mobilePhases}>{mobilePhases || "N/A"}</span>;
        })()}
      </td>
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
        {(() => {
          const washes = test.mobilePhaseCodes
            .slice(4)
            .filter((code) => code !== "")
            .join(", ");
          return <span title={washes}>{washes || "N/A"}</span>;
        })()}
      </td>
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={test.batchNumber}
      >
        {test.batchNumber}
      </td>
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
        <div className="font-medium truncate w-20" title={test.testName}>
          {test.testName}
        </div>
        {test.isGrouped && (
          <div
            className="text-[10px] text-green-600 truncate"
            title={test.groupReason}
          >
            Grouped
          </div>
        )}
      </td>
      <td className="px-1 py-1 text-center border-r border-gray-200">
        <span
          className={`inline-block px-1 text-[10px] font-medium rounded ${
            test.priority.toLowerCase() === "urgent"
              ? "bg-red-100 text-red-600"
              : test.priority.toLowerCase() === "high"
              ? "bg-orange-100 text-orange-600"
              : test.priority.toLowerCase() === "normal"
              ? "bg-green-100 text-green-600"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {test.priority.charAt(0)}
        </span>
      </td>

      {/* All your injection columns */}
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sampleInjection || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.standardInjection || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.blankInjection || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.systemSuitability || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sensitivity || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.placebo || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference1 || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference2 || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.bracketingFrequency || 0}
      </td>

      {/* All your runtime columns */}
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.runTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.blankRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.standardRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sampleRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.systemSuitabilityRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.sensitivityRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.placeboRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference1RunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.originalTest?.reference2RunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-[10px] border-r border-gray-200">
        {test.washTime || 0}m
      </td>

      {/* Time column */}
      <td className="px-1 py-1 text-center text-gray-700 border-r border-gray-200">
        <div className="text-[10px]">{test.executionTime.toFixed(0)}m</div>
        {test.isGrouped && test.timeSaved && (
          <div className="text-[10px] text-green-600">
            -{test.timeSaved.toFixed(0)}m
          </div>
        )}
      </td>

      {/* Action column */}
      <td className="px-1 py-1 text-center border-r border-gray-200">
        <button
          onClick={() => setSelectedTestForCalculation(test)}
          className="text-blue-500 hover:text-blue-600 text-[10px] p-1"
          title="View details"
        >
          <Calculator className="w-2 h-2" />
        </button>
      </td>
    </tr>
  );
};

// Main component
export default function EnhancedSchedulingAlgorithm() {
  // All your existing state variables (unchanged)
  const [batchData, setBatchData] = useState<BatchItem[]>([]);
  const [hplcMaster, setHplcMaster] = useState<HPLCMaster[]>([]);
  const [hplcSchedules, setHplcSchedules] = useState<HPLCSchedule[]>([]);
  const [unscheduledTests, setUnscheduledTests] = useState<ScheduledTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [selectedTestForCalculation, setSelectedTestForCalculation] =
    useState<ScheduledTest | null>(null);
  const [apiMaster, setApiMaster] = useState<{ [key: string]: string }>({});
  const [columnMaster, setColumnMaster] = useState<{ [key: string]: string }>(
    {}
  );
  const [detectorMaster, setDetectorMaster] = useState<Record<string, string>>(
    {}
  );

  // NEW: Drag and drop state
  const [activeTest, setActiveTest] = useState<ScheduledTest | null>(null);
  const [draggedOverHPLC, setDraggedOverHPLC] = useState<string | null>(null);

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // All your existing calculation functions (unchanged)
  const computeOptimizedCounts = (
    test: Test,
    washInterval: number = 6
  ): CalculationBreakdown => {
    const injectionCounts: { [key: string]: number } = {
      sample: safeNumber(test.sampleInjection),
      standard: safeNumber(test.standardInjection),
      blank: safeNumber(test.blankInjection),
      sensitivity: safeNumber(test.sensitivity),
      systemSuitability: safeNumber(test.systemSuitability),
      placebo: safeNumber(test.placebo),
      reference1: safeNumber(test.reference1),
      reference2: safeNumber(test.reference2),
    };

    const defaultRuntime = safeNumber(test.runTime, 1);
    const hasUniqueRuntimes =
      test.uniqueRuntimes ||
      [
        test.blankRunTime,
        test.standardRunTime,
        test.sampleRunTime,
        test.systemSuitabilityRunTime,
        test.sensitivityRunTime,
        test.placeboRunTime,
        test.reference1RunTime,
        test.reference2RunTime,
      ].some((rt) => safeNumber(rt) > 0);

    const runtimes: { [key: string]: number } = hasUniqueRuntimes
      ? {
          sample: safeNumber(test.sampleRunTime, defaultRuntime),
          standard: safeNumber(test.standardRunTime, defaultRuntime),
          blank: safeNumber(test.blankRunTime, defaultRuntime),
          sensitivity: safeNumber(test.sensitivityRunTime, defaultRuntime),
          systemSuitability: safeNumber(
            test.systemSuitabilityRunTime,
            defaultRuntime
          ),
          placebo: safeNumber(test.placeboRunTime, defaultRuntime),
          reference1: safeNumber(test.reference1RunTime, defaultRuntime),
          reference2: safeNumber(test.reference2RunTime, defaultRuntime),
          bracketing: defaultRuntime,
        }
      : { default: defaultRuntime };

    const baseInjections = Object.values(injectionCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const bracketingInjections = Math.ceil(baseInjections / washInterval);
    injectionCounts.bracketing = bracketingInjections;

    const totalCountedInjections = baseInjections + bracketingInjections;
    const washCycles = Math.ceil(totalCountedInjections / washInterval);

    let runtimeMinutes: number;
    const steps: string[] = [];

    if (hasUniqueRuntimes) {
      runtimeMinutes = Object.entries(injectionCounts).reduce(
        (sum, [type, count]) => {
          const runtime = runtimes[type] || defaultRuntime;
          const contribution = count * runtime;
          if (count > 0)
            steps.push(
              `${type}: ${count} × ${runtime} min = ${contribution} min`
            );
          return sum + contribution;
        },
        0
      );
    } else {
      runtimeMinutes = totalCountedInjections * defaultRuntime;
      steps.push(`Base injections: ${baseInjections}`);
      steps.push(
        `Bracketing injections: ${bracketingInjections} (every ${washInterval} + compulsory)`
      );
      steps.push(
        `Total injections: ${baseInjections} + ${bracketingInjections} = ${totalCountedInjections}`
      );
      steps.push(`Runtime per injection: ${defaultRuntime} min`);
      steps.push(
        `Runtime total: ${totalCountedInjections} × ${defaultRuntime} = ${runtimeMinutes} min`
      );
    }

    const washTime = safeNumber(test.washTime);
    const washMinutes = washCycles * washTime;
    const totalMinutes = runtimeMinutes + washMinutes;

    steps.push(
      `Wash cycles: ceil(${totalCountedInjections} / ${washInterval}) = ${washCycles}`
    );
    steps.push(`Wash time: ${washCycles} × ${washTime} = ${washMinutes} min`);
    steps.push(
      `Total time: ${runtimeMinutes} + ${washMinutes} = ${totalMinutes} min`
    );

    const formula = hasUniqueRuntimes
      ? `Time = ∑(Ni × RTi) + WashCycles × WT = ${runtimeMinutes.toFixed(
          1
        )} + ${washMinutes.toFixed(1)} = ${totalMinutes.toFixed(1)} min`
      : `Time = (∑Ni + Bracketing) × RT + WashCycles × WT = ${totalCountedInjections} × ${defaultRuntime} + ${washCycles} × ${washTime} = ${totalMinutes.toFixed(
          1
        )} min`;

    return {
      injectionCounts,
      runtimes,
      totalCountedInjections,
      washCycles,
      runtimeMinutes,
      washMinutes,
      totalMinutes,
      hasUniqueRuntimes,
      washInterval,
      formula,
      steps,
      bracketingInjections,
    };
  };

  const calculateGroupedCounts = (
    tests: ScheduledTest[],
    washInterval: number = 6
  ) => {
    if (tests.length === 0)
      return {
        counts: {},
        totalTime: 0,
        timeSaved: 0,
        originalTime: 0,
        washCycles: 0,
        totalInjections: 0,
      };

    let originalTotalTime = 0;
    tests.forEach((test) => {
      if (test.originalTest) {
        const breakdown = computeOptimizedCounts(
          test.originalTest,
          washInterval
        );
        originalTotalTime += breakdown.totalMinutes;
      }
    });

    const groupedCounts: { [key: string]: number } = {};
    const injectionTypes = [
      "sample",
      "standard",
      "blank",
      "sensitivity",
      "systemSuitability",
      "placebo",
      "reference1",
      "reference2",
    ];
    injectionTypes.forEach((type) => (groupedCounts[type] = 0));

    if (tests.length > 0 && tests[0]?.originalTest) {
      const firstTest = tests[0].originalTest;
      groupedCounts.sample += safeNumber(firstTest.sampleInjection);
      groupedCounts.standard += safeNumber(firstTest.standardInjection);
      groupedCounts.blank += safeNumber(firstTest.blankInjection);
      groupedCounts.sensitivity += safeNumber(firstTest.sensitivity);
      groupedCounts.systemSuitability += safeNumber(
        firstTest.systemSuitability
      );
      groupedCounts.placebo += safeNumber(firstTest.placebo);
      groupedCounts.reference1 += safeNumber(firstTest.reference1);
      groupedCounts.reference2 += safeNumber(firstTest.reference2);

      for (let i = 1; i < tests.length; i++) {
        const currentTest = tests[i];
        if (currentTest && currentTest.originalTest) {
          groupedCounts.sample += safeNumber(
            currentTest.originalTest.sampleInjection
          );
        }
      }
    }

    const baseGroupedInjections = Object.values(groupedCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    const bracketingInjections = Math.ceil(
      baseGroupedInjections / washInterval
    );
    groupedCounts.bracketing = bracketingInjections;

    const totalGroupedInjections = baseGroupedInjections + bracketingInjections;
    const firstTestRuntime = tests[0]?.originalTest
      ? safeNumber(tests[0].originalTest.runTime, 1)
      : 1;
    const firstTestWashTime = tests[0]?.originalTest
      ? safeNumber(tests[0].originalTest.washTime)
      : 0;

    const washCycles = Math.ceil(totalGroupedInjections / washInterval);
    const runtimeMinutes = totalGroupedInjections * firstTestRuntime;
    const washMinutes = washCycles * firstTestWashTime;
    const optimizedTotalTime = runtimeMinutes + washMinutes;

    return {
      counts: groupedCounts,
      totalTime: optimizedTotalTime,
      timeSaved: originalTotalTime - optimizedTotalTime,
      originalTime: originalTotalTime,
      washCycles,
      totalInjections: totalGroupedInjections,
    };
  };

  

  // ALL YOUR EXISTING FETCH FUNCTIONS (unchanged)
  const fetchAPIMaster = async () => {
    try {
      const companyId =
        localStorage.getItem("companyId") 
      const locationId =
        localStorage.getItem("locationId")
      const response = await fetch(
        `/api/admin/api?companyId=${companyId}&locationId=${locationId}`
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const apiMapping: { [key: string]: string } = {};
      if (data?.data) {
        data.data.forEach((api: any) => {
          apiMapping[api._id] = api.api;
        });
      }

      setApiMaster(apiMapping);
      console.log("Fetched API master:", apiMapping);
    } catch (error) {
      console.error("Error fetching API master data:", error);
      setApiMaster({});
    }
  };

  const fetchColumnMaster = async () => {
    try {
      const companyId =
        localStorage.getItem("companyId")
      const locationId =
        localStorage.getItem("locationId") 

      const response = await fetch(
        `/api/admin/column/getAll?companyId=${companyId}&locationId=${locationId}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status ${response.status}`);
      const data = await response.json();

      const mergedMap: Record<string, string> = {};
      if (data?.data) {
        data.data.forEach((column: any) => {
          const firstDesc = column?.descriptions?.[0];
          const makeName =
            firstDesc?.make?.make || firstDesc?.makeId?.make || "Unknown Make";
          const carbonType = firstDesc?.carbonType || "Unknown Type";
          const length = firstDesc?.length || 0;
          const particleSize = firstDesc?.particleSize || 0;
          const innerDiameter = firstDesc?.innerDiameter || 0;

          const display =
            `${column.columnCode} - ${makeName} ${carbonType} ` +
            `${length}x${innerDiameter}mm, ${particleSize}μm`;

          if (column._id) mergedMap[column._id] = display;
          if (column.id) mergedMap[column.id] = display;
          if (column.columnCode) mergedMap[column.columnCode] = display;
        });
      }

      setColumnMaster(mergedMap);
    } catch (error) {
      console.error("Error fetching column master data:", error);
      setColumnMaster({});
    }
  };

  const fetchDetectorMaster = async () => {
    try {
      const companyId =
        localStorage.getItem("companyId") ||
        "220E43EA-E525-4DDD-9155-631AAAD6A880";
      const locationId =
        localStorage.getItem("locationId") ||
        "0ae9d80c-add2-423e-9d28-b5b44b097867";

      const res = await fetch(
        `/api/admin/detector-type?companyId=${companyId}&locationId=${locationId}`
      );
      if (!res.ok) throw new Error(`HTTP error! status ${res.status}`);

      const json = await res.json();

      const map: Record<string, string> = {};
      if (json?.data) {
        json.data.forEach((d: any) => {
          const name =
            d?.name ||
            d?.detectorType ||
            d?.type ||
            d?.code ||
            "Unknown detector";

          if (d?._id) map[d._id] = name;
          if (d?.id) map[d.id] = name;
          if (d?.code) map[d.code] = name;
        });
      }

      setDetectorMaster(map);
      console.log("Fetched detector master", map);
    } catch (e) {
      console.error("Error fetching detector master data:", e);
      setDetectorMaster({});
    }
  };

  const getDetectorName = (value?: string) => {
    if (!value) return "NA";
    return detectorMaster[value] || value;
  };


  
  const calculateExecutionTime = (
    test: Test
  ): { time: number; breakdown: CalculationBreakdown } => {
    try {
      const breakdown = computeOptimizedCounts(test);
      return { time: breakdown.totalMinutes, breakdown };
    } catch (error) {
      console.error("Error calculating execution time:", error, test);
      return {
        time: 0,
        breakdown: {
          injectionCounts: {},
          runtimes: { default: 0 },
          totalCountedInjections: 0,
          washCycles: 0,
          runtimeMinutes: 0,
          washMinutes: 0,
          totalMinutes: 0,
          hasUniqueRuntimes: false,
          washInterval: 6,
          formula: "Error in calculation",
          steps: ["Calculation failed"],
        },
      };
    }
  };

  const fetchBatchData = async () => {
    try {
      const companyId = "220E43EA-E525-4DDD-9155-631AAAD6A880";
      const locationId = "0ae9d80c-add2-423e-9d28-b5b44b097867";
      const response = await fetch(
        `http://localhost:3000/api/batch-input?companyId=${companyId}&locationId=${locationId}`
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let processedData: BatchItem[] = data?.data || [];

      const validatedData = processedData
        .map((batch) => ({
          ...batch,
          tests:
            batch.tests
              ?.filter(
                (test) => test.testStatus.toLowerCase() === "not started"
              )
              .map((test) => ({
                ...test,
                sampleInjection: safeNumber(test.sampleInjection),
                standardInjection: safeNumber(test.standardInjection),
                blankInjection: safeNumber(test.blankInjection),
                sensitivity: safeNumber(test.sensitivity),
                systemSuitability: safeNumber(test.systemSuitability),
                placebo: safeNumber(test.placebo),
                reference1: safeNumber(test.reference1),
                reference2: safeNumber(test.reference2),
                runTime: safeNumber(test.runTime, 1),
                washTime: safeNumber(test.washTime),
                bracketingFrequency: safeNumber(test.bracketingFrequency, 6),
              })) || [],
        }))
        .filter((batch) => batch.tests.length > 0);

      setBatchData(validatedData);
      console.log("Fetched batch data:", validatedData);
    } catch (error) {
      console.error("Error fetching batch data:", error);
      setBatchData([]);
    }
  };

  const fetchHPLCMaster = async () => {
    try {
      const companyId = localStorage.getItem("companyId");
      const locationId = localStorage.getItem("locationId");
      const response = await fetch(
        `/api/admin/hplc?companyId=${companyId}&locationId=${locationId}`
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      let hplcData: any[] = data?.data || [];
      const processedHPLCs: HPLCMaster[] = hplcData.map((hplc) => ({
        _id: hplc._id,
        hplcName: hplc.internalCode || `HPLC-${hplc._id.slice(-4)}`,
        hplcModel: "Generic Model",
        status: hplc.isActive ? "available" : "unavailable",
        internalCode: hplc.internalCode,
        isActive: hplc.isActive,
        detector: hplc.detector || [], // Ensure detector is always an array
      }));

      setHplcMaster(processedHPLCs);
      console.log("Fetched HPLC master:", processedHPLCs);

      if (batchData.length > 0) {
        await autoStartScheduling(batchData, processedHPLCs);
      }
    } catch (error) {
      console.error("Error fetching HPLC master data:", error);
      const defaultHPLCs: HPLCMaster[] = Array.from(
        { length: 4 },
        (_, index) => ({
          _id: `hplc-default-${index + 1}`,
          hplcName: `HPLC ${index + 1}`,
          hplcModel: "Default Model",
          status: "available",
          internalCode: `HPLC-DEF-${index + 1}`,
          isActive: true,
          detector: [], // Default to empty detector array
        })
      );
      setHplcMaster(defaultHPLCs);

      if (batchData.length > 0) {
        await autoStartScheduling(batchData, defaultHPLCs);
      }
    }
  };

  // All your other existing functions (unchanged)
  const autoStartScheduling = async (
    batches: BatchItem[],
    hplcs?: HPLCMaster[]
  ) => {
    setScheduling(true);
    console.log("Starting scheduling with batches:", batches.length);

    try {
      const availableHPLCs =
        hplcs || hplcMaster.filter((hplc) => hplc.status === "available");
      console.log("Available HPLCs:", availableHPLCs);

      if (availableHPLCs.length === 0) {
        console.log("No available HPLCs found");
        setScheduling(false);
        return;
      }

      const allTests: ScheduledTest[] = [];
batches.forEach((batch) => {
  batch.tests.forEach((test, testIndex) => {
    const { time: executionTime, breakdown } = calculateExecutionTime(test);
    if (
      !isNaN(executionTime) &&
      executionTime > 0 &&
      test.testStatus.toLowerCase() === "not started"
    ) {
      // Pass testIndex to help resolve the correct API for duplicate tests
      const { apiId, apiLabel } = resolveApiForTest(batch, test, apiMaster, testIndex);
      
      // Create a unique ID that includes both test index AND api information
      // This ensures tests with same parameters but different APIs get unique IDs
      const uniqueTestId = apiId 
        ? `${batch._id}-${testIndex}-${apiId}`
        : `${batch._id}-${testIndex}-${uuidv4()}`;

      allTests.push({
        id: uniqueTestId,
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        productCode: batch.productCode,
        productName: batch.productName,
        testName: test.testName,
        columnCode: test.columnCode,
        detectorTypeId: test.detectorTypeId,
        mobilePhaseCodes: test.mobilePhaseCodes,
        priority: batch.priority,
        executionTime,
        originalExecutionTime: executionTime,
        washTime: safeNumber(test.washTime),
        bracketingFrequency: safeNumber(test.bracketingFrequency, 6),
        isGrouped: false,
        originalTest: test,
        calculationBreakdown: breakdown,
        apiId: apiId ?? undefined,
        apiLabel: apiLabel ?? undefined,
      });
    }
  });
});

      console.log("All valid tests found:", allTests.length);

      console.log("All valid tests found:", allTests.length);

      if (allTests.length === 0) {
        console.log("No valid tests to schedule");
        setHplcSchedules([]);
        setUnscheduledTests([]);
        setScheduling(false);
        return;
      }

      const sortedTests = allTests.sort(
        (a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority)
      );
      console.log(
        "Tests sorted by priority:",
        sortedTests.map((t) => `${t.testName} (${t.priority})`)
      );

      const schedules: HPLCSchedule[] = availableHPLCs.map((hplc) => ({
        hplcId: hplc._id,
        hplcName: hplc.hplcName,
        tests: [],
        groups: [],
        totalTime: 0,
      }));

      const assignedTestIds = new Set<string>();
      const unscheduled: ScheduledTest[] = [];

      let hplcIndex = 0;

      // Replace the existing sortedTests.forEach loop with:
sortedTests.forEach((test) => {
  let assigned = false;
  
  // Try to assign to existing HPLC with matching column AND detector
  for (const schedule of schedules) {
    if (schedule.tests.length > 0) {
      // Check if this HPLC already has tests
      const firstTest = schedule.tests[0];
      const columnMatches = firstTest.columnCode === test.columnCode;
      const detectorMatches = firstTest.detectorTypeId === test.detectorTypeId;
      const withinTimeLimit = (schedule.totalTime + test.executionTime) <= 4320; // 72 hours = 4320 minutes
      
      if (columnMatches && detectorMatches && withinTimeLimit) {
        schedule.tests.push(test);
        schedule.totalTime += test.executionTime;
        assignedTestIds.add(test.id);
        assigned = true;
        console.log(`Assigned test ${test.testName} to existing ${schedule.hplcName} (Column: ${test.columnCode}, Detector: ${getDetectorName(test.detectorTypeId)})`);
        break;
      }
    }
  }
  
  // If not assigned, try to assign to empty HPLC with compatible detector
  if (!assigned) {
    const availableSchedule = schedules.find(schedule => {
      if (schedule.tests.length > 0) return false; // Skip HPLCs that already have tests
      
      // Check if HPLC has compatible detector
      const hplc = hplcMaster.find(h => h._id === schedule.hplcId);
      const hasCompatibleDetector = hplc?.detector.some(d => 
        d._id === test.detectorTypeId || d.detectorType === test.detectorTypeId
      );
      
      return hasCompatibleDetector && test.executionTime <= 4320;
    });
    
    if (availableSchedule) {
      availableSchedule.tests.push(test);
      availableSchedule.totalTime += test.executionTime;
      assignedTestIds.add(test.id);
      assigned = true;
      console.log(`Assigned test ${test.testName} to new ${availableSchedule.hplcName} (Column: ${test.columnCode}, Detector: ${getDetectorName(test.detectorTypeId)})`);
    }
  }
  
  // If still not assigned, add to unscheduled
  if (!assigned) {
    const reason = test.executionTime > 4320 
      ? `Exceeds 72-hour limit (${(test.executionTime/60).toFixed(1)} hours)`
      : `No HPLC available with compatible detector (${getDetectorName(test.detectorTypeId)}) and matching column`;
      
    unscheduled.push({
      ...test,
      groupReason: reason,
    });
    console.log(`Unscheduled: ${test.testName} - ${reason}`);
  }
});


      schedules.forEach((schedule) => {
        if (schedule.tests.length > 1) {
          const groupingResult = groupTests(schedule.tests);
          schedule.tests = groupingResult.tests;
          schedule.groups = groupingResult.groups;
          schedule.totalTime = schedule.tests.reduce(
            (sum, test) => sum + test.executionTime,
            0
          );
        }
      });

      const nonEmptySchedules = schedules.filter(
        (schedule) => schedule.tests.length > 0
      );

      console.log(
        "Final schedules:",
        nonEmptySchedules.map((s) => `${s.hplcName}: ${s.tests.length} tests`)
      );
      console.log("Unscheduled tests:", unscheduled.length);

      setHplcSchedules(nonEmptySchedules);
      setUnscheduledTests(unscheduled);
    } catch (error) {
      console.error("Error in scheduling:", error);
    } finally {
      setScheduling(false);
    }
  };

  const getPriorityValue = (priority: string): number => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return 3;
      case "high":
        return 2;
      case "normal":
        return 1;
      case "low":
        return 0;
      default:
        return 1;
    }
  };

  const getMobilePhaseKey = (mobilePhaseCodes: string[]): string => {
    return mobilePhaseCodes
      .filter((code) => code.trim() !== "")
      .sort()
      .join("-");
  };

  const groupTests = (
    tests: ScheduledTest[],
    existingTests: ScheduledTest[] = []
  ): { tests: ScheduledTest[]; groups: GroupInfo[] } => {
    const groups: GroupInfo[] = [];
    const processedTests: ScheduledTest[] = [];
    const usedTestIds = new Set<string>();
    const apiTestMap = new Map<string, ScheduledTest[]>();

    if (tests.length <= 1 && existingTests.length === 0) {
      return tests.length === 0
        ? { tests: [], groups: [] }
        : { tests: tests, groups: [] };
    }

    const allTests = [...existingTests, ...tests];
    const columnMobilePhaseGroups = new Map<string, ScheduledTest[]>();

    allTests.forEach((test, index) => {
      // Prefer unique apiNameId if available, fallback to label
const apiKey = test.apiId 
  ? `${test.apiId}-${index}` 
  : `${test.apiLabel}-${index}` || "NA";

      if (!apiTestMap.has(apiKey)) {
        apiTestMap.set(apiKey, []);
      }
      apiTestMap.get(apiKey)!.push(test);
    });

    // Log API distribution
    console.log(
      "API distribution in grouping:",
      Array.from(apiTestMap.entries()).map(
        ([api, tests]) => `${api}: ${tests.length} tests`
      )
    );

    allTests.forEach((test, index) => {
      const mobilePhaseKey = getMobilePhaseKey(test.mobilePhaseCodes);
    const key = `${test.columnCode}-${mobilePhaseKey}-${test.detectorTypeId}-${index}`;
;

      if (!columnMobilePhaseGroups.has(key)) {
        columnMobilePhaseGroups.set(key, []);
      }
      columnMobilePhaseGroups.get(key)!.push(test);
    });

    columnMobilePhaseGroups.forEach((columnTests, columnKey) => {
      if (columnTests.length > 1) {
        const groupId = `group-${groups.length + 1}`;
        const groupAnalysis = calculateGroupedCounts(columnTests);
        const originalGroupTime =
          groupAnalysis.originalTime > 0 ? groupAnalysis.originalTime : 0;
        const optimizedGroupTime =
          groupAnalysis.totalTime > 0 ? groupAnalysis.totalTime : 0;
        const totalTimeSaved =
          groupAnalysis.timeSaved > 0 ? groupAnalysis.timeSaved : 0;

        const [columnCode, mobilePhaseKey, detectorId] = columnKey.split("-");

        const group: GroupInfo = {
          id: groupId,
          detectorId,
          columnCode,
          mobilePhaseKey,
          reason: `Saved ${totalTimeSaved.toFixed(1)} min (${
            originalGroupTime > 0
              ? ((totalTimeSaved / originalGroupTime) * 100).toFixed(1)
              : "0"
          }%) by grouping ${columnTests.length} tests`,
          tests: columnTests.map((test, index) => {
            const isFirstTest = index === 0;
            let individualTimeSaved = 0;

            if (!isFirstTest && test.originalTest) {
              const testBreakdown = computeOptimizedCounts(test.originalTest);
              const skippedInjections =
                testBreakdown.totalCountedInjections -
                safeNumber(test.originalTest.sampleInjection);
              const runtime = safeNumber(test.originalTest.runTime, 1);
              individualTimeSaved = skippedInjections * runtime;
            }

            return {
              ...test,
              groupId,
              groupReason: isFirstTest
                ? `Lead test in group of ${columnTests.length} (full injections)`
                : `Grouped test (only samples repeated, saved ${individualTimeSaved.toFixed(
                    1
                  )} min)`,
              isGrouped: true,
              executionTime: isFirstTest
                ? test.originalExecutionTime
                : test.originalTest
                ? safeNumber(test.originalTest.sampleInjection, 0) *
                  safeNumber(test.originalTest.runTime, 1)
                : 0,
              timeSaved: individualTimeSaved,
            };
          }),
          totalTime: optimizedGroupTime,
          originalTotalTime: originalGroupTime,
          timeSaved: totalTimeSaved,
        };

        groups.push(group);
        group.tests.forEach((test) => {
          processedTests.push(test);
          usedTestIds.add(test.id);
        });
      }
    });

    tests.forEach((test) => {
      if (!usedTestIds.has(test.id)) {
        processedTests.push(test);
      }
    });

    return { tests: processedTests, groups };
  };

  // NEW: Function to recalculate all values after reordering
  const recalculateSchedules = (updatedSchedules: HPLCSchedule[]) => {
    const recalculatedSchedules = updatedSchedules.map((schedule) => {
      if (schedule.tests.length > 1) {
        // Re-apply grouping optimization
        const groupingResult = groupTests(schedule.tests, []);
        schedule.tests = groupingResult.tests;
        schedule.groups = groupingResult.groups;
      }

      // Recalculate total time
      schedule.totalTime = schedule.tests.reduce(
        (sum, test) => sum + test.executionTime,
        0
      );

      return schedule;
    });

    setHplcSchedules(recalculatedSchedules);
  };

  // NEW: Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const testId = active.id as string;

    // Find the test being dragged
    const draggedTest = hplcSchedules
      .flatMap((schedule) => schedule.tests)
      .find((test) => test.id === testId);

    setActiveTest(draggedTest || null);
  };

  // NEW: Handle drag over (for visual feedback)
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    if (over) {
      const overId = over.id as string;
      // Check if dragging over an HPLC container
      const overHPLC = hplcSchedules.find(
        (schedule) =>
          schedule.hplcId === overId ||
          schedule.tests.some((test) => test.id === overId)
      );

      if (overHPLC) {
        setDraggedOverHPLC(overHPLC.hplcId);
      }
    } else {
      setDraggedOverHPLC(null);
    }
  };

  // NEW: Handle drag end - this is where the magic happens
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !activeTest) {
      setActiveTest(null);
      setDraggedOverHPLC(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination
    const sourceScheduleIndex = hplcSchedules.findIndex((schedule) =>
      schedule.tests.some((test) => test.id === activeId)
    );
    const sourceTestIndex = hplcSchedules[sourceScheduleIndex]?.tests.findIndex(
      (test) => test.id === activeId
    );

    let destinationScheduleIndex = -1;
    let destinationTestIndex = -1;

    // Check if dropping on another test (for reordering within HPLC)
    const overTest = hplcSchedules
      .flatMap((schedule, scheduleIndex) =>
        schedule.tests.map((test, testIndex) => ({
          test,
          scheduleIndex,
          testIndex,
        }))
      )
      .find((item) => item.test.id === overId);

    if (overTest) {
      destinationScheduleIndex = overTest.scheduleIndex;
      destinationTestIndex = overTest.testIndex;
    } else {
      // Check if dropping on HPLC container (for cross-HPLC movement)
      destinationScheduleIndex = hplcSchedules.findIndex(
        (schedule) => schedule.hplcId === overId
      );
      if (destinationScheduleIndex >= 0) {
        destinationTestIndex =
          hplcSchedules[destinationScheduleIndex].tests.length;
      }
    }

    if (sourceScheduleIndex === -1 || destinationScheduleIndex === -1) {
      setActiveTest(null);
      setDraggedOverHPLC(null);
      return;
    }

    const updatedSchedules = [...hplcSchedules];
    const [movedTest] = updatedSchedules[sourceScheduleIndex].tests.splice(
      sourceTestIndex,
      1
    );

    if (sourceScheduleIndex === destinationScheduleIndex) {
      // Reordering within same HPLC
      const adjustedDestIndex =
        destinationTestIndex > sourceTestIndex
          ? destinationTestIndex - 1
          : destinationTestIndex;
      updatedSchedules[destinationScheduleIndex].tests.splice(
        adjustedDestIndex,
        0,
        movedTest
      );
    } else {
      // Moving between HPLCs
      updatedSchedules[destinationScheduleIndex].tests.splice(
        destinationTestIndex,
        0,
        movedTest
      );
    }

    // Update sort orders
    updatedSchedules.forEach((schedule) => {
      schedule.tests.forEach((test, index) => {
        test.sortOrder = index + 1;
      });
    });

    // Recalculate all algorithmic values
    recalculateSchedules(updatedSchedules);

    setActiveTest(null);
    setDraggedOverHPLC(null);
  };

  // Your existing initialization
  useEffect(() => {
    fetchInitialData();
  }, []);

  

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBatchData(),
        fetchHPLCMaster(),
        fetchAPIMaster(),
        fetchColumnMaster(),
        fetchDetectorMaster(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      batchData.length > 0 &&
      hplcMaster.length > 0 &&
      Object.keys(apiMaster).length > 0 &&
      Object.keys(columnMaster).length > 0
    ) {
      autoStartScheduling(batchData, hplcMaster);
    }
  }, [batchData, hplcMaster, apiMaster, columnMaster]);

  // Loading states
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scheduling data...</p>
        </div>
      </div>
    );
  }

  if (scheduling) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing scheduling...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ddebfc] p-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800">
            HPLC Test Scheduling Algorithm with Drag & Drop
          </h1>
          <div className="flex space-x-3 text-xs text-gray-600">
            <span>Total Batches: {batchData.length}</span>
            <span>
              Available HPLCs:{" "}
              {hplcMaster.filter((h) => h.status === "available").length}
            </span>
          </div>
        </div>

        {hplcSchedules.length === 0 && unscheduledTests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <p className="text-gray-500 text-sm">
              No tests found for scheduling. Please ensure there are batches
              with tests in 'not started' status.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-2 gap-3 h-[calc(100vh-120px)] overflow-auto">
              {hplcSchedules.map((schedule) => (
                <div
                  key={schedule.hplcId}
                  className={`bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col ${
                    draggedOverHPLC === schedule.hplcId
                      ? "ring-2 ring-blue-400 bg-blue-50"
                      : ""
                  }`}
                >
                  {/* HPLC Header */}
                  <div className="p-2 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-gray-800 text-xs font-medium">
                          {schedule.hplcName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {schedule.tests.length} tests •{" "}
                          {formatTime(schedule.totalTime)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-500">Column</div>
                        {schedule.tests.length > 0 &&
                          columnMaster[schedule.tests[0]?.columnCode] && (
                            <div
                              className="text-[10px] text-gray-600 truncate max-w-[200px]"
                              title={
                                columnMaster[schedule.tests[0]?.columnCode]
                              }
                            >
                              {columnMaster[schedule.tests[0]?.columnCode]}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-500">
                        Detector:{" "}
                        <span className="text-gray-800">
                          {schedule.tests.length > 0
                            ? getDetectorName(schedule.tests[0].detectorTypeId)
                            : "NA"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tests Table */}
                  {schedule.tests.length > 0 ? (
                    <div className="flex-1 overflow-auto">
                      <SortableContext
                        items={schedule.tests.map((test) => test.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <table className="w-full text-xs border-collapse">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200 w-12">
                                Sr No.
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Product Name
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Product Code
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                MFC Number
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                API Name
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Pharmacopoeial
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Type of Sample
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Mobile Phases
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Washes
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Batch
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Test
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Pri
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Sample Inj
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Std Inj
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Blank Inj
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Sys Suit
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Sens
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Placebo
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Ref1
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Ref2
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Bracket Freq
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Run Time
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Blank RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Std RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Sample RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Sys Suit RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Sens RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Placebo RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Ref1 RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Ref2 RT
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Wash Time
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Time
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Act
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {schedule.tests.map((test, index) => (
                              <DraggableTestRow
                                key={test.id}
                                test={test}
                                index={index}
                                batchData={batchData}
                                apiMaster={apiMaster}
                                columnMaster={columnMaster}
                                setSelectedTestForCalculation={
                                  setSelectedTestForCalculation
                                }
                                getDetectorName={getDetectorName}
                              />
                            ))}
                          </tbody>
                        </table>
                      </SortableContext>
                    </div>
                  ) : (
                    <div
                      className="p-3 text-center text-gray-500 text-xs min-h-[100px] flex items-center justify-center border-2 border-dashed border-gray-300 m-2 rounded"
                      data-hplc-id={schedule.hplcId}
                    >
                      Drop tests here or no tests assigned
                    </div>
                  )}

                  {/* Groups Summary */}
                  {schedule.groups.length > 0 && (
                    <div className="border-t border-gray-200 bg-green-50 p-2">
                      <div className="text-[10px] text-green-600">
                        {schedule.groups.length} optimization group
                        {schedule.groups.length !== 1 ? "s" : ""} • Saved{" "}
                        {schedule.groups
                          .reduce((sum, group) => sum + group.timeSaved, 0)
                          .toFixed(1)}{" "}
                        min total
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTest ? (
                <div className="bg-white shadow-lg rounded p-2 border-2 border-blue-400">
                  <div className="text-xs font-medium">
                    {activeTest.testName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {activeTest.productName}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Calculation Modal */}
        {selectedTestForCalculation && (
          <CalculationModal
            test={selectedTestForCalculation}
            isOpen={selectedTestForCalculation !== null}
            onClose={() => setSelectedTestForCalculation(null)}
          />
        )}
      </div>
    </div>
  );
}
