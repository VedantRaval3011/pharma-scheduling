"use client";

import React, { forwardRef, useEffect, useState } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  Control,
  UseFormReturn,
  Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMasterDataContext } from "@/context/MasterDataContext";
import MobilePhaseDropdown from "./MobilePhaseDropdown";
import ColumnPopup from "./ColumnPopUp";

// Validation schemas
const testTypeSchema = z.object({
  testTypeId: z.string().min(1, "Test Type is required"),
  selectMakeSpecific: z.boolean(),
  isOutsourcedTest: z.boolean(), // Add this line
  columnCode: z.string().min(1, "Column is required"),
  mobilePhaseCodes: z
    .array(z.string())
    .length(6, "Must have exactly 6 mobile phase slots")
    .refine(
      (codes) => codes[0] && codes[0].trim() !== "",
      "MP01 (first mobile phase) is required"
    ),
  mobilePhaseRatios: z
    .array(z.number().min(0))
    .min(1, "At least one mobile phase ratio is required")
    .max(6, "Cannot have more than 6 mobile phase ratios")
    .transform((ratios) => {
      // Pad with zeros to ensure exactly 6 elements
      const normalized = [0, 0, 0, 0, 0, 0];
      ratios.forEach((ratio, index) => {
        if (index < 6) {
          normalized[index] = ratio;
        }
      });
      return normalized;
    })
    .default([0, 0, 0, 0, 0, 0])
    .optional(),

  flowRates: z
    .array(z.number().min(0))
    .length(2, "Must have exactly 2 flow rates for Wash1 and Wash2")
    .default([0, 0])
    .optional(),

  systemFlowRate: z
    .number()
    .min(0, "System flow rate must be non-negative")
    .default(0)
    .optional(),

  washFlowRate: z
    .number()
    .min(0, "Wash flow rate must be non-negative")
    .default(0)
    .optional(),
  detectorTypeId: z.string().min(1, "Detector Type is required"),
  pharmacopoeialId: z
    .array(z.string().min(1))
    .refine(
      (arr) => arr.length === 0 || arr.every((id) => id.trim().length > 0),
      {
        message: "All pharmacopoeial IDs must be valid",
      }
    ),
  sampleInjection: z.number().min(0, "Sample Injection must be >= 0"),
  standardInjection: z.number().min(0, "Standard Injection must be >= 0"),
  blankInjection: z.number().min(0, "Blank Injection must be >= 0"),
  systemSuitability: z.number().min(0, "System Suitability must be >= 0"),
  sensitivity: z.number().min(0, "Sensitivity must be >= 0"),
  placebo: z.number().min(0, "Placebo must be >= 0"),
  reference1: z.number().min(0, "Reference1 must be >= 0"),
  reference2: z.number().min(0, "Reference2 must be >= 0"),
  uniqueRuntimes: z.boolean(),
  blankRunTime: z.number().min(0, "Blank Run Time must be >= 0").optional(),
  standardRunTime: z
    .number()
    .min(0, "Standard Run Time must be >= 0")
    .optional(),
  sampleRunTime: z.number().min(0, "Sample Run Time must be >= 0").optional(),
  // Add the new runtime fields
  systemSuitabilityRunTime: z
    .number()
    .min(0, "System Suitability Run Time must be >= 0")
    .optional(),
  sensitivityRunTime: z
    .number()
    .min(0, "Sensitivity Run Time must be >= 0")
    .optional(),
  placeboRunTime: z.number().min(0, "Placebo Run Time must be >= 0").optional(),
  reference1RunTime: z
    .number()
    .min(0, "Reference1 Run Time must be >= 0")
    .optional(),
  reference2RunTime: z
    .number()
    .min(0, "Reference2 Run Time must be >= 0")
    .optional(),
  // ... rest of your existing fields
  bracketingFrequency: z.number().min(0, "Bracketing Frequency must be >= 0"),
  injectionTime: z.number().min(0, "Injection Time must be >= 0"),
  runTime: z.number().min(0, "Run Time must be >= 0"),
  washTime: z.number().min(0, "Wash Time must be >= 0"),
  numberOfInjectionsAMV: z
    .number()
    .min(0, "AMV Injections must be >= 0")
    .optional(),
  numberOfInjectionsPV: z
    .number()
    .min(0, "PV Injections must be >= 0")
    .optional(),
  numberOfInjectionsCV: z
    .number()
    .min(0, "CV Injections must be >= 0")
    .optional(),
  numberOfInjections: z
    .number()
    .min(0, "Number of Injections must be >= 0")
    .optional(),
  bulk: z.boolean(),
  fp: z.boolean(),
  stabilityPartial: z.boolean(),
  stabilityFinal: z.boolean(),
  amv: z.boolean(),
  pv: z.boolean(),
  cv: z.boolean(),
  isLinked: z.boolean(),
});

const apiSchema = z.object({
  apiName: z.string().min(1, "API selection is required"),
  testTypes: z
    .array(testTypeSchema)
    .min(1, "At least one test type is required"),
});

const mfcFormSchema = z
  .object({
    mfcNumber: z.string().min(1, "MFC Number is required"),
    genericName: z.string().min(1, "Generic Name is required"),
    apis: z.array(apiSchema).min(1, "At least one API is required"),
    departmentId: z.string().min(1, "Department is required"),
    wash: z.number().min(0, "Wash must be >= 0"),
    productIds: z
      .array(
        z.object({
          id: z.string(),
          productCode: z.string().optional(),
          productName: z.string().optional(),
        })
      )
      .min(0, "Product Code is optional"),
    isLinked: z.boolean(),
    isObsolete: z.boolean().default(false),
    isRawMaterial: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    data.apis.forEach((api, apiIndex) => {
      api.testTypes.forEach((testType, testTypeIndex) => {
        if (
          testType.amv &&
          (!testType.numberOfInjectionsAMV ||
            testType.numberOfInjectionsAMV < 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              `apis.${apiIndex}.testTypes.${testTypeIndex}.numberOfInjectionsAMV`,
            ],
            message:
              "Number of AMV Injections is required when AMV is selected",
          });
        }
        if (
          testType.pv &&
          (!testType.numberOfInjectionsPV || testType.numberOfInjectionsPV < 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              `apis.${apiIndex}.testTypes.${testTypeIndex}.numberOfInjectionsPV`,
            ],
            message: "Number of PV Injections is required when PV is selected",
          });
        }
        if (
          testType.cv &&
          (!testType.numberOfInjectionsCV || testType.numberOfInjectionsCV < 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              `apis.${apiIndex}.testTypes.${testTypeIndex}.numberOfInjectionsCV`,
            ],
            message: "Number of CV Injections is required when CV is selected",
          });
        }
      });
    });
  });

type TestTypeData = z.infer<typeof testTypeSchema>;
type ApiData = z.infer<typeof apiSchema>;
type MFCFormData = z.infer<typeof mfcFormSchema>;

interface LinkingSuggestion {
  apiIndex: number;
  testTypeIndex: number;
  matchingTestTypes: Array<{
    apiIndex: number;
    testTypeIndex: number;
    apiName: string;
  }>;
  allIdenticalTestTypes?: Array<{
    apiIndex: number;
    testTypeIndex: number;
    apiName: string;
  }>;
  message: string;
}

interface ApiPopupProps {
  apiData: ApiData;
  onSave: (data: ApiData) => void;
  onClose: () => void;
  title: string;
  allApis?: ApiData[];
  currentApiIndex?: number;
  onLinkTestTypes?: (
    apiIndex: number,
    testTypeIndex: number,
    matchingTestTypes: Array<{ apiIndex: number; testTypeIndex: number }>
  ) => void;
}

interface MFCMasterFormProps {
  onSubmit: (data: MFCFormData) => void;
  initialData?: any;
  onCancel: () => void;
}

interface Product {
  _id: string;
  productCode: string;
  productName: string;
}

const getStorageIds = () => {
  if (typeof window === "undefined")
    return { companyId: null, locationId: null };
  const companyId = localStorage.getItem("companyId");
  const locationId = localStorage.getItem("locationId");
  return { companyId, locationId };
};

// Helper function to ensure mobile phase codes are always exactly 6 elements
const normalizeMobilePhaseCodes = (codes: any): string[] => {
  const normalized = ["", "", "", "", "", ""];

  if (Array.isArray(codes)) {
    codes.forEach((code, index) => {
      if (index < 6) {
        normalized[index] = code || "";
      }
    });
  }

  return normalized;
};

// Helper function to check if two test types are identical (excluding isLinked)
const areTestTypesIdentical = (
  testType1: TestTypeData,
  testType2: TestTypeData
): boolean => {
  const fieldsToCompare = [
    "testTypeId",
    "selectMakeSpecific",
    "isOutsourcedTest", // Add this
    "columnCode",
    "mobilePhaseCodes",
    "detectorTypeId",
    "pharmacopoeialId",
    "sampleInjection",
    "standardInjection",
    "blankInjection",
    "bracketingFrequency",
    "injectionTime",
    "systemSuitability",
    "sensitivity",
    "placebo",
    "reference1",
    "reference2",
    "uniqueRuntimes",
    "blankRunTime",
    "standardRunTime",
    "sampleRunTime",
    "systemSuitabilityRunTime", // Add this
    "sensitivityRunTime", // Add this
    "placeboRunTime", // Add this
    "reference1RunTime", // Add this
    "reference2RunTime", // Add this
    "runTime",
    "washTime",
    "numberOfInjections",
    "bulk",
    "fp",
    "stabilityPartial",
    "stabilityFinal",
    "amv",
    "pv",
    "cv",
  ];

  for (const field of fieldsToCompare) {
    if (field === "mobilePhaseCodes") {
      const codes1 = normalizeMobilePhaseCodes(testType1.mobilePhaseCodes);
      const codes2 = normalizeMobilePhaseCodes(testType2.mobilePhaseCodes);
      for (let i = 0; i < 6; i++) {
        if (codes1[i] !== codes2[i]) return false;
      }
    } else if (field === "pharmacopoeialId") {
      const arr1 = testType1.pharmacopoeialId || [];
      const arr2 = testType2.pharmacopoeialId || [];
      if (arr1.length !== arr2.length) return false;
      const sortedArr1 = [...arr1].sort();
      const sortedArr2 = [...arr2].sort();
      for (let i = 0; i < sortedArr1.length; i++) {
        if (sortedArr1[i] !== sortedArr2[i]) return false;
      }
    } else {
      const val1 = testType1[field as keyof TestTypeData];
      const val2 = testType2[field as keyof TestTypeData];
      if (typeof val1 === "number" || typeof val2 === "number") {
        const num1 = val1 ?? 0;
        const num2 = val2 ?? 0;
        if (num1 !== num2) return false;
      } else if (typeof val1 === "boolean" || typeof val2 === "boolean") {
        const bool1 = val1 ?? false;
        const bool2 = val2 ?? false;
        if (bool1 !== bool2) return false;
      } else {
        if (val1 !== val2) return false;
      }
    }
  }
  return true;
};

const fetchColumnDisplayText = async (columnId: string): Promise<string> => {
  console.log("🔍 fetchColumnDisplayText called with columnId:", columnId);

  try {
    const locationId = getStorageIds().locationId;
    const companyId = getStorageIds().companyId;

    console.log("🔍 Storage IDs:", { locationId, companyId });

    if (!locationId || !companyId) {
      console.error("❌ Missing locationId or companyId");
      return columnId;
    }

    const url = `/api/admin/column/desc?descriptionId=${columnId}&locationId=${locationId}&companyId=${companyId}`;
    console.log("🔍 Fetching URL:", url);

    const response = await fetch(url);
    console.log("🔍 Response status:", response.status);

    if (!response.ok) {
      return columnId;
    }

    const data = await response.json();
    console.log("🔍 Response data:", data);

    if (data.success && data.data) {
      const {
        prefixId,
        carbonType,
        innerDiameter,
        length,
        particleSize,
        suffixId,
        makeId,
      } = data.data;

      console.log("🔍 Extracted data:", {
        prefixId: prefixId?.name,
        carbonType,
        innerDiameter,
        length,
        particleSize,
        suffixId: suffixId?.name,
        makeId: makeId?.make,
      });

      // Build display text in the format: ${prefix} ${carbonType} ${innerDiameter} x ${length} ${particleSize}µm ${suffix}-{desc.make}
      const prefix = prefixId?.name || "";
      const suffix = suffixId?.name || "";
      const make = makeId?.make || "";

      let displayText = "";

      // Add prefix if exists
      if (prefix) {
        displayText += `${prefix} `;
      }

      // Add carbon type, dimensions, and particle size
      displayText += `${carbonType} ${innerDiameter} x ${length} ${particleSize}µm`;

      // Add suffix if exists
      if (suffix) {
        displayText += ` ${suffix}`;
      }

      // Add make
      if (make) {
        displayText += `-${make}`;
      }

      const finalDisplayText = displayText.trim();
      console.log("✅ Final display text:", finalDisplayText);
      return finalDisplayText;
    } else {
      console.error("❌ API response not successful or no data:", data);
    }
  } catch (error) {
    console.error("❌ Error fetching column details:", error);
  }

  console.log("⚠️ Fallback to columnId:", columnId);
  return columnId; // Fallback to columnId
};

// Helper function to find linking suggestions across all APIs
const findLinkingSuggestions = (
  apis: ApiData[],
  getApiLabel?: (name: string) => string
): LinkingSuggestion[] => {
  const suggestions: LinkingSuggestion[] = [];
  const processedGroups = new Set<string>();
  const identicalGroups: Array<
    Array<{ apiIndex: number; testTypeIndex: number; apiName: string }>
  > = [];
  const assignedToGroup = new Set<string>();

  for (let apiIndex1 = 0; apiIndex1 < apis.length; apiIndex1++) {
    const api1 = apis[apiIndex1];
    for (
      let testTypeIndex1 = 0;
      testTypeIndex1 < api1.testTypes.length;
      testTypeIndex1++
    ) {
      const key1 = `${apiIndex1}-${testTypeIndex1}`;

      if (assignedToGroup.has(key1)) continue;

      const testType1 = api1.testTypes[testTypeIndex1];
      const currentGroup: Array<{
        apiIndex: number;
        testTypeIndex: number;
        apiName: string;
      }> = [
        {
          apiIndex: apiIndex1,
          testTypeIndex: testTypeIndex1,
          apiName: api1.apiName,
        },
      ];

      assignedToGroup.add(key1);

      for (let apiIndex2 = apiIndex1; apiIndex2 < apis.length; apiIndex2++) {
        const api2 = apis[apiIndex2];
        const startIndex = apiIndex2 === apiIndex1 ? testTypeIndex1 + 1 : 0;

        for (
          let testTypeIndex2 = startIndex;
          testTypeIndex2 < api2.testTypes.length;
          testTypeIndex2++
        ) {
          const key2 = `${apiIndex2}-${testTypeIndex2}`;

          if (assignedToGroup.has(key2)) continue;

          const testType2 = api2.testTypes[testTypeIndex2];

          if (areTestTypesIdentical(testType1, testType2)) {
            currentGroup.push({
              apiIndex: apiIndex2,
              testTypeIndex: testTypeIndex2,
              apiName: api2.apiName,
            });
            assignedToGroup.add(key2);
          }
        }
      }

      if (currentGroup.length >= 2) {
        identicalGroups.push(currentGroup);
      }
    }
  }

  identicalGroups.forEach((group) => {
    if (group.length < 2) return;

    group.sort((a, b) => {
      if (a.apiIndex !== b.apiIndex) return a.apiIndex - b.apiIndex;
      return a.testTypeIndex - b.testTypeIndex;
    });

    const testTypeDescriptions = group.map(
      (item) =>
        `${getApiLabel ? getApiLabel(item.apiName) : item.apiName} (Test Type ${
          item.testTypeIndex + 1
        })`
    );

    const uniqueDescriptions = [...new Set(testTypeDescriptions)].join(", ");

    const primaryItem = group[0];

    suggestions.push({
      apiIndex: primaryItem.apiIndex,
      testTypeIndex: primaryItem.testTypeIndex,
      matchingTestTypes: group.slice(1),
      allIdenticalTestTypes: group,
      message: `These test types are identical and can be linked: ${uniqueDescriptions}`,
    });
  });

  return suggestions;
};

const transformInitialData = (
  data: any,
  products: Product[] = []
): MFCFormData => {
  if (!data) {
    return {
      mfcNumber: "",
      genericName: "",
      apis: [],
      departmentId: "",
      wash: 0,
      productIds: [],
      isLinked: false,
      isObsolete: false,
      isRawMaterial: false,
    };
  }

  const firstGeneric = data.generics?.[0];
  const apis = firstGeneric?.apis || [];
  let transformedProductIds = [];

  if (data.productIds && Array.isArray(data.productIds)) {
    transformedProductIds = data.productIds.map((productId: any) => {
      if (typeof productId === "object" && productId.id) {
        return {
          id: productId.id,
          productCode: productId.productCode || "",
          productName: productId.productName || "",
        };
      }
      const productIdString =
        typeof productId === "string" ? productId : productId.toString();
      const product = products.find((p) => p._id === productIdString);
      return {
        id: productIdString,
        productCode: product?.productCode || "",
        productName: product?.productName || "",
      };
    });
  }

  return {
    mfcNumber: data.mfcNumber || "",
    genericName: firstGeneric?.genericName || "",
    apis: apis.map((api: any) => ({
      apiName: api.apiName || "",
      testTypes: (api.testTypes || []).map((testType: any) => ({
        testTypeId: testType.testTypeId || "",
        selectMakeSpecific: testType.selectMakeSpecific || false,
        columnCode: testType.columnCode || "",
        mobilePhaseCodes: normalizeMobilePhaseCodes(testType.mobilePhaseCodes),
        mobilePhaseRatios: testType.mobilePhaseRatios || [0, 0, 0, 0, 0, 0],
        flowRates: testType.flowRates || [0, 0],
        systemFlowRate: testType.systemFlowRate || 0,
        washFlowRate: testType.washFlowRate || 0,
        numberOfInjectionsAMV: testType.numberOfInjectionsAMV || 0,
        numberOfInjectionsPV: testType.numberOfInjectionsPV || 0,
        numberOfInjectionsCV: testType.numberOfInjectionsCV || 0,
        detectorTypeId: testType.detectorTypeId || "",
        pharmacopoeialId: Array.isArray(testType.pharmacopoeialId)
          ? testType.pharmacopoeialId
          : testType.pharmacopoeialId
          ? [testType.pharmacopoeialId]
          : [], // Ensure array
        sampleInjection: testType.sampleInjection || 0,
        standardInjection: testType.standardInjection || 0,
        blankInjection: testType.blankInjection || 0,
        systemSuitability: testType.systemSuitability || 0,
        sensitivity: testType.sensitivity || 0,
        placebo: testType.placebo || 0,
        reference1: testType.reference1 || 0,
        reference2: testType.reference2 || 0,
        uniqueRuntimes: testType.uniqueRuntimes || false,
        blankRunTime: testType.blankRunTime || 0,
        standardRunTime: testType.standardRunTime || 0,
        sampleRunTime: testType.sampleRunTime || 0,
        systemSuitabilityRunTime: testType.systemSuitabilityRunTime || 0,
        sensitivityRunTime: testType.sensitivityRunTime || 0,
        placeboRunTime: testType.placeboRunTime || 0,
        reference1RunTime: testType.reference1RunTime || 0,
        reference2RunTime: testType.reference2RunTime || 0,
        isOutsourcedTest: testType.isOutsourcedTest || false,
        bracketingFrequency: testType.bracketingFrequency || 0,
        injectionTime: testType.injectionTime || 0,
        runTime: testType.runTime || 0,
        washTime: testType.washTime || 0,
        numberOfInjections: testType.numberOfInjections || 0,
        bulk: testType.bulk || false,
        fp: testType.fp || false,
        stabilityPartial: testType.stabilityPartial || false,
        stabilityFinal: testType.stabilityFinal || false,
        amv: testType.amv || false,
        pv: testType.pv || false,
        cv: testType.cv || false,
        isLinked: testType.isLinked || false,
      })),
    })),
    departmentId: data.departmentId || "",
    wash: Number(data.wash) || 0,
    productIds: transformedProductIds,
    isLinked: data.isLinked ?? false,
    isObsolete: data.isObsolete ?? false,
    isRawMaterial: data.isRawMaterial ?? false,
  };
};

const ApiPopup: React.FC<ApiPopupProps> = ({
  apiData,
  onSave,
  onClose,
  title,
  allApis = [],
  currentApiIndex = -1,
}) => {
  const {
    getTestTypeOptions,
    getDetectorTypeOptions,
    getColumnOptions,
    getPharmacopoeialOptions,
    getApiOptions,
  } = useMasterDataContext();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
    clearErrors,
  } = useForm<ApiData>({
    defaultValues: {
      apiName: apiData?.apiName || "",
      testTypes:
        apiData?.testTypes?.length > 0
          ? apiData.testTypes.map((tt) => ({
              ...tt,
              mobilePhaseCodes: normalizeMobilePhaseCodes(tt.mobilePhaseCodes),
              mobilePhaseRatios: tt.mobilePhaseRatios || [0, 0, 0, 0, 0, 0],
              flowRates: tt.flowRates || [0, 0],
              systemFlowRate: tt.systemFlowRate || 0,
              washFlowRate: tt.washFlowRate || 0,
              selectMakeSpecific: tt.selectMakeSpecific || false,
              washTime: tt.washTime || 0,
              numberOfInjectionsAMV: tt.numberOfInjectionsAMV || 0,
              numberOfInjectionsPV: tt.numberOfInjectionsPV || 0,
              numberOfInjectionsCV: tt.numberOfInjectionsCV || 0,
            }))
          : [
              {
                testTypeId: "",
                selectMakeSpecific: false,
                columnCode: "",
                mobilePhaseCodes: ["", "", "", "", "", ""],
                detectorTypeId: "",
                pharmacopoeialId: [],
                blankInjection: 0,
                systemSuitability: 0,
                sensitivity: 0,
                placebo: 0,
                standardInjection: 0,
                reference1: 0,
                reference2: 0,
                sampleInjection: 0,
                bracketingFrequency: 0,
                uniqueRuntimes: false,
                blankRunTime: 0,
                standardRunTime: 0,
                sampleRunTime: 0,
                systemSuitabilityRunTime: 0,
                sensitivityRunTime: 0,
                placeboRunTime: 0,
                reference1RunTime: 0,
                reference2RunTime: 0,
                isOutsourcedTest: false,
                runTime: 0,
                washTime: 0,
                numberOfInjectionsAMV: 0,
                numberOfInjectionsPV: 0,
                numberOfInjectionsCV: 0,
                numberOfInjections: 0,
                bulk: false,
                fp: false,
                stabilityPartial: false,
                stabilityFinal: false,
                amv: false,
                pv: false,
                cv: false,
                isLinked: false,
              },
            ],
    },
    resolver: zodResolver(apiSchema),
  });

  const {
    fields: testTypeFields,
    append: appendTestType,
    remove: removeTestType,
  } = useFieldArray({
    control,
    name: "testTypes",
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [linkingSuggestions, setLinkingSuggestions] = useState<
    LinkingSuggestion[]
  >([]);
  const [showColumnPopup, setShowColumnPopup] = useState(false);
  const [currentColumnTestTypeIndex, setCurrentColumnTestTypeIndex] = useState<
    number | null
  >(null);
  const [columnDisplayTexts, setColumnDisplayTexts] = useState<{
    [key: number]: string;
  }>({});

  const testTypeOptions = getTestTypeOptions();
  const detectorTypeOptions = getDetectorTypeOptions();
  const pharmacopoeialOptions = getPharmacopoeialOptions();
  const columnOptions = getColumnOptions();
  const apiOptions = getApiOptions();

  const watchedValues = watch();

  const checkLinkingSuggestions = () => {
    const currentApiData = getValues();
    const allApisForChecking = [...allApis];

    if (currentApiIndex >= 0 && currentApiIndex < allApisForChecking.length) {
      allApisForChecking[currentApiIndex] = currentApiData;
    } else if (currentApiIndex === -1) {
      allApisForChecking.push(currentApiData);
    }

    const suggestions = findLinkingSuggestions(
      allApisForChecking,
      (apiName) => {
        const option = apiOptions.find((opt: any) => opt.value === apiName);
        return option?.label || apiName;
      }
    );

    const currentApiIndexToCheck =
      currentApiIndex >= 0 ? currentApiIndex : allApisForChecking.length - 1;

    const relevantSuggestions = suggestions.filter((suggestion) => {
      if (
        !suggestion.allIdenticalTestTypes ||
        suggestion.allIdenticalTestTypes.length < 2
      ) {
        return false;
      }

      const hasUnlinkedTestTypes = suggestion.allIdenticalTestTypes.some(
        (item) => {
          if (item.apiIndex === currentApiIndexToCheck) {
            const testType = currentApiData.testTypes[item.testTypeIndex];
            return !testType.isLinked;
          }
          return false;
        }
      );

      return hasUnlinkedTestTypes;
    });

    setLinkingSuggestions(relevantSuggestions);
  };

  const handleLinkingChange = (
    suggestionIndex: number,
    shouldLink: boolean
  ) => {
    const suggestion = linkingSuggestions[suggestionIndex];

    if (shouldLink && suggestion.allIdenticalTestTypes) {
      suggestion.allIdenticalTestTypes.forEach((item) => {
        if (
          item.apiIndex ===
          (currentApiIndex >= 0 ? currentApiIndex : allApis.length)
        ) {
          setValue(`testTypes.${item.testTypeIndex}.isLinked`, true);
        }
      });

      setLinkingSuggestions((prev) =>
        prev.filter((_, index) => index !== suggestionIndex)
      );
    }
  };

  const handleTestTypeChange = (
    testTypeIndex: number,
    field: string,
    value: any
  ) => {
    const currentValues = getValues();
    const currentTestType = currentValues.testTypes[testTypeIndex];

    if (field !== "isLinked" && currentTestType.isLinked) {
      const linkingFields = [
        "testTypeId",
        "selectMakeSpecific",
        "columnCode",
        "mobilePhaseCodes",
        "detectorTypeId",
        "pharmacopoeialId",
        "blankInjection",
        "systemSuitability",
        "sensitivity",
        "placebo",
        "standardInjection",
        "reference1",
        "reference2",
        "sampleInjection",
        "bracketingFrequency",
        "uniqueRuntimes",
        "blankRunTime",
        "standardRunTime",
        "sampleRunTime",
        "runTime",
        "washTime",
        "numberOfInjectionsAMV",
        "numberOfInjectionsPV",
        "numberOfInjectionsCV",
        "bulk",
        "fp",
        "stabilityPartial",
        "stabilityFinal",
        "amv",
        "pv",
        "cv",
      ];

      if (linkingFields.includes(field)) {
        const shouldUnlink = confirm(
          "This test type is currently linked. Changing this field will unlink it from other identical test types. Continue?"
        );

        if (shouldUnlink) {
          setValue(`testTypes.${testTypeIndex}.isLinked`, false);
        } else {
          return;
        }
      }
    }

    setValue(`testTypes.${testTypeIndex}.${field}` as any, value);

    setTimeout(() => {
      checkLinkingSuggestions();
    }, 100);
  };

  const MobilePhaseCodeFields = ({
    testTypeIndex,
    control,
  }: {
    testTypeIndex: number;
    control: any;
  }) => {
    const phaseLabels = ["MP01", "MP02", "MP03", "MP04", "Wash 1", "Wash 2"];
    const watchedValues = watch();
    const mobilePhaseCodes =
      watchedValues?.testTypes?.[testTypeIndex]?.mobilePhaseCodes || [];

    return (
      <div className="space-y-4">
        {/* Mobile Phase Codes with their corresponding ratios/flow rates directly below */}
        <div className="grid grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="space-y-2">
              {/* Mobile Phase Input */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {phaseLabels[index]}
                </label>
                <Controller
                  name={`testTypes.${testTypeIndex}.mobilePhaseCodes.${index}`}
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <MobilePhaseDropdown
                      value={field.value || ""}
                      onChange={(value) => {
                        field.onChange(value || "");
                        handleTestTypeChange(
                          testTypeIndex,
                          `mobilePhaseCodes.${index}`,
                          value || ""
                        );
                      }}
                      placeholder={index === 0 ? "Required" : "Optional"}
                      required={index === 0}
                    />
                  )}
                />
              </div>
              {/* Ratio/Flow Rate Input directly below */}
              <div>
                {index <= 3 ? (
                  // Mobile Phase Ratio (MP01-MP04)
                  <>
                    <label className="block text-xs text-gray-500 mb-1">
                      {phaseLabels[index]} Ratio
                    </label>
                    <Controller
                      name={`testTypes.${testTypeIndex}.mobilePhaseRatios.${index}`}
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value}
                          onChange={(e) => {
                            // Only update the field value, don't trigger parent state changes
                            field.onChange(e.target.value);
                          }}
                          onBlur={(e) => {
                            const stringValue = e.target.value;
                            // Clean up and validate the value on blur
                            const numericValue =
                              stringValue === ""
                                ? 0
                                : parseFloat(stringValue) || 0;
                            field.onChange(numericValue.toString());

                            // Update parent state only on blur
                            const currentRatios = watchedValues?.testTypes?.[
                              testTypeIndex
                            ]?.mobilePhaseRatios || [0, 0, 0, 0, 0, 0];
                            const newRatios = [...currentRatios];
                            newRatios[index] = numericValue;
                            handleTestTypeChange(
                              testTypeIndex,
                              "mobilePhaseRatios",
                              newRatios
                            );
                          }}
                          disabled={!mobilePhaseCodes[index]}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            !mobilePhaseCodes[index]
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "border-gray-300"
                          }`}
                          placeholder="0.00"
                        />
                      )}
                    />
                  </>
                ) : (
                  // Wash Flow Rate (Wash1 and Wash2)
                  <>
                    <label className="block text-xs text-gray-500 mb-1">
                      {phaseLabels[index]} Flow Rate
                    </label>
                    <Controller
                      name={`testTypes.${testTypeIndex}.flowRates.${index - 4}`}
                      control={control}
                      defaultValue=""
                      render={({ field }) => (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value}
                          onChange={(e) => {
                            // Only update the field value, don't trigger parent state changes
                            field.onChange(e.target.value);
                          }}
                          onBlur={(e) => {
                            const stringValue = e.target.value;
                            // Clean up and validate the value on blur
                            const numericValue =
                              stringValue === ""
                                ? 0
                                : parseFloat(stringValue) || 0;
                            field.onChange(numericValue.toString());

                            // Update parent state only on blur
                            const currentFlowRates = watchedValues?.testTypes?.[
                              testTypeIndex
                            ]?.flowRates || [0, 0];
                            const newFlowRates = [...currentFlowRates];
                            newFlowRates[index - 4] = numericValue;
                            handleTestTypeChange(
                              testTypeIndex,
                              "flowRates",
                              newFlowRates
                            );
                          }}
                          disabled={!mobilePhaseCodes[index]}
                          className={`w-full px-2 py-1 text-xs border rounded ${
                            !mobilePhaseCodes[index]
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "border-gray-300"
                          }`}
                          placeholder="0.00"
                        />
                      )}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* System Flow Rate and Wash Flow Rate in separate section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              System Flow Rate
            </label>
            <Controller
              name={`testTypes.${testTypeIndex}.systemFlowRate`}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={field.value}
                  onChange={(e) => {
                    // Only update the field value, don't trigger parent state changes
                    field.onChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    const stringValue = e.target.value;
                    // Clean up and validate the value on blur
                    const numericValue =
                      stringValue === "" ? 0 : parseFloat(stringValue) || 0;
                    field.onChange(numericValue.toString());

                    // Update parent state only on blur
                    handleTestTypeChange(
                      testTypeIndex,
                      "systemFlowRate",
                      numericValue
                    );
                  }}
                  className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                  placeholder="0.00"
                />
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Wash Flow Rate
            </label>
            <Controller
              name={`testTypes.${testTypeIndex}.washFlowRate`}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={field.value}
                  onChange={(e) => {
                    // Only update the field value, don't trigger parent state changes
                    field.onChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    const stringValue = e.target.value;
                    // Clean up and validate the value on blur
                    const numericValue =
                      stringValue === "" ? 0 : parseFloat(stringValue) || 0;
                    field.onChange(numericValue.toString());

                    // Update parent state only on blur
                    handleTestTypeChange(
                      testTypeIndex,
                      "washFlowRate",
                      numericValue
                    );
                  }}
                  className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                  placeholder="0.00"
                />
              )}
            />
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    const loadColumnDisplayTexts = async () => {
      if (!apiData?.testTypes) return;

      const displayTextPromises = apiData.testTypes.map(async (tt, index) => {
        if (tt.selectMakeSpecific && tt.columnCode) {
          try {
            const displayText = await fetchColumnDisplayText(tt.columnCode);
            return { index, displayText };
          } catch (error) {
            return { index, displayText: tt.columnCode };
          }
        }
        return null;
      });

      const results = await Promise.all(displayTextPromises);
      const newDisplayTexts: { [key: number]: string } = {};

      results.forEach((result) => {
        if (result) {
          newDisplayTexts[result.index] = result.displayText;
        }
      });

      setColumnDisplayTexts(newDisplayTexts);

      const resetData = {
        apiName: apiData.apiName || "",
        testTypes: apiData.testTypes.map((tt) => ({
          ...tt,
          mobilePhaseCodes: normalizeMobilePhaseCodes(tt.mobilePhaseCodes),
          numberOfInjectionsAMV: tt.numberOfInjectionsAMV || 0,
          numberOfInjectionsPV: tt.numberOfInjectionsPV || 0,
          numberOfInjectionsCV: tt.numberOfInjectionsCV || 0,
        })),
      };

      reset(resetData);
    };

    loadColumnDisplayTexts().catch((error) => {
      console.error("Error in loadColumnDisplayTexts:", error);
    });
  }, [apiData, reset]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedValues.apiName || watchedValues.testTypes?.length > 0) {
        checkLinkingSuggestions();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedValues.apiName, JSON.stringify(watchedValues.testTypes)]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const closestElement = e.currentTarget.closest(".bg-white");
    if (!closestElement) return;
    const rect = closestElement.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  useEffect(() => {
    setPosition({
      x: (window.innerWidth - 800) / 2,
      y: (window.innerHeight - 600) / 2,
    });
  }, []);

  const onSubmitForm = (data: ApiData) => {
    const processedData = {
      ...data,
      testTypes: data.testTypes.map((tt) => ({
        ...tt,
        mobilePhaseCodes: normalizeMobilePhaseCodes(tt.mobilePhaseCodes),
      })),
    };

    onSave(processedData);
  };

  const onSubmitError = (errors: any) => {
    console.log("🐛 Full Form Data:", getValues()); // Add this line
    console.log("🐛 Validation Errors:", errors);
    let errorMessages: string[] = [];

    if (errors.apiName) {
      errorMessages.push(`🔸 API Name: ${errors.apiName.message}`);
    }

    if (errors.testTypes) {
      errors.testTypes.forEach((testTypeError: any, index: number) => {
        if (testTypeError) {
          errorMessages.push(`\n📋 Test Type ${index + 1} Issues:`);

          Object.keys(testTypeError).forEach((fieldName) => {
            const error = testTypeError[fieldName];
            if (error && error.message) {
              const friendlyFieldName = fieldName
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()
                .replace(/^./, (str) => str.toUpperCase());
              errorMessages.push(`   • ${friendlyFieldName}: ${error.message}`);
            }
          });
        }
      });
    }

    if (errorMessages.length > 0) {
      const alertMessage = `❌ Invalid input:\n\n${errorMessages.join("\n")}`;
      alert(alertMessage);
    } else {
      alert("❌ Please check all required fields and try again.");
    }

    const firstErrorField = document.querySelector(".border-red-400");
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const openColumnPopup = (testTypeIndex: number) => {
    setCurrentColumnTestTypeIndex(testTypeIndex);
    setShowColumnPopup(true);
  };

  const handleColumnSelect = async (columnData: {
    id: string;
    displayText?: string;
    columnCode: string;
  }) => {
    if (currentColumnTestTypeIndex !== null) {
      setValue(
        `testTypes.${currentColumnTestTypeIndex}.columnCode`,
        columnData.id
      );

      let displayText = columnData.displayText;
      if (!displayText) {
        try {
          displayText = await fetchColumnDisplayText(columnData.id);
        } catch (error) {
          console.error("Error fetching display text:", error);
          displayText = columnData.id;
        }
      }

      setColumnDisplayTexts((prev) => ({
        ...prev,
        [currentColumnTestTypeIndex]: displayText,
      }));

      handleTestTypeChange(
        currentColumnTestTypeIndex,
        "columnCode",
        columnData.id
      );

      clearErrors(`testTypes.${currentColumnTestTypeIndex}.columnCode`);
    }

    setShowColumnPopup(false);
    setCurrentColumnTestTypeIndex(null);
  };

  return (
    <div
      className="fixed inset-0 bg-opacity-50 z-[70]"
      onClick={(e) => {
        if (!isDragging && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxWidth: "1024px",
          width: "90vw",
        }}
      >
        <div
          className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-white hover:text-red-400 text-xl font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmitForm, onSubmitError)}
          className="p-6"
        >
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Name *
            </label>
            <select
              {...register("apiName")}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.apiName ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            >
              <option value="">Select API</option>
              {apiOptions.map((option: { value: string; label: string }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.apiName?.message && (
              <div className="mt-1 flex items-center text-sm text-red-600">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.apiName.message}
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Test Type Details
            </label>
            {testTypeFields.map((field, testTypeIndex) => (
              <div
                key={field.id}
                className="bg-gray-50 p-4 rounded-lg border mb-4"
              >
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-700">
                    Test Type {testTypeIndex + 1}
                    {watchedValues?.testTypes?.[testTypeIndex]?.isLinked && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded">
                        Linked
                      </span>
                    )}
                  </h4>
                  {testTypeFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestType(testTypeIndex)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Type *
                    </label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.testTypeId`)}
                      onChange={(e) => {
                        register(
                          `testTypes.${testTypeIndex}.testTypeId`
                        ).onChange(e);
                        handleTestTypeChange(
                          testTypeIndex,
                          "testTypeId",
                          e.target.value
                        );
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.testTypes?.[testTypeIndex]?.testTypeId
                          ? "border-red-400 bg-red-50"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Test Type</option>
                      {testTypeOptions.map(
                        (option: { value: string; label: string }) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                    {errors.testTypes?.[testTypeIndex]?.testTypeId?.message && (
                      <div className="mt-1 flex items-center text-sm text-red-600">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {errors.testTypes[testTypeIndex].testTypeId.message}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center mt-3 gap-3 px-3">
                    <input
                      type="checkbox"
                      {...register(
                        `testTypes.${testTypeIndex}.selectMakeSpecific`
                      )}
                      onChange={(e) => {
                        register(
                          `testTypes.${testTypeIndex}.selectMakeSpecific`
                        ).onChange(e);
                        handleTestTypeChange(
                          testTypeIndex,
                          "selectMakeSpecific",
                          e.target.checked
                        );
                      }}
                      className="h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label
                      htmlFor={`testTypes.${testTypeIndex}.selectMakeSpecific`}
                      className="text-sm font-medium text-gray-800 cursor-pointer select-none"
                    >
                      Make Specific
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Column Code *
                    </label>
                    <div className="flex gap-2">
                      {watchedValues?.testTypes?.[testTypeIndex]
                        ?.selectMakeSpecific ? (
                        <>
                          <input
                            type="text"
                            value={columnDisplayTexts[testTypeIndex] || ""}
                            readOnly
                            placeholder="Click Browse to select column"
                            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 ${
                              errors.testTypes?.[testTypeIndex]?.columnCode
                                ? "border-red-400"
                                : "border-gray-300"
                            }`}
                          />
                          <input
                            type="hidden"
                            {...register(
                              `testTypes.${testTypeIndex}.columnCode`
                            )}
                          />
                        </>
                      ) : (
                        <select
                          {...register(`testTypes.${testTypeIndex}.columnCode`)}
                          onChange={(e) => {
                            register(
                              `testTypes.${testTypeIndex}.columnCode`
                            ).onChange(e);
                            handleTestTypeChange(
                              testTypeIndex,
                              "columnCode",
                              e.target.value
                            );
                          }}
                          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.testTypes?.[testTypeIndex]?.columnCode
                              ? "border-red-400 bg-red-50"
                              : "border-gray-300"
                          }`}
                        >
                          <option value="">Select Column</option>
                          {columnOptions.map(
                            (option: { value: string; label: string }) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            )
                          )}
                        </select>
                      )}

                      {watchedValues?.testTypes?.[testTypeIndex]
                        ?.selectMakeSpecific && (
                        <button
                          type="button"
                          onClick={() => openColumnPopup(testTypeIndex)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                          title="Browse Columns"
                        >
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
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {errors.testTypes?.[testTypeIndex]?.columnCode?.message && (
                      <div className="mt-1 flex items-center text-sm text-red-600">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {errors.testTypes[testTypeIndex].columnCode.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detector Type *
                    </label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.detectorTypeId`)}
                      onChange={(e) => {
                        register(
                          `testTypes.${testTypeIndex}.detectorTypeId`
                        ).onChange(e);
                        handleTestTypeChange(
                          testTypeIndex,
                          "detectorTypeId",
                          e.target.value
                        );
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.testTypes?.[testTypeIndex]?.detectorTypeId
                          ? "border-red-400 bg-red-50"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Detector</option>
                      {detectorTypeOptions.map(
                        (option: { value: string; label: string }) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                    {errors.testTypes?.[testTypeIndex]?.detectorTypeId
                      ?.message && (
                      <div className="mt-1 flex items-center text-sm text-red-600">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {errors.testTypes[testTypeIndex].detectorTypeId.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pharmacopoeial *
                    </label>
                    <Controller
                      name={`testTypes.${testTypeIndex}.pharmacopoeialId`}
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 gap-2">
                          {pharmacopoeialOptions.map(
                            (option: { value: string; label: string }) => (
                              <label
                                key={option.value}
                                className="flex items-center"
                              >
                                <input
                                  type="checkbox"
                                  value={option.value}
                                  checked={
                                    field.value?.includes(option.value) || false
                                  }
                                  onChange={(e) => {
                                    const newValue = e.target.checked
                                      ? [...(field.value || []), option.value]
                                      : (field.value || []).filter(
                                          (val: string) => val !== option.value
                                        );
                                    field.onChange(newValue);
                                    handleTestTypeChange(
                                      testTypeIndex,
                                      "pharmacopoeialId",
                                      newValue
                                    );
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                />
                                <span className="text-sm text-gray-700">
                                  {option.label}
                                </span>
                              </label>
                            )
                          )}
                        </div>
                      )}
                    />
                    {errors.testTypes?.[testTypeIndex]?.pharmacopoeialId
                      ?.message && (
                      <div className="mt-1 flex items-center text-sm text-red-600">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {
                          errors.testTypes[testTypeIndex].pharmacopoeialId
                            .message
                        }
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Phase Codes (6 phases: 4 Mobile Phases + 2 Wash) *
                  </label>
                  <MobilePhaseCodeFields
                    testTypeIndex={testTypeIndex}
                    control={control}
                  />
                  {errors.testTypes?.[testTypeIndex]?.mobilePhaseCodes
                    ?.message && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.testTypes[testTypeIndex].mobilePhaseCodes.message}
                    </div>
                  )}
                </div>

                {/* Fields in the correct sequence: Blank → System Suitability → Sensitivity → Placebo → Standard → Reference1 → Reference2 → Sample */}
                <div className="grid grid-cols-6 gap-3 mb-4">
                  {[
                    { field: "blankInjection", label: "Blank Injection" },
                    { field: "systemSuitability", label: "System Suitability" },
                    { field: "sensitivity", label: "Sensitivity" },
                    { field: "placebo", label: "Placebo" },
                    { field: "standardInjection", label: "Standard Injection" },
                    { field: "reference1", label: "Reference1" },
                    { field: "reference2", label: "Reference2" },
                    { field: "sampleInjection", label: "Sample Injection" },
                    {
                      field: "bracketingFrequency",
                      label: "Bracketing Frequency",
                    },
                    { field: "washTime", label: "Wash Time" },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(
                          `testTypes.${testTypeIndex}.${field}` as any,
                          {
                            valueAsNumber: true,
                          }
                        )}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          register(
                            `testTypes.${testTypeIndex}.${field}` as any,
                            {
                              valueAsNumber: true,
                            }
                          ).onChange({ target: { value } });
                          handleTestTypeChange(testTypeIndex, field, value);
                        }}
                        className={`w-full px-2 py-1 text-sm border rounded ${
                          errors.testTypes?.[testTypeIndex]?.[
                            field as keyof TestTypeData
                          ]
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.testTypes?.[testTypeIndex]?.[
                        field as keyof TestTypeData
                      ]?.message && (
                        <div className="mt-1 text-xs text-red-600">
                          {
                            errors.testTypes?.[testTypeIndex]?.[
                              field as keyof TestTypeData
                            ]?.message
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Unique Runtimes checkbox and conditional runtime fields */}
                <div className="mb-4">
                  <label className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.uniqueRuntimes`)}
                      onChange={(e) => {
                        register(
                          `testTypes.${testTypeIndex}.uniqueRuntimes`
                        ).onChange(e);
                        handleTestTypeChange(
                          testTypeIndex,
                          "uniqueRuntimes",
                          e.target.checked
                        );
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Unique Runtimes
                    </span>
                  </label>

                  {watchedValues?.testTypes?.[testTypeIndex]?.uniqueRuntimes ? (
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Blank Run Time
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.blankRunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.blankRunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "blankRunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Standard Run Time
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.standardRunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.standardRunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "standardRunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sample Run Time
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.sampleRunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.sampleRunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "sampleRunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          System Suitability Runtime
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.systemSuitabilityRunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.systemSuitabilityRunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "systemSuitabilityRunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sensitivity Runtime
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.sensitivityRunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.sensitivityRunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "sensitivityRunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Placebo Runtime
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.placeboRunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.placeboRunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "placeboRunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Reference1 Runtime
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.reference1RunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.reference1RunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "reference1RunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Reference2 Runtime
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          {...register(
                            `testTypes.${testTypeIndex}.reference2RunTime`,
                            { valueAsNumber: true }
                          )}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            register(
                              `testTypes.${testTypeIndex}.reference2RunTime`,
                              { valueAsNumber: true }
                            ).onChange({ target: { value } });
                            handleTestTypeChange(
                              testTypeIndex,
                              "reference2RunTime",
                              value
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Run Time
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`testTypes.${testTypeIndex}.runTime`, {
                          valueAsNumber: true,
                        })}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          register(`testTypes.${testTypeIndex}.runTime`, {
                            valueAsNumber: true,
                          }).onChange({ target: { value } });
                          handleTestTypeChange(testTypeIndex, "runTime", value);
                        }}
                        className="w-full px-2 py-1 text-sm border rounded border-gray-300"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { field: "bulk", label: "Bulk" },
                    { field: "fp", label: "FP" },
                    { field: "stabilityPartial", label: "Stability Partial" },
                    { field: "stabilityFinal", label: "Stability Final" },
                    { field: "amv", label: "AMV" },
                    { field: "pv", label: "PV" },
                    { field: "cv", label: "CV" },
                    { field: "isOutsourcedTest", label: "Outsourced Test" },
                    { field: "isLinked", label: "Manual Link" },
                  ].map(({ field, label }) => (
                    <label key={field} className="flex items-center">
                      <input
                        type="checkbox"
                        {...register(
                          `testTypes.${testTypeIndex}.${
                            field as keyof TestTypeData
                          }`
                        )}
                        onChange={(e) => {
                          register(
                            `testTypes.${testTypeIndex}.${
                              field as keyof TestTypeData
                            }`
                          ).onChange(e);
                          handleTestTypeChange(
                            testTypeIndex,
                            field,
                            e.target.checked
                          );
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>

                {/* Dynamic Number of Injections fields based on checkboxes */}
                <div className="space-y-3">
                  {watchedValues?.testTypes?.[testTypeIndex]?.amv && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Injections for AMV *
                      </label>
                      <input
                        type="number"
                        step="1"
                        {...register(
                          `testTypes.${testTypeIndex}.numberOfInjectionsAMV`,
                          {
                            valueAsNumber: true,
                          }
                        )}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          register(
                            `testTypes.${testTypeIndex}.numberOfInjectionsAMV`,
                            {
                              valueAsNumber: true,
                            }
                          ).onChange({ target: { value } });
                          handleTestTypeChange(
                            testTypeIndex,
                            "numberOfInjectionsAMV",
                            value
                          );
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.testTypes?.[testTypeIndex]
                            ?.numberOfInjectionsAMV
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter number of AMV injections"
                      />
                      {errors.testTypes?.[testTypeIndex]?.numberOfInjectionsAMV
                        ?.message && (
                        <div className="mt-1 flex items-center text-sm text-red-600">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {
                            errors.testTypes[testTypeIndex]
                              .numberOfInjectionsAMV.message
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {watchedValues?.testTypes?.[testTypeIndex]?.pv && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Injections for PV *
                      </label>
                      <input
                        type="number"
                        step="1"
                        {...register(
                          `testTypes.${testTypeIndex}.numberOfInjectionsPV`,
                          {
                            valueAsNumber: true,
                          }
                        )}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          register(
                            `testTypes.${testTypeIndex}.numberOfInjectionsPV`,
                            {
                              valueAsNumber: true,
                            }
                          ).onChange({ target: { value } });
                          handleTestTypeChange(
                            testTypeIndex,
                            "numberOfInjectionsPV",
                            value
                          );
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.testTypes?.[testTypeIndex]
                            ?.numberOfInjectionsPV
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter number of PV injections"
                      />
                      {errors.testTypes?.[testTypeIndex]?.numberOfInjectionsPV
                        ?.message && (
                        <div className="mt-1 flex items-center text-sm text-red-600">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {
                            errors.testTypes[testTypeIndex].numberOfInjectionsPV
                              .message
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {watchedValues?.testTypes?.[testTypeIndex]?.cv && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number of Injections for CV *
                      </label>
                      <input
                        type="number"
                        step="1"
                        {...register(
                          `testTypes.${testTypeIndex}.numberOfInjectionsCV`,
                          {
                            valueAsNumber: true,
                          }
                        )}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          register(
                            `testTypes.${testTypeIndex}.numberOfInjectionsCV`,
                            {
                              valueAsNumber: true,
                            }
                          ).onChange({ target: { value } });
                          handleTestTypeChange(
                            testTypeIndex,
                            "numberOfInjectionsCV",
                            value
                          );
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.testTypes?.[testTypeIndex]
                            ?.numberOfInjectionsCV
                            ? "border-red-400 bg-red-50"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter number of CV injections"
                      />
                      {errors.testTypes?.[testTypeIndex]?.numberOfInjectionsCV
                        ?.message && (
                        <div className="mt-1 flex items-center text-sm text-red-600">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {
                            errors.testTypes[testTypeIndex].numberOfInjectionsCV
                              .message
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                appendTestType({
                  testTypeId: "",
                  selectMakeSpecific: false,
                  columnCode: "",
                  mobilePhaseCodes: ["", "", "", "", "", ""],
                  detectorTypeId: "",
                  pharmacopoeialId: [],
                  sampleInjection: 0,
                  standardInjection: 0, // ← Added missing property
                  blankInjection: 0,
                  bracketingFrequency: 0,
                  injectionTime: 0, // ← Added missing property
                  systemSuitability: 0,
                  sensitivity: 0,
                  placebo: 0,
                  reference1: 0,
                  reference2: 0,
                  uniqueRuntimes: false,
                  blankRunTime: 0,
                  standardRunTime: 0,
                  sampleRunTime: 0,
                  systemSuitabilityRunTime: 0,
                  sensitivityRunTime: 0,
                  placeboRunTime: 0,
                  reference1RunTime: 0,
                  reference2RunTime: 0,
                  isOutsourcedTest: false,
                  runTime: 0,
                  washTime: 0,
                  numberOfInjectionsAMV: 0,
                  numberOfInjectionsPV: 0,
                  numberOfInjectionsCV: 0,
                  numberOfInjections: 0,
                  bulk: false,
                  fp: false,
                  stabilityPartial: false,
                  stabilityFinal: false,
                  amv: false,
                  pv: false,
                  cv: false,
                  isLinked: false,
                })
              }
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              + Add Test Type
            </button>
          </div>

          {linkingSuggestions.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">
                Identical Test Types Found
              </h4>
              {linkingSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 mb-3 last:mb-0 p-3 bg-white rounded border"
                >
                  <div className="flex-1">
                    <p className="text-sm text-blue-700 font-medium">
                      {suggestion.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Linking will synchronize these{" "}
                      {suggestion.allIdenticalTestTypes?.length || 0} test
                      types. Any future changes to one will automatically update
                      all linked test types.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLinkingChange(index, true)}
                    className="px-4 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 whitespace-nowrap"
                  >
                    Link All
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:bg-green-700"
            >
              Save API
            </button>
          </div>
        </form>

        {showColumnPopup && (
          <ColumnPopup
            isOpen={showColumnPopup}
            onClose={() => {
              setShowColumnPopup(false);
              setCurrentColumnTestTypeIndex(null);
            }}
            onSelect={handleColumnSelect}
            selectedColumnCode={
              currentColumnTestTypeIndex !== null
                ? watchedValues?.testTypes?.[currentColumnTestTypeIndex]
                    ?.columnCode
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
};

const MFCMasterForm = forwardRef<unknown, MFCMasterFormProps>(
  ({ onSubmit, initialData, onCancel }, ref) => {
    const {
      getDepartmentOptions,
      getTestTypeOptions,
      getDetectorTypeOptions,
      getPharmacopoeialOptions,
      getColumnOptions,
      getApiOptions,
      isLoading: masterDataLoading,
    } = useMasterDataContext();

    const [showApiPopup, setShowApiPopup] = useState(false);
    const [editingApiIndex, setEditingApiIndex] = useState<number | null>(null);
    const [currentApiData, setCurrentApiData] = useState<ApiData | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string>("");
    const [linkingSuggestions, setLinkingSuggestions] = useState<
      LinkingSuggestion[]
    >([]);
    const [columnDisplayTexts, setColumnDisplayTexts] = useState<{
      [key: string]: string;
    }>({});
    const [submitError, setSubmitError] = useState<string>("");

    const {
      register,
      handleSubmit,
      control,
      getValues,
      formState: { errors },
      reset,
      setValue,
      watch,
    } = useForm({
      resolver: zodResolver(mfcFormSchema) as Resolver<MFCFormData>,
      defaultValues: transformInitialData(initialData) as MFCFormData,
      mode: "onChange" as const,
    }) as UseFormReturn<MFCFormData>;

    const {
      fields: productFields,
      append: appendProduct,
      remove: removeProduct,
    } = useFieldArray({
      control,
      name: "productIds",
    });

    const watchedApis = watch("apis");
    const { companyId, locationId } = getStorageIds();

    const getTestTypeLabel = (id: string) => {
      const option = getTestTypeOptions().find((opt: any) => opt.value === id);
      return option?.label || id;
    };

    const getDetectorTypeLabel = (id: string) => {
      const option = getDetectorTypeOptions().find(
        (opt: any) => opt.value === id
      );
      return option?.label || id;
    };

    const getColumnLabel = (id: string) => {
      const option = getColumnOptions().find((opt: any) => opt.value === id);
      return option?.label || id;
    };

    const getApiLabel = (name: string) => {
      const option = getApiOptions().find((opt: any) => opt.value === name);
      return option?.label || name;
    };

    useEffect(() => {
      const loadExistingColumnDisplayTexts = async () => {
        if (!watchedApis || watchedApis.length === 0) return;

        const newDisplayTexts: { [key: string]: string } = {};

        for (let apiIndex = 0; apiIndex < watchedApis.length; apiIndex++) {
          const api = watchedApis[apiIndex];
          if (!api.testTypes) continue;

          for (
            let testTypeIndex = 0;
            testTypeIndex < api.testTypes.length;
            testTypeIndex++
          ) {
            const testType = api.testTypes[testTypeIndex];

            if (testType.selectMakeSpecific && testType.columnCode) {
              try {
                const displayText = await fetchColumnDisplayText(
                  testType.columnCode
                );
                newDisplayTexts[`${apiIndex}-${testTypeIndex}`] = displayText;
              } catch (error) {
                console.error("Error loading column display text:", error);
                newDisplayTexts[`${apiIndex}-${testTypeIndex}`] =
                  testType.columnCode;
              }
            }
          }
        }

        if (Object.keys(newDisplayTexts).length > 0) {
          setColumnDisplayTexts((prev) => ({ ...prev, ...newDisplayTexts }));
        }
      };

      loadExistingColumnDisplayTexts();
    }, [watchedApis]);

    useEffect(() => {
      const fetchProducts = async () => {
        if (!companyId || !locationId) return;
        setIsLoadingProducts(true);
        try {
          const response = await fetch(
            `/api/admin/product?locationId=${locationId}&companyId=${companyId}`
          );
          const data = await response.json();
          if (data.success) {
            setProducts(data.data);
          }
        } catch (error) {
          console.error("Error fetching products:", error);
        } finally {
          setIsLoadingProducts(false);
        }
      };
      fetchProducts();
    }, [companyId, locationId]);

    useEffect(() => {
      if (products.length > 0 && initialData) {
        reset(transformInitialData(initialData, products));
      }
    }, [products, initialData, reset]);

    useEffect(() => {
      if (watchedApis && watchedApis.length > 0) {
        const timeoutId = setTimeout(() => {
          setLinkingSuggestions(
            findLinkingSuggestions(watchedApis, getApiLabel)
          );
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    }, [JSON.stringify(watchedApis)]);

    // Enhanced form submission with better error handling
    const handleFormSubmit = async (data: MFCFormData) => {
      setSubmitError(""); // Clear any previous errors

      try {
        console.log("MFC FORM SUBMISSION");
        console.log("Form data:", data);

        await onSubmit(data);
      } catch (error: any) {
        // Handle server validation errors
        if (error.response?.data?.errors) {
          const serverErrors = error.response.data.errors;

          // Check for MFC number uniqueness error
          if (serverErrors.mfcNumber) {
            setSubmitError(serverErrors.mfcNumber);
            return;
          }

          // Handle other server errors
          const errorMessages = Object.entries(serverErrors).map(
            ([field, message]) => `${field}: ${message}`
          );
          setSubmitError(errorMessages.join(", "));
        } else {
          setSubmitError(
            error.message || "An error occurred while saving the MFC record."
          );
        }
      }
    };

    // Enhanced error handler for form validation errors
    const handleFormError = (errors: any) => {
      let errorMessages: string[] = [];

      // Basic form errors
      if (errors.mfcNumber) {
        errorMessages.push(`🔸 MFC Number: ${errors.mfcNumber.message}`);
      }
      if (errors.genericName) {
        errorMessages.push(`🔸 Generic Name: ${errors.genericName.message}`);
      }
      if (errors.departmentId) {
        errorMessages.push(`🔸 Department: ${errors.departmentId.message}`);
      }
      if (errors.wash) {
        errorMessages.push(`🔸 Wash: ${errors.wash.message}`);
      }
      if (errors.productIds) {
        errorMessages.push(`🔸 Product Codes: ${errors.productIds.message}`);
      }

      // API errors
      if (errors.apis) {
        if (typeof errors.apis === "object" && "message" in errors.apis) {
          errorMessages.push(`🔸 APIs: ${errors.apis.message}`);
        }

        if (Array.isArray(errors.apis)) {
          errors.apis.forEach((apiError: any, apiIndex: number) => {
            if (apiError) {
              errorMessages.push(`\n📋 API ${apiIndex + 1} Issues:`);

              if (apiError.apiName) {
                errorMessages.push(
                  `   • API Name: ${apiError.apiName.message}`
                );
              }

              if (apiError.testTypes) {
                if (
                  typeof apiError.testTypes === "object" &&
                  "message" in apiError.testTypes
                ) {
                  errorMessages.push(
                    `   • Test Types: ${apiError.testTypes.message}`
                  );
                }

                if (Array.isArray(apiError.testTypes)) {
                  apiError.testTypes.forEach(
                    (testTypeError: any, testTypeIndex: number) => {
                      if (testTypeError) {
                        errorMessages.push(
                          `   📝 Test Type ${testTypeIndex + 1}:`
                        );

                        Object.keys(testTypeError).forEach((fieldName) => {
                          const error = testTypeError[fieldName];
                          if (error && error.message) {
                            const friendlyFieldName = fieldName
                              .replace(/([A-Z])/g, " $1")
                              .toLowerCase()
                              .replace(/^./, (str) => str.toUpperCase());
                            errorMessages.push(
                              `      • ${friendlyFieldName}: ${error.message}`
                            );
                          }
                        });
                      }
                    }
                  );
                }
              }
            }
          });
        }
      }

      // Show comprehensive error message
      if (errorMessages.length > 0) {
        const alertMessage = `❌ Please fix the following errors:\n\n${errorMessages.join(
          "\n"
        )}`;
        setSubmitError(
          "Please check all required fields and fix the validation errors before submitting."
        );
        alert(alertMessage);
      } else {
        setSubmitError("Please check all required fields and try again.");
        alert("❌ Please check all required fields and try again.");
      }

      // Scroll to first error field
      const firstErrorField = document.querySelector(".border-red-400");
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // ... (keep all your existing functions like openApiPopup, saveApiData, etc.)

    const openApiPopup = (index?: number) => {
      if (index !== undefined) {
        setEditingApiIndex(index);
        setCurrentApiData(getValues().apis[index]);
      } else {
        setEditingApiIndex(null);
        setCurrentApiData({
          apiName: "",
          testTypes: [
            {
              testTypeId: "",
              selectMakeSpecific: false,
              columnCode: "",
              mobilePhaseCodes: ["", "", "", "", "", ""],
              detectorTypeId: "",
              pharmacopoeialId: [],
              sampleInjection: 0,
              standardInjection: 0,
              blankInjection: 0,
              bracketingFrequency: 0, // ✅ Add this
              injectionTime: 0, // ✅ Add this
              runTime: 0, // ✅ Add this
              washTime: 0, // ✅ Add this
              systemSuitability: 0,
              sensitivity: 0,
              placebo: 0,
              reference1: 0,
              reference2: 0,
              uniqueRuntimes: false,
              blankRunTime: 0,
              standardRunTime: 0,
              sampleRunTime: 0,
              systemSuitabilityRunTime: 0,
              sensitivityRunTime: 0,
              placeboRunTime: 0,
              reference1RunTime: 0,
              reference2RunTime: 0,
              isOutsourcedTest: false,
              numberOfInjectionsAMV: 0,
              numberOfInjectionsPV: 0,
              numberOfInjectionsCV: 0,
              numberOfInjections: 0,
              bulk: false,
              fp: false,
              stabilityFinal: false,
              stabilityPartial: false,
              amv: false,
              pv: false,
              cv: false,
              isLinked: false,
            },
          ],
        });
      }
      setShowApiPopup(true);
    };

    const saveApiData = (data: ApiData) => {
      const currentApis = getValues().apis;
      if (editingApiIndex !== null) {
        currentApis[editingApiIndex] = data;
      } else {
        currentApis.push(data);
      }
      reset({ ...getValues(), apis: currentApis });
      setShowApiPopup(false);
      setCurrentApiData(null);
      setEditingApiIndex(null);
    };

    const removeApi = (index: number) => {
      const currentApis = getValues().apis;
      if (currentApis.length > 1) {
        currentApis.splice(index, 1);
        reset({ ...getValues(), apis: currentApis });
      }
    };

    const handleAddProduct = () => {
      const selectedProductObj = products.find(
        (p) => p._id === selectedProduct
      );
      if (
        selectedProduct &&
        selectedProductObj &&
        !productFields.some((field) => field.id === selectedProduct)
      ) {
        appendProduct({
          id: selectedProduct,
          productCode: selectedProductObj.productCode,
          productName: selectedProductObj.productName,
        });
        setSelectedProduct("");
      }
    };

    const departmentOptions = getDepartmentOptions();

    return (
      <>
        <div
          className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onCancel}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {initialData ? "Edit MFC Record" : "Create New MFC Record"}
                </h2>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-white hover:text-red-400 text-xl font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(handleFormSubmit, handleFormError)}
              className="p-6 flex-1 overflow-y-auto"
            >
              {/* Global Form Error */}
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-red-800">
                      {submitError}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MFC Number *
                  </label>
                  <input
                    type="text"
                    {...register("mfcNumber")}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.mfcNumber
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter MFC number"
                  />
                  {errors.mfcNumber?.message && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.mfcNumber.message}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generic Name *
                  </label>
                  <input
                    type="text"
                    {...register("genericName")}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.genericName
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter generic name"
                  />
                  {errors.genericName?.message && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.genericName.message}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    {...register("departmentId")}
                    disabled={masterDataLoading}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.departmentId
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map(
                      (option: { value: string; label: string }) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                  {errors.departmentId?.message && (
                    <div className="mt-1 flex items-center text-sm text-red-600">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {errors.departmentId.message}
                    </div>
                  )}
                </div>
              </div>

              {/* NEW: Add MFC Status Section */}
              {/* <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  MFC Status & Configuration
                </label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("isObsolete")}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Mark as Obsolete
                    </span>
                  </label>
                </div>
              </div> */}

              {/* Visual Warning for Obsolete Status */}
              {watch("isObsolete") && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-red-800">
                      ⚠️ This MFC is marked as <strong>OBSOLETE</strong>. It
                      will be archived and not available for active use.
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  API Information *
                </label>

                <div className="space-y-3">
                  {getValues().apis?.map((api, apiIndex) => (
                    <div
                      key={apiIndex}
                      className={`bg-gradient-to-r from-gray-50 to-gray-100 p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
                        errors.apis?.[apiIndex]
                          ? "border-red-200 bg-red-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex gap-10 items-start justify-between">
                        <div className="flex-1">
                          {/* API Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <h3 className="font-bold text-lg text-gray-900 tracking-wide">
                                {getApiLabel(api.apiName) || "Unnamed API"}
                              </h3>
                              {errors.apis?.[apiIndex] && (
                                <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded">
                                  Has Errors
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openApiPopup(apiIndex)}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeApi(apiIndex)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Test Types - keep your existing display code */}
                          <div className="space-y-4">
                            {api.testTypes?.map((testType, index) => (
                              <div
                                key={index}
                                className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm"
                              >
                                {/* Keep all your existing test type display code */}
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-base">
                                      {getTestTypeLabel(testType.testTypeId)}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Test Type {index + 1}
                                    </p>
                                  </div>

                                  {/* Status Badges */}
                                  <div className="flex flex-wrap gap-1">
                                    {testType.isLinked && (
                                      <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                                        LINKED
                                      </span>
                                    )}
                                    {testType.selectMakeSpecific && (
                                      <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                        Make Specific
                                      </span>
                                    )}
                                    {/* Keep all your other status badges */}
                                  </div>
                                </div>

                                {/* Keep all your existing grid layouts and content display */}
                                {/* Main Details Grid, Injection Details, Mobile Phases, etc. */}
                                {/* ... existing content ... */}
                              </div>
                            )) || (
                              <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                                <p className="text-sm">
                                  No test types configured for this API
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => openApiPopup()}
                    className="w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
                  >
                    + Add New API
                  </button>
                </div>
                {errors.apis?.message && (
                  <div className="mt-1 flex items-center text-sm text-red-600">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.apis.message}
                  </div>
                )}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Product Codes *
                </label>
                <div className="flex gap-4 mb-4">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    disabled={isLoadingProducts}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.productIds
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Product Code</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.productCode} - {product.productName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={!selectedProduct || isLoadingProducts}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Product Code
                  </button>
                </div>
                <div className="mb-8">
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register("isObsolete")}
                        className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Mark as Obsolete
                      </span>
                    </label>
                  </div>
                </div>
                {errors.productIds?.message && (
                  <div className="mt-1 flex items-center text-sm text-red-600">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.productIds.message}
                  </div>
                )}
                {/* Keep your existing product fields display code */}
                <div className="space-y-2">
                  {isLoadingProducts ? (
                    <div className="text-sm text-gray-500">
                      Loading products...
                    </div>
                  ) : (
                    productFields.map((productField, index) => {
                      // Keep your existing product field rendering logic
                      let product = null;
                      if (
                        productField.productCode &&
                        productField.productName
                      ) {
                        product = {
                          productCode: productField.productCode,
                          productName: productField.productName,
                        };
                      } else {
                        product = products.find(
                          (p) => p._id === productField.id
                        );
                      }
                      return (
                        <div
                          key={productField.id || index}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border"
                        >
                          <span className="text-sm text-gray-800">
                            {product && product.productCode
                              ? `${product.productCode} - ${product.productName}`
                              : `Loading product... (${productField.id})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeProduct(index)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={masterDataLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {masterDataLoading ? "Loading..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {showApiPopup && currentApiData && (
          <ApiPopup
            apiData={currentApiData}
            onSave={saveApiData}
            onClose={() => setShowApiPopup(false)}
            title={editingApiIndex !== null ? "Edit API" : "Add New API"}
            allApis={getValues().apis}
            currentApiIndex={editingApiIndex || -1}
          />
        )}
      </>
    );
  }
);

MFCMasterForm.displayName = "MFCMasterForm";

export default MFCMasterForm;