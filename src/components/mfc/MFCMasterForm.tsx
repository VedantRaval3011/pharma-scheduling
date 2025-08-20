import React, { forwardRef, useEffect, useState } from "react";
import { useForm, useFieldArray, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMasterDataContext } from "@/context/MasterDataContext";
import MobilePhaseDropdown from "./MobilePhaseDropdown";

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

const productIdSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
});

const mfcFormSchema = z
  .object({
    mfcNumber: z.string().min(1, "MFC Number is required"),
    genericName: z.string().min(1, "Generic Name is required"),
    apis: z.array(apiSchema).min(1, "At least one API is required"),
    departmentId: z.string().min(1, "Department is required"),
    wash: z.string(),
    isLinked: z.boolean(),
    productIds: z
      .array(productIdSchema)
      .min(1, "At least one product ID is required"),
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

interface Product {
  _id: string;
  productName: string;
  productId: string;
}

interface ApiPopupProps {
  apiData: ApiData;
  onSave: (data: ApiData) => void;
  onClose: () => void;
  title: string;
}

interface MFCMasterFormProps {
  onSubmit: (data: MFCFormData) => void;
  initialData?: any;
  onCancel: () => void;
}

const getStorageIds = () => {
  if (typeof window === "undefined")
    return { companyId: null, locationId: null };
  const companyId = localStorage.getItem("companyId");
  const locationId = localStorage.getItem("locationId");
  return { companyId, locationId };
};

const transformInitialData = (data: any): MFCFormData => {
  if (!data) {
    return {
      mfcNumber: "",
      genericName: "",
      apis: [],
      departmentId: "",
      wash: "",
      isLinked: false,
      productIds: [{ id: "" }],
    };
  }

  const firstGeneric = data.generics?.[0];
  const apis = firstGeneric?.apis || [];

  let productIds = [{ id: "" }];
  if (data.productIds && Array.isArray(data.productIds) && data.productIds.length > 0) {
    productIds = data.productIds.map((pi: any) => ({
      id: pi.id || pi.productId || pi.code || pi || "",
    }));
    if (productIds.every(pi => !pi.id)) {
      productIds = [{ id: "" }];
    }
  }

  return {
    mfcNumber: data.mfcNumber || "",
    genericName: firstGeneric?.genericName || "",
    apis: apis.map((api: any) => ({
      apiName: api.apiName || "",
      testTypes: (api.testTypes || []).map((testType: any) => ({
        testTypeId: testType.testTypeId || "",
        columnCode: testType.columnCode || "",
        mobilePhaseCodes: Array.isArray(testType.mobilePhaseCodes)
          ? [...testType.mobilePhaseCodes, "", "", "", ""].slice(0, 4)
          : ["", "", "", ""],
        detectorTypeId: testType.detectorTypeId || "",
        pharmacopoeialId: testType.pharmacopoeialId || "",
        sampleInjection: testType.sampleInjection || 0,
        standardInjection: testType.standardInjection || 0,
        blankInjection: testType.blankInjection || 0,
        bracketingFrequency: testType.bracketingFrequency || 0,
        injectionTime: testType.injectionTime || 0,
        runTime: testType.runTime || 0,
        testApplicability: testType.testApplicability || false,
        numberOfInjections: testType.numberOfInjections || 0,
        bulk: testType.bulk ?? false,
        fp: testType.fp ?? false,
        stabilityPartial: testType.stabilityPartial ?? testType.partialStability ?? testType.stability ?? false,
        stabilityFinal: testType.stabilityFinal ?? testType.final ?? false,
        amv: testType.amv ?? false,
        pv: testType.pv ?? false,
        cv: testType.cv ?? false,
        isLinked: testType.isLinked ?? false,
      })),
    })),
    departmentId: data.departmentId || "",
    wash: data.wash || "",
    isLinked: data.isLinked ?? false,
    productIds,
  };
};

const ApiPopup: React.FC<ApiPopupProps> = ({
  apiData,
  onSave,
  onClose,
  title,
}) => {
  const {
    getTestTypeOptions,
    getDetectorTypeOptions,
    getPharmacopoeialOptions,
    getColumnOptions,
    getApiOptions,
  } = useMasterDataContext();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<ApiData>({
    defaultValues: apiData,
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

  const testTypeOptions = getTestTypeOptions();
  const detectorTypeOptions = getDetectorTypeOptions();
  const pharmacopoeialOptions = getPharmacopoeialOptions();
  const columnOptions = getColumnOptions();

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
              render={({ field }) => (
                <MobilePhaseDropdown
                  value={field.value || ""}
                  onChange={field.onChange}
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

  const watchTestCategories = watch();

  useEffect(() => {
    if (apiData) {
      reset(apiData);
    }
  }, [apiData, reset]);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="p-6">
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
              {getApiOptions().map((option: { value: string; label: string }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.apiName?.message && (
              <p className="mt-1 text-sm text-red-600">
                {errors.apiName.message}
              </p>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].testTypeId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Column Code *
                    </label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.columnCode`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      {...register(
                        `testTypes.${testTypeIndex}.pharmacopoeialId`
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Pharmacopoeial</option>
                      {pharmacopoeialOptions.map(
                        (option: { value: string; label: string }) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                    {errors.testTypes?.[testTypeIndex]?.pharmacopoeialId
                      ?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {
                          errors.testTypes[testTypeIndex].pharmacopoeialId
                            .message
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Phase Codes
                  </label>
                  <MobilePhaseCodeFields
                    testTypeIndex={testTypeIndex}
                    control={control}
                  />
                  {errors.testTypes?.[testTypeIndex]?.mobilePhaseCodes
                    ?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.testTypes[testTypeIndex].mobilePhaseCodes.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sample Injection
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(
                        `testTypes.${testTypeIndex}.sampleInjection`,
                        { valueAsNumber: true }
                      )}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    {errors.testTypes?.[testTypeIndex]?.sampleInjection
                      ?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {
                          errors.testTypes[testTypeIndex].sampleInjection
                            .message
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Standard Injection
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(
                        `testTypes.${testTypeIndex}.standardInjection`,
                        { valueAsNumber: true }
                      )}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    {errors.testTypes?.[testTypeIndex]?.standardInjection
                      ?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {
                          errors.testTypes[testTypeIndex].standardInjection
                            .message
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Blank Injection
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(
                        `testTypes.${testTypeIndex}.blankInjection`,
                        { valueAsNumber: true }
                      )}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    {errors.testTypes?.[testTypeIndex]?.blankInjection
                      ?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].blankInjection.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bracketing Frequency
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(
                        `testTypes.${testTypeIndex}.bracketingFrequency`,
                        { valueAsNumber: true }
                      )}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    {errors.testTypes?.[testTypeIndex]?.bracketingFrequency
                      ?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {
                          errors.testTypes[testTypeIndex].bracketingFrequency
                            .message
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Injection Time
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`testTypes.${testTypeIndex}.injectionTime`, {
                        valueAsNumber: true,
                      })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    {errors.testTypes?.[testTypeIndex]?.injectionTime
                      ?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].injectionTime.message}
                      </p>
                    )}
                  </div>
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    {errors.testTypes?.[testTypeIndex]?.runTime?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.testTypes[testTypeIndex].runTime.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.bulk` as const)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">Bulk</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.fp` as const)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">FP</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.stabilityPartial` as const)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">Stability Partial</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.stabilityFinal` as const)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">Stability Final</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.amv` as const)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">AMV</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.pv` as const)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">PV</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(`testTypes.${testTypeIndex}.cv` as const)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">CV</span>
                  </label>
                </div>

                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    {...register(`testTypes.${testTypeIndex}.isLinked`)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Is Linked
                  </label>
                </div>

                {(watchTestCategories?.testTypes?.[testTypeIndex]?.amv ||
                  watchTestCategories?.testTypes?.[testTypeIndex]?.pv ||
                  watchTestCategories?.testTypes?.[testTypeIndex]?.cv) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Injections *
                    </label>
                    <input
                      type="number"
                      step="1"
                      {...register(
                        `testTypes.${testTypeIndex}.numberOfInjections`,
                        {
                          valueAsNumber: true,
                        }
                      )}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.testTypes?.[testTypeIndex]?.numberOfInjections
                          ? "border-red-400"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter number of injections"
                    />
                    {errors.testTypes?.[testTypeIndex]?.numberOfInjections
                      ?.message && (
                      <p className="mt-1 text-sm text-red-600">
                        {
                          errors.testTypes[testTypeIndex].numberOfInjections
                            .message
                        }
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
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Save API
            </button>
          </div>
        </form>
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
      isLoading: masterDataLoading,
    } = useMasterDataContext();

    const [showApiPopup, setShowApiPopup] = useState(false);
    const [editingApiIndex, setEditingApiIndex] = useState<number | null>(null);
    const [currentApiData, setCurrentApiData] = useState<ApiData | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    const {
      register,
      handleSubmit,
      control,
      getValues,
      formState: { errors },
      reset,
      watch,
    } = useForm<MFCFormData>({
      resolver: zodResolver(mfcFormSchema),
      defaultValues: transformInitialData(initialData),
    });

    const {
      fields: productIdFields,
      append: appendProductId,
      remove: removeProductId,
    } = useFieldArray({
      control,
      name: "productIds",
    });

    const watchProductIds = watch("productIds");

    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const { companyId, locationId } = getStorageIds();
        if (!companyId || !locationId) {
          console.error("Company ID or Location ID missing");
          return;
        }
        const response = await fetch(
          `/api/admin/product?locationId=${locationId}&companyId=${companyId}`
        );
        const data = await response.json();
        if (data.success) {
          setProducts(data.data.map((p: any) => ({
            _id: p._id,
            productName: p.productName,
            productId: p.productId || p.productCode || p.id || "",
          })));
        } else {
          console.error("Failed to fetch products:", data.error);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    useEffect(() => {
      fetchProducts();
    }, []);

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

    const departmentOptions = getDepartmentOptions();

    const getProductDisplay = (productId: string) => {
      const product = products.find((p) => p.productId === productId);
      return product ? `${product.productName} (${product.productId})` : productId || "Select a product";
    };

    return (
      <>
        <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <h2 className="text-xl font-bold">
                {initialData ? "Edit MFC Record" : "Create New MFC Record"}
              </h2>
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
                    type="text"
                    {...register("wash")}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                    placeholder="Enter wash value"
                  />
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
                      className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {api.apiName || "Unnamed API"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {api.testTypes?.length || 0} test types configured
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
                  Product IDs *
                </label>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {productIdFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-center">
                      <select
                        {...register(`productIds.${index}.id`)}
                        className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.productIds?.[index]?.id
                            ? "border-red-400"
                            : "border-gray-300"
                        }`}
                        disabled={isLoadingProducts}
                      >
                        <option value="">Select Product Code</option>
                        {products.map((product) => (
                          <option key={product._id} value={product.productId}>
                            {product.productId}
                          </option>
                        ))}
                      </select>
                      <div className="flex-1 text-sm text-gray-600">
                        {getProductDisplay(watchProductIds?.[index]?.id)}
                      </div>
                      {productIdFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProductId(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {errors.productIds?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.productIds.message}
                    </p>
                  )}
                  {Array.isArray(errors.productIds) && errors.productIds.some((err) => err?.id) && (
                    <p className="mt-1 text-sm text-red-600">
                      Please select a valid Product ID for all fields
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => appendProductId({ id: "" })}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    + Add Product ID
                  </button>
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
                  disabled={masterDataLoading || isLoadingProducts}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {masterDataLoading || isLoadingProducts
                    ? "Loading..."
                    : "Submit"}
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
          />
        )}
      </>
    );
  }
);

export default MFCMasterForm;
