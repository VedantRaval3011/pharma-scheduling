import React, { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form validation schema
const mfcFormSchema = z.object({
  mfcNumber: z.number().min(1, "MFC Number is required"),
  genericName: z.string().min(1, "Generic Name is required"),
  apiId: z.string().min(1, "API is required"),
  departmentId: z.string().min(1, "Department is required"),
  testTypeId: z.string().min(1, "Test Type is required"),
  detectorTypeId: z.string().min(1, "Detector Type is required"),
  pharmacopoeialId: z.string().min(1, "Pharmacopoeial is required"),
  columnCode: z.string().min(1, "Column Code is required"),
  mobilePhaseCode1: z.string().min(1, "Mobile Phase Code 1 is required"),
  mobilePhaseCode2: z.string().optional(),
  mobilePhaseCode3: z.string().optional(),
  mobilePhaseCode4: z.string().optional(),
  sampleInjection: z.number().min(0, "Sample Injection must be >= 0"),
  blankInjection: z.number().min(0, "Blank Injection must be >= 0"),
  bracketingFrequency: z.number().min(0, "Bracketing Frequency must be >= 0"),
  injectionTime: z.number().min(0, "Injection Time must be >= 0"),
  runTime: z.number().min(0, "Run Time must be >= 0"),
  testApplicability: z.boolean(),
  bulk: z.boolean(),
  fp: z.boolean(),
  stabilityPartial: z.boolean(),
  stabilityFinal: z.boolean(),
  amv: z.boolean(),
  pv: z.boolean(),
  cv: z.boolean(),
});

type MFCFormData = z.infer<typeof mfcFormSchema>;

interface DropdownOption {
  id: string;
  name: string;
}

interface ApiItem {
  _id: string;
  api?: string;
  department?: string;
  testType?: string;
  detectorType?: string;
  pharmacopoeial?: string;
  columnCode?: string;
  desc?: string;
  companyId?: string;
  locationId?: string;
}

interface MobilePhaseItem {
  code: string;
  baseSolvent: string;
  description?: string;
}

interface MFCMasterFormProps {
  onSubmit: (data: MFCFormData) => void;
  initialData?: Partial<MFCFormData> | null;
  onCancel: () => void;
}

const MFCMasterForm = forwardRef(({ onSubmit, initialData, onCancel }: MFCMasterFormProps, ref) => {
  const [apiOptions, setApiOptions] = useState<DropdownOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<DropdownOption[]>([]);
  const [testTypeOptions, setTestTypeOptions] = useState<DropdownOption[]>([]);
  const [detectorTypeOptions, setDetectorTypeOptions] = useState<DropdownOption[]>([]);
  const [pharmacopoeialOptions, setPharmacopoeialOptions] = useState<DropdownOption[]>([]);
  const [columnOptions, setColumnOptions] = useState<DropdownOption[]>([]);
  const [mobilePhaseOptions, setMobilePhaseOptions] = useState<DropdownOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
  } = useForm<MFCFormData>({
    resolver: zodResolver(mfcFormSchema),
    defaultValues: {
      mfcNumber: 0,
      genericName: "",
      apiId: "",
      departmentId: "",
      testTypeId: "",
      detectorTypeId: "",
      pharmacopoeialId: "",
      columnCode: "",
      mobilePhaseCode1: "",
      mobilePhaseCode2: "",
      mobilePhaseCode3: "",
      mobilePhaseCode4: "",
      sampleInjection: 0,
      blankInjection: 0,
      bracketingFrequency: 0,
      injectionTime: 0,
      runTime: 0,
      testApplicability: false,
      bulk: false,
      fp: false,
      stabilityPartial: false,
      stabilityFinal: false,
      amv: false,
      pv: false,
      cv: false,
    },
  });

  // Expose submit method for external triggering
  useImperativeHandle(ref, () => ({
    submit: () => {
      handleSubmit(onSubmit)();
    },
  }));

  // Fetch data for dropdowns
  useEffect(() => {
    const companyId = localStorage.getItem("companyId") || "";
    const locationId = localStorage.getItem("locationId") || "";

    if (!companyId || !locationId) {
      setError("Company ID or Location ID is missing.");
      return;
    }

    const fetchData = async () => {
      try {
        const [
          apiResponse,
          departmentResponse,
          testTypeResponse,
          detectorTypeResponse,
          pharmacopoeialResponse,
          columnResponse,
          mobilePhaseResponse,
        ] = await Promise.all([
          fetch(`/api/admin/api?companyId=${companyId}&locationId=${locationId}`).then(async (res) => {
            if (!res.ok) throw new Error(`API fetch failed: ${res.status}`);
            return res.json();
          }),
          fetch(`/api/admin/department?companyId=${companyId}&locationId=${locationId}`).then(async (res) => {
            if (!res.ok) throw new Error(`Department fetch failed: ${res.status}`);
            return res.json();
          }),
          fetch(`/api/admin/test-type?companyId=${companyId}&locationId=${locationId}`).then(async (res) => {
            if (!res.ok) throw new Error(`Test Type fetch failed: ${res.status}`);
            return res.json();
          }),
          fetch(`/api/admin/detector-type?companyId=${companyId}&locationId=${locationId}`).then(async (res) => {
            if (!res.ok) throw new Error(`Detector Type fetch failed: ${res.status}`);
            return res.json();
          }),
          fetch(`/api/admin/pharmacopeial?companyId=${companyId}&locationId=${locationId}`).then(async (res) => {
            if (!res.ok) throw new Error(`Pharmacopoeial fetch failed: ${res.status}`);
            return res.json();
          }),
          fetch(`/api/admin/column/getAll?companyId=${companyId}&locationId=${locationId}`).then(async (res) => {
            if (!res.ok) throw new Error(`Column fetch failed: ${res.status}`);
            return res.json();
          }),
          fetch(`/api/admin/mfc?companyId=${companyId}&locationId=${locationId}`).then(async (res) => {
            if (!res.ok) throw new Error(`MFC fetch failed: ${res.status}`);
            return res.json();
          }),
        ]);

        // Helper function to validate array response
        const validateArray = (response: any, endpoint: string): any[] => {
          const data = response?.data || response;
          if (!Array.isArray(data)) {
            console.error(`Invalid response from ${endpoint}: Expected an array, got`, response);
            setError(`Invalid response from ${endpoint}. Please try again.`);
            return [];
          }
          console.log(`Response from ${endpoint}:`, data); // Debugging log
          return data;
        };

        setApiOptions(
          validateArray(apiResponse, "/api/admin/api").map((item: ApiItem) => ({
            id: item._id,
            name: item.api || "Unknown API",
          }))
        );
        setDepartmentOptions(
          validateArray(departmentResponse, "/api/admin/department").map((item: ApiItem) => ({
            id: item._id,
            name: item.department || "Unknown Department",
          }))
        );
        setTestTypeOptions(
          validateArray(testTypeResponse, "/api/admin/test-type").map((item: ApiItem) => ({
            id: item._id,
            name: item.testType || "Unknown Test Type",
          }))
        );
        setDetectorTypeOptions(
          validateArray(detectorTypeResponse, "/api/admin/detector-type").map((item: ApiItem) => ({
            id: item._id,
            name: item.detectorType || "Unknown Detector Type",
          }))
        );
        setPharmacopoeialOptions(
          validateArray(pharmacopoeialResponse, "/api/admin/pharmacopeial").map((item: ApiItem) => ({
            id: item._id,
            name: item.pharmacopoeial || "Unknown Pharmacopoeial",
          }))
        );
        setColumnOptions(
          validateArray(columnResponse, "/api/admin/column").map((item: ApiItem) => ({
            id: item._id,
            name: item.columnCode || "Unknown Column",
          }))
        );
        setMobilePhaseOptions(
          validateArray(mobilePhaseResponse, "/api/admin/mfc").map((phase: MobilePhaseItem) => ({
            id: phase.code,
            name: `${phase.code} - ${phase.baseSolvent}${phase.description ? ` (${phase.description})` : ""}`,
          }))
        );

        setError(null);
      } catch (err) {
        setError("Failed to fetch dropdown data. Please try again.");
        console.error("Fetch error:", err);
      }
    };

    fetchData();

    // Load initial data
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (key !== "_id" && key !== "createdAt" && key !== "createdBy") {
          setValue(key as keyof MFCFormData, value);
        }
      });
    } else {
      reset();
    }
  }, [initialData, setValue, reset]);

  // Mobile Phase Dropdown Component
  const MobilePhaseDropdown: React.FC<{
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    error?: string;
  }> = ({ value, onChange, placeholder, required, error }) => (
    <div>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
          error ? "border-red-400 shadow-none" : ""
        }`}
      >
        <option value="">{placeholder || "Select Mobile Phase"}</option>
        {mobilePhaseOptions.map((option, index) => (
          <option key={index} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#b6d5ff] to-white flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-white to-gray-100 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.3)] w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-400">
        {/* Modal Header */}
        <div className="px-6 py-3 border-b border-gray-400 bg-gradient-to-r from-[#e0e8ff] to-[#f5f7ff] shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 tracking-wide">
            {initialData ? "Edit MFC Record" : "Add MFC Record"}
          </h2>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-gray-50">
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="bg-white p-4 rounded-sm border border-gray-400 shadow-inner">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MFC Number
                  </label>
                  <input
                    type="number"
                    {...register("mfcNumber", { valueAsNumber: true })}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.mfcNumber ? "border-red-400 shadow-none" : ""
                    }`}
                    placeholder=""
                  />
                  {errors.mfcNumber && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.mfcNumber.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    {...register("genericName")}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.genericName ? "border-red-400 shadow-none" : ""
                    }`}
                    placeholder=""
                  />
                  {errors.genericName && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.genericName.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown Selections Section */}
            <div className="bg-white p-4 rounded-sm border border-gray-400 shadow-inner">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API</label>
                  <select
                    {...register("apiId")}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.apiId ? "border-red-400 shadow-none" : ""
                    }`}
                  >
                    <option value="">Select API</option>
                    {apiOptions.map((option, index) => (
                      <option key={index} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.apiId && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.apiId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    {...register("departmentId")}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.departmentId ? "border-red-400 shadow-none" : ""
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map((option, index) => (
                      <option key={index} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.departmentId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
                  <select
                    {...register("testTypeId")}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.testTypeId ? "border-red-400 shadow-none" : ""
                    }`}
                  >
                    <option value="">Select Test Type</option>
                    {testTypeOptions.map((option, index) => (
                      <option key={index} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.testTypeId && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.testTypeId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detector Type</label>
                  <select
                    {...register("detectorTypeId")}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.detectorTypeId ? "border-red-400 shadow-none" : ""
                    }`}
                  >
                    <option value="">Select Detector Type</option>
                    {detectorTypeOptions.map((option, index) => (
                      <option key={index} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.detectorTypeId && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.detectorTypeId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacopoeial</label>
                  <select
                    {...register("pharmacopoeialId")}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.pharmacopoeialId ? "border-red-400 shadow-none" : ""
                    }`}
                  >
                    <option value="">Select Pharmacopoeial</option>
                    {pharmacopoeialOptions.map((option, index) => (
                      <option key={index} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.pharmacopoeialId && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.pharmacopoeialId.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Column Code</label>
                  <select
                    {...register("columnCode")}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.columnCode ? "border-red-400 shadow-none" : ""
                    }`}
                  >
                    <option value="">Select Column Code</option>
                    {columnOptions.map((option, index) => (
                      <option key={index} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  {errors.columnCode && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.columnCode.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Phase Codes Section */}
            <div className="bg-white p-4 rounded-sm border border-gray-400 shadow-inner">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Phase Code 1
                  </label>
                  <Controller
                    name="mobilePhaseCode1"
                    control={control}
                    render={({ field }) => (
                      <MobilePhaseDropdown
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Mobile Phase Code 1"
                        required
                        error={errors.mobilePhaseCode1?.message}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Phase Code 2
                  </label>
                  <Controller
                    name="mobilePhaseCode2"
                    control={control}
                    render={({ field }) => (
                      <MobilePhaseDropdown
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Mobile Phase Code 2"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Phase Code 3
                  </label>
                  <Controller
                    name="mobilePhaseCode3"
                    control={control}
                    render={({ field }) => (
                      <MobilePhaseDropdown
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Mobile Phase Code 3"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Phase Code 4
                  </label>
                  <Controller
                    name="mobilePhaseCode4"
                    control={control}
                    render={({ field }) => (
                      <MobilePhaseDropdown
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Mobile Phase Code 4"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Numerical Fields Section */}
            <div className="bg-white p-4 rounded-sm border border-gray-400 shadow-inner">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Injection
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("sampleInjection", { valueAsNumber: true })}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.sampleInjection ? "border-red-400 shadow-none" : ""
                    }`}
                    placeholder=""
                  />
                  {errors.sampleInjection && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.sampleInjection.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blank Injection
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("blankInjection", { valueAsNumber: true })}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.blankInjection ? "border-red-400 shadow-none" : ""
                    }`}
                    placeholder=""
                  />
                  {errors.blankInjection && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.blankInjection.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bracketing Frequency
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("bracketingFrequency", { valueAsNumber: true })}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.bracketingFrequency ? "border-red-400 shadow-none" : ""
                    }`}
                    placeholder=""
                  />
                  {errors.bracketingFrequency && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.bracketingFrequency.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Injection Time
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("injectionTime", { valueAsNumber: true })}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.injectionTime ? "border-red-400 shadow-none" : ""
                    }`}
                    placeholder=""
                  />
                  {errors.injectionTime && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.injectionTime.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Run Time
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("runTime", { valueAsNumber: true })}
                    className={`w-full px-3 py-2 text-sm border border-gray-400 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 shadow-inner transition-all duration-200 hover:border-blue-500 ${
                      errors.runTime ? "border-red-400 shadow-none" : ""
                    }`}
                    placeholder=""
                  />
                  {errors.runTime && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.runTime.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Checkbox Fields Section */}
            <div className="bg-white p-4 rounded-sm border border-gray-400 shadow-inner">
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("testApplicability")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">Test Applicability</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("bulk")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">Bulk</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("fp")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">FP</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("stabilityPartial")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">Stability Partial</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("stabilityFinal")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">Stability Final</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("amv")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">AMV</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("pv")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">PV</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("cv")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-400 rounded-sm shadow-inner"
                  />
                  <label className="text-sm text-gray-700 font-medium">CV</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-400 bg-gradient-to-r from-[#e0e8ff] to-[#f5f7ff] flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gradient-to-b from-gray-200 to-gray-300 border border-gray-400 rounded-sm shadow-sm hover:bg-gradient-to-b hover:from-gray-300 hover:to-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-b from-blue-600 to-blue-700 border border-blue-600 rounded-sm shadow-sm hover:bg-gradient-to-b hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
});

MFCMasterForm.displayName = "MFCMasterForm";

export default MFCMasterForm;