"use client";

import React, { forwardRef, useEffect, useState } from "react";
import { useForm, useFieldArray, Controller, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMasterDataContext } from "@/context/MasterDataContext";
import MobilePhaseDropdown from "./MobilePhaseDropdown";
import ColumnPopup from "./ColumnPopUp";

// Validation schemas
const testTypeSchema = z.object({
  testTypeId: z.string().min(1, "Test Type is required"),
  columnCode: z.string().min(1, "ColumnCode is required"),
  mobilePhaseCodes: z
    .array(z.string())
    .refine(
      (codes) => codes.filter((code) => code.trim() !== "").length >= 1,
      "At least one mobile phase code is required"
    ),
  detectorTypeId: z.string().min(1, "Detector Type is required"),
  pharmacopoeialId: z.string().min(1, "Pharmacopoeial is required"),
  sampleInjection: z.number().min(0, "Sample Injection must be >= 0"),
  standardInjection: z.number().min(0, "Standard Injection must be >= 0"),
  blankInjection: z.number().min(0, "Blank Injection must be >= 0"),
  bracketingFrequency: z.number().min(0, "Bracketing Frequency must be >= 0"),
  injectionTime: z.number().min(0, "Injection Time must be >= 0"),
  runTime: z.number().min(0, "Run Time must be >= 0"),
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
      .min(1, "At least one Product Code is required"),
    isLinked: z.boolean(),
  })
  .superRefine((data, ctx) => {
    data.apis.forEach((api, apiIndex) => {
      api.testTypes.forEach((testType, testTypeIndex) => {
        if (testType.amv || testType.pv || testType.cv) {
          if (!testType.numberOfInjections || testType.numberOfInjections < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [
                `apis.${apiIndex}.testTypes.${testTypeIndex}.numberOfInjections`,
              ],
              message:
                "Number of Injections is required when AMV, PV, or CV is selected",
            });
          }
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
    // Add this new property
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

// Helper function to check if two test types are identical (excluding isLinked)
const areTestTypesIdentical = (
  testType1: TestTypeData,
  testType2: TestTypeData
): boolean => {
  // List all fields that need to be compared (excluding isLinked)
  const fieldsToCompare = [
    "testTypeId",
    "columnCode",
    "mobilePhaseCodes", // Added this field to the array
    "detectorTypeId",
    "pharmacopoeialId",
    "sampleInjection",
    "standardInjection",
    "blankInjection",
    "bracketingFrequency",
    "injectionTime",
    "runTime",
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
      // Special handling for mobilePhaseCodes array
      const codes1 = testType1.mobilePhaseCodes?.filter((code) => code && code.trim() !== "") || [];
      const codes2 = testType2.mobilePhaseCodes?.filter((code) => code && code.trim() !== "") || [];
      
      if (codes1.length !== codes2.length) return false;
      
      // Sort both arrays to compare regardless of order
      const sorted1 = [...codes1].sort();
      const sorted2 = [...codes2].sort();
      
      for (let i = 0; i < sorted1.length; i++) {
        if (sorted1[i] !== sorted2[i]) return false;
      }
    } else {
      // Regular field comparison
      const val1 = testType1[field as keyof TestTypeData];
      const val2 = testType2[field as keyof TestTypeData];
      
      // Handle undefined/null values - treat them as equal to 0 for numbers, false for booleans
      if (typeof val1 === 'number' || typeof val2 === 'number') {
        const num1 = val1 ?? 0;
        const num2 = val2 ?? 0;
        if (num1 !== num2) return false;
      } else if (typeof val1 === 'boolean' || typeof val2 === 'boolean') {
        const bool1 = val1 ?? false;
        const bool2 = val2 ?? false;
        if (bool1 !== bool2) return false;
      } else {
        // For strings and other types
        if (val1 !== val2) return false;
      }
    }
  }
  
  return true;
};

// Helper function to find linking suggestions across all APIs
const findLinkingSuggestions = (apis: ApiData[], getApiLabel?: (name: string) => string): LinkingSuggestion[] => {
  const suggestions: LinkingSuggestion[] = [];
  const processedGroups = new Set<string>(); // Track processed groups
  
  // Find all groups of identical test types
  const identicalGroups: Array<Array<{apiIndex: number; testTypeIndex: number; apiName: string}>> = [];
  const assignedToGroup = new Set<string>(); // Track which test types are already in a group
  
  // Compare all test types to find identical ones
  for (let apiIndex1 = 0; apiIndex1 < apis.length; apiIndex1++) {
    const api1 = apis[apiIndex1];
    for (let testTypeIndex1 = 0; testTypeIndex1 < api1.testTypes.length; testTypeIndex1++) {
      const key1 = `${apiIndex1}-${testTypeIndex1}`;
      
      // Skip if already assigned to a group
      if (assignedToGroup.has(key1)) continue;
      
      const testType1 = api1.testTypes[testTypeIndex1];
      const currentGroup: Array<{apiIndex: number; testTypeIndex: number; apiName: string}> = [{
        apiIndex: apiIndex1,
        testTypeIndex: testTypeIndex1,
        apiName: api1.apiName
      }];
      
      // Mark as assigned
      assignedToGroup.add(key1);
      
      // Find all other identical test types
      for (let apiIndex2 = apiIndex1; apiIndex2 < apis.length; apiIndex2++) {
        const api2 = apis[apiIndex2];
        const startIndex = (apiIndex2 === apiIndex1) ? testTypeIndex1 + 1 : 0;
        
        for (let testTypeIndex2 = startIndex; testTypeIndex2 < api2.testTypes.length; testTypeIndex2++) {
          const key2 = `${apiIndex2}-${testTypeIndex2}`;
          
          // Skip if already assigned to a group
          if (assignedToGroup.has(key2)) continue;
          
          const testType2 = api2.testTypes[testTypeIndex2];
          
          // Use the areTestTypesIdentical function to check if they're identical
          if (areTestTypesIdentical(testType1, testType2)) {
            currentGroup.push({
              apiIndex: apiIndex2,
              testTypeIndex: testTypeIndex2,
              apiName: api2.apiName
            });
            assignedToGroup.add(key2);
          }
        }
      }
      
      // Only add groups with AT LEAST 2 members (need actual matches, not just the original)
      // This prevents showing suggestions for test types that have no matches
      if (currentGroup.length >= 2) {
        identicalGroups.push(currentGroup);
      }
    }
  }
  
  // Create ONE suggestion per group of identical test types
  identicalGroups.forEach((group) => {
    // Double-check: skip if group has less than 2 members (shouldn't happen but safety check)
    if (group.length < 2) return;
    
    // Sort the group for consistent processing
    group.sort((a, b) => {
      if (a.apiIndex !== b.apiIndex) return a.apiIndex - b.apiIndex;
      return a.testTypeIndex - b.testTypeIndex;
    });
    
    // Create a list of all test types in the group
    const testTypeDescriptions = group.map(item => 
      `${getApiLabel ? getApiLabel(item.apiName) : item.apiName} (Test Type ${item.testTypeIndex + 1})`
    );
    
    // Remove any duplicate descriptions and join them
    const uniqueDescriptions = [...new Set(testTypeDescriptions)].join(', ');
    
    // Create a single suggestion for the entire group
    // Use the first item as the "primary" for the suggestion
    const primaryItem = group[0];
    
    suggestions.push({
      apiIndex: primaryItem.apiIndex,
      testTypeIndex: primaryItem.testTypeIndex,
      matchingTestTypes: group.slice(1), // All other members except the first
      allIdenticalTestTypes: group, // Include the complete group for reference
      message: `These test types are identical and can be linked: ${uniqueDescriptions}`
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
        columnCode: testType.columnCode || "",
        mobilePhaseCodes: testType.mobilePhaseCodes || ["", "", "", ""],
        detectorTypeId: testType.detectorTypeId || "",
        pharmacopoeialId: testType.pharmacopoeialId || "",
        sampleInjection: testType.sampleInjection || 0,
        standardInjection: testType.standardInjection || 0,
        blankInjection: testType.blankInjection || 0,
        bracketingFrequency: testType.bracketingFrequency || 0,
        injectionTime: testType.injectionTime || 0,
        runTime: testType.runTime || 0,
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
    getPharmacopoeialOptions,
    getColumnOptions,
    getApiOptions,
  } = useMasterDataContext();

  // Initialize form with proper default values
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<ApiData>({
    defaultValues: {
      apiName: apiData?.apiName || "",
      testTypes: apiData?.testTypes?.length > 0 
        ? apiData.testTypes.map(tt => ({
            ...tt,
            // Ensure mobile phase codes are always an array of strings
            mobilePhaseCodes: tt.mobilePhaseCodes || ["", "", "", ""]
          }))
        : [{
            testTypeId: "",
            columnCode: "",
            mobilePhaseCodes: ["", "", "", ""],
            detectorTypeId: "",
            pharmacopoeialId: "",
            sampleInjection: 0,
            standardInjection: 0,
            blankInjection: 0,
            bracketingFrequency: 0,
            injectionTime: 0,
            runTime: 0,
            numberOfInjections: 0,
            bulk: false,
            fp: false,
            stabilityPartial: false,
            stabilityFinal: false,
            amv: false,
            pv: false,
            cv: false,
            isLinked: false,
          }]
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
  const [linkingSuggestions, setLinkingSuggestions] = useState<LinkingSuggestion[]>([]);
  const [showColumnPopup, setShowColumnPopup] = useState(false);
const [currentColumnTestTypeIndex, setCurrentColumnTestTypeIndex] = useState<number | null>(null);

  const testTypeOptions = getTestTypeOptions();
  const detectorTypeOptions = getDetectorTypeOptions();
  const pharmacopoeialOptions = getPharmacopoeialOptions();
  const columnOptions = getColumnOptions();
  const apiOptions = getApiOptions();

  const watchedValues = watch();

  // Check for linking suggestions
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

    
    
    // Filter to show only suggestions that include test types from the current API
    const currentApiIndexToCheck = currentApiIndex >= 0 ? currentApiIndex : allApisForChecking.length - 1;
    
    const relevantSuggestions = suggestions.filter((suggestion) => {
      // Only show suggestions with 2 or more test types
      if (!suggestion.allIdenticalTestTypes || suggestion.allIdenticalTestTypes.length < 2) {
        return false;
      }
      // Check if any test type in the group belongs to the current API
      return suggestion.allIdenticalTestTypes.some(
        (item) => item.apiIndex === currentApiIndexToCheck
      );
    });
    
    setLinkingSuggestions(relevantSuggestions);
  };

  // Handle linking change
  const handleLinkingChange = (suggestionIndex: number, shouldLink: boolean) => {
    const suggestion = linkingSuggestions[suggestionIndex];

    if (shouldLink && suggestion.allIdenticalTestTypes) {
      // Set isLinked = true for ALL test types in the group
      suggestion.allIdenticalTestTypes.forEach((item) => {
        if (item.apiIndex === (currentApiIndex >= 0 ? currentApiIndex : allApis.length)) {
          // This is in the current API popup
          setValue(`testTypes.${item.testTypeIndex}.isLinked`, true);
        }
      });

      // Remove this suggestion
      setLinkingSuggestions((prev) =>
        prev.filter((_, index) => index !== suggestionIndex)
      );
    }
  };

  // Handle test type field changes
  const handleTestTypeChange = (
    testTypeIndex: number,
    field: string,
    value: any
  ) => {
    const currentValues = getValues();
    const currentTestType = currentValues.testTypes[testTypeIndex];
    
    // If test type was linked, unlink it when changing
    if (currentTestType.isLinked) {
      setValue(`testTypes.${testTypeIndex}.isLinked`, false);
    }
    
    setValue(`testTypes.${testTypeIndex}.${field}` as any, value);
    
    // Recheck linking suggestions after change
    setTimeout(() => {
      checkLinkingSuggestions();
    }, 100);
  };

  // Mobile Phase Code Fields Component
  const MobilePhaseCodeFields = ({
    testTypeIndex,
    control,
  }: {
    testTypeIndex: number;
    control: any;
  }) => {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((index) => (
          <div key={index}>
            <label className="block text-xs text-gray-500 mb-1">
              Phase {index + 1}
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
        ))}
      </div>
    );
  };

  // Initialize position and reset form when apiData changes
  useEffect(() => {
    if (apiData) {
      const processedData = {
        apiName: apiData.apiName || "",
        testTypes: apiData.testTypes?.map(tt => ({
          ...tt,
          mobilePhaseCodes: Array.isArray(tt.mobilePhaseCodes) 
            ? tt.mobilePhaseCodes.map(code => code || "")
            : ["", "", "", ""]
        })) || []
      };
      reset(processedData);
    }
  }, [apiData, reset]);

  // Check linking suggestions when data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedValues.apiName || watchedValues.testTypes?.length > 0) {
        checkLinkingSuggestions();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedValues.apiName, JSON.stringify(watchedValues.testTypes)]);

  // Dragging functionality
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

  // Form submission handler
  const onSubmitForm = (data: ApiData) => {
    // Ensure mobile phase codes are properly formatted
    const processedData = {
      ...data,
      testTypes: data.testTypes.map(tt => ({
        ...tt,
        mobilePhaseCodes: tt.mobilePhaseCodes?.map(code => code || "") || ["", "", "", ""]
      }))
    };
    
    console.log("Saving API data:", processedData);
    onSave(processedData);
  };

  // Error handler for form submission
  const onSubmitError = (errors: any) => {
    console.error("Form validation errors:", errors);
    
    if (errors.apiName) {
      alert(`API Name: ${errors.apiName.message}`);
    }
    
    if (errors.testTypes) {
      errors.testTypes.forEach((testTypeError: any, index: number) => {
        if (testTypeError) {
          const errorMessages = [];
          
          if (testTypeError.testTypeId) {
            errorMessages.push(`Test Type: ${testTypeError.testTypeId.message}`);
          }
          if (testTypeError.columnCode) {
            errorMessages.push(`Column: ${testTypeError.columnCode.message}`);
          }
          if (testTypeError.mobilePhaseCodes) {
            errorMessages.push(`Mobile Phases: ${testTypeError.mobilePhaseCodes.message}`);
          }
          if (testTypeError.detectorTypeId) {
            errorMessages.push(`Detector: ${testTypeError.detectorTypeId.message}`);
          }
          if (testTypeError.pharmacopoeialId) {
            errorMessages.push(`Pharmacopoeial: ${testTypeError.pharmacopoeialId.message}`);
          }
          if (testTypeError.numberOfInjections) {
            errorMessages.push(`Injections: ${testTypeError.numberOfInjections.message}`);
          }
          
          if (errorMessages.length > 0) {
            alert(`Test Type ${index + 1} Errors:\n${errorMessages.join('\n')}`);
          }
        }
      });
    }
  };

  const openColumnPopup = (testTypeIndex: number) => {
  setCurrentColumnTestTypeIndex(testTypeIndex);
  setShowColumnPopup(true);
};

// Add this function to handle column selection:
const handleColumnSelect = (columnData: { id: string; displayText: string; columnCode: string }) => {
  if (currentColumnTestTypeIndex !== null) {
    setValue(`testTypes.${currentColumnTestTypeIndex}.columnCode`, columnData.columnCode);
    handleTestTypeChange(currentColumnTestTypeIndex, "columnCode", columnData.columnCode);
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
              className="text-white hover:text-gray-200 text-xl font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmitForm, onSubmitError)} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Name *
            </label>
            <select
              {...register("apiName")}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.apiName ? "border-red-400" : "border-gray-300"
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
              <p className="mt-1 text-sm text-red-600">{errors.apiName.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Test Type Details
            </label>
            {testTypeFields.map((field, testTypeIndex) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-lg border mb-4">
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
                        register(`testTypes.${testTypeIndex}.testTypeId`).onChange(e);
                        handleTestTypeChange(testTypeIndex, "testTypeId", e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Test Type</option>
                      {testTypeOptions.map((option: { value: string; label: string }) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.testTypes?.[testTypeIndex]?.testTypeId?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].testTypeId.message}
                      </p>
                    )}
                  </div>

                  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Column Code *
  </label>
  <div className="flex gap-2">
    <select
      {...register(`testTypes.${testTypeIndex}.columnCode`)}
      onChange={(e) => {
        register(`testTypes.${testTypeIndex}.columnCode`).onChange(e);
        handleTestTypeChange(testTypeIndex, "columnCode", e.target.value);
      }}
      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select Column</option>
      {columnOptions.map((option: { value: string; label: string }) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
  </div>
  {errors.testTypes?.[testTypeIndex]?.columnCode?.message && (
    <p className="mt-1 text-sm text-red-600">
      {errors.testTypes[testTypeIndex].columnCode.message}
    </p>
  )}
</div>


                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Detector Type *
                    </label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.detectorTypeId`)}
                      onChange={(e) => {
                        register(`testTypes.${testTypeIndex}.detectorTypeId`).onChange(e);
                        handleTestTypeChange(testTypeIndex, "detectorTypeId", e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Detector</option>
                      {detectorTypeOptions.map((option: { value: string; label: string }) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.testTypes?.[testTypeIndex]?.detectorTypeId?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].detectorTypeId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pharmacopoeial *
                    </label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.pharmacopoeialId`)}
                      onChange={(e) => {
                        register(`testTypes.${testTypeIndex}.pharmacopoeialId`).onChange(e);
                        handleTestTypeChange(testTypeIndex, "pharmacopoeialId", e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Pharmacopoeial</option>
                      {pharmacopoeialOptions.map((option: { value: string; label: string }) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.testTypes?.[testTypeIndex]?.pharmacopoeialId?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].pharmacopoeialId.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Phase Codes *
                  </label>
                  <MobilePhaseCodeFields testTypeIndex={testTypeIndex} control={control} />
                  {errors.testTypes?.[testTypeIndex]?.mobilePhaseCodes?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.testTypes[testTypeIndex].mobilePhaseCodes.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-3 mb-4">
                  {[
                    { field: "sampleInjection", label: "Sample Injection" },
                    { field: "standardInjection", label: "Standard Injection" },
                    { field: "blankInjection", label: "Blank Injection" },
                    { field: "bracketingFrequency", label: "Bracketing Frequency" },
                    { field: "injectionTime", label: "Injection Time" },
                    { field: "runTime", label: "Run Time" },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`testTypes.${testTypeIndex}.${field}` as any, {
                          valueAsNumber: true,
                        })}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          register(`testTypes.${testTypeIndex}.${field}` as any, {
                            valueAsNumber: true,
                          }).onChange({ target: { value } });
                          handleTestTypeChange(testTypeIndex, field, value);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      {errors.testTypes?.[testTypeIndex]?.[field as keyof TestTypeData]?.message && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.testTypes?.[testTypeIndex]?.[field as keyof TestTypeData]?.message}
                        </p>
                      )}
                    </div>
                  ))}
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
                  ].map(({ field, label }) => (
                    <label key={field} className="flex items-center">
                      <input
                        type="checkbox"
                        {...register(`testTypes.${testTypeIndex}.${field as keyof TestTypeData}`)}
                        onChange={(e) => {
                          register(`testTypes.${testTypeIndex}.${field as keyof TestTypeData}`).onChange(e);
                          handleTestTypeChange(testTypeIndex, field, e.target.checked);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>

                {(watchedValues?.testTypes?.[testTypeIndex]?.amv ||
                  watchedValues?.testTypes?.[testTypeIndex]?.pv ||
                  watchedValues?.testTypes?.[testTypeIndex]?.cv) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Injections *
                    </label>
                    <input
                      type="number"
                      step="1"
                      {...register(`testTypes.${testTypeIndex}.numberOfInjections`, {
                        valueAsNumber: true,
                      })}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        register(`testTypes.${testTypeIndex}.numberOfInjections`, {
                          valueAsNumber: true,
                        }).onChange({ target: { value } });
                        handleTestTypeChange(testTypeIndex, "numberOfInjections", value);
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.testTypes?.[testTypeIndex]?.numberOfInjections
                          ? "border-red-400"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter number of injections"
                    />
                    {errors.testTypes?.[testTypeIndex]?.numberOfInjections?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].numberOfInjections.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                appendTestType({
                  testTypeId: "",
                  columnCode: "",
                  mobilePhaseCodes: ["", "", "", ""],
                  detectorTypeId: "",
                  pharmacopoeialId: "",
                  sampleInjection: 0,
                  standardInjection: 0,
                  blankInjection: 0,
                  bracketingFrequency: 0,
                  injectionTime: 0,
                  runTime: 0,
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
                      Linking will synchronize these {suggestion.allIdenticalTestTypes?.length || 0} test types.
                      Any future changes to one will automatically update all linked test types.
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
              ? watchedValues?.testTypes?.[currentColumnTestTypeIndex]?.columnCode
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

    const {
      register,
      handleSubmit,
      control,
      getValues,
      formState: { errors },
      reset,
      setValue,
      watch,
    } = useForm<MFCFormData>({
      resolver: zodResolver(mfcFormSchema),
      defaultValues: transformInitialData(initialData),
    });

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

    const getPharmacopoeialLabel = (id: string) => {
      const option = getPharmacopoeialOptions().find(
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

    const handleCrossApiLinking = (
      apiIndex: number,
      testTypeIndex: number,
      matchingTestTypes: Array<{ apiIndex: number; testTypeIndex: number }>
    ) => {
      // Set isLinked = true for all matched test types across APIs
      const currentApis = getValues().apis;

      // Mark the source test type as linked
      setValue(`apis.${apiIndex}.testTypes.${testTypeIndex}.isLinked`, true);

      // Mark all matching test types as linked
      matchingTestTypes.forEach((match) => {
        setValue(
          `apis.${match.apiIndex}.testTypes.${match.testTypeIndex}.isLinked`,
          true
        );
      });

      // Update the form
      reset({ ...getValues(), apis: currentApis });
    };

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
              columnCode: "",
              mobilePhaseCodes: ["", "", "", ""],
              detectorTypeId: "",
              pharmacopoeialId: "",
              sampleInjection: 0,
              standardInjection: 0,
              blankInjection: 0,
              bracketingFrequency: 0,
              injectionTime: 0,
              runTime: 0,
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
            className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
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
                  className="text-white hover:text-gray-200 text-xl font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-white hover:bg-opacity-20 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-6 flex-1 overflow-y-auto"
            >
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MFC Number *
                  </label>
                  <input
                    type="text"
                    {...register("mfcNumber")}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.mfcNumber ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="Enter MFC number"
                  />
                  {errors.mfcNumber?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.mfcNumber.message}
                    </p>
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
                      errors.genericName ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="Enter generic name"
                  />
                  {errors.genericName?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.genericName.message}
                    </p>
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
                      errors.departmentId ? "border-red-400" : "border-gray-300"
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
                    <p className="mt-1 text-sm text-red-600">
                      {errors.departmentId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wash
                  </label>
                  <input
                    type="number"
                    {...register("wash", { valueAsNumber: true })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                    placeholder="Enter wash value"
                  />
                  {errors.wash?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.wash.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  API Information *
                </label>
                <div className="space-y-3">
                  {getValues().apis?.map((api, apiIndex) => (
                    <div
                      key={apiIndex}
                      className="flex gap-10 items-center justify-between bg-gray-50 p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm mb-2">
                          {getApiLabel(api.apiName) || "Unnamed API"}
                        </div>

                        <div className="space-y-2">
                          {api.testTypes?.map((testType, index) => (
                            <div
                              key={index}
                              className="bg-white border border-gray-200 rounded p-3 text-xs"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-gray-800">
                                  {getTestTypeLabel(testType.testTypeId)}
                                </span>
                                <div className="flex gap-1">
                                  {testType.isLinked && (
                                    <span className="bg-green-500 text-white px-1.5 py-0.5 rounded text-xs">
                                      LINKED
                                    </span>
                                  )}
                                  {testType.bulk && (
                                    <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded text-xs">
                                      Bulk
                                    </span>
                                  )}
                                  {testType.fp && (
                                    <span className="bg-green-500 text-white px-1.5 py-0.5 rounded text-xs">
                                      FP
                                    </span>
                                  )}
                                  {testType.stabilityPartial && (
                                    <span className="bg-yellow-500 text-white px-1.5 py-0.5 rounded text-xs">
                                      SP
                                    </span>
                                  )}
                                  {testType.stabilityFinal && (
                                    <span className="bg-yellow-600 text-white px-1.5 py-0.5 rounded text-xs">
                                      SF
                                    </span>
                                  )}
                                  {testType.amv && (
                                    <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded text-xs">
                                      AMV
                                    </span>
                                  )}
                                  {testType.pv && (
                                    <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded text-xs">
                                      PV
                                    </span>
                                  )}
                                  {testType.cv && (
                                    <span className="bg-purple-700 text-white px-1.5 py-0.5 rounded text-xs">
                                      CV
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-x-3 gap-y-1 text-gray-600">
                                <div>
                                  <span className="text-gray-500">Column:</span>{" "}
                                  {getColumnLabel(testType.columnCode)}
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Detector:
                                  </span>{" "}
                                  {getDetectorTypeLabel(
                                    testType.detectorTypeId
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500">Pharma:</span>{" "}
                                  {getPharmacopoeialLabel(
                                    testType.pharmacopoeialId
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500">Run:</span>{" "}
                                  {testType.runTime}min
                                </div>
                                <div>
                                  <span className="text-gray-500">Sample:</span>{" "}
                                  {testType.sampleInjection}
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Standard:
                                  </span>{" "}
                                  {testType.standardInjection}
                                </div>
                                <div>
                                  <span className="text-gray-500">Blank:</span>{" "}
                                  {testType.blankInjection}
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Bracket:
                                  </span>{" "}
                                  {testType.bracketingFrequency}
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    Inj.Time:
                                  </span>{" "}
                                  {testType.injectionTime}min
                                </div>
                                {(testType.amv || testType.pv || testType.cv) &&
                                  testType.numberOfInjections && (
                                    <div>
                                      <span className="text-gray-500">
                                        No.Inj:
                                      </span>{" "}
                                      {testType.numberOfInjections}
                                    </div>
                                  )}
                              </div>

                              {testType.mobilePhaseCodes?.filter(
                                (code) => code.trim() !== ""
                              ).length > 0 && (
                                <div className="mt-2 text-gray-600">
                                  <span className="text-gray-500">
                                    Mobile Phases:
                                  </span>{" "}
                                  {testType.mobilePhaseCodes
                                    ?.filter((code) => code.trim() !== "")
                                    .join(", ")}
                                </div>
                              )}
                            </div>
                          )) || (
                            <div className="text-sm text-gray-500">
                              No test types configured
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openApiPopup(apiIndex)}
                          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeApi(apiIndex)}
                          className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => openApiPopup()}
                    className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    + Add API
                  </button>
                </div>
                {errors.apis?.message && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.apis.message}
                  </p>
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
                      errors.productIds ? "border-red-400" : "border-gray-300"
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
                {errors.productIds?.message && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.productIds.message}
                  </p>
                )}
                <div className="space-y-2">
                  {isLoadingProducts ? (
                    <div className="text-sm text-gray-500">
                      Loading products...
                    </div>
                  ) : (
                    productFields.map((productField, index) => {
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
