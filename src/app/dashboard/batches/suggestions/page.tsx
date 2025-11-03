"use client";
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
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

// Color palette for visual grouping
const COLOR_PALETTE = [
  {
    bg: "bg-blue-50",
    border: "border-l-4 border-blue-400",
    text: "text-blue-700",
    name: "Light Blue",
  },
  {
    bg: "bg-yellow-50",
    border: "border-l-4 border-yellow-400",
    text: "text-yellow-700",
    name: "Light Yellow",
  },
  {
    bg: "bg-green-50",
    border: "border-l-4 border-green-400",
    text: "text-green-700",
    name: "Light Green",
  },
  {
    bg: "bg-purple-50",
    border: "border-l-4 border-purple-400",
    text: "text-purple-700",
    name: "Light Purple",
  },
  {
    bg: "bg-pink-50",
    border: "border-l-4 border-pink-400",
    text: "text-pink-700",
    name: "Light Pink",
  },
  {
    bg: "bg-indigo-50",
    border: "border-l-4 border-indigo-400",
    text: "text-indigo-700",
    name: "Light Indigo",
  },
  {
    bg: "bg-orange-50",
    border: "border-l-4 border-orange-400",
    text: "text-orange-700",
    name: "Light Orange",
  },
  {
    bg: "bg-teal-50",
    border: "border-l-4 border-teal-400",
    text: "text-teal-700",
    name: "Light Teal",
  },
  {
    bg: "bg-cyan-50",
    border: "border-l-4 border-cyan-400",
    text: "text-cyan-700",
    name: "Light Cyan",
  },
  {
    bg: "bg-rose-50",
    border: "border-l-4 border-rose-400",
    text: "text-rose-700",
    name: "Light Rose",
  },
  {
    bg: "bg-lime-50",
    border: "border-l-4 border-lime-400",
    text: "text-lime-700",
    name: "Light Lime",
  },
  {
    bg: "bg-amber-50",
    border: "border-l-4 border-amber-400",
    text: "text-amber-700",
    name: "Light Amber",
  },
];

interface VisualGroup {
  id: string;
  apiName: string;
  mobilePhases: string;
  detector: string;
  column: string;
  color: (typeof COLOR_PALETTE)[0];
  tests: ScheduledTest[];
}

interface FutureSequence {
  sequenceName: string; // e.g., "F-1-a"
  hplcId: string;
  hplcName: string;
  day: number; // 1-7
  instrumentLetter: string; // a, b, c, d
  startTime: Date;
  endTime: Date;
  tests: ScheduledTest[];
  groups: GroupInfo[];
  totalTime: number;
  detector: string;
  column: string;
  mobilePhaseCodes: string[];
}

interface FutureSequencePlan {
  [hplcId: string]: FutureSequence[]; // Up to 7 days per HPLC
}

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

function resolveApiForTest(
  batch: BatchItem,
  test: Test,
  apiMaster: Record<string, string>,
  testIndex?: number
): ApiResolverResult {
  if (!batch?.generics?.length || !test) return { apiId: null, apiLabel: "NA" };

  // For batches with multiple APIs creating identical tests,
  // we need to map tests to their corresponding APIs
  const allApiTests: Array<{ apiId: string; test: Test; apiLabel: string }> =
    [];

  for (const generic of batch.generics) {
    for (const rawApi of generic.apis ?? []) {
      const apiIdentifier = rawApi?.apiName || null;
      if (!apiIdentifier) continue;

      for (const tt of rawApi.testTypes ?? []) {
        allApiTests.push({
          apiId: apiIdentifier,
          test: tt,
          apiLabel: apiMaster[apiIdentifier] || apiIdentifier,
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
      if (
        testIndex !== undefined &&
        allApiTests.filter(
          (at) =>
            at.test.testName === test.testName &&
            at.test.columnCode === test.columnCode
        ).length > 1
      ) {
        // Get all matching API tests
        const matchingApiTests = allApiTests.filter((at) => {
          const t = at.test;
          return (
            t?.testName === test.testName &&
            t?.columnCode === test.columnCode &&
            t?.detectorTypeId === test.detectorTypeId
          );
        });

        if (matchingApiTests[testIndex]) {
          return {
            apiId: matchingApiTests[testIndex].apiId,
            apiLabel: matchingApiTests[testIndex].apiLabel,
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
      const runtimeClose =
        Math.abs((tt?.runTime ?? 0) - (test?.runTime ?? 0)) <= 1;

      const score =
        (exactMatch ? 10 : 0) +
        (equalPhase ? 5 : 0) +
        (pharmOverlap ? 1 : 0) +
        (runtimeClose ? 1 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          apiId: apiTest.apiId,
          apiLabel: apiTest.apiLabel,
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

const calculateInjectionDisplayForGroup = (
  testIndexInGroup: number,
  totalTestsInGroup: number,
  test: ScheduledTest
): {
  blank: boolean;
  standard: boolean;
  sample: boolean;
  bracketing: boolean;
} => {
  const isFirstTestInGroup = testIndexInGroup === 0;
  const isLastTestInGroup = testIndexInGroup === totalTestsInGroup - 1;

  // Cumulative sample count WITHIN GROUP (2 samples per test)
  const cumulativeSamplesInGroup = (testIndexInGroup + 1) * 2;

  // Bracketing occurs after every 6 samples WITHIN GROUP
  const needsBracketing =
    isFirstTestInGroup || // First test in group gets BKT after standards
    cumulativeSamplesInGroup % 6 === 0 || // Every 6 samples within group
    isLastTestInGroup; // Last test in group always gets BKT

  return {
    blank: isFirstTestInGroup,
    standard: isFirstTestInGroup,
    sample: true, // All products get samples
    bracketing: needsBracketing,
  };
};

// NEW: Draggable Test Row Component - This keeps your exact table structure
// Draggable Test Row Component with Visual Grouping
const DraggableTestRow: React.FC<{
  test: ScheduledTest;
  index: number;
  batchData: BatchItem[];
  apiMaster: { [key: string]: string };
  columnMaster: { [key: string]: string };
  setSelectedTestForCalculation: (test: ScheduledTest) => void;
  getDetectorName: (value?: string) => string;
  hplcSchedules: HPLCSchedule[];
  visualGroupsMap: Map<string, Map<string, VisualGroup>>;
}> = ({
  test,
  index,
  batchData,
  apiMaster,
  columnMaster,
  setSelectedTestForCalculation,
  getDetectorName,
  hplcSchedules,
  visualGroupsMap,
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

  let apiName = "NA";
  if (test.apiId) {
    apiName = apiMaster[test.apiId] || "Unknown API";
  } else if (batch?.generics && test.originalTest) {
    const testIndexInBatch = batch.tests.findIndex(
      (t) =>
        t.testName === test.originalTest?.testName &&
        t.columnCode === test.originalTest?.columnCode
    );
    const { apiId, apiLabel } = resolveApiForTest(
      batch,
      test.originalTest,
      apiMaster,
      testIndexInBatch >= 0 ? testIndexInBatch : undefined
    );
    if (apiId && apiMaster[apiId]) {
      apiName = apiMaster[apiId];
    } else {
      apiName = apiLabel || "NA";
    }
  }

  // Find the group this test belongs to
  const groupKey = (() => {
    const mobilePhases = test.mobilePhaseCodes
      .slice(0, 4)
      .filter((code) => code.trim() !== "")
      .sort()
      .join(", ");

    const detector = getDetectorName(test.detectorTypeId);
    const column = columnMaster[test.columnCode] || test.columnCode;

    return `${apiName}|${mobilePhases}|${detector}|${column}`;
  })();

  // Get the visual group from parent HPLC
  const visualGroup = (() => {
    for (const schedule of hplcSchedules) {
      if (schedule.tests.some((t) => t.id === test.id)) {
        const groups = visualGroupsMap.get(schedule.hplcId);
        return groups?.get(groupKey);
      }
    }
    return undefined;
  })();

  // Find the group this test belongs to
  const groupInfo = hplcSchedules
    .flatMap((s) => s.groups)
    .find((g) => g.tests.some((t) => t.id === test.id));

  // If test is grouped, find its position within the group
  let testIndexInGroup = 0;
  let totalTestsInGroup = 1;

  if (groupInfo) {
    const groupTests = groupInfo.tests;
    testIndexInGroup = groupTests.findIndex((t) => t.id === test.id);
    totalTestsInGroup = groupTests.length;
  } else {
    // Ungrouped tests - calculate per HPLC
    const schedule = hplcSchedules.find((s) =>
      s.tests.some((t) => t.id === test.id)
    );
    if (schedule) {
      testIndexInGroup = schedule.tests.findIndex((t) => t.id === test.id);
      totalTestsInGroup = schedule.tests.length;
    }
  }

  // Use per-group calculation
  const injectionDisplay = calculateInjectionDisplayForGroup(
    testIndexInGroup,
    totalTestsInGroup,
    test
  );

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        ${visualGroup ? visualGroup.color.bg : "bg-white"}
        ${visualGroup ? visualGroup.color.border : ""}
        hover:opacity-80 transition-all
        ${isDragging ? "shadow-lg ring-2 ring-blue-400 opacity-70" : ""}
      `}
    >
      {/* Sr No. column with drag handle */}
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200 w-16">
        <div className="flex items-center gap-1.5 relative">
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

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium">{index + 1}</span>

            {/* Group badge below serial number */}
            {groupInfo && (
              <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-green-500 text-white shadow-sm whitespace-nowrap">
                {testIndexInGroup + 1}/{totalTestsInGroup}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Product Name */}
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
        <div className="font-medium truncate w-20" title={test.productName}>
          {test.productName}
        </div>
      </td>

      {/* Product Code */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={test.productCode}
      >
        {test.productCode}
      </td>

      {/* MFC Number */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
        title={batch?.mfcNumber}
      >
        {batch?.mfcNumber || "NA"}
      </td>

      {/* API Name */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
        title={apiName}
      >
        {apiName}
      </td>

      {/* Pharmacopoeial */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={batch?.pharmacopoeialName}
      >
        {batch?.pharmacopoeialName || "NA"}
      </td>

      {/* Type of Sample */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={batch?.typeOfSample}
      >
        {batch?.typeOfSample || "NA"}
      </td>

      {/* Column */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
        title={columnMaster[test.columnCode]}
      >
        {columnMaster[test.columnCode] || test.columnCode}
      </td>

      {/* Detector */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={getDetectorName(test.detectorTypeId)}
      >
        {getDetectorName(test.detectorTypeId)}
      </td>

      {/* Mobile Phases */}
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
        {(() => {
          const mobilePhases = test.mobilePhaseCodes
            .slice(0, 4)
            .filter((code) => code !== "")
            .join(", ");
          return <span title={mobilePhases}>{mobilePhases || "NA"}</span>;
        })()}
      </td>

      {/* Washes */}
      <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
        {(() => {
          const washes = test.mobilePhaseCodes
            .slice(4)
            .filter((code) => code !== "")
            .join(", ");
          return <span title={washes}>{washes || "NA"}</span>;
        })()}
      </td>

      {/* Batch Number */}
      <td
        className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
        title={test.batchNumber}
      >
        {test.batchNumber}
      </td>

      {/* Test Name with enhanced group indicator */}
      <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
        <div className="flex items-center gap-1">
          <div className="font-medium truncate w-20" title={test.testName}>
            {test.testName}
          </div>
          {groupInfo && (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-green-100 text-green-700 border border-green-300">
                <svg
                  className="w-2 h-2 mr-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                {testIndexInGroup + 1}/{totalTestsInGroup}
              </span>
            </div>
          )}
        </div>
        {test.isGrouped && (
          <div
            className="text-[9px] text-green-600 truncate mt-0.5 flex items-center gap-0.5"
            title={test.groupReason}
          >
            <span>⚡</span>
            <span className="font-medium">
              {test.timeSaved
                ? `Saved ${test.timeSaved.toFixed(0)}m`
                : "Grouped"}
            </span>
          </div>
        )}
      </td>

      {/* Priority */}
      <td className="px-1 py-1 text-center border-r border-gray-200">
        <span
          className={`inline-block px-1 text-10px font-medium rounded ${
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

      {/* Blank Injection */}
      <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
        <span
          className={
            injectionDisplay.blank
              ? "text-green-600 font-semibold"
              : "text-gray-400"
          }
        >
          {test.originalTest?.blankInjection || 0}
        </span>
      </td>

      {/* Standard Injection */}
      <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
        <span
          className={
            injectionDisplay.standard
              ? "text-green-600 font-semibold"
              : "text-gray-400"
          }
        >
          {test.originalTest?.standardInjection || 0}
        </span>
      </td>

      {/* Sample Injection */}
      <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
        <span
          className={
            injectionDisplay.sample
              ? "text-green-600 font-semibold"
              : "text-gray-400"
          }
        >
          {test.originalTest?.sampleInjection || 0}
        </span>
      </td>

      {/* Bracketing */}
      <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
        <span
          className={
            injectionDisplay.bracketing
              ? "text-green-600 font-semibold"
              : "text-gray-400"
          }
        >
          {test.bracketingFrequency || 0}
        </span>
      </td>

      {/* Remaining injections moved after */}
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.systemSuitability || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.sensitivity || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.placebo || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.reference1 || 0}
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.reference2 || 0}
      </td>

      {/* All runtime columns */}
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.runTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.blankRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.standardRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.sampleRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.systemSuitabilityRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.sensitivityRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.placeboRunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.reference1RunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.originalTest?.reference2RunTime || 0}m
      </td>
      <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
        {test.washTime || 0}m
      </td>

      {/* Time column */}
      <td className="px-1 py-1 text-center text-gray-700 border-r border-gray-200">
        <div className="text-10px">{test.executionTime.toFixed(0)}m</div>
        {test.isGrouped && test.timeSaved && (
          <div className="text-10px text-green-600">
            -{test.timeSaved.toFixed(0)}m
          </div>
        )}
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
  // Add this state near other state declarations (around line 300)
  const [futureDragActive, setFutureDragActive] =
    useState<ScheduledTest | null>(null);
  const [columnMaster, setColumnMaster] = useState<{ [key: string]: string }>(
    {}
  );
  const [futureSequences, setFutureSequences] = useState<FutureSequencePlan>(
    {}
  );
  const [isFutureSequencesMinimized, setIsFutureSequencesMinimized] =
    useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [detectorMaster, setDetectorMaster] = useState<Record<string, string>>(
    {}
  );
  const [visualGroupsMap, setVisualGroupsMap] = useState<
    Map<string, Map<string, VisualGroup>>
  >(new Map());

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const calculateEndTime = (
    startTime: Date,
    durationMinutes: number
  ): string => {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const formatTime = (date: Date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const minutesStr = minutes < 10 ? "0" + minutes : minutes;
      return `${hours}:${minutesStr} ${ampm}`;
    };

    const formatDate = (date: Date) => {
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getDate();
      return `${month} ${day}`;
    };

    const startDate = startTime.toDateString();
    const endDate = endTime.toDateString();

    if (startDate === endDate) {
      return formatTime(endTime);
    } else {
      // Different day
      const daysDiff = Math.floor(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        return `${formatTime(endTime)} (next day)`;
      } else {
        return `${formatTime(endTime)} (${formatDate(endTime)})`;
      }
    }
  };

  const formatCurrentTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  // All your existing calculation functions (UPDATED)
  const computeOptimizedCounts = (
    test: Test,
    washInterval: number = 6,
    activeInjections: {
      isBlankActive: boolean;
      isStandardActive: boolean;
      isSampleActive: boolean;
      isBracketingActive: boolean;
    } = {
      isBlankActive: true,
      isStandardActive: true,
      isSampleActive: true,
      isBracketingActive: true,
    }
  ): CalculationBreakdown => {
    // Modify injection counts based on active status
    const injectionCounts: { [key: string]: number } = {
      sample: activeInjections.isSampleActive
        ? safeNumber(test.sampleInjection)
        : 0,
      standard: activeInjections.isStandardActive
        ? safeNumber(test.standardInjection)
        : 0,
      blank: activeInjections.isBlankActive
        ? safeNumber(test.blankInjection)
        : 0,
      // Other injections - always included if ≥ 1
      sensitivity: safeNumber(test.sensitivity),
      systemSuitability: safeNumber(test.systemSuitability),
      placebo: safeNumber(test.placebo),
      reference1: safeNumber(test.reference1),
      reference2: safeNumber(test.reference2),
    };

    const defaultRuntime = safeNumber(test.runTime, 1);
    const hasUniqueRuntimes = test.uniqueRuntimes === true;

    // Define runtimes for each injection type
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
          // Use sampleRunTime for bracketing, or define bracketingRunTime if available
          bracketing: safeNumber(test.sampleRunTime, defaultRuntime),
        }
      : {
          bracketing: defaultRuntime,
          default: defaultRuntime,
        };

    // Calculate base injections (excluding bracketing)
    const baseInjections = Object.values(injectionCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    // Bracketing calculation - only if bracketing is active
    const bracketingInjections = activeInjections.isBracketingActive
      ? Math.ceil(baseInjections / washInterval)
      : 0;

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
        `Bracketing injections: ${bracketingInjections} (every ${washInterval})`
      );
      steps.push(
        `Total injections: ${baseInjections} + ${bracketingInjections} = ${totalCountedInjections}`
      );
      steps.push(`Runtime per injection: ${defaultRuntime} min`);
      steps.push(
        `Runtime total: ${totalCountedInjections} × ${defaultRuntime} = ${runtimeMinutes} min`
      );
    }

    // Wash time is added ONCE at the end
    const washTime = safeNumber(test.washTime);
    const washMinutes = washTime; // Only once at the end
    const totalMinutes = runtimeMinutes + washMinutes;

    steps.push(`Wash time (once at end): ${washTime} min`);
    steps.push(
      `Total time: ${runtimeMinutes} + ${washMinutes} = ${totalMinutes} min`
    );

    const formula = hasUniqueRuntimes
      ? `Time = ∑(Ni × RTi) + WT = ${runtimeMinutes.toFixed(
          1
        )} + ${washMinutes.toFixed(1)} = ${totalMinutes.toFixed(1)} min`
      : `Time = (∑Ni + Bracketing) × RT + WT = ${totalCountedInjections} × ${defaultRuntime} + ${washTime} = ${totalMinutes.toFixed(
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

  // Helper function to determine which injections are active for a test in a group
  const calculateInjectionDisplayForGroup = (
    testIndexInGroup: number,
    totalTestsInGroup: number,
    test: ScheduledTest
  ): {
    blank: boolean;
    standard: boolean;
    sample: boolean;
    bracketing: boolean;
  } => {
    const isFirstTest = testIndexInGroup === 0;
    const isLastTest = testIndexInGroup === totalTestsInGroup - 1;

    return {
      blank: isFirstTest, // Only first test has blank
      standard: isFirstTest, // Only first test has standard
      sample: true, // All tests have samples
      bracketing: isLastTest, // Only last test has final bracketing
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

    // Calculate original time for each test with ALL injections active
    let originalTotalTime = 0;
    tests.forEach((test) => {
      if (test.originalTest) {
        const breakdown = computeOptimizedCounts(
          test.originalTest,
          washInterval,
          {
            isBlankActive: true,
            isStandardActive: true,
            isSampleActive: true,
            isBracketingActive: true,
          }
        );
        originalTotalTime += breakdown.totalMinutes;
      }
    });

    // For grouped calculation, determine active injections per test position
    let optimizedTotalTime = 0;
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
      "bracketing",
    ];
    injectionTypes.forEach((type) => (groupedCounts[type] = 0));

    tests.forEach((test, index) => {
      if (test.originalTest) {
        const activeInjections = calculateInjectionDisplayForGroup(
          index,
          tests.length,
          test
        );

        const breakdown = computeOptimizedCounts(
          test.originalTest,
          washInterval,
          {
            isBlankActive: activeInjections.blank,
            isStandardActive: activeInjections.standard,
            isSampleActive: activeInjections.sample,
            isBracketingActive: activeInjections.bracketing,
          }
        );

        optimizedTotalTime += breakdown.totalMinutes;

        // Accumulate counts for display
        Object.entries(breakdown.injectionCounts).forEach(([type, count]) => {
          if (groupedCounts.hasOwnProperty(type)) {
            groupedCounts[type] += count;
          }
        });
      }
    });

    // Add wash time at the end (only once)
    const firstTestWashTime = tests[0]?.originalTest
      ? safeNumber(tests[0].originalTest.washTime)
      : 0;

    // Note: optimizedTotalTime already includes one wash time from the calculation
    // originalTotalTime includes wash time for each test

    const totalGroupedInjections = Object.values(groupedCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      counts: groupedCounts,
      totalTime: optimizedTotalTime,
      timeSaved: originalTotalTime - optimizedTotalTime,
      originalTime: originalTotalTime,
      washCycles: 1, // One wash at the end
      totalInjections: totalGroupedInjections,
    };
  };

  // ALL YOUR EXISTING FETCH FUNCTIONS (unchanged)
  const fetchAPIMaster = async () => {
    try {
      const companyId = localStorage.getItem("companyId");
      const locationId = localStorage.getItem("locationId");
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
      const companyId = localStorage.getItem("companyId");
      const locationId = localStorage.getItem("locationId");

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
    test: Test,
    activeInjections?: {
      blank: boolean;
      standard: boolean;
      sample: boolean;
      bracketing: boolean;
    }
  ): { time: number; breakdown: CalculationBreakdown } => {
    try {
      // If no active injections provided, default all to true
      const active = activeInjections || {
        blank: true,
        standard: true,
        sample: true,
        bracketing: true,
      };

      const breakdown = computeOptimizedCounts(test, 6, {
        isBlankActive: active.blank,
        isStandardActive: active.standard,
        isSampleActive: active.sample,
        isBracketingActive: active.bracketing,
      });

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
      const companyId = localStorage.getItem("companyId");
      const locationId = localStorage.getItem("locationId");
      const response = await fetch(
        `/api/batch-input?companyId=${companyId}&locationId=${locationId}`
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
    console.log("Starting enhanced scheduling with batches:", batches.length);

    try {
      const availableHPLCs =
        hplcs || hplcMaster.filter((hplc) => hplc.status === "available");

      if (availableHPLCs.length === 0) {
        console.log("No available HPLCs found");
        setScheduling(false);
        return;
      }

      // Step 1: Convert all batches to schedulable tests
      const allTests: ScheduledTest[] = [];
      batches.forEach((batch) => {
        batch.tests.forEach((test, testIndex) => {
          const { time: executionTime, breakdown } =
            calculateExecutionTime(test);
          if (
            !isNaN(executionTime) &&
            executionTime > 0 &&
            test.testStatus.toLowerCase() === "not started"
          ) {
            const { apiId, apiLabel } = resolveApiForTest(
              batch,
              test,
              apiMaster,
              testIndex
            );

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

      if (allTests.length === 0) {
        console.log("No valid tests to schedule");
        setHplcSchedules([]);
        setUnscheduledTests([]);
        setScheduling(false);
        return;
      }

      // Step 2: Sort by priority (Urgent > High > Normal > Low)
      const sortedTests = allTests.sort(
        (a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority)
      );

      // Step 3: Initialize HPLC schedules with mobile phase tracking
      interface HPLCScheduleExtended extends HPLCSchedule {
        currentMobilePhases: Set<string>;
        currentColumn: string | null;
        currentDetector: string | null;
        availableDetectors: string[];
      }

      const schedules: HPLCScheduleExtended[] = availableHPLCs.map((hplc) => ({
        hplcId: hplc._id,
        hplcName: hplc.hplcName,
        tests: [],
        groups: [],
        totalTime: 0,
        currentMobilePhases: new Set<string>(),
        currentColumn: null,
        currentDetector: null,
        availableDetectors: hplc.detector.map((d) => d._id),
      }));

      const unscheduled: ScheduledTest[] = [];
      const MAX_RUNTIME = 4320; // 72 hours in minutes
      const MAX_MOBILE_PHASES_AND_WASHES = 4; // Combined limit for mobile phases + washes

      // Step 4: Schedule each test based on criteria
      sortedTests.forEach((test) => {
        let assigned = false;
        // Get ALL mobile phase codes (both mobile phases AND washes)
        const testMobilePhases = test.mobilePhaseCodes.filter(
          (code) => code.trim() !== ""
        ); // Get all non-empty codes

        // Try to find matching HPLC with same column and detector
        for (const schedule of schedules) {
          if (schedule.tests.length === 0) {
            // Empty HPLC - check detector compatibility only
            const hasCompatibleDetector = schedule.availableDetectors.includes(
              test.detectorTypeId
            );

            if (!hasCompatibleDetector) continue;

            // Check mobile phase limit
            if (testMobilePhases.length > MAX_MOBILE_PHASES_AND_WASHES) {
              continue;
            }

            // Check runtime limit
            if (test.executionTime > MAX_RUNTIME) {
              continue;
            }

            // Assign to this HPLC
            schedule.tests.push(test);
            schedule.totalTime += test.executionTime;
            schedule.currentColumn = test.columnCode;
            schedule.currentDetector = test.detectorTypeId;
            testMobilePhases.forEach((mp) =>
              schedule.currentMobilePhases.add(mp)
            );
            assigned = true;
            console.log(
              `Assigned ${test.testName} to ${schedule.hplcName} (new assignment)`
            );
            break;
          } else {
            // HPLC has existing tests - must match column, detector, and mobile phases
            const columnMatches = schedule.currentColumn === test.columnCode;
            const detectorMatches =
              schedule.currentDetector === test.detectorTypeId;

            if (!columnMatches || !detectorMatches) continue;

            // Check runtime limit
            if (schedule.totalTime + test.executionTime > MAX_RUNTIME) {
              continue;
            }

            // Check mobile phase compatibility
            const combinedMobilePhases = new Set([
              ...schedule.currentMobilePhases,
              ...testMobilePhases,
            ]);

            if (combinedMobilePhases.size > MAX_MOBILE_PHASES_AND_WASHES) {
              continue; // Would exceed mobile phase + wash limit
            }

            // All checks passed - assign test
            schedule.tests.push(test);
            schedule.totalTime += test.executionTime;
            testMobilePhases.forEach((mp) =>
              schedule.currentMobilePhases.add(mp)
            );
            assigned = true;
            console.log(
              `Assigned ${test.testName} to ${schedule.hplcName} (existing assignment)`
            );
            break;
          }
        }

        // If not assigned, add to hold table with reason
        if (!assigned) {
          let reason = "";

          if (test.executionTime > MAX_RUNTIME) {
            reason = `Exceeds 72-hour limit (${(
              test.executionTime / 60
            ).toFixed(1)} hours)`;
          } else if (testMobilePhases.length > MAX_MOBILE_PHASES_AND_WASHES) {
            reason = `Requires ${testMobilePhases.length} mobile phases + washes (max ${MAX_MOBILE_PHASES_AND_WASHES})`;
          } else {
            const hasCompatibleHPLC = schedules.some((s) =>
              s.availableDetectors.includes(test.detectorTypeId)
            );

            if (!hasCompatibleHPLC) {
              reason = `No HPLC with compatible detector (${getDetectorName(
                test.detectorTypeId
              )})`;
            } else {
              reason = `No HPLC available matching: Column ${
                test.columnCode
              }, Detector ${getDetectorName(
                test.detectorTypeId
              )}, and mobile phase constraints`;
            }
          }

          unscheduled.push({
            ...test,
            groupReason: reason,
          });
          console.log(`Unscheduled: ${test.testName} - ${reason}`);
        }
      });

      // Step 5: Apply grouping optimization
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

      // Step 6: Filter out empty schedules for current display
      const nonEmptySchedules = schedules
        .filter((schedule) => schedule.tests.length > 0)
        .map(
          (schedule): HPLCSchedule => ({
            hplcId: schedule.hplcId,
            hplcName: schedule.hplcName,
            tests: schedule.tests,
            groups: schedule.groups,
            totalTime: schedule.totalTime,
          })
        );

      console.log(
        "Final schedules:",
        nonEmptySchedules.map((s) => `${s.hplcName}: ${s.tests.length} tests`)
      );
      console.log("Unscheduled tests (Hold Table):", unscheduled.length);

      // Create visual groups for display
      const visualGroups = new Map<string, Map<string, VisualGroup>>();
      nonEmptySchedules.forEach((schedule) => {
        const groups = createVisualGroups(schedule.tests, batches);
        visualGroups.set(schedule.hplcId, groups);
      });

      // Also create visual groups for Hold Table
      const holdTableGroups = createVisualGroups(unscheduled, batches);
      visualGroups.set("hold-table", holdTableGroups);

      setVisualGroupsMap(visualGroups);
      setHplcSchedules(nonEmptySchedules);
      setUnscheduledTests(unscheduled);

      // ✅ NEW: Create schedules for ALL HPLCs (including idle ones) for future planning
      const allSchedules: HPLCSchedule[] = availableHPLCs.map((hplc) => {
        const existingSchedule = nonEmptySchedules.find(
          (s) => s.hplcId === hplc._id
        );

        if (existingSchedule) {
          return existingSchedule; // HPLC has current tests
        } else {
          // Idle HPLC - create empty schedule
          return {
            hplcId: hplc._id,
            hplcName: hplc.hplcName,
            tests: [],
            groups: [],
            totalTime: 0, // Will start immediately
          };
        }
      });

      console.log(
        `Planning future sequences for ${allSchedules.length} HPLCs (${
          nonEmptySchedules.length
        } busy + ${allSchedules.length - nonEmptySchedules.length} idle)`
      );

      // Plan future sequences with ALL HPLCs
      const futurePlan = planFutureSequences(
        allSchedules, // ✅ Includes both busy and idle HPLCs
        [...unscheduled],
        currentTime,
        7
      );

      // Remove tests scheduled in future from hold table
      const scheduledTestIds = new Set<string>();
      Object.values(futurePlan).forEach((sequences) => {
        sequences.forEach((seq) => {
          seq.tests.forEach((test) => {
            scheduledTestIds.add(test.id);
          });
        });
      });

      const remainingUnscheduled = unscheduled.filter(
        (test) => !scheduledTestIds.has(test.id)
      );

      console.log("Future sequences planned:", futurePlan);
      console.log("Tests scheduled in future:", scheduledTestIds.size);
      console.log("Remaining in hold table:", remainingUnscheduled.length);

      // Update states
      setUnscheduledTests(remainingUnscheduled);
      setFutureSequences(futurePlan);
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

  const areTestsLinked = (
    test1: ScheduledTest,
    test2: ScheduledTest,
    batches: BatchItem[]
  ): boolean => {
    // Check if both tests belong to the same batch
    if (test1.batchId !== test2.batchId) return false;

    const batch = batches.find((b) => b._id === test1.batchId);
    if (!batch?.generics) return false;

    // Check if tests are in the same generic and have isLinked: true
    for (const generic of batch.generics) {
      for (const api of generic.apis || []) {
        const linkedTests = (api.testTypes || []).filter(
          (t: any) => t.isLinked === true
        );

        // If both tests are in the linked tests array, they should be grouped
        const test1InLinked = linkedTests.some(
          (t: any) =>
            t.testName === test1.testName && t.columnCode === test1.columnCode
        );
        const test2InLinked = linkedTests.some(
          (t: any) =>
            t.testName === test2.testName && t.columnCode === test2.columnCode
        );

        if (test1InLinked && test2InLinked) return true;
      }
    }

    return false;
  };

  const getMobilePhaseKey = (
    mobilePhaseCodes: string[],
    washTime?: number
  ): string => {
    const phases = mobilePhaseCodes
      .filter((code) => code.trim() !== "")
      .sort()
      .join("-");
    return `${phases}-W${washTime || 0}`;
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

    // Additional grouping for linked tests (even if other parameters differ slightly)
    const linkedGroups = new Map<string, ScheduledTest[]>();

    allTests.forEach((test1, i) => {
      allTests.forEach((test2, j) => {
        if (i >= j) return; // Avoid duplicate comparisons

        if (areTestsLinked(test1, test2, batchData)) {
          const linkKey = `linked-${Math.min(i, j)}-${Math.max(i, j)}`;

          if (!linkedGroups.has(linkKey)) {
            linkedGroups.set(linkKey, []);
          }

          // Add both tests if not already added
          const group = linkedGroups.get(linkKey)!;
          if (!group.some((t) => t.id === test1.id)) group.push(test1);
          if (!group.some((t) => t.id === test2.id)) group.push(test2);
        }
      });
    });

    // Process linked groups
    linkedGroups.forEach((linkedTests, linkKey) => {
      if (linkedTests.length > 1) {
        const groupId = `linked-group-${groups.length + 1}`;
        const groupAnalysis = calculateGroupedCounts(linkedTests);

        const group: GroupInfo = {
          id: groupId,
          detectorId: linkedTests[0].detectorTypeId,
          columnCode: linkedTests[0].columnCode,
          mobilePhaseKey: getMobilePhaseKey(
            linkedTests[0].mobilePhaseCodes,
            linkedTests[0].washTime
          ),
          reason: `Linked tests group (${linkedTests.length} tests explicitly linked)`,
          tests: linkedTests.map((test, index) => ({
            ...test,
            groupId,
            groupReason: `Linked test ${index + 1} of ${linkedTests.length}`,
            isGrouped: true,
          })),
          totalTime: groupAnalysis.totalTime,
          originalTotalTime: groupAnalysis.originalTime,
          timeSaved: groupAnalysis.timeSaved,
        };

        groups.push(group);
        group.tests.forEach((test) => {
          processedTests.push(test);
          usedTestIds.add(test.id);
        });
      }
    });

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
      const mobilePhaseKey = getMobilePhaseKey(
        test.mobilePhaseCodes,
        test.washTime
      );
      const testTypeId = test.originalTest?.testTypeId || "UNKNOWN";
      const key = `${test.columnCode}-${mobilePhaseKey}-${test.detectorTypeId}-${testTypeId}`;

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
            const activeInjections = calculateInjectionDisplayForGroup(
              index,
              columnTests.length,
              test
            );

            const isFirstTest = index === 0;
            let individualTimeSaved = 0;

            if (!isFirstTest && test.originalTest) {
              // Calculate what this test would have cost individually
              const fullBreakdown = computeOptimizedCounts(
                test.originalTest,
                6,
                {
                  isBlankActive: true,
                  isStandardActive: true,
                  isSampleActive: true,
                  isBracketingActive: true,
                }
              );

              // Calculate what it costs in the group
              const groupedBreakdown = computeOptimizedCounts(
                test.originalTest,
                6,
                {
                  isBlankActive: activeInjections.blank,
                  isStandardActive: activeInjections.standard,
                  isSampleActive: activeInjections.sample,
                  isBracketingActive: activeInjections.bracketing,
                }
              );

              individualTimeSaved =
                fullBreakdown.totalMinutes - groupedBreakdown.totalMinutes;
            }

            return {
              ...test,
              groupId,
              groupReason: isFirstTest
                ? `Lead test in group of ${columnTests.length} (full injections)`
                : `Grouped test (only samples + selective bracketing, saved ${individualTimeSaved.toFixed(
                    1
                  )} min)`,
              isGrouped: true,
              executionTime: isFirstTest
                ? test.originalExecutionTime
                : test.originalTest
                ? (() => {
                    const breakdown = computeOptimizedCounts(
                      test.originalTest,
                      6,
                      {
                        isBlankActive: activeInjections.blank,
                        isStandardActive: activeInjections.standard,
                        isSampleActive: activeInjections.sample,
                        isBracketingActive: activeInjections.bracketing,
                      }
                    );
                    return breakdown.totalMinutes;
                  })()
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

 const planFutureSequences = (
    currentSchedules: HPLCSchedule[],
    holdTableTests: ScheduledTest[],
    currentTime: Date,
    daysToSchedule: number = 7
  ): FutureSequencePlan => {
    const futurePlan: FutureSequencePlan = {};
    const instrumentLetters = ["a", "b", "c", "d"];
    const MAX_RUNTIME = 4320; // 72 hours in minutes
    const MAX_MOBILE_PHASES_AND_WASHES = 4;

    // Sort hold table by priority (Urgent > High > Normal > Low)
    let remainingTests = [...holdTableTests].sort((a, b) => {
      const priorityA = getPriorityValue(a.priority);
      const priorityB = getPriorityValue(b.priority);
      return priorityB - priorityA;
    });

    console.log(
      "Planning future sequences with",
      remainingTests.length,
      "tests from hold table"
    );

    // ✅ NEW: Round-robin approach - iterate through days and HPLCs together
    for (let day = 1; day <= daysToSchedule; day++) {
      console.log(`\n=== Planning Day ${day} ===`);
      
      // Calculate day boundaries
      const dayStartTime = new Date(currentTime);
      dayStartTime.setHours(0, 0, 0, 0);
      dayStartTime.setDate(dayStartTime.getDate() + (day - 1));

      const dayEndTime = new Date(dayStartTime);
      dayEndTime.setDate(dayEndTime.getDate() + 1);

      // ✅ For each HPLC, try to schedule tests for this day
      currentSchedules.forEach((schedule, index) => {
        const hplc = hplcMaster.find((h) => h._id === schedule.hplcId);
        const hplcDetectorIds = hplc?.detector?.map((d) => d._id) || [];

        // Initialize future plan for this HPLC if not exists
        if (!futurePlan[schedule.hplcId]) {
          futurePlan[schedule.hplcId] = [];
        }

        // Calculate when this HPLC will be free
        let hplcFreeTime = new Date(currentTime);
        
        if (day === 1) {
          // Day 1: Account for current schedule
          if (schedule.totalTime > 0) {
            hplcFreeTime = new Date(
              currentTime.getTime() + schedule.totalTime * 60000
            );
          }
        } else {
          // Day 2+: Check when previous day's sequence ends
          const previousDaySequences = futurePlan[schedule.hplcId].filter(
            (seq) => seq.day === day - 1
          );
          
          if (previousDaySequences.length > 0) {
            const lastSequence = previousDaySequences[previousDaySequences.length - 1];
            hplcFreeTime = new Date(lastSequence.endTime);
          } else {
            // If no sequence on previous day, start at day boundary
            hplcFreeTime = new Date(dayStartTime);
          }
        }

        // Skip if HPLC won't be free until after this day ends
        if (hplcFreeTime >= dayEndTime) {
          console.log(
            `${schedule.hplcName} won't be free until after Day ${day} - skipping`
          );
          return;
        }

        const effectiveStartTime = new Date(
          Math.max(hplcFreeTime.getTime(), dayStartTime.getTime())
        );

        const instrumentLetter = instrumentLetters[index] || "x";
        const sequenceName = `F-${day}-${instrumentLetter}`;

        console.log(
          `\n${sequenceName} (${schedule.hplcName}): Free at ${effectiveStartTime.toLocaleTimeString()}`
        );

        // ✅ Determine detector compatibility
        let compatibleDetectorIds: string[] = [];
        
        if (day === 1 && schedule.tests.length > 0) {
          // Busy HPLC on Day 1 - lock to current detector
          compatibleDetectorIds = [schedule.tests[0].detectorTypeId];
        } else {
          // Idle HPLC or Day 2+ - use all supported detectors
          compatibleDetectorIds = hplcDetectorIds;
        }

        console.log(
          `Compatible detectors: ${compatibleDetectorIds.map((d) => getDetectorName(d)).join(", ")}`
        );

        // ✅ Filter available tests that match detector compatibility
        const availableTests = remainingTests.filter((test) =>
          compatibleDetectorIds.includes(test.detectorTypeId)
        );

        console.log(`Available tests for ${sequenceName}: ${availableTests.length}`);

        if (availableTests.length === 0) {
          console.log(`No compatible tests for ${sequenceName}`);
          return;
        }

        // ✅ Build the sequence for this day
        const dayTests: ScheduledTest[] = [];
        let dayTotalTime = 0;
        const dayMobilePhases = new Set<string>();
        let currentColumn: string | null = null;
        let currentDetector: string | null = null;

        for (const test of availableTests) {
          const testMobilePhases = test.mobilePhaseCodes.filter(
            (code) => code.trim() !== ""
          );
          const combinedMobilePhases = new Set([
            ...dayMobilePhases,
            ...testMobilePhases,
          ]);

          // First test sets the column and detector
          if (dayTests.length === 0) {
            currentColumn = test.columnCode;
            currentDetector = test.detectorTypeId;
          }

          // Check if test matches current configuration
          const matchesConfig =
            dayTests.length === 0 ||
            (test.columnCode === currentColumn &&
              test.detectorTypeId === currentDetector);

          // Check if adding this test would exceed limits
          const wouldExceedTime =
            dayTotalTime + test.executionTime > MAX_RUNTIME;
          const wouldExceedMobilePhases =
            combinedMobilePhases.size > MAX_MOBILE_PHASES_AND_WASHES;

          if (matchesConfig && !wouldExceedTime && !wouldExceedMobilePhases) {
            dayTests.push(test);
            dayTotalTime += test.executionTime;
            testMobilePhases.forEach((mp) => dayMobilePhases.add(mp));

            // Remove test from remaining pool
            const testIndex = remainingTests.findIndex((t) => t.id === test.id);
            if (testIndex >= 0) {
              remainingTests.splice(testIndex, 1);
            }

            console.log(
              `  ✓ Added ${test.testName} (${test.priority}) - Total time: ${dayTotalTime}m`
            );
          }
        }

        // ✅ Apply grouping optimization
        let finalTests: ScheduledTest[] = dayTests.map((test, idx) => ({
          ...test,
          sortOrder: idx,
        }));

        let finalGroups: GroupInfo[] = [];

        if (dayTests.length > 1) {
          const groupingResult = groupTests(dayTests, []);
          finalTests = groupingResult.tests;
          finalGroups = groupingResult.groups;
          dayTotalTime = finalTests.reduce(
            (sum, test) => sum + test.executionTime,
            0
          );
        }

        // ✅ Create the sequence (even if empty, for tracking)
        const sequenceEndTime = new Date(
          effectiveStartTime.getTime() + dayTotalTime * 60000
        );

        const detectorName = currentDetector
          ? getDetectorName(currentDetector)
          : "NA";

        const columnName = currentColumn
          ? columnMaster[currentColumn] || currentColumn
          : "NA";

        const futureSequence: FutureSequence = {
          sequenceName,
          hplcId: schedule.hplcId,
          hplcName: schedule.hplcName,
          day,
          instrumentLetter,
          startTime: new Date(effectiveStartTime),
          endTime: sequenceEndTime,
          tests: finalTests,
          groups: finalGroups,
          totalTime: dayTotalTime,
          detector: detectorName,
          column: columnName,
          mobilePhaseCodes: Array.from(dayMobilePhases),
        };

        futurePlan[schedule.hplcId].push(futureSequence);

        console.log(
          `Created ${sequenceName}: ${finalTests.length} tests, ${dayTotalTime}m, ends ${sequenceEndTime.toLocaleTimeString()}`
        );
      });

      // ✅ Check if we've scheduled all tests
      if (remainingTests.length === 0) {
        console.log(`\n✅ All tests scheduled by Day ${day}`);
        break;
      } else {
        console.log(`\n${remainingTests.length} tests remaining for future days`);
      }
    }

    console.log("\n=== Future Planning Summary ===");
    Object.entries(futurePlan).forEach(([hplcId, sequences]) => {
      const schedule = currentSchedules.find((s) => s.hplcId === hplcId);
      const totalTests = sequences.reduce((sum, seq) => sum + seq.tests.length, 0);
      console.log(`${schedule?.hplcName}: ${sequences.length} sequences, ${totalTests} tests`);
    });

    return futurePlan;
  };

  // NEW: Create visual groups based on API, Mobile Phases, Detector, Column
  const createVisualGroups = (
    tests: ScheduledTest[],
    batchData: BatchItem[]
  ): Map<string, VisualGroup> => {
    const groupMap = new Map<string, VisualGroup>();
    const colorIndex = new Map<string, number>();
    let currentColorIndex = 0;

    tests.forEach((test) => {
      // Get API name
      let apiName = "NA";
      if (test.apiId) {
        apiName = apiMaster[test.apiId] || "Unknown API";
      } else {
        const batch = batchData.find((b) => b._id === test.batchId);
        if (batch?.generics && test.originalTest) {
          const testIndexInBatch = batch.tests.findIndex(
            (t) =>
              t.testName === test.originalTest?.testName &&
              t.columnCode === test.originalTest?.columnCode
          );
          const { apiId, apiLabel } = resolveApiForTest(
            batch,
            test.originalTest,
            apiMaster,
            testIndexInBatch >= 0 ? testIndexInBatch : undefined
          );
          if (apiId && apiMaster[apiId]) {
            apiName = apiMaster[apiId];
          } else {
            apiName = apiLabel || "NA";
          }
        }
      }

      // Create group key
      const mobilePhases = test.mobilePhaseCodes
        .slice(0, 4)
        .filter((code) => code.trim() !== "")
        .sort()
        .join(", ");

      const detector = getDetectorName(test.detectorTypeId);
      const column = columnMaster[test.columnCode] || test.columnCode;

      const groupKey = `${apiName}|${mobilePhases}|${detector}|${column}`;
      if (!groupMap.has(groupKey)) {
        // Assign color - ALWAYS use the next unique color for each unique group
        if (!colorIndex.has(groupKey)) {
          // Get the unique color for this group (don't cycle)
          colorIndex.set(groupKey, currentColorIndex);
          currentColorIndex = (currentColorIndex + 1) % COLOR_PALETTE.length;
        }

        const colorIdx = colorIndex.get(groupKey)!;

        groupMap.set(groupKey, {
          id: groupKey,
          apiName,
          mobilePhases,
          detector,
          column,
          color: COLOR_PALETTE[colorIdx], // Each unique group gets its own color
          tests: [],
        });
      }

      groupMap.get(groupKey)!.tests.push(test);
    });

    return groupMap;
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

  const handleFutureSequenceReorder = (
    sequenceName: string,
    newTests: ScheduledTest[]
  ) => {
    setFutureSequences((prev) => {
      const updated = { ...prev };

      // Find which HPLC this sequence belongs to
      for (const hplcId in updated) {
        const sequences = updated[hplcId];
        const seqIndex = sequences.findIndex(
          (s) => s.sequenceName === sequenceName
        );

        if (seqIndex >= 0) {
          // Update the tests with new order
          updated[hplcId][seqIndex] = {
            ...sequences[seqIndex],
            tests: newTests.map((test, idx) => ({ ...test, sortOrder: idx })),
            totalTime: newTests.reduce(
              (sum, test) => sum + test.executionTime,
              0
            ),
          };

          // Recalculate groups if needed
          if (newTests.length > 1) {
            const groupingResult = groupTests(newTests, []);
            updated[hplcId][seqIndex].tests = groupingResult.tests;
            updated[hplcId][seqIndex].groups = groupingResult.groups;
            updated[hplcId][seqIndex].totalTime = groupingResult.tests.reduce(
              (sum, test) => sum + test.executionTime,
              0
            );
          }

          break;
        }
      }

      return updated;
    });
  };

  // Enhanced Handle drag end - supports Hold Table → HPLC movement
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !activeTest) {
      setActiveTest(null);
      setDraggedOverHPLC(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if test is from Hold Table
    const isFromHoldTable = unscheduledTests.some(
      (test) => test.id === activeId
    );

    if (isFromHoldTable) {
      // Moving from Hold Table to HPLC
      const destinationScheduleIndex = hplcSchedules.findIndex(
        (schedule) =>
          schedule.hplcId === overId ||
          schedule.tests.some((test) => test.id === overId)
      );

      if (destinationScheduleIndex >= 0) {
        const updatedSchedules = [...hplcSchedules];
        const updatedHoldTable = [...unscheduledTests];

        // Remove from hold table
        const testIndex = updatedHoldTable.findIndex(
          (test) => test.id === activeId
        );
        const [movedTest] = updatedHoldTable.splice(testIndex, 1);

        // Find insertion point in destination HPLC
        const overTestIndex = updatedSchedules[
          destinationScheduleIndex
        ].tests.findIndex((test) => test.id === overId);

        if (overTestIndex >= 0) {
          // Inserting between tests
          updatedSchedules[destinationScheduleIndex].tests.splice(
            overTestIndex,
            0,
            movedTest
          );
        } else {
          // Dropping on HPLC container
          updatedSchedules[destinationScheduleIndex].tests.push(movedTest);
        }

        // Recalculate
        recalculateSchedules(updatedSchedules);
        setUnscheduledTests(updatedHoldTable);
      }
    } else {
      // Original logic for HPLC → HPLC movement (keep your existing code)
      const sourceScheduleIndex = hplcSchedules.findIndex((schedule) =>
        schedule.tests.some((test) => test.id === activeId)
      );

      const sourceTestIndex = hplcSchedules[
        sourceScheduleIndex
      ]?.tests.findIndex((test) => test.id === activeId);

      let destinationScheduleIndex = -1;
      let destinationTestIndex = -1;

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
        destinationScheduleIndex = hplcSchedules.findIndex(
          (schedule) => schedule.hplcId === overId
        );
        if (destinationScheduleIndex >= 0) {
          destinationTestIndex =
            hplcSchedules[destinationScheduleIndex].tests.length;
        }
      }

      if (sourceScheduleIndex >= 0 && destinationScheduleIndex >= 0) {
        const updatedSchedules = [...hplcSchedules];
        const [movedTest] = updatedSchedules[sourceScheduleIndex].tests.splice(
          sourceTestIndex,
          1
        );

        if (sourceScheduleIndex === destinationScheduleIndex) {
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
          updatedSchedules[destinationScheduleIndex].tests.splice(
            destinationTestIndex,
            0,
            movedTest
          );
        }

        recalculateSchedules(updatedSchedules);
      }
    }

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

  const FutureSequenceDraggableRow: React.FC<{
    test: ScheduledTest;
    index: number;
    visualGroup?: VisualGroup;
    groupInfo?: GroupInfo;
    testIndexInGroup: number;
    totalTestsInGroup: number;
    injectionDisplay: {
      blank: boolean;
      standard: boolean;
      sample: boolean;
      bracketing: boolean;
    };
    batchData: BatchItem[];
    apiMaster: { [key: string]: string };
    columnMaster: { [key: string]: string };
    getDetectorName: (value?: string) => string;
  }> = ({
    test,
    index,
    visualGroup,
    groupInfo,
    testIndexInGroup,
    totalTestsInGroup,
    injectionDisplay,
    batchData,
    apiMaster,
    columnMaster,
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

    let apiName = "NA";
    if (test.apiId) {
      apiName = apiMaster[test.apiId] || "Unknown API";
    } else if (batch?.generics && test.originalTest) {
      const testIndexInBatch = batch.tests.findIndex(
        (t) =>
          t.testName === test.originalTest?.testName &&
          t.columnCode === test.originalTest?.columnCode
      );
      const { apiId, apiLabel } = resolveApiForTest(
        batch,
        test.originalTest,
        apiMaster,
        testIndexInBatch >= 0 ? testIndexInBatch : undefined
      );
      if (apiId && apiMaster[apiId]) {
        apiName = apiMaster[apiId];
      } else {
        apiName = apiLabel || "NA";
      }
    }

    return (
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`
        ${visualGroup ? visualGroup.color.bg : "bg-white"}
        ${visualGroup ? visualGroup.color.border : ""}
        hover:opacity-80 transition-all
        ${isDragging ? "shadow-lg ring-2 ring-purple-400 opacity-70" : ""}
      `}
      >
        {/* Sr No. column with drag handle */}
        <td className="px-1 py-1 text-gray-700 border-r border-gray-200 w-16">
          <div className="flex items-center gap-1.5 relative">
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

            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium">{index + 1}</span>

              {/* Group badge below serial number */}
              {groupInfo && (
                <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-green-500 text-white shadow-sm whitespace-nowrap">
                  {testIndexInGroup + 1}/{totalTestsInGroup}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Product Name */}
        <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
          <div className="font-medium truncate w-20" title={test.productName}>
            {test.productName}
          </div>
        </td>

        {/* Product Code */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
          title={test.productCode}
        >
          {test.productCode}
        </td>

        {/* MFC Number */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
          title={batch?.mfcNumber}
        >
          {batch?.mfcNumber || "NA"}
        </td>

        {/* API Name */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
          title={apiName}
        >
          {apiName}
        </td>

        {/* Pharmacopoeial */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
          title={batch?.pharmacopoeialName}
        >
          {batch?.pharmacopoeialName || "NA"}
        </td>

        {/* Type of Sample */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
          title={batch?.typeOfSample}
        >
          {batch?.typeOfSample || "NA"}
        </td>

        {/* Column */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200"
          title={columnMaster[test.columnCode]}
        >
          {columnMaster[test.columnCode] || test.columnCode}
        </td>

        {/* Detector */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
          title={getDetectorName(test.detectorTypeId)}
        >
          {getDetectorName(test.detectorTypeId)}
        </td>

        {/* Mobile Phases */}
        <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
          {(() => {
            const mobilePhases = test.mobilePhaseCodes
              .slice(0, 4)
              .filter((code) => code !== "")
              .join(", ");
            return <span title={mobilePhases}>{mobilePhases || "NA"}</span>;
          })()}
        </td>

        {/* Washes */}
        <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-gray-200">
          {(() => {
            const washes = test.mobilePhaseCodes
              .slice(4)
              .filter((code) => code !== "")
              .join(", ");
            return <span title={washes}>{washes || "NA"}</span>;
          })()}
        </td>

        {/* Batch Number */}
        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-gray-200"
          title={test.batchNumber}
        >
          {test.batchNumber}
        </td>

        {/* Test Name with enhanced group indicator */}
        <td className="px-1 py-1 text-gray-700 border-r border-gray-200">
          <div className="flex items-center gap-1">
            <div className="font-medium truncate w-20" title={test.testName}>
              {test.testName}
            </div>
            {groupInfo && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-green-100 text-green-700 border border-green-300">
                  <svg
                    className="w-2 h-2 mr-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  {testIndexInGroup + 1}/{totalTestsInGroup}
                </span>
              </div>
            )}
          </div>
          {test.isGrouped && (
            <div
              className="text-[9px] text-green-600 truncate mt-0.5 flex items-center gap-0.5"
              title={test.groupReason}
            >
              <span>⚡</span>
              <span className="font-medium">
                {test.timeSaved
                  ? `Saved ${test.timeSaved.toFixed(0)}m`
                  : "Grouped"}
              </span>
            </div>
          )}
        </td>

        {/* Priority */}
        <td className="px-1 py-1 text-center border-r border-gray-200">
          <span
            className={`inline-block px-1 text-10px font-medium rounded ${
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

        {/* Blank Injection */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.blank
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.originalTest?.blankInjection || 0}
          </span>
        </td>

        {/* Standard Injection */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.standard
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.originalTest?.standardInjection || 0}
          </span>
        </td>

        {/* Sample Injection */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.sample
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.originalTest?.sampleInjection || 0}
          </span>
        </td>

        {/* Bracketing */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.bracketing
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.bracketingFrequency || 0}
          </span>
        </td>

        {/* Remaining injections */}
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.systemSuitability || 0}
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.sensitivity || 0}
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.placebo || 0}
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.reference1 || 0}
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.reference2 || 0}
        </td>

        {/* All runtime columns */}
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.runTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.blankRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.standardRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.sampleRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.systemSuitabilityRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.sensitivityRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.placeboRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.reference1RunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.originalTest?.reference2RunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-gray-200">
          {test.washTime || 0}m
        </td>

        {/* Time column */}
        <td className="px-1 py-1 text-center text-gray-700 border-r border-gray-200">
          <div className="text-10px">{test.executionTime.toFixed(0)}m</div>
          {test.isGrouped && test.timeSaved && (
            <div className="text-10px text-green-600">
              -{test.timeSaved.toFixed(0)}m
            </div>
          )}
        </td>
      </tr>
    );
  };

  const FutureSequenceCard: React.FC<{
    futureSequence: FutureSequence;
    visualGroups: Map<string, VisualGroup>;
    onReorder: (sequenceName: string, tests: ScheduledTest[]) => void;
  }> = ({ futureSequence, visualGroups, onReorder }) => {
    const formatDateTime = (date: Date): string => {
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getDate();
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const minutesStr = minutes < 10 ? "0" + minutes : minutes;
      return `${month} ${day}, ${hours}:${minutesStr} ${ampm}`;
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        setFutureDragActive(null);
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      const oldIndex = futureSequence.tests.findIndex((t) => t.id === activeId);
      const newIndex = futureSequence.tests.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTests = [...futureSequence.tests];
        const [movedTest] = newTests.splice(oldIndex, 1);
        newTests.splice(newIndex, 0, movedTest);

        onReorder(futureSequence.sequenceName, newTests);
      }

      setFutureDragActive(null);
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
        {/* Header - exactly like HPLC cards */}
        <div className="p-2 border-b border-gray-200 bg-purple-50">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-gray-800 text-xs font-medium">
                🔮 {futureSequence.sequenceName} - {futureSequence.hplcName}
              </div>
              <div className="text-xs text-gray-500">
                {futureSequence.tests.length} tests •{" "}
                {formatTime(futureSequence.totalTime)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">Column</div>
              <div
                className="text-[10px] text-gray-600 truncate max-w-[200px]"
                title={futureSequence.column}
              >
                {futureSequence.column}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-500">
              Detector:{" "}
              <span className="text-gray-800">{futureSequence.detector}</span>
            </div>
          </div>

          {/* Start and End Times */}
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between bg-purple-100 rounded px-2 py-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-600" />
                <span className="text-xs text-purple-700 font-medium">
                  Start: {formatDateTime(futureSequence.startTime)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-purple-700 font-medium">
                  End: {formatDateTime(futureSequence.endTime)}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 text-center mt-1">
              Scheduled to run after current sequence completes
            </div>
          </div>
        </div>

        {/* Tests Table with Drag & Drop - EXACT SAME as HPLC */}
        {futureSequence.tests.length > 0 ? (
          <div className="flex-1 overflow-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e) => {
                const test = futureSequence.tests.find(
                  (t) => t.id === e.active.id
                );
                setFutureDragActive(test || null);
              }}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={futureSequence.tests.map((test) => test.id)}
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
                        Column
                      </th>
                      <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                        Detector
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
                        Blank Inj
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        Std Inj
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        Sample Inj
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        Bracket Freq
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        SS
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
                        RT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        BRT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        StdRT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        SmpRT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        SSRT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        SnsRT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        PlcRT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        R1RT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        R2RT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        WT
                      </th>
                      <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {futureSequence.tests.map((test, index) => {
                      const batch = batchData.find(
                        (b) => b._id === test.batchId
                      );

                      // Get API name for this test
                      let apiName = "NA";
                      if (test.apiId) {
                        apiName = apiMaster[test.apiId] || "Unknown API";
                      } else if (batch?.generics && test.originalTest) {
                        const testIndexInBatch = batch.tests.findIndex(
                          (t) =>
                            t.testName === test.originalTest?.testName &&
                            t.columnCode === test.originalTest?.columnCode
                        );
                        const { apiId, apiLabel } = resolveApiForTest(
                          batch,
                          test.originalTest,
                          apiMaster,
                          testIndexInBatch >= 0 ? testIndexInBatch : undefined
                        );
                        if (apiId && apiMaster[apiId]) {
                          apiName = apiMaster[apiId];
                        } else {
                          apiName = apiLabel || "NA";
                        }
                      }

                      // Create the group key for this test
                      const mobilePhases = test.mobilePhaseCodes
                        .slice(0, 4)
                        .filter((code) => code.trim() !== "")
                        .sort()
                        .join(", ");
                      const detector = getDetectorName(test.detectorTypeId);
                      const column =
                        columnMaster[test.columnCode] || test.columnCode;
                      const groupKey = `${apiName}|${mobilePhases}|${detector}|${column}`;

                      // Get the visual group for color coding
                      const visualGroup = visualGroups.get(groupKey);

                      // Find group info for grouping badges
                      const groupInfo = futureSequence.groups.find((g) =>
                        g.tests.some((t) => t.id === test.id)
                      );

                      let testIndexInGroup = 0;
                      let totalTestsInGroup = 1;

                      if (groupInfo) {
                        testIndexInGroup = groupInfo.tests.findIndex(
                          (t) => t.id === test.id
                        );
                        totalTestsInGroup = groupInfo.tests.length;
                      }

                      const injectionDisplay =
                        calculateInjectionDisplayForGroup(
                          testIndexInGroup,
                          totalTestsInGroup,
                          test
                        );

                      // Create a temporary visualGroupsMap for this specific sequence
                      const tempVisualGroupsMap = new Map<
                        string,
                        Map<string, VisualGroup>
                      >();
                      tempVisualGroupsMap.set(
                        futureSequence.sequenceName,
                        visualGroups
                      );

                      return (
                        <FutureSequenceDraggableRow
                          key={test.id}
                          test={test}
                          index={index}
                          visualGroup={visualGroup}
                          groupInfo={groupInfo}
                          testIndexInGroup={testIndexInGroup}
                          totalTestsInGroup={totalTestsInGroup}
                          injectionDisplay={injectionDisplay}
                          batchData={batchData}
                          apiMaster={apiMaster}
                          columnMaster={columnMaster}
                          getDetectorName={getDetectorName}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </SortableContext>

              <DragOverlay>
                {futureDragActive ? (
                  <div className="bg-white shadow-lg rounded p-2 border-2 border-purple-400">
                    <div className="text-xs font-medium">
                      {futureDragActive.testName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {futureDragActive.productName}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 text-xs">
            No tests scheduled for this sequence
          </div>
        )}

        {/* Groups Summary - same as HPLC */}
        {futureSequence.groups.length > 0 && (
          <div className="border-t border-gray-200 bg-green-50 p-2">
            <div className="text-[10px] text-green-600">
              {futureSequence.groups.length} optimization group(s) • Total
              saved:{" "}
              {futureSequence.groups
                .reduce((sum, g) => sum + g.timeSaved, 0)
                .toFixed(1)}
              m
            </div>
          </div>
        )}
      </div>
    );
  };

  // NEW: Draggable Test Row for Hold Table
  const DraggableHoldTestRow: React.FC<{
    test: ScheduledTest;
    index: number;
    batchData: BatchItem[];
    apiMaster: { [key: string]: string };
    columnMaster: { [key: string]: string };
    setSelectedTestForCalculation: (test: ScheduledTest) => void;
    getDetectorName: (value?: string) => string;
    visualGroupsMap: Map<string, Map<string, VisualGroup>>;
  }> = ({
    test,
    index,
    batchData,
    apiMaster,
    columnMaster,
    setSelectedTestForCalculation,
    getDetectorName,
    visualGroupsMap,
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

    let apiName = "NA";
    if (test.apiId) {
      apiName = apiMaster[test.apiId] || "Unknown API";
    } else if (batch?.generics && test.originalTest) {
      const testIndexInBatch = batch.tests.findIndex(
        (t) =>
          t.testName === test.originalTest?.testName &&
          t.columnCode === test.originalTest?.columnCode
      );
      const { apiId, apiLabel } = resolveApiForTest(
        batch,
        test.originalTest,
        apiMaster,
        testIndexInBatch >= 0 ? testIndexInBatch : undefined
      );
      if (apiId && apiMaster[apiId]) {
        apiName = apiMaster[apiId];
      } else {
        apiName = apiLabel || "NA";
      }
    }

    // Find the group this test belongs to
    const groupKey = (() => {
      const mobilePhases = test.mobilePhaseCodes
        .slice(0, 4)
        .filter((code) => code.trim() !== "")
        .sort()
        .join(", ");

      const detector = getDetectorName(test.detectorTypeId);
      const column = columnMaster[test.columnCode] || test.columnCode;

      return `${apiName}|${mobilePhases}|${detector}|${column}`;
    })();

    const visualGroup = visualGroupsMap.get("hold-table")?.get(groupKey);

    // Calculate which injections are active for this test
    // Find the group this test belongs to
    const groupInfo = hplcSchedules
      .flatMap((s) => s.groups)
      .find((g) => g.tests.some((t) => t.id === test.id));

    // If test is grouped, find its position within the group
    let testIndexInGroup = 0;
    let totalTestsInGroup = 1;

    if (groupInfo) {
      const groupTests = groupInfo.tests;
      testIndexInGroup = groupTests.findIndex((t) => t.id === test.id);
      totalTestsInGroup = groupTests.length;
    } else {
      // Ungrouped tests - calculate per HPLC
      const schedule = hplcSchedules.find((s) =>
        s.tests.some((t) => t.id === test.id)
      );
      if (schedule) {
        testIndexInGroup = schedule.tests.findIndex((t) => t.id === test.id);
        totalTestsInGroup = schedule.tests.length;
      }
    }

    // Use per-group calculation
    const injectionDisplay = calculateInjectionDisplayForGroup(
      testIndexInGroup,
      totalTestsInGroup,
      test
    );

    return (
      <tr
        ref={setNodeRef}
        style={style}
        {...attributes}
        className={`
        ${visualGroup ? visualGroup.color.bg : "bg-yellow-50"}
        ${visualGroup ? visualGroup.color.border : ""}
        hover:opacity-80 transition-all
        ${isDragging ? "shadow-lg ring-2 ring-yellow-400 opacity-70" : ""}
      `}
      >
        {/* Sr No. column with drag handle */}
        <td className="px-1 py-1 text-gray-700 border-r border-yellow-200 w-12">
          <div className="flex items-center gap-1">
            <div
              {...listeners}
              className="cursor-grab hover:cursor-grabbing p-1 hover:bg-yellow-200 rounded transition-colors"
              title="Drag to move to HPLC"
            >
              <div className="flex flex-col items-center">
                <div className="w-1 h-1 bg-yellow-600 rounded-full mb-0.5"></div>
                <div className="w-1 h-1 bg-yellow-600 rounded-full mb-0.5"></div>
                <div className="w-1 h-1 bg-yellow-600 rounded-full"></div>
              </div>
            </div>
            <span className="text-xs">{index + 1}</span>
          </div>
        </td>

        {/* All other columns - same as before */}
        <td className="px-1 py-1 text-gray-700 border-r border-yellow-200">
          <div className="font-medium truncate w-20" title={test.productName}>
            {test.productName}
          </div>
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-yellow-200"
          title={test.productCode}
        >
          {test.productCode}
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-20 border-r border-yellow-200"
          title={batch?.mfcNumber}
        >
          {batch?.mfcNumber || "NA"}
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-20 border-r border-yellow-200"
          title={apiName}
        >
          {apiName}
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-yellow-200"
          title={batch?.pharmacopoeialName}
        >
          {batch?.pharmacopoeialName || "NA"}
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-yellow-200"
          title={batch?.typeOfSample}
        >
          {batch?.typeOfSample || "NA"}
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-20 border-r border-yellow-200"
          title={columnMaster[test.columnCode]}
        >
          {columnMaster[test.columnCode] || test.columnCode}
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-yellow-200"
          title={getDetectorName(test.detectorTypeId)}
        >
          {getDetectorName(test.detectorTypeId)}
        </td>

        <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-yellow-200">
          {(() => {
            const mobilePhases = test.mobilePhaseCodes
              .slice(0, 4)
              .filter((code) => code !== "")
              .join(", ");
            return <span title={mobilePhases}>{mobilePhases || "NA"}</span>;
          })()}
        </td>

        <td className="px-1 py-1 text-gray-700 truncate w-20 border-r border-yellow-200">
          {(() => {
            const washes = test.mobilePhaseCodes
              .slice(4)
              .filter((code) => code !== "")
              .join(", ");
            return <span title={washes}>{washes || "NA"}</span>;
          })()}
        </td>

        <td
          className="px-1 py-1 text-gray-700 truncate w-16 border-r border-yellow-200"
          title={test.batchNumber}
        >
          {test.batchNumber}
        </td>

        <td className="px-1 py-1 text-gray-700 border-r border-yellow-200">
          <div className="font-medium truncate w-20" title={test.testName}>
            {test.testName}
          </div>
        </td>

        <td className="px-1 py-1 text-center border-r border-yellow-200">
          <span
            className={`inline-block px-1 text-10px font-medium rounded ${
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

        {/* Blank Injection */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.blank
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.originalTest?.blankInjection || 0}
          </span>
        </td>

        {/* Standard Injection */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.standard
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.originalTest?.standardInjection || 0}
          </span>
        </td>

        {/* Sample Injection */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.sample
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.originalTest?.sampleInjection || 0}
          </span>
        </td>

        {/* Bracketing */}
        <td className="px-1 py-1 text-center text-10px border-r border-gray-200">
          <span
            className={
              injectionDisplay.bracketing
                ? "text-green-600 font-semibold"
                : "text-gray-400"
            }
          >
            {test.bracketingFrequency || 0}
          </span>
        </td>

        {/* Remaining injections moved after */}
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.systemSuitability || 0}
        </td>

        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.sensitivity || 0}
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.placebo || 0}
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.reference1 || 0}
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.reference2 || 0}
        </td>

        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.runTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.blankRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.standardRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.sampleRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.systemSuitabilityRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.sensitivityRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.placeboRunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.reference1RunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.originalTest?.reference2RunTime || 0}m
        </td>
        <td className="px-1 py-1 text-center text-gray-700 text-10px border-r border-yellow-200">
          {test.washTime || 0}m
        </td>

        <td className="px-1 py-1 text-center text-gray-700 border-r border-yellow-200">
          <div className="text-10px">{test.executionTime.toFixed(0)}m</div>
        </td>

        {/* Hold Reason column */}
        <td className="px-1 py-1 text-yellow-700 border-r border-yellow-200">
          <div
            className="text-10px truncate max-w-[150px]"
            title={test.groupReason}
          >
            {test.groupReason || "Unknown reason"}
          </div>
        </td>
      </tr>
    );
  };

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
                    {schedule.tests.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between bg-blue-50 rounded px-2 py-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-700 font-medium">
                              Start: {formatCurrentTime(currentTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-blue-700 font-medium">
                              End:{" "}
                              {calculateEndTime(
                                currentTime,
                                schedule.totalTime
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500 text-center mt-1">
                          Estimated completion time if started now
                        </div>
                      </div>
                    )}
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
                                Column
                              </th>
                              <th className="px-1 py-1 text-left text-gray-600 font-medium border-r border-gray-200">
                                Detector
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

                              {/* REORDERED INJECTION COLUMNS: Blank → Standard → Sample → Bracketing */}
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Blank Inj
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Std Inj
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Sample Inj
                              </th>
                              <th className="px-1 py-1 text-center text-gray-600 font-medium border-r border-gray-200">
                                Bracket Freq
                              </th>

                              {/* REMAINING INJECTION TYPES */}
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

                              {/* RUNTIME COLUMNS */}
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
                                hplcSchedules={hplcSchedules}
                                visualGroupsMap={visualGroupsMap}
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
                      </div>
                      {/* NEW: Show time saved in hours/days if significant */}
                      {(() => {
                        const totalSaved = schedule.groups.reduce(
                          (sum, group) => sum + group.timeSaved,
                          0
                        );
                        if (totalSaved >= 60) {
                          const hours = Math.floor(totalSaved / 60);
                          const mins = Math.round(totalSaved % 60);
                          return (
                            <div className="text-[10px] text-green-700 font-medium mt-1">
                              ⏰ Time saved: {hours}h {mins}m
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Future Sequences Section */}
            {Object.keys(futureSequences).length > 0 && (
              <div className="mt-6">
                {/* Header with Minimize Button */}
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg shadow-md p-3 mb-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-indigo-800 text-base font-bold">
                        Future Sequence Planning (7-Day Forecast)
                      </h2>
                      <p className="text-indigo-500 text-xs mt-1">
                        Automated scheduling for the next week across all HPLCs
                        {!isFutureSequencesMinimized &&
                          " • Drag to reorder tests"}
                      </p>
                    </div>

                    {/* Minimize/Expand Button */}
                    <button
                      onClick={() =>
                        setIsFutureSequencesMinimized(
                          !isFutureSequencesMinimized
                        )
                      }
                      className="bg-white/60 hover:bg-white/80 text-indigo-700 rounded-lg px-3 py-2 flex items-center gap-2 transition-all border border-indigo-200"
                      title={
                        isFutureSequencesMinimized
                          ? "Expand future sequences"
                          : "Minimize future sequences"
                      }
                    >
                      {isFutureSequencesMinimized ? (
                        <>
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
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                          <span className="text-xs font-medium">Expand</span>
                        </>
                      ) : (
                        <>
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
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                          <span className="text-xs font-medium">Minimize</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary Stats - Always visible */}
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="bg-white/60 rounded px-3 py-1 border border-purple-100">
                      <div className="text-indigo-600 text-xs">
                        Planning Horizon
                      </div>
                      <div className="text-indigo-900 text-sm font-bold">
                        7 Days
                      </div>
                    </div>
                    <div className="bg-white/60 rounded px-3 py-1 border border-purple-100">
                      <div className="text-indigo-600 text-xs">
                        Total Sequences
                      </div>
                      <div className="text-indigo-900 text-sm font-bold">
                        {
                          Object.values(futureSequences).flatMap(
                            (sequences) => sequences
                          ).length
                        }
                      </div>
                    </div>
                    <div className="bg-white/60 rounded px-3 py-1 border border-purple-100">
                      <div className="text-indigo-600 text-xs">
                        Tests Scheduled
                      </div>
                      <div className="text-indigo-900 text-sm font-bold">
                        {Object.values(futureSequences)
                          .flatMap((seqs) => seqs)
                          .reduce((sum, seq) => sum + seq.tests.length, 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expandable Content */}
                {!isFutureSequencesMinimized && (
                  <>
                    {/* Display Future Sequences in same grid layout as HPLCs */}
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const daySequences = Object.values(futureSequences)
                        .flatMap((sequences) => sequences)
                        .filter((seq) => seq.day === day);

                      if (daySequences.length === 0) return null;

                      return (
                        <div key={day} className="mb-6">
                          <div className="bg-indigo-100 border-l-4 border-indigo-600 rounded px-3 py-2 mb-3">
                            <h3 className="text-indigo-800 text-sm font-bold">
                              Day {day} -{" "}
                              {daySequences[0]?.startTime.toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </h3>
                            <p className="text-indigo-600 text-xs mt-1">
                              {daySequences.length} HPLC sequences planned •
                              Total runtime:{" "}
                              {formatTime(
                                daySequences.reduce(
                                  (sum, seq) => sum + seq.totalTime,
                                  0
                                )
                              )}
                            </p>
                          </div>

                          {/* Same 2-column grid as HPLC schedules */}
                          <div className="grid grid-cols-2 gap-3">
                            {daySequences.map((sequence) => {
                              // Create visual groups for THIS specific sequence
                              const sequenceVisualGroups = new Map<
                                string,
                                VisualGroup
                              >();
                              const colorIndex = new Map<string, number>();
                              let currentColorIndex = 0;

                              sequence.tests.forEach((test) => {
                                // Get API name
                                let apiName = "NA";
                                if (test.apiId) {
                                  apiName =
                                    apiMaster[test.apiId] || "Unknown API";
                                } else {
                                  const batch = batchData.find(
                                    (b) => b._id === test.batchId
                                  );
                                  if (batch?.generics && test.originalTest) {
                                    const testIndexInBatch =
                                      batch.tests.findIndex(
                                        (t) =>
                                          t.testName ===
                                            test.originalTest?.testName &&
                                          t.columnCode ===
                                            test.originalTest?.columnCode
                                      );
                                    const { apiId, apiLabel } =
                                      resolveApiForTest(
                                        batch,
                                        test.originalTest,
                                        apiMaster,
                                        testIndexInBatch >= 0
                                          ? testIndexInBatch
                                          : undefined
                                      );
                                    if (apiId && apiMaster[apiId]) {
                                      apiName = apiMaster[apiId];
                                    } else {
                                      apiName = apiLabel ?? "NA";
                                    }
                                  }
                                }

                                const mobilePhases = test.mobilePhaseCodes
                                  .slice(0, 4)
                                  .filter((code) => code.trim() !== "")
                                  .sort()
                                  .join(",");
                                const detector = getDetectorName(
                                  test.detectorTypeId
                                );
                                const column =
                                  columnMaster[test.columnCode] ||
                                  test.columnCode;
                                const groupKey = `${apiName}|${mobilePhases}|${detector}|${column}`;

                                if (!sequenceVisualGroups.has(groupKey)) {
                                  if (!colorIndex.has(groupKey)) {
                                    colorIndex.set(groupKey, currentColorIndex);
                                    currentColorIndex =
                                      (currentColorIndex + 1) %
                                      COLOR_PALETTE.length;
                                  }
                                  const colorIdx = colorIndex.get(groupKey)!;
                                  sequenceVisualGroups.set(groupKey, {
                                    id: groupKey,
                                    apiName,
                                    mobilePhases,
                                    detector,
                                    column,
                                    color: COLOR_PALETTE[colorIdx],
                                    tests: [],
                                  });
                                }
                                sequenceVisualGroups
                                  .get(groupKey)!
                                  .tests.push(test);
                              });

                              return (
                                <FutureSequenceCard
                                  key={sequence.sequenceName}
                                  futureSequence={sequence}
                                  visualGroups={sequenceVisualGroups}
                                  onReorder={handleFutureSequenceReorder}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Hold Table - After the HPLC grid */}
            {unscheduledTests.length > 0 && (
              <div className="mt-4 bg-white border-2 border-yellow-400 rounded-lg shadow-sm flex flex-col">
                {/* Hold Table Header */}
                <div className="p-2 border-b border-yellow-200 bg-yellow-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-800 text-xs font-medium">
                        🕐 Hold Table - Tests Awaiting Resources
                      </div>
                      <div className="text-xs text-yellow-700">
                        {unscheduledTests.length} tests • Total Time:{" "}
                        {formatTime(
                          unscheduledTests.reduce(
                            (sum, test) => sum + test.executionTime,
                            0
                          )
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                      These tests will be auto-scheduled when resources become
                      available
                    </div>
                  </div>
                </div>

                {/* Hold Table Tests */}
                <div className="flex-1 overflow-auto">
                  <SortableContext
                    items={unscheduledTests.map((test) => test.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-yellow-50">
                        <tr>
                          {/* Same exact headers as HPLC tables */}
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200 w-12">
                            Sr No.
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Product Name
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Product Code
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            MFC Number
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            API Name
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Pharmacopoeial
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Type of Sample
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Column
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Detector
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Mobile Phases
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Washes
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Batch
                          </th>
                          <th className="px-1 py-1 text-left text-yellow-800 font-medium border-r border-yellow-200">
                            Test
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Pri
                          </th>

                          {/* REORDERED INJECTION COLUMNS: Blank → Standard → Sample → Bracketing */}
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Blank Inj
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Std Inj
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Sample Inj
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Bracket Freq
                          </th>

                          {/* REMAINING INJECTION TYPES */}
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Sys Suit
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Sens
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Placebo
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Ref1
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Ref2
                          </th>

                          {/* RUNTIME COLUMNS */}
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Run Time
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Blank RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Std RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Sample RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Sys Suit RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Sens RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Placebo RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Ref1 RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Ref2 RT
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Wash Time
                          </th>
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Time
                          </th>

                          {/* HOLD TABLE SPECIFIC COLUMNS */}
                          <th className="px-1 py-1 text-center text-yellow-800 font-medium border-r border-yellow-200">
                            Hold Reason
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-yellow-200">
                        {unscheduledTests.map((test, index) => (
                          <DraggableHoldTestRow
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
                            visualGroupsMap={visualGroupsMap}
                          />
                        ))}
                      </tbody>
                    </table>
                  </SortableContext>
                </div>

                {/* Hold Table Footer */}
                <div className="border-t border-yellow-200 bg-yellow-50 p-2">
                  <div className="text-10px text-yellow-700">
                    💡 Tip: These tests will automatically move to HPLCs when: •
                    Compatible detector becomes available • Matching column is
                    freed up • Mobile phase capacity allows • 72-hour runtime
                    limit is satisfied
                  </div>
                </div>
              </div>
            )}

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
      </div>
    </div>
  );
}
