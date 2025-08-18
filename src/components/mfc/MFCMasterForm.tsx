import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MobilePhaseDropdown from "./MobilePhaseDropdown";
import { useMasterDataContext } from "@/context/MasterDataContext";

// Validation schemas
const testTypeSchema = z.object({
  testTypeId: z.string().min(1, "Test Type is required"),
  columnCode: z.string().min(1, "Column Code is required"),
  mobilePhaseCodes: z.array(z.string()).refine(
    (codes) => codes.filter(code => code.trim() !== "").length >= 1,
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
  testApplicability: z.boolean(),
});

const apiSchema = z.object({
  apiName: z.string().min(1, "API Name is required"),
  testTypes: z.array(testTypeSchema).min(1, "At least one test type is required"),
});

const productCodeSchema = z.object({
  code: z.string().min(1, "Product Code is required"),
});

const mfcFormSchema = z.object({
  mfcNumber: z.string().min(1, "MFC Number is required"),
  genericName: z.string().min(1, "Generic Name is required"),
  apis: z.array(apiSchema).min(1, "At least one API is required"),
  departmentId: z.string().min(1, "Department is required"),
  bulk: z.boolean(),
  fp: z.boolean(),
  stabilityPartial: z.boolean(),
  stabilityFinal: z.boolean(),
  amv: z.boolean(),
  pv: z.boolean(),
  cv: z.boolean(),
  productCodes: z.array(productCodeSchema).min(1, "At least one product code is required"),
});

type MFCFormData = z.infer<typeof mfcFormSchema>;
type TestTypeData = z.infer<typeof testTypeSchema>;
type ApiData = z.infer<typeof apiSchema>;

interface MFCMasterFormProps {
  onSubmit: (data: MFCFormData) => void;
  initialData?: Partial<MFCFormData> | null;
  onCancel: () => void;
}

interface ApiPopupProps {
  apiData: ApiData;
  onSave: (data: ApiData) => void;
  onClose: () => void;
  title: string;
}

const MFCMasterForm = forwardRef(({ onSubmit, initialData, onCancel }: MFCMasterFormProps, ref) => {
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
  const [currentApiData, setCurrentApiData] = useState<any>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<MFCFormData>({
    resolver: zodResolver(mfcFormSchema),
    mode: "onChange",
    defaultValues: {
      mfcNumber: "",
      genericName: "",
      apis: [],
      departmentId: "",
      bulk: false,
      fp: false,
      stabilityPartial: false,
      stabilityFinal: false,
      amv: false,
      pv: false,
      cv: false,
      productCodes: [{ code: "" }],
    },
  });

  const { fields: productCodeFields, append: appendProductCode, remove: removeProductCode } = useFieldArray({
    control,
    name: "productCodes",
  });

  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit((data: MFCFormData) => onSubmit(data))();
    },
  }));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showApiPopup) {
          setShowApiPopup(false);
        } else {
          onCancel();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, showApiPopup]);

  const departmentOptions = getDepartmentOptions();

  const openApiPopup = (apiIndex?: number) => {
    const currentValues = getValues();
    if (apiIndex !== undefined) {
      setCurrentApiData(currentValues.apis[apiIndex]);
      setEditingApiIndex(apiIndex);
    } else {
      setCurrentApiData({
        apiName: "",
        testTypes: [{
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
          testApplicability: false,
        }]
      });
      setEditingApiIndex(null);
    }
    setShowApiPopup(true);
  };

  const saveApiData = (apiData: any) => {
    const currentValues = getValues();
    const updatedApis = [...currentValues.apis];
    
    if (editingApiIndex !== null) {
      updatedApis[editingApiIndex] = apiData;
    } else {
      updatedApis.push(apiData);
    }
    setValue("apis", updatedApis);
    
    setShowApiPopup(false);
    setEditingApiIndex(null);
    setCurrentApiData(null);
  };

  const removeApi = (apiIndex: number) => {
    const currentValues = getValues();
    const updatedApis = [...currentValues.apis];
    updatedApis.splice(apiIndex, 1);
    setValue("apis", updatedApis);
  };

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <h2 className="text-xl font-bold">
              {initialData ? "Edit MFC Record" : "Create New MFC Record"}
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex-1 overflow-y-auto">
            {/* Step 1: Basic Information - Single Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* MFC Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">MFC Number *</label>
                <input
                  type="text"
                  {...register("mfcNumber")}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.mfcNumber ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="Enter MFC number"
                />
                {errors.mfcNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.mfcNumber.message}</p>
                )}
              </div>

              {/* Generic Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Generic Name *</label>
                <input
                  type="text"
                  {...register("genericName")}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.genericName ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder="Enter generic name"
                />
                {errors.genericName && (
                  <p className="mt-1 text-sm text-red-600">{errors.genericName.message}</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                <select
                  {...register("departmentId")}
                  disabled={masterDataLoading}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.departmentId ? "border-red-400" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Department</option>
                  {departmentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.departmentId && (
                  <p className="mt-1 text-sm text-red-600">{errors.departmentId.message}</p>
                )}
              </div>
            </div>

            {/* Step 2: API Information */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-4">API Information *</label>
              <div className="space-y-3">
                {getValues().apis?.map((api, apiIndex) => (
                  <div key={apiIndex} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{api.apiName || "Unnamed API"}</div>
                      <div className="text-sm text-gray-600">{api.testTypes?.length || 0} test types configured</div>
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
              {errors.apis && (
                <p className="mt-1 text-sm text-red-600">{errors.apis.message}</p>
              )}
            </div>

            {/* Step 3: Test Categories and Product Codes - Two Columns */}
            <div className="grid grid-cols-2 gap-8">
              {/* Test Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Test Categories</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'bulk', label: 'Bulk' },
                    { key: 'fp', label: 'FP' },
                    { key: 'stabilityPartial', label: 'Stability Partial' },
                    { key: 'stabilityFinal', label: 'Stability Final' },
                    { key: 'amv', label: 'AMV' },
                    { key: 'pv', label: 'PV' },
                    { key: 'cv', label: 'CV' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        {...register(key as keyof MFCFormData)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Product Codes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Product Codes *</label>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {productCodeFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <input
                        type="text"
                        {...register(`productCodes.${index}.code`)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Product code ${index + 1}`}
                      />
                      {productCodeFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProductCode(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => appendProductCode({ code: "" })}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-400 hover:text-blue-600"
                  >
                    + Add Product Code
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
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

      {/* API Popup */}
      {showApiPopup && (
        <ApiPopup
          apiData={currentApiData}
          onSave={saveApiData}
          onClose={() => setShowApiPopup(false)}
          title={editingApiIndex !== null ? "Edit API" : "Add New API"}
        />
      )}
    </>
  );
});

// API Popup Component
const ApiPopup: React.FC<ApiPopupProps> = ({ apiData, onSave, onClose, title }) => {
  const {
    getTestTypeOptions,
    getDetectorTypeOptions,
    getPharmacopoeialOptions,
    getColumnOptions,
  } = useMasterDataContext();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: apiData,
  });

  const { fields: testTypeFields, append: appendTestType, remove: removeTestType } = useFieldArray({
    control,
    name: "testTypes",
  });

  const testTypeOptions = getTestTypeOptions();
  const detectorTypeOptions = getDetectorTypeOptions();
  const pharmacopoeialOptions = getPharmacopoeialOptions();
  const columnOptions = getColumnOptions();

  const MobilePhaseCodeFields = ({ testTypeIndex, control }: { testTypeIndex: number; control: any }) => {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((index) => (
          <div key={index}>
            <label className="block text-xs text-gray-500 mb-1">Phase {index + 1}</label>
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

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <h3 className="text-lg font-bold">{title}</h3>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="p-6">
          {/* API Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">API Name *</label>
            <input
              type="text"
              {...register("apiName", { required: "API Name is required" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter API name"
            />
            {errors.apiName && (
              <p className="mt-1 text-sm text-red-600">{errors.apiName.message}</p>
            )}
          </div>

          {/* Test Types */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">Test Types</label>
            {testTypeFields.map((field, testTypeIndex) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-lg border mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-700">Test Type {testTypeIndex + 1}</h4>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.testTypeId`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Test Type</option>
                      {testTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Column Code *</label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.columnCode`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Column</option>
                      {columnOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detector Type *</label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.detectorTypeId`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Detector</option>
                      {detectorTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacopoeial *</label>
                    <select
                      {...register(`testTypes.${testTypeIndex}.pharmacopoeialId`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Pharmacopoeial</option>
                      {pharmacopoeialOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mobile Phase Codes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Phase Codes</label>
                  <MobilePhaseCodeFields testTypeIndex={testTypeIndex} control={control} />
                </div>

                {/* Numerical fields */}
                <div className="grid grid-cols-6 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sample Injection</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`testTypes.${testTypeIndex}.sampleInjection`, { valueAsNumber: true })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Standard Injection</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`testTypes.${testTypeIndex}.standardInjection`, { valueAsNumber: true })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Blank Injection</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`testTypes.${testTypeIndex}.blankInjection`, { valueAsNumber: true })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bracketing Frequency</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`testTypes.${testTypeIndex}.bracketingFrequency`, { valueAsNumber: true })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Injection Time</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`testTypes.${testTypeIndex}.injectionTime`, { valueAsNumber: true })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Run Time</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`testTypes.${testTypeIndex}.runTime`, { valueAsNumber: true })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register(`testTypes.${testTypeIndex}.testApplicability`)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">Test Applicability</label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => appendTestType({
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
                testApplicability: false,
              })}
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              + Add Test Type
            </button>
          </div>

          {/* Footer */}
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

MFCMasterForm.displayName = "MFCMasterForm";

export default MFCMasterForm;