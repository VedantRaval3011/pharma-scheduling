"use client";
import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";
import { useRouter } from "next/navigation";

interface ColumnDescription {
  prefix: string;
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: string | number;
  length: string | number;
  particleSize: string | number;
  suffix: string;
  make: string;
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
  // Add new checkboxes for column code generation
  usePrefixForNewCode: boolean;
  useSuffixForNewCode: boolean;
  isObsolete: boolean;
}

interface CoreAttributes {
  carbonType: string;
  innerDiameter: string | number;
  length: string | number;
  particleSize: string | number;
}

interface Column {
  _id: string;
  columnCode: string;
  descriptions: ColumnDescription[];
  companyId: string;
  locationId: string;
}

interface Series {
  _id: string;
  name: string;
  prefix: string;
  suffix: string;
  currentNumber: number;
  padding: number;
}

interface Option {
  _id: string;
  value?: string;
  make?: string;
  columnId?: string;
}

interface Audit {
  _id: string;
  action: string;
  userId: string;
  timestamp: string;
  columnCode?: string;
  changes: { field: string; from: any; to: any }[];
}

const carbonTypeMap: { [key: string]: string } = {
  // C to L mapping
  C18: "L1",
  C8: "L7",
  // L to C mapping
  L1: "C18",
  L7: "C8",
  L10: "L10",
  L20: "L20",
  L17: "L17",
};

const carbonTypeOptions = ["C18", "C8"];
const linkedCarbonTypeOptions = ["L1", "L7", "L10", "L20", "L17"];

export default function MasterColumn() {
  const router = useRouter();

  // Authentication state
  const [companyId, setCompanyId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [authLoaded, setAuthLoaded] = useState(false);

  // Data state
  const [columns, setColumns] = useState<Column[]>([]);
  const [obsoleteColumns, setObsoleteColumns] = useState<Column[]>([]);
  const [makes, setMakes] = useState<Option[]>([]);
  const [prefixes, setPrefixes] = useState<Option[]>([]);
  const [suffixes, setSuffixes] = useState<Option[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [selectedDescriptionIndex, setSelectedDescriptionIndex] =
    useState<number>(-1);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showObsoleteTable, setShowObsoleteTable] = useState(false);
  const [showDescriptionPopup, setShowDescriptionPopup] = useState(false);
  const [columnCodeFilter, setColumnCodeFilter] = useState("");
  const [linkedCarbonTypeDropdowns, setLinkedCarbonTypeDropdowns] = useState<{
    [key: number]: boolean;
  }>({});
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState<{
    [key: number]: { carbonType?: number; linkedCarbonType?: number };
  }>({});
  const [linkedCarbonTypeFilters, setLinkedCarbonTypeFilters] = useState<{
    [key: number]: string;
  }>({});
  const [selectedColumnCodeForAudit, setSelectedColumnCodeForAudit] =
    useState("");
  const [carbonTypeDropdowns, setCarbonTypeDropdowns] = useState<{
    [key: number]: boolean;
  }>({});
  const [carbonTypeFilters, setCarbonTypeFilters] = useState<{
    [key: number]: string;
  }>({});
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");
  const [auditFilters, setAuditFilters] = useState({
    columnCode: "",
    action: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
  });

  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    columnCode: "",
    carbonType: "",
    make: "",
    description: "",
  });

  const [form, setForm] = useState({
    columnCode: "",
    descriptions: [
      {
        prefix: "",
        carbonType: "",
        linkedCarbonType: "",
        innerDiameter: "",
        length: "",
        particleSize: "",
        suffix: "",
        make: "",
        columnId: "",
        installationDate: "",
        usePrefix: false,
        useSuffix: false,
        // Add new checkboxes for column code generation
        usePrefixForNewCode: false,
        useSuffixForNewCode: false,
        isObsolete: false,
      },
    ],
  });

  useEffect(() => {
    if (isFormOpen && form.descriptions.length > 0) {
      updateColumnCode(0);
    }
  }, [
    isFormOpen,
    form.descriptions[0]?.carbonType,
    form.descriptions[0]?.innerDiameter,
    form.descriptions[0]?.length,
    form.descriptions[0]?.particleSize,
    form.descriptions[0]?.prefix,
    form.descriptions[0]?.suffix,
    form.descriptions[0]?.usePrefixForNewCode,
    form.descriptions[0]?.useSuffixForNewCode,
  ]);

  // Load auth data from localStorage
  useEffect(() => {
    const loadAuthData = () => {
      try {
        const storedCompanyId = localStorage.getItem("companyId");
        const storedLocationId = localStorage.getItem("locationId");
        if (storedCompanyId && storedLocationId) {
          setCompanyId(storedCompanyId);
          setLocationId(storedLocationId);
          setAuthLoaded(true);
        } else {
          setError("Company ID or Location ID not found in localStorage");
          setAuthLoaded(true);
        }
      } catch (err) {
        setError("Error accessing authentication data");
        setAuthLoaded(true);
      }
    };
    loadAuthData();
  }, []);

  const getCoreAttributes = (desc: ColumnDescription): CoreAttributes => {
    return {
      carbonType: desc.carbonType,
      innerDiameter: desc.innerDiameter,
      length: desc.length,
      particleSize: desc.particleSize,
    };
  };

  // Helper function to compare core attributes
  const coreAttributesChanged = (
    current: CoreAttributes,
    previous: CoreAttributes
  ): boolean => {
    return (
      current.carbonType !== previous.carbonType ||
      current.innerDiameter !== previous.innerDiameter ||
      current.length !== previous.length ||
      current.particleSize !== previous.particleSize
    );
  };

  // Helper function to create core specification string
  const createCoreSpec = (desc: ColumnDescription): string => {
    const normalizedCarbonType =
      carbonTypeMap[desc.carbonType] || desc.carbonType;
    return `${normalizedCarbonType}-${desc.innerDiameter}-${desc.length}-${desc.particleSize}`;
  };

  // Helper function to create full specification including prefix/suffix
  const createFullSpec = (
    desc: ColumnDescription,
    includePrefixSuffix: boolean = false
  ): string => {
    const coreSpec = createCoreSpec(desc);

    if (!includePrefixSuffix) {
      return coreSpec;
    }

    const prefix = desc.prefix?.trim() || "";
    const suffix = desc.suffix?.trim() || "";

    let fullSpec = coreSpec;
    if (prefix) fullSpec = `${prefix}-${fullSpec}`;
    if (suffix) fullSpec = `${fullSpec}-${suffix}`;

    return fullSpec;
  };

  const filterAudits = (audits: Audit[]) => {
    return audits.filter((audit) => {
      const matchesColumnCode =
        !auditFilters.columnCode ||
        audit.columnCode
          ?.toLowerCase()
          .includes(auditFilters.columnCode.toLowerCase());

      const matchesAction =
        !auditFilters.action ||
        audit.action.toLowerCase().includes(auditFilters.action.toLowerCase());

      const matchesUserId =
        !auditFilters.userId ||
        audit.userId.toLowerCase().includes(auditFilters.userId.toLowerCase());

      const auditDate = new Date(audit.timestamp);
      const matchesDateFrom =
        !auditFilters.dateFrom || auditDate >= new Date(auditFilters.dateFrom);

      const matchesDateTo =
        !auditFilters.dateTo ||
        auditDate <= new Date(auditFilters.dateTo + "T23:59:59");

      return (
        matchesColumnCode &&
        matchesAction &&
        matchesUserId &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  };

  // Fetch data when auth is loaded
  useEffect(() => {
    if (authLoaded && companyId && locationId) {
      fetchData();
    }
  }, [companyId, locationId, authLoaded]);

  const fetchData = async () => {
    if (!companyId || !locationId) {
      setError("Missing company or location ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [
        columnsRes,
        obsoleteColumnsRes,
        makesRes,
        prefixRes,
        suffixRes,
        seriesRes,
      ] = await Promise.all([
        fetch(
          `/api/admin/column?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
          }
        ),
        fetch(
          `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
          }
        ),
        fetch(
          `/api/admin/column/make?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
          }
        ),
        fetch(
          `/api/admin/prefixAndSuffix?type=PREFIX&companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
          }
        ),
        fetch(
          `/api/admin/prefixAndSuffix?type=SUFFIX&companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
          }
        ),
        fetch(
          `/api/admin/series?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
          }
        ),
      ]);

      const responses = [
        { name: "columns", response: columnsRes },
        { name: "obsoleteColumns", response: obsoleteColumnsRes },
        { name: "makes", response: makesRes },
        { name: "prefix", response: prefixRes },
        { name: "suffix", response: suffixRes },
        { name: "series", response: seriesRes },
      ];

      for (const { name, response } of responses) {
        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `${name} API error:`,
            response.status,
            response.statusText,
            errorText
          );
          throw new Error(`${name} API error: ${response.statusText}`);
        }
      }

      const [
        columnsData,
        obsoleteColumnsData,
        makesData,
        prefixData,
        suffixData,
        seriesData,
      ] = await Promise.all([
        columnsRes.json(),
        obsoleteColumnsRes.json(),
        makesRes.json(),
        prefixRes.json(),
        suffixRes.json(),
        seriesRes.json(),
      ]);

      if (columnsData.success) {
        const processedColumns = columnsData.data.map((col: Column) => ({
          ...col,
          descriptions: col.descriptions.map((desc: any) => ({
            ...desc,
            columnId: desc.columnId || "",
            installationDate: desc.installationDate || "",
            linkedCarbonType:
              desc.linkedCarbonType || carbonTypeMap[desc.carbonType] || "",
          })),
        }));
        setColumns(processedColumns);
      } else {
        setError(`Failed to fetch columns: ${columnsData.error}`);
      }

      if (obsoleteColumnsData.success) {
        const processedObsoleteColumns = obsoleteColumnsData.data.map(
          (col: Column) => ({
            ...col,
            descriptions: col.descriptions.map((desc: any) => ({
              ...desc,
              columnId: desc.columnId || "",
              installationDate: desc.installationDate || "",
              linkedCarbonType:
                desc.linkedCarbonType || carbonTypeMap[desc.carbonType] || "",
            })),
          })
        );
        setObsoleteColumns(processedObsoleteColumns);
      } else {
        setError(
          `Failed to fetch obsolete columns: ${obsoleteColumnsData.error}`
        );
      }

      if (makesData.success) {
        setMakes(
          makesData.data.filter((make: any) => make && make.make?.trim())
        );
      } else {
        setError(`Failed to fetch makes: ${makesData.error}`);
      }

      if (prefixData.success && Array.isArray(prefixData.data)) {
        const processedPrefixes = prefixData.data
          .filter((item: any) => item && item.name?.trim())
          .map((item: any) => ({
            _id: item._id,
            value: item.name,
          }));
        setPrefixes(processedPrefixes);
      } else {
        setPrefixes([]);
      }

      if (suffixData.success && Array.isArray(suffixData.data)) {
        const processedSuffixes = suffixData.data
          .filter((item: any) => item && item.name?.trim())
          .map((item: any) => ({
            _id: item._id,
            value: item.name,
          }));
        setSuffixes(processedSuffixes);
      } else {
        setSuffixes([]);
      }

      if (seriesData.success) {
        setSeries(seriesData.data);
      } else {
        setError(`Failed to fetch series: ${seriesData.error}`);
      }
    } catch (err: any) {
      console.error("fetchData error:", err);
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Replace your existing handleUsePrefixChange function with this:
  const handleUsePrefixChange = (index: number, checked: boolean) => {
    console.log(`=== PREFIX CHECKBOX CHANGE: ${checked} ===`);

    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = {
        ...newDescriptions[index],
        usePrefix: checked,
        // Clear prefix value immediately when unchecking
        prefix: checked ? newDescriptions[index].prefix : "",
      };
      return { ...prev, descriptions: newDescriptions };
    });

    // Clear any existing error for this field
    setFormErrors((prev) => ({
      ...prev,
      [`usePrefix_${index}`]: "",
      [`prefix_${index}`]: "",
    }));

    // Update column code after state change
    setTimeout(() => {
      updateColumnCode(index);
    }, 50);
  };
  const generateColumnCode = (
    desc: ColumnDescription,
    columns: Column[],
    obsoleteColumns: Column[],
    previousCoreAttributes?: CoreAttributes
  ): string => {
    console.log("=== ENHANCED COLUMN CODE GENERATION ===");
    console.log("Description:", JSON.stringify(desc, null, 2));
    console.log("Previous core attributes:", previousCoreAttributes);

    const currentCoreAttributes = getCoreAttributes(desc);
    const coreSpec = createCoreSpec(desc);
    const fullSpec = createFullSpec(desc, true);

    console.log("Current core attributes:", currentCoreAttributes);
    console.log("Core spec:", coreSpec);
    console.log("Full spec:", fullSpec);
    console.log("Use prefix for new code:", desc.usePrefixForNewCode);
    console.log("Use suffix for new code:", desc.useSuffixForNewCode);

    // If core attributes changed, generate a new column code
    const coreChanged = previousCoreAttributes
      ? coreAttributesChanged(currentCoreAttributes, previousCoreAttributes)
      : false;

    console.log("Core attributes changed:", coreChanged);

    if (coreChanged) {
      console.log("Core attributes changed - generating new column code");
      return generateNewColumnCode(columns, obsoleteColumns);
    }

    // Determine if we should consider prefix/suffix for uniqueness
    const shouldUsePrefixSuffixForUniqueness =
      desc.usePrefixForNewCode || desc.useSuffixForNewCode;

    // Get the current column being edited, if any
    const currentColumn = selectedColumnId
      ? [...columns, ...obsoleteColumns].find(
          (col) => col._id === selectedColumnId
        )
      : null;

    if (shouldUsePrefixSuffixForUniqueness) {
      console.log(
        "Checking uniqueness with full spec (including prefix/suffix)"
      );
      // Check if a *different* column with the same full spec exists
      const existingWithFullSpec = [...columns, ...obsoleteColumns].find(
        (col) =>
          col._id !== selectedColumnId && // Exclude the current column
          col.descriptions.some((d) => {
            const dFullSpec = createFullSpec(d, true);
            return dFullSpec === fullSpec;
          })
      );

      if (existingWithFullSpec) {
        console.log(
          "Found existing column with same full spec:",
          existingWithFullSpec.columnCode
        );
        return existingWithFullSpec.columnCode;
      } else {
        console.log("No other column with full spec - generating new code");
        return generateNewColumnCode(columns, obsoleteColumns);
      }
    } else {
      console.log(
        "Checking uniqueness with core spec (excluding prefix/suffix)"
      );
      // Check for existing column with same core spec
      const existingWithCoreSpec = [...columns, ...obsoleteColumns].find(
        (col) =>
          col._id !== selectedColumnId && // Exclude the current column
          col.descriptions.some((d) => {
            const dCoreSpec = createCoreSpec(d);
            return dCoreSpec === coreSpec;
          })
      );

      if (existingWithCoreSpec) {
        console.log(
          "Found existing column with same core spec:",
          existingWithCoreSpec.columnCode
        );
        return existingWithCoreSpec.columnCode;
      } else {
        console.log("No other column with core spec - generating new code");
        return generateNewColumnCode(columns, obsoleteColumns);
      }
    }
  };
  // Helper function to generate new column code
  const generateNewColumnCode = (
    columns: Column[],
    obsoleteColumns: Column[]
  ): string => {
    const allColumnCodes = [...columns, ...obsoleteColumns].map(
      (col) => col.columnCode
    );
    console.log("All existing column codes:", allColumnCodes);

    const maxNum = allColumnCodes.reduce((max, code) => {
      const match = code.match(/^(cl|CL)(\d+)$/i);
      if (match) {
        const num = parseInt(match[2]) || 0;
        console.log(`Parsed ${code} -> ${num}`);
        return Math.max(max, num);
      }
      return max;
    }, 0);

    const newColumnCode = `CL${(maxNum + 1).toString().padStart(2, "0")}`;
    console.log(
      "Generated new column code:",
      newColumnCode,
      "Max found:",
      maxNum
    );

    return newColumnCode;
  };

  const getNextColumnId = async (seriesId: string) => {
  try {
    // Get the selected series to understand the prefix pattern
    const selectedSeries = series.find((s) => s._id === seriesId);
    if (!selectedSeries) throw new Error("Series not found");
    
    // Find all existing column IDs that match the series prefix pattern
    const allColumns = [...columns, ...obsoleteColumns];
    const existingIds = allColumns.flatMap(col => 
      col.descriptions.map(desc => desc.columnId)
    ).filter(id => id && id.startsWith(selectedSeries.prefix));
    
    // Extract numbers and find the maximum
    const maxNumber = existingIds.reduce((max, id) => {
      const match = id.match(new RegExp(`^${selectedSeries.prefix}(\\d+)$`));
      if (match) {
        return Math.max(max, parseInt(match[1]) || 0);
      }
      return max;
    }, 0);
    
    // Generate next ID
    const nextNumber = maxNumber + 1;
    const nextColumnId = `${selectedSeries.prefix}${nextNumber.toString().padStart(selectedSeries.padding, '0')}`;
    
    return nextColumnId;
  } catch (err) {
    console.error("Error generating next column ID:", err);
    throw err;
  }
};

  const validateCarbonTypeInput = (
    value: string,
    fieldType: "carbon" | "linked"
  ): boolean => {
    if (!value.trim()) return true; // Allow empty values

    if (fieldType === "carbon") {
      return value.startsWith("C") && /^C\d+$/.test(value);
    } else {
      return value.startsWith("L") && /^L\d+$/.test(value);
    }
  };

  const validateForm = () => {
    console.log("=== FORM VALIDATION START ===");
    const errors: { [key: string]: string } = {};
    const desc = form.descriptions[0];

    console.log("Validating description:", JSON.stringify(desc, null, 2));
    console.log("Current column code:", form.columnCode);

    // Required field validations
    if (!desc.carbonType.trim()) {
      errors[`carbonType_0`] = "Carbon Type is required";
    }

    if (!desc.make) {
      errors[`make_0`] = "Make is required";
    }

    if (!desc.columnId.trim()) {
      errors[`columnId_0`] = "Column ID is required - please select a series";
    }

    if (!desc.installationDate) {
      errors[`installationDate_0`] = "Installation Date is required";
    }

    // Numeric field validations
    const numFields = ["innerDiameter", "length", "particleSize"];
    numFields.forEach((field) => {
      const value = desc[field as keyof ColumnDescription];
      if (value === "" || value === null || value === undefined) {
        errors[`${field}_0`] = `${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} is required`;
      } else if (isNaN(Number(value)) || Number(value) <= 0) {
        errors[`${field}_0`] = `${field
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()} must be a valid positive number`;
      }
    });

    // Column code validation
    if (!form.columnCode) {
      errors.columnCode =
        "Column code is required. Please generate or enter a valid code.";
    }

    console.log("Validation errors:", errors);
    console.log(
      "Validation result:",
      Object.keys(errors).length === 0 ? "PASSED" : "FAILED"
    );

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateColumnCode = (
    index: number,
    preserveSelection: boolean = false,
    previousCoreAttributes?: CoreAttributes
  ) => {
    const desc = form.descriptions[index];

    // Skip column code update if editing an existing column
    if (selectedColumnId) {
      console.log(
        "Editing existing column, preserving column code:",
        form.columnCode
      );
      return;
    }

    // Only generate new column code if all required fields are filled
    if (
      desc.carbonType &&
      desc.innerDiameter &&
      desc.length &&
      desc.particleSize
    ) {
      try {
        const newColumnCode = generateColumnCode(
          desc,
          columns,
          obsoleteColumns,
          previousCoreAttributes
        );

        if (newColumnCode !== form.columnCode) {
          console.log(
            "Column code changing from",
            form.columnCode,
            "to",
            newColumnCode
          );
          setForm((prev) => ({ ...prev, columnCode: newColumnCode }));
        } else {
          console.log("Column code unchanged:", newColumnCode);
        }
      } catch (err: any) {
        console.error("Error generating column code:", err);
        setError(err.message);
      }
    } else {
      // Only clear columnCode if it's not a new column with no data
      if (
        (form.columnCode && columns.length > 0) ||
        obsoleteColumns.length > 0
      ) {
        console.log("Missing required fields, clearing column code");
        setForm((prev) => ({ ...prev, columnCode: "" }));
      } else {
        console.log(
          "No data exists, preserving initial column code:",
          form.columnCode
        );
      }
    }
  };

  const handleCarbonTypeKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    field: "carbonType" | "linkedCarbonType"
  ) => {
    const isDropdownOpen =
      field === "carbonType"
        ? carbonTypeDropdowns[index]
        : linkedCarbonTypeDropdowns[index];

    if (!isDropdownOpen) return;

    const options =
      field === "carbonType" ? carbonTypeOptions : linkedCarbonTypeOptions;
    const currentFilter =
      field === "carbonType"
        ? carbonTypeFilters[index] || form.descriptions[index][field] || ""
        : linkedCarbonTypeFilters[index] ||
          form.descriptions[index][field] ||
          "";

    const filteredOptions = options.filter((option) =>
      option.toLowerCase().includes(currentFilter.toLowerCase())
    );

    const currentSelectedIndex = selectedDropdownIndex[index]?.[field] || 0;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        const nextIndex =
          currentSelectedIndex < filteredOptions.length - 1
            ? currentSelectedIndex + 1
            : 0;
        setSelectedDropdownIndex((prev) => ({
          ...prev,
          [index]: { ...prev[index], [field]: nextIndex },
        }));
        break;

      case "ArrowUp":
        e.preventDefault();
        const prevIndex =
          currentSelectedIndex > 0
            ? currentSelectedIndex - 1
            : filteredOptions.length - 1;
        setSelectedDropdownIndex((prev) => ({
          ...prev,
          [index]: { ...prev[index], [field]: prevIndex },
        }));
        break;

      case "Enter":
      case "Tab":
        e.preventDefault();
        if (filteredOptions[currentSelectedIndex]) {
          handleCarbonTypeSelect(
            index,
            field,
            filteredOptions[currentSelectedIndex]
          );
        }
        break;

      case "Escape":
        if (field === "carbonType") {
          setCarbonTypeDropdowns((prev) => ({ ...prev, [index]: false }));
        } else {
          setLinkedCarbonTypeDropdowns((prev) => ({ ...prev, [index]: false }));
        }
        setSelectedDropdownIndex((prev) => ({
          ...prev,
          [index]: { ...prev[index], [field]: 0 },
        }));
        break;
    }
  };

  const handleCarbonTypeSelect = (
    index: number,
    field: "carbonType" | "linkedCarbonType",
    value: string
  ) => {
    console.log(`=== ${field.toUpperCase()} SELECTED: ${value} ===`);

    // Get the corresponding value for auto-sync
    const correspondingValue = carbonTypeMap[value] || "";

    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = {
        ...newDescriptions[index],
        [field]: value,
        [field === "carbonType" ? "linkedCarbonType" : "carbonType"]:
          correspondingValue,
      };
      return { ...prev, descriptions: newDescriptions };
    });

    // Close dropdown after selection
    if (field === "carbonType") {
      setCarbonTypeDropdowns((prev) => ({ ...prev, [index]: false }));
      setCarbonTypeFilters((prev) => ({ ...prev, [index]: "" }));
    } else {
      setLinkedCarbonTypeDropdowns((prev) => ({ ...prev, [index]: false }));
      setLinkedCarbonTypeFilters((prev) => ({ ...prev, [index]: "" }));
    }
  };

  const handleCarbonTypeChange = (
    index: number,
    field: "carbonType" | "linkedCarbonType",
    value: string
  ) => {
    console.log(`=== ${field.toUpperCase()} CHANGE: ${value} ===`);

    // Allow typing freely without validation during input
    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = {
        ...newDescriptions[index],
        [field]: value,
        // Only auto-sync if the value exists in the mapping
        [field === "carbonType" ? "linkedCarbonType" : "carbonType"]:
          carbonTypeMap[value] ||
          newDescriptions[index][
            field === "carbonType" ? "linkedCarbonType" : "carbonType"
          ],
      };
      return { ...prev, descriptions: newDescriptions };
    });

    // Clear any existing errors
    setFormErrors((prev) => ({
      ...prev,
      [`${field}_${index}`]: "",
      [`${
        field === "carbonType" ? "linkedCarbonType" : "carbonType"
      }_${index}`]: "",
    }));

    // Update the filter for dropdown suggestions
    if (field === "carbonType") {
      setCarbonTypeFilters((prev) => ({ ...prev, [index]: value }));
    } else {
      setLinkedCarbonTypeFilters((prev) => ({ ...prev, [index]: value }));
    }
  };

  const handleDescriptionChange = (
    index: number,
    field: keyof ColumnDescription,
    value: string | number | boolean
  ) => {
    console.log(`=== FIELD CHANGE: ${field} = ${value} ===`);

    // Capture previous core attributes for column code generation
    const previousCoreAttributes = getCoreAttributes(form.descriptions[index]);

    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = { ...newDescriptions[index], [field]: value };
      return { ...prev, descriptions: newDescriptions };
    });

    // Clear any existing error for this field
    setFormErrors((prev) => ({ ...prev, [`${field}_${index}`]: "" }));

    // Trigger column code update if the changed field affects code generation
    if (
      field === "carbonType" ||
      field === "innerDiameter" ||
      field === "length" ||
      field === "particleSize" ||
      field === "prefix" ||
      field === "suffix" ||
      field === "usePrefixForNewCode" ||
      field === "useSuffixForNewCode"
    ) {
      setTimeout(() => {
        updateColumnCode(index, false, previousCoreAttributes);
      }, 50);
    }
  };

  const handleSeriesChange = async (index: number, seriesId: string) => {
    console.log("=== SERIES CHANGE START ===");
    console.log("Index:", index, "Series ID:", seriesId);

    setSelectedSeriesId(seriesId);
    if (!seriesId) {
      console.log("No series selected, clearing columnId");
      handleDescriptionChange(index, "columnId", "");
      return;
    }

    const selectedSeries = series.find((s) => s._id === seriesId);
    console.log("Selected series:", selectedSeries);

    if (selectedSeries) {
      try {
        console.log("Getting next column ID for series:", seriesId);
        const nextColumnId = await getNextColumnId(seriesId);
        console.log("Next column ID received:", nextColumnId);

        if (nextColumnId) {
          handleDescriptionChange(index, "columnId", nextColumnId);
          setFormErrors((prev) => ({ ...prev, [`columnId_${index}`]: "" }));
          console.log("Column ID set successfully");
        } else {
          console.error("No column ID returned from API");
          setError("Failed to generate Column ID. Please try again.");
        }
      } catch (err) {
        console.error("Error getting next column ID:", err);
        setError("Failed to generate Column ID. Please try again.");
      }
    }
    console.log("=== SERIES CHANGE END ===");
  };

  const handleTableRowClick = (
    column: Column,
    descIndex: number,
    event: React.MouseEvent
  ) => {
    event.preventDefault();

    setSelectedColumnId(column._id);
    setSelectedDescriptionIndex(descIndex);

    const desc = column.descriptions[descIndex];
    setForm({
      columnCode: column.columnCode,
      descriptions: [
        {
          ...desc,
          innerDiameter: desc.innerDiameter.toString(),
          length: desc.length.toString(),
          particleSize: desc.particleSize.toString(),
          linkedCarbonType: carbonTypeMap[desc.carbonType] || "",
          usePrefix: desc.usePrefix ?? false, // Ensure default value
          useSuffix: desc.useSuffix ?? false, // Ensure default value
          usePrefixForNewCode: desc.usePrefixForNewCode ?? false, // Ensure checkbox state
          useSuffixForNewCode: desc.useSuffixForNewCode ?? false, // Ensure checkbox state
          isObsolete: desc.isObsolete ?? false, // Ensure checkbox state
        },
      ],
    });

    if (event.ctrlKey) {
      setShowDescriptionPopup(true);
    }
  };

  const handleCloseForm = () => {
    console.log("=== CLOSING FORM ===");

    setIsFormOpen(false);
    setShowDescriptionPopup(false);

    // Reset form to initial state
    setForm({
      columnCode: "",
      descriptions: [
        {
          prefix: "",
          carbonType: "",
          linkedCarbonType: "",
          innerDiameter: "",
          length: "",
          particleSize: "",
          suffix: "",
          make: "",
          columnId: "",
          installationDate: "",
          usePrefix: false,
          useSuffix: false,
          usePrefixForNewCode: false,
          useSuffixForNewCode: false,
          isObsolete: false,
        },
      ],
    });

    // Clear all errors
    setFormErrors({});

    // Reset selection states
    setSelectedColumnId("");
    setSelectedDescriptionIndex(-1);
    setSelectedSeriesId("");

    // Clear all form-related states including new dropdown states
    setCarbonTypeDropdowns({});
    setCarbonTypeFilters({});
    setLinkedCarbonTypeDropdowns({});
    setLinkedCarbonTypeFilters({});

    console.log("Form state reset completed");
  };

  const handleSave = async () => {
  console.log("=== SAVE OPERATION START ===");
  console.log("Form state:", JSON.stringify(form, null, 2));
  console.log("Selected series ID:", selectedSeriesId);
  console.log("Selected column ID:", selectedColumnId);
  console.log("Selected description index:", selectedDescriptionIndex);

  if (!validateForm()) {
    console.log("Form validation failed");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const desc = form.descriptions[0];
    console.log("Description to save:", JSON.stringify(desc, null, 2));

    // Validate required fields
    if (!desc.columnId?.trim()) {
      const errorMsg = "Column ID is required. Please select a series to generate a Column ID.";
      console.error("Validation error:", errorMsg);
      throw new Error(errorMsg);
    }

    if (!desc.installationDate) {
      const errorMsg = "Installation Date is required.";
      console.error("Validation error:", errorMsg);
      throw new Error(errorMsg);
    }

    const formattedDesc = {
      ...desc,
      innerDiameter: Number(desc.innerDiameter),
      length: Number(desc.length),
      particleSize: Number(desc.particleSize),
      columnId: desc.columnId.trim(),
      installationDate: desc.installationDate,
      isObsolete: !!desc.isObsolete,
      usePrefix: !!desc.usePrefix,
      useSuffix: !!desc.useSuffix,
      usePrefixForNewCode: !!desc.usePrefixForNewCode,
      useSuffixForNewCode: !!desc.useSuffixForNewCode,
    };
    console.log("Formatted description for backend:", JSON.stringify(formattedDesc, null, 2));

    let column = null;
    let columnCode = form.columnCode;
    let isNewDescriptionForExistingColumn = false;

    // Fetch existing column if editing
    if (selectedColumnId && selectedDescriptionIndex >= 0) {
      const response = await fetch(`/api/admin/column?companyId=${companyId}&locationId=${locationId}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        column = data.data.find((col: Column) => col._id === selectedColumnId);
      }

      if (!column) {
        console.warn("Selected column not found during edit operation, treating as new column");
        setSelectedColumnId("");
        setSelectedDescriptionIndex(-1);
      } else {
        columnCode = column.columnCode; // Preserve existing column code
      }
    }

    const existingColumn = [...columns, ...obsoleteColumns].find(
      (col) => col.columnCode.toLowerCase() === columnCode.toLowerCase()
    );

    console.log("Existing column found:", !!existingColumn, existingColumn?._id);

    if (formattedDesc.isObsolete) {
      const obsoleteBody = {
        columnCode: columnCode,
        descriptions: [formattedDesc],
        companyId,
        locationId,
      };

      const obsoleteResponse = await fetch(`/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obsoleteBody),
        credentials: "include",
      });

      const obsoleteData = await obsoleteResponse.json();
      if (!obsoleteData.success) {
        console.error("Failed to move to obsolete:", obsoleteData.error);
        throw new Error(obsoleteData.error || "Failed to move column to obsolete table.");
      }

      if (column && selectedDescriptionIndex >= 0) {
        const updatedDescriptions = column.descriptions.filter(
          (_: any, index: number) => index !== selectedDescriptionIndex
        );

        if (updatedDescriptions.length === 0) {
          const deleteResponse = await fetch(`/api/admin/column/${selectedColumnId}?companyId=${companyId}&locationId=${locationId}`, {
            method: "DELETE",
            credentials: "include",
          });
          const deleteData = await deleteResponse.json();
          if (!deleteData.success) {
            throw new Error(deleteData.error || "Failed to delete column.");
          }
        } else {
          const updateBody = {
            id: selectedColumnId,
            columnCode: column.columnCode,
            descriptions: updatedDescriptions,
          };

          const updateResponse = await fetch(`/api/admin/column?companyId=${companyId}&locationId=${locationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateBody),
            credentials: "include",
          });

          const updateData = await updateResponse.json();
          if (!updateData.success) {
            throw new Error(updateData.error || "Failed to update column.");
          }
        }
      }
    } else {
      let body;
      let method;
      let url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
      let action = "CREATE"; // Default to CREATE

      if (column && selectedDescriptionIndex >= 0) {
        console.log("UPDATE MODE: Editing existing description");
        const updatedDescriptions = column.descriptions.map((desc: ColumnDescription, index: number) =>
          index === selectedDescriptionIndex ? formattedDesc : desc
        );
        body = {
          id: selectedColumnId,
          columnCode: column.columnCode,
          descriptions: updatedDescriptions,
        };
        method = "PUT";
        action = "UPDATE";
      } else if (existingColumn) {
        console.log("CREATE MODE: Adding new description to existing column");
        const response = await fetch(`/api/admin/column?companyId=${companyId}&locationId=${locationId}`, {
          credentials: "include",
        });
        const data = await response.json();

        if (data.success) {
          const latestColumn = data.data.find((col: Column) => col._id === existingColumn._id);
          if (latestColumn) {
            body = {
              id: existingColumn._id,
              columnCode: existingColumn.columnCode,
              descriptions: [...latestColumn.descriptions, formattedDesc],
            };
            method = "PUT";
            action = "CREATE"; // Explicitly set to CREATE for new description
            isNewDescriptionForExistingColumn = true;
          } else {
            console.log("Existing column not found in latest data, creating new column");
            body = { columnCode: columnCode, descriptions: [formattedDesc] };
            method = "POST";
          }
        } else {
          console.log("Failed to fetch latest data, creating new column");
          body = { columnCode: columnCode, descriptions: [formattedDesc] };
          method = "POST";
        }
      } else {
        console.log("CREATE MODE: Creating new column");
        body = { columnCode: columnCode, descriptions: [formattedDesc] };
        method = "POST";
      }

      console.log("Request details:");
      console.log("- Method:", method);
      console.log("- URL:", url);
      console.log("- Body:", JSON.stringify(body, null, 2));
      console.log("- Action for audit:", action);

      const saveColumn = async () => {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });

        const data = await response.json();
        console.log("Response data:", JSON.stringify(data, null, 2));

        if (!data.success) {
          if (data.error === "Column code already exists" || response.status === 409) {
            console.log("Duplicate column code detected, retrying with new code");
            await fetchData();
            const newColumnCode = generateNewColumnCode(columns, obsoleteColumns);
            console.log("New column code generated:", newColumnCode);
            setForm((prev) => ({ ...prev, columnCode: newColumnCode }));
            body.columnCode = newColumnCode;
            const retryResponse = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
              credentials: "include",
            });
            const retryData = await retryResponse.json();
            if (!retryData.success) {
              throw new Error(retryData.error || "Failed to save column after retry.");
            }
            return retryData;
          } else {
            throw new Error(data.error || "Failed to save column.");
          }
        }
        return data;
      };

      const result = await saveColumn();

      // Log audit entry with correct action
      try {
        const auditBody = {
          action,
          columnCode: body.columnCode,
          userId: localStorage.getItem("userId") || "unknown",
          changes: isNewDescriptionForExistingColumn
            ? Object.keys(formattedDesc).map((key) => ({
                field: `descriptions[${existingColumn!.descriptions.length}].${key}`, // Use non-null assertion
                from: undefined,
                to: formattedDesc[key as keyof ColumnDescription],
              }))
            : [], // No changes recorded for new column creation
          companyId,
          locationId,
        };
        console.log("Audit log body:", JSON.stringify(auditBody, null, 2));
        await fetch(`/api/admin/column/audit?companyId=${companyId}&locationId=${locationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(auditBody),
          credentials: "include",
        });
      } catch (auditErr: any) {
        console.error("Failed to log audit entry:", auditErr);
      }

      if (selectedSeriesId) {
        try {
          console.log("Incrementing series counter for:", selectedSeriesId);
          const incrementResponse = await fetch(
            `/api/admin/series/increment?seriesId=${selectedSeriesId}&companyId=${companyId}&locationId=${locationId}`,
            { method: "PUT", credentials: "include" }
          );
          const incrementData = await incrementResponse.json();
          if (!incrementData.success) {
            console.error("Failed to increment series counter:", incrementData.error);
            setError(`Failed to increment series counter: ${incrementData.error}`);
          }
        } catch (err: any) {
          console.error("Error incrementing series counter:", err);
          setError(`Error incrementing series counter: ${err.message}`);
        }
      }

      // Fetch updated data and ensure form reflects backend state
      await fetchData();
      const updatedColumn = [...columns, ...obsoleteColumns].find(
        (col) => col._id === (column?._id || result.data?._id)
      );
      if (updatedColumn) {
        const updatedDesc = updatedColumn.descriptions[selectedDescriptionIndex] || updatedColumn.descriptions[0];
        setForm({
          columnCode: updatedColumn.columnCode,
          descriptions: [
            {
              ...updatedDesc,
              innerDiameter: updatedDesc.innerDiameter.toString(),
              length: updatedDesc.length.toString(),
              particleSize: updatedDesc.particleSize.toString(),
              linkedCarbonType: carbonTypeMap[updatedDesc.carbonType] || "",
              usePrefix: !!updatedDesc.usePrefix,
              useSuffix: !!updatedDesc.useSuffix,
              usePrefixForNewCode: !!updatedDesc.usePrefixForNewCode,
              useSuffixForNewCode: !!updatedDesc.useSuffixForNewCode,
              isObsolete: !!updatedDesc.isObsolete,
            },
          ],
        });
      }
    }
  } catch (err: any) {
    console.error("Save operation failed:", err);
    setError(`Failed to save column: ${err.message || "An unknown error occurred."}`);
  } finally {
    setLoading(false);
    handleCloseForm();
  }
};

  const handleCodeGenerationCheckboxChange = (
    index: number,
    field: "usePrefixForNewCode" | "useSuffixForNewCode",
    checked: boolean
  ) => {
    console.log(`=== ${field.toUpperCase()} CHECKBOX CHANGE: ${checked} ===`);

    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = { ...newDescriptions[index], [field]: checked };
      return { ...prev, descriptions: newDescriptions };
    });

    // Clear any related errors
    setFormErrors((prev) => ({ ...prev, [`${field}_${index}`]: "" }));

    // Trigger column code update
    setTimeout(() => {
      updateColumnCode(index);
    }, 50);
  };

  const handleColumnCodeFocus = (index: number) => {
    console.log("=== COLUMN CODE FIELD FOCUSED ===");
    const desc = form.descriptions[index];

    // If column code is empty but we have enough data to generate it, do so immediately
    if (
      !form.columnCode &&
      desc.carbonType &&
      desc.innerDiameter &&
      desc.length &&
      desc.particleSize
    ) {
      console.log("Generating column code on focus...");
      updateColumnCode(index);
    } else if (!form.columnCode) {
      console.log("Cannot generate column code - missing required fields:", {
        carbonType: !!desc.carbonType,
        innerDiameter: !!desc.innerDiameter,
        length: !!desc.length,
        particleSize: !!desc.particleSize,
      });
    } else {
      console.log("Column code already exists:", form.columnCode);
    }
  };

  const handleEdit = () => {
    if (selectedColumnId && selectedDescriptionIndex >= 0) {
      const column = [...columns, ...obsoleteColumns].find(
        (col) => col._id === selectedColumnId
      );
      if (column) {
        const desc = column.descriptions[selectedDescriptionIndex];
        setForm({
          columnCode: column.columnCode,
          descriptions: [
            {
              ...desc,
              innerDiameter: desc.innerDiameter.toString(),
              length: desc.length.toString(),
              particleSize: desc.particleSize.toString(),
              linkedCarbonType: carbonTypeMap[desc.carbonType] || "",
              usePrefix: desc.usePrefix ?? false,
              useSuffix: desc.useSuffix ?? false,
              usePrefixForNewCode: desc.usePrefixForNewCode ?? false,
              useSuffixForNewCode: desc.useSuffixForNewCode ?? false,
              isObsolete: desc.isObsolete ?? false,
            },
          ],
        });
        setIsFormOpen(true);
        setShowDescriptionPopup(false);
      }
    }
  };

  const handleDelete = async () => {
    if (
      !selectedColumnId ||
      !confirm("Are you sure you want to delete this description?")
    )
      return;
    setLoading(true);
    try {
      const column = [...columns, ...obsoleteColumns].find(
        (col) => col._id === selectedColumnId
      );
      if (!column || selectedDescriptionIndex < 0) {
        setError("Selected description not found.");
        setLoading(false);
        return;
      }

      if (column.descriptions.length === 1) {
        // Delete entire column if it's the last description
        const response = await fetch(
          `/api/admin/column/${selectedColumnId}?companyId=${companyId}&locationId=${locationId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );
        const data = await response.json();
        if (data.success) {
          await fetchData();
          setSelectedColumnId("");
          setSelectedDescriptionIndex(-1);
          handleCloseForm();
        } else {
          setError(data.error);
        }
      } else {
        // Delete only the specific description
        const updatedDescriptions = column.descriptions.filter(
          (_, index) => index !== selectedDescriptionIndex
        );
        const body = {
          id: selectedColumnId,
          columnCode: column.columnCode,
          descriptions: updatedDescriptions,
        };
        const response = await fetch(
          `/api/admin/column?companyId=${companyId}&locationId=${locationId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          }
        );
        const data = await response.json();
        if (data.success) {
          await fetchData();
          setSelectedColumnId("");
          setSelectedDescriptionIndex(-1);
          handleCloseForm();
        } else {
          setError(data.error);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (
      !selectedColumnId ||
      !confirm(
        "Are you sure you want to delete the entire column with all its descriptions?"
      )
    )
      return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/column/${selectedColumnId}?companyId=${companyId}&locationId=${locationId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        await fetchData();
        setSelectedColumnId("");
        setSelectedDescriptionIndex(-1);
        handleCloseForm();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAudits = async () => {
    try {
      const response = await fetch(
        `/api/admin/column/audit?companyId=${companyId}&locationId=${locationId}`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      if (data.success) {
        setAudits(
          data.data.map((audit: any) => ({
            ...audit,
            changes: Array.isArray(audit.changes)
              ? audit.changes
              : [audit.changes || {}],
          }))
        );
      } else {
        setError(data.error || "Failed to fetch audit logs.");
      }
    } catch (err: any) {
      setError(`Error fetching audits: ${err.message}`);
    }
  };

  const navigation = (direction: "up" | "down") => {
    const currentColumns = showObsoleteTable ? obsoleteColumns : columns;
    if (!currentColumns.length) return;

    let newColumnIndex = currentColumns.findIndex(
      (col) => col._id === selectedColumnId
    );
    let newDescIndex = selectedDescriptionIndex;

    if (newColumnIndex === -1) {
      newColumnIndex = 0;
      newDescIndex = 0;
    } else {
      const currentColumn = currentColumns[newColumnIndex];
      if (direction === "up") {
        if (newDescIndex > 0) {
          newDescIndex -= 1;
        } else {
          newColumnIndex =
            newColumnIndex > 0 ? newColumnIndex - 1 : currentColumns.length - 1;
          newDescIndex = currentColumns[newColumnIndex].descriptions.length - 1;
        }
      } else {
        if (newDescIndex < currentColumn.descriptions.length - 1) {
          newDescIndex += 1;
        } else {
          newColumnIndex =
            newColumnIndex < currentColumns.length - 1 ? newColumnIndex + 1 : 0;
          newDescIndex = 0;
        }
      }
    }

    const selectedColumn = currentColumns[newColumnIndex];
    const selectedDesc = selectedColumn.descriptions[newDescIndex];
    setSelectedColumnId(selectedColumn._id);
    setSelectedDescriptionIndex(newDescIndex);
    setForm({
      columnCode: selectedColumn.columnCode,
      descriptions: [
        {
          ...selectedDesc,
          innerDiameter: selectedDesc.innerDiameter.toString(),
          length: selectedDesc.length.toString(),
          particleSize: selectedDesc.particleSize.toString(),
          linkedCarbonType: carbonTypeMap[selectedDesc.carbonType] || "",
        },
      ],
    });
  };

  // Filter columns based on search criteria
  const filterColumns = (columns: Column[]) => {
    return columns.filter((column) => {
      const matchesColumnCode =
        !searchFilters.columnCode ||
        column.columnCode
          .toLowerCase()
          .includes(searchFilters.columnCode.toLowerCase());

      const matchesDescription = column.descriptions.some((desc) => {
        const matchesCarbonType =
          !searchFilters.carbonType ||
          desc.carbonType
            .toLowerCase()
            .includes(searchFilters.carbonType.toLowerCase());

        const matchesMake =
          !searchFilters.make ||
          desc.make.toLowerCase().includes(searchFilters.make.toLowerCase());

        const descString =
          `${desc.prefix} ${desc.carbonType} ${desc.innerDiameter} x ${desc.length} ${desc.particleSize}µm ${desc.suffix}`.toLowerCase();
        const matchesDescText =
          !searchFilters.description ||
          descString.includes(searchFilters.description.toLowerCase());

        return matchesCarbonType && matchesMake && matchesDescText;
      });

      return matchesColumnCode && matchesDescription;
    });
  };

  const currentColumns = filterColumns(
    showObsoleteTable ? obsoleteColumns : columns
  );
  const filteredAudits = selectedColumnCodeForAudit
    ? audits.filter((audit) => audit.columnCode === selectedColumnCodeForAudit)
    : audits;

  if (!authLoaded) {
    return (
      <ProtectedRoute allowedRoles={["admin", "employee"]}>
        <div className="min-h-screen bg-gradient-to-b from-[#d7e6f5] to-[#a0b7d0] pt-5 p-4 flex items-center justify-center">
          <div className="text-[#0052cc] text-lg">
            Loading authentication data...
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!companyId || !locationId) {
    return (
      <ProtectedRoute allowedRoles={["admin", "employee"]}>
        <div className="min-h-screen bg-gradient-to-b from-[#d7e6f5] to-[#a0b7d0] pt-5 p-4 flex items-center justify-center">
          <div className="text-red-500 text-lg bg-[#ffe6e6] p-4 rounded border border-red-300">
            Authentication Error:{" "}
            {error || "Company ID or Location ID not found"}
            <div className="mt-2 text-sm">
              Please ensure you are properly logged in and try refreshing the
              page.
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <div
        className="min-h-screen bg-gradient-to-b from-[#d7e6f5] to-[#a0b7d0] pt-5 p-4"
        style={{ fontFamily: "Verdana, Arial, sans-serif" }}
      >
        <WindowsToolbar
          modulePath="/dashboard/columns"
          onAddNew={() => {
            // Determine initial column code based on whether there are existing columns
            const initialColumnCode =
              columns.length === 0 && obsoleteColumns.length === 0
                ? "CL01"
                : "";

            setForm({
              columnCode: initialColumnCode, // Use the conditional initial value
              descriptions: [
                {
                  prefix: "",
                  carbonType: "",
                  linkedCarbonType: "",
                  innerDiameter: "",
                  length: "",
                  particleSize: "",
                  suffix: "",
                  make: "",
                  columnId: "",
                  installationDate: "",
                  usePrefix: false,
                  useSuffix: false,
                  usePrefixForNewCode: false,
                  useSuffixForNewCode: false,
                  isObsolete: false,
                },
              ],
            });
            setFormErrors({});
            setSelectedColumnId("");
            setSelectedDescriptionIndex(-1);
            setShowDescriptionPopup(false);
            setIsFormOpen(true);
          }}
          onSave={handleSave}
          onClear={handleCloseForm}
          onExit={() => router.push("/dashboard")}
          onUp={() => navigation("up")}
          onDown={() => navigation("down")}
          onSearch={() => setShowSearchModal(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAudit={() => {
            fetchAudits();
            setShowAuditModal(true);
          }}
          onPrint={() => {
            const printContent = `<h1>${
              showObsoleteTable ? "Obsolete" : "Active"
            } Column Master</h1>
              <table border="1"><thead><tr><th>Serial No</th><th>Column Code</th><th>Description</th><th>Make</th><th>Column ID</th><th>Installation Date</th><th>Status</th></tr></thead>
              <tbody>${currentColumns
                .flatMap((column, index) =>
                  column.descriptions.map(
                    (desc) =>
                      `<tr><td>${index + 1}</td><td>${
                        column.columnCode
                      }</td><td>${desc.prefix} ${desc.carbonType} ${
                        desc.innerDiameter
                      } x ${desc.length} ${desc.particleSize}µm ${
                        desc.suffix
                      }</td><td>${desc.make}</td><td>${desc.columnId}</td><td>${
                        desc.installationDate
                      }</td><td>${
                        desc.isObsolete ? "Obsolete" : "Active"
                      }</td></tr>`
                  )
                )
                .join("")}</tbody></table>`;
            const printWindow = window.open("", "_blank");
            printWindow?.document.write(
              `<html><head><title>Print Column Master</title></head><body>${printContent}</body></html>`
            );
            printWindow?.document.close();
            printWindow?.print();
          }}
          onHelp={() => setShowHelpModal(true)}
        />

        <div className="max-w-5xl mx-auto bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.2)] p-6 backdrop-blur-sm bg-opacity-80">
          <h1 className="text-2xl font-bold mb-4 text-[#003087]">
            Column Master
          </h1>

          {error && (
            <p className="text-red-500 mb-4 bg-[#ffe6e6] p-2 rounded border border-red-300">
              {error}
            </p>
          )}
          {loading && (
            <p className="text-[#0052cc] mb-4 bg-[#e6f0ff] p-2 rounded border border-[#add8e6]">
              Loading...
            </p>
          )}

          <div className="mb-4 flex gap-2">
            <button
              onClick={() => {
                setShowObsoleteTable(!showObsoleteTable);
                setSelectedColumnId("");
                setSelectedDescriptionIndex(-1);
                handleCloseForm();
              }}
              className="bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] transition-all shadow-sm"
            >
              {showObsoleteTable
                ? "Show Active Columns"
                : "Show Obsolete Columns"}
            </button>
          </div>

          {/* Search Filters */}
          <div className="mb-4 bg-white p-4 rounded-lg border border-gray-300">
            <h3 className="text-sm font-semibold text-[#003087] mb-2">
              Search Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Column Code..."
                value={searchFilters.columnCode}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    columnCode: e.target.value,
                  }))
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Carbon Type..."
                value={searchFilters.carbonType}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    carbonType: e.target.value,
                  }))
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Make..."
                value={searchFilters.make}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    make: e.target.value,
                  }))
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <input
                type="text"
                placeholder="Description..."
                value={searchFilters.description}
                onChange={(e) =>
                  setSearchFilters((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <button
              onClick={() =>
                setSearchFilters({
                  columnCode: "",
                  carbonType: "",
                  make: "",
                  description: "",
                })
              }
              className="mt-2 bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-all"
            >
              Clear Filters
            </button>
          </div>

          <div className="overflow-x-auto border-2 border-gray-300 rounded-lg shadow-sm">
            <table className="w-full border-collapse border border-gray-300 bg-white">
              <thead>
                <tr className="bg-gray-100">
                  {[
                    "Serial No",
                    "Column Code",
                    "Prefix",
                    "Suffix",
                    "Description",
                    "Make",
                    "Column ID",
                    "Installation Date",
                    "Status",
                  ].map((header) => (
                    <th
                      key={header}
                      className="border border-gray-300 p-2 text-gray-700 font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentColumns.map((column, colIndex) =>
                  column.descriptions.map((desc, descIndex) => (
                    <tr
                      key={`${column._id}-${descIndex}`}
                      className={`cursor-pointer ${
                        column._id === selectedColumnId &&
                        descIndex === selectedDescriptionIndex
                          ? "bg-blue-200 border-2 border-blue-500"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={(e) => handleTableRowClick(column, descIndex, e)}
                      title="Click to select, Ctrl+Click for popup"
                    >
                      {descIndex === 0 && (
                        <>
                          <td
                            className="border border-gray-300 p-2"
                            rowSpan={column.descriptions.length}
                          >
                            {colIndex + 1}
                          </td>
                          <td
                            className="border border-gray-300 p-2"
                            rowSpan={column.descriptions.length}
                          >
                            {column.columnCode}
                          </td>
                        </>
                      )}
                      <td className="border border-gray-300 p-2">
                        {desc.prefix || "-"}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {desc.suffix || "-"}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {desc.prefix} {desc.carbonType} {desc.innerDiameter} x{" "}
                        {desc.length} {desc.particleSize}µm {desc.suffix}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {desc.make}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {desc.columnId}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {desc.installationDate}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {desc.isObsolete ? "Obsolete" : "Active"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Selection Info */}
          {selectedColumnId && selectedDescriptionIndex >= 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {form.columnCode} -{" "}
                {form.descriptions[0]?.carbonType}{" "}
                {form.descriptions[0]?.innerDiameter}x
                {form.descriptions[0]?.length}{" "}
                {form.descriptions[0]?.particleSize}µm
                <span className="ml-4 text-xs text-gray-600">
                  (Ctrl+Click for popup, Use toolbar buttons for actions)
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Description Popup Modal */}
        {showDescriptionPopup &&
          selectedColumnId &&
          selectedDescriptionIndex >= 0 && (
            <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-6 max-w-2xl w-full shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                <WindowsToolbar
                  modulePath="/dashboard/columns"
                  onAddNew={() => {
                    setIsFormOpen(true);
                    setSelectedColumnId("");
                    setSelectedDescriptionIndex(-1);
                    handleCloseForm();
                  }}
                  onSave={handleSave}
                  onClear={handleCloseForm}
                  onExit={() => setShowDescriptionPopup(false)}
                  onUp={() => navigation("up")}
                  onDown={() => navigation("down")}
                  onSearch={() => setShowSearchModal(true)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAudit={() => {
                    fetchAudits();
                    setShowAuditModal(true);
                  }}
                  onPrint={() => {
                    const printContent = `<h1>${
                      showObsoleteTable ? "Obsolete" : "Active"
                    } Column Master</h1>
                    <table border="1"><thead><tr><th>Serial No</th><th>Column Code</th><th>Prefix</th><th>Suffix</th><th>Description</th><th>Make</th><th>Column ID</th><th>Installation Date</th><th>Status</th></tr></thead>
                    <tbody>${currentColumns
                      .flatMap((column, index) =>
                        column.descriptions.map(
                          (desc) =>
                            `<tr><td>${index + 1}</td><td>${
                              column.columnCode
                            }</td><td>${desc.prefix || "-"}</td><td>${
                              desc.suffix || "-"
                            }</td><td>${desc.carbonType} ${
                              desc.innerDiameter
                            } x ${desc.length} ${desc.particleSize}µm</td><td>${
                              desc.make
                            }</td><td>${desc.columnId}</td><td>${
                              desc.installationDate
                            }</td><td>${
                              desc.isObsolete ? "Obsolete" : "Active"
                            }</td></tr>`
                        )
                      )
                      .join("")}</tbody></table>`;
                    const printWindow = window.open("", "_blank");
                    printWindow?.document.write(
                      `<html><head><title>Print Column Master</title></head><body>${printContent}</body></html>`
                    );
                    printWindow?.document.close();
                    printWindow?.print();
                  }}
                  onHelp={() => setShowHelpModal(true)}
                />

                {error && (
                  <div className="fixed inset-0 backdrop-blur-md bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-[#f0f0f0] border-2 border-red-500 rounded-lg p-6 max-w-md w-full shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center mb-4">
                        <div className="bg-red-500 text-white rounded-full p-2 mr-3">
                          <svg
                            className="w-6 h-6"
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
                        </div>
                        <h2 className="text-lg font-bold text-red-600">
                          Error
                        </h2>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {error}
                        </p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setError("")}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <h2 className="text-lg font-bold mt-4 mb-4 text-[#003087]">
                  Column Description Details
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Column Code:
                    </label>
                    <p className="text-lg font-semibold">{form.columnCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Make:
                    </label>
                    <p>{form.descriptions[0]?.make}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Carbon Type:
                    </label>
                    <p>{form.descriptions[0]?.carbonType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Linked Carbon Type:
                    </label>
                    <p>{form.descriptions[0]?.linkedCarbonType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Inner Diameter:
                    </label>
                    <p>{form.descriptions[0]?.innerDiameter} mm</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Length:
                    </label>
                    <p>{form.descriptions[0]?.length} mm</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Particle Size:
                    </label>
                    <p>{form.descriptions[0]?.particleSize} µm</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Column ID:
                    </label>
                    <p>{form.descriptions[0]?.columnId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Installation Date:
                    </label>
                    <p>{form.descriptions[0]?.installationDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#003087]">
                      Status:
                    </label>
                    <p>
                      {form.descriptions[0]?.isObsolete ? "Obsolete" : "Active"}
                    </p>
                  </div>
                </div>

                {(form.descriptions[0]?.prefix ||
                  form.descriptions[0]?.suffix) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#003087]">
                      Full Description:
                    </label>
                    <p className="text-lg">
                      {form.descriptions[0]?.prefix}{" "}
                      {form.descriptions[0]?.carbonType}{" "}
                      {form.descriptions[0]?.innerDiameter} x{" "}
                      {form.descriptions[0]?.length}{" "}
                      {form.descriptions[0]?.particleSize}µm{" "}
                      {form.descriptions[0]?.suffix}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowDescriptionPopup(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Add/Edit Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-3xl w-full shadow-[0_4px_8px_rgba(0,0,0,0.2)] max-h-[90vh] overflow-y-auto relative">
              <h2 className="text-lg font-bold mb-3 text-[#003087]">
                {selectedColumnId ? "Edit Column Description" : "Add Column"}
              </h2>

              {/* Fixed Preview in Top-Right Corner */}
              <div className="fixed top-4 right-4 bg-white border border-[#3a6ea5] rounded-lg p-2 shadow-lg z-10 bg-opacity-90 max-w-xs">
                <label className="block text-xs font-medium text-[#003087] mb-1">
                  Preview:
                </label>
                {form.descriptions.map((desc, index) => (
                  <div key={index}>
                    <p className="text-xs font-semibold text-gray-800">
                      {desc.prefix && `${desc.prefix} `}
                      {desc.carbonType} {desc.innerDiameter} x {desc.length}{" "}
                      {desc.particleSize}µm
                      {desc.suffix && ` ${desc.suffix}`}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Column Code:{" "}
                      <span className="font-semibold">{form.columnCode}</span>
                    </p>
                  </div>
                ))}
              </div>

              {form.descriptions.map((desc, index) => (
                <div key={index} className="mb-3 p-3 border rounded bg-white">
                  <div className="space-y-3">
                    {/* Make and Prefix */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Make
                        </label>
                        <select
                          value={desc.make}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "make",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                          required
                        >
                          <option value="">Select Make</option>
                          {makes.map((make) => (
                            <option key={make._id} value={make.make}>
                              {make.make}
                            </option>
                          ))}
                        </select>
                        {formErrors[`make_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors[`make_${index}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Prefix 
                        </label>
                        <select
                          value={desc.prefix}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "prefix",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                        >
                          <option value="">Select Prefix</option>
                          {prefixes.map((prefix) => (
                            <option key={prefix._id} value={prefix.value}>
                              {prefix.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Carbon Type and Linked Carbon Type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Carbon Type
                        </label>
                        <input
                          type="text"
                          value={desc.carbonType}
                          onChange={(e) =>
                            handleCarbonTypeChange(
                              index,
                              "carbonType",
                              e.target.value
                            )
                          }
                          onKeyDown={(e) =>
                            handleCarbonTypeKeyDown(e, index, "carbonType")
                          }
                          onFocus={() => {
                            setCarbonTypeDropdowns((prev) => ({
                              ...prev,
                              [index]: true,
                            }));
                            setSelectedDropdownIndex((prev) => ({
                              ...prev,
                              [index]: { ...prev[index], carbonType: 0 },
                            }));
                          }}
                          onBlur={() =>
                            setTimeout(() => {
                              setCarbonTypeDropdowns((prev) => ({
                                ...prev,
                                [index]: false,
                              }));
                              setSelectedDropdownIndex((prev) => ({
                                ...prev,
                                [index]: { ...prev[index], carbonType: 0 },
                              }));
                            }, 200)
                          }
                          className={`border-2 rounded-lg p-2 w-full bg-[#f8f8f8] text-xs ${
                            formErrors[`carbonType_${index}`]
                              ? "border-red-500"
                              : "border-[#3a6ea5]"
                          }`}
                          placeholder="Type C18, C8, C1... or use arrows to select"
                          required
                        />
                        {carbonTypeDropdowns[index] && (
                          <div className="absolute z-10 w-full bg-[#f8f8f8] border-2 border-[#3a6ea5] rounded-lg mt-1 shadow-lg max-h-32 overflow-y-auto">
                            {carbonTypeOptions
                              .filter((option) =>
                                option
                                  .toLowerCase()
                                  .includes(
                                    (
                                      carbonTypeFilters[index] ||
                                      desc.carbonType ||
                                      ""
                                    ).toLowerCase()
                                  )
                              )
                              .map((option, optIndex) => (
                                <div
                                  key={option}
                                  className={`p-1 cursor-pointer flex justify-between text-xs ${
                                    optIndex ===
                                    (selectedDropdownIndex[index]?.carbonType ||
                                      0)
                                      ? "bg-[#3a6ea5] text-white"
                                      : "hover:bg-[#d7e6f5]"
                                  }`}
                                  onClick={() =>
                                    handleCarbonTypeSelect(
                                      index,
                                      "carbonType",
                                      option
                                    )
                                  }
                                  onMouseEnter={() =>
                                    setSelectedDropdownIndex((prev) => ({
                                      ...prev,
                                      [index]: {
                                        ...prev[index],
                                        carbonType: optIndex,
                                      },
                                    }))
                                  }
                                >
                                  <span>{option}</span>
                                  <span
                                    className={`text-xs ${
                                      optIndex ===
                                      (selectedDropdownIndex[index]
                                        ?.carbonType || 0)
                                        ? "text-gray-200"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    → {carbonTypeMap[option] || "N/A"}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                        {formErrors[`carbonType_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors[`carbonType_${index}`]}
                          </p>
                        )}
                      </div>

                      {/* Linked Carbon Type Input with Enhanced Dropdown */}
                      <div className="relative">
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Linked Carbon Type
                        </label>
                        <input
                          type="text"
                          value={desc.linkedCarbonType}
                          onChange={(e) =>
                            handleCarbonTypeChange(
                              index,
                              "linkedCarbonType",
                              e.target.value
                            )
                          }
                          onKeyDown={(e) =>
                            handleCarbonTypeKeyDown(
                              e,
                              index,
                              "linkedCarbonType"
                            )
                          }
                          onFocus={() => {
                            setLinkedCarbonTypeDropdowns((prev) => ({
                              ...prev,
                              [index]: true,
                            }));
                            setSelectedDropdownIndex((prev) => ({
                              ...prev,
                              [index]: { ...prev[index], linkedCarbonType: 0 },
                            }));
                          }}
                          onBlur={() =>
                            setTimeout(() => {
                              setLinkedCarbonTypeDropdowns((prev) => ({
                                ...prev,
                                [index]: false,
                              }));
                              setSelectedDropdownIndex((prev) => ({
                                ...prev,
                                [index]: {
                                  ...prev[index],
                                  linkedCarbonType: 0,
                                },
                              }));
                            }, 200)
                          }
                          className={`border-2 rounded-lg p-2 w-full bg-[#f8f8f8] text-xs ${
                            formErrors[`linkedCarbonType_${index}`]
                              ? "border-red-500"
                              : "border-[#3a6ea5]"
                          }`}
                          placeholder="Type L1, L7, L3... or use arrows to select"
                        />
                        {linkedCarbonTypeDropdowns[index] && (
                          <div className="absolute z-10 w-full bg-[#f8f8f8] border-2 border-[#3a6ea5] rounded-lg mt-1 shadow-lg max-h-32 overflow-y-auto">
                            {linkedCarbonTypeOptions
                              .filter((option) =>
                                option
                                  .toLowerCase()
                                  .includes(
                                    (
                                      linkedCarbonTypeFilters[index] ||
                                      desc.linkedCarbonType ||
                                      ""
                                    ).toLowerCase()
                                  )
                              )
                              .map((option, optIndex) => (
                                <div
                                  key={option}
                                  className={`p-1 cursor-pointer flex justify-between text-xs ${
                                    optIndex ===
                                    (selectedDropdownIndex[index]
                                      ?.linkedCarbonType || 0)
                                      ? "bg-[#3a6ea5] text-white"
                                      : "hover:bg-[#d7e6f5]"
                                  }`}
                                  onClick={() =>
                                    handleCarbonTypeSelect(
                                      index,
                                      "linkedCarbonType",
                                      option
                                    )
                                  }
                                  onMouseEnter={() =>
                                    setSelectedDropdownIndex((prev) => ({
                                      ...prev,
                                      [index]: {
                                        ...prev[index],
                                        linkedCarbonType: optIndex,
                                      },
                                    }))
                                  }
                                >
                                  <span>{option}</span>
                                  <span
                                    className={`text-xs ${
                                      optIndex ===
                                      (selectedDropdownIndex[index]
                                        ?.linkedCarbonType || 0)
                                        ? "text-gray-200"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    → {carbonTypeMap[option] || "N/A"}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                        {formErrors[`linkedCarbonType_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors[`linkedCarbonType_${index}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inner Diameter, Length, Particle Size */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Inner Diameter (mm)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={desc.innerDiameter}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "innerDiameter",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                        {formErrors[`innerDiameter_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors[`innerDiameter_${index}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Length (mm)
                        </label>
                        <input
                          type="number"
                          value={desc.length}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "length",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                        {formErrors[`length_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors[`length_${index}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Particle Size (µm)
                        </label>
                        <input
                          type="number"
                          value={desc.particleSize}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "particleSize",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                        {formErrors[`particleSize_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors[`particleSize_${index}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Suffix and Series */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Suffix
                        </label>
                        <select
                          value={desc.suffix}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "suffix",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                        >
                          <option value="">Select Suffix</option>
                          {suffixes.map((suffix) => (
                            <option key={suffix._id} value={suffix.value}>
                              {suffix.value}
                            </option>
                          ))}
                        </select>
                      </div>
                      {!selectedColumnId && (
                        <div>
                          <label className="block text-xs font-medium text-[#003087] mb-1">
                            Series
                          </label>
                          <select
                            value={selectedSeriesId}
                            onChange={(e) =>
                              handleSeriesChange(index, e.target.value)
                            }
                            className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                            required
                          >
                            <option value="">Select Series</option>
                            {series.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-600 mt-1">
                            Current ID: {desc.columnId || "Select a series"}
                          </p>
                          {formErrors[`columnId_${index}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {formErrors[`columnId_${index}`]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Installation Date and Column Code */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Installation Date
                        </label>
                        <input
                          type="date"
                          value={desc.installationDate}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "installationDate",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                        {formErrors[`installationDate_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors[`installationDate_${index}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#003087] mb-1">
                          Column Code
                        </label>
                        <input
                          type="text"
                          value={form.columnCode}
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs font-semibold opacity-50"
                          readOnly
                        />
                        {formErrors.columnCode && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.columnCode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Column Code Generation Options */}
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={desc.usePrefixForNewCode || false}
                              onChange={(e) =>
                                handleCodeGenerationCheckboxChange(
                                  index,
                                  "usePrefixForNewCode",
                                  e.target.checked
                                )
                              }
                              className="form-checkbox h-4 w-4 text-[#3a6ea5]"
                            />
                            <span className="text-xs font-medium text-[#003087]">
                              Use prefix to generate a new column code
                            </span>
                          </label>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                            When checked, different prefixes will create
                            separate column codes
                          </p>
                        </div>
                        <div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={desc.useSuffixForNewCode || false}
                              onChange={(e) =>
                                handleCodeGenerationCheckboxChange(
                                  index,
                                  "useSuffixForNewCode",
                                  e.target.checked
                                )
                              }
                              className="form-checkbox h-4 w-4 text-[#3a6ea5]"
                            />
                            <span className="text-xs font-medium text-[#003087]">
                              Use suffix to generate a new column code
                            </span>
                          </label>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                            When checked, different suffixes will create
                            separate column codes
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Obsolete Checkbox */}
                    <div>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={desc.isObsolete || false}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "isObsolete",
                              e.target.checked
                            )
                          }
                          className="form-checkbox h-4 w-4 text-[#3a6ea5]"
                        />
                        <span className="text-xs font-medium text-[#003087]">
                          Mark as Obsolete
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-3 justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-md w-full shadow-lg">
              <h2 className="text-lg font-bold mb-2 text-[#003087]">
                Quick Search Columns
              </h2>
              <input
                type="text"
                value={columnCodeFilter}
                onChange={(e) => setColumnCodeFilter(e.target.value)}
                placeholder="Enter Column Code..."
                className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSearchFilters((prev) => ({
                      ...prev,
                      columnCode: columnCodeFilter,
                    }));
                    setShowSearchModal(false);
                  }}
                  className="bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] transition-all"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setColumnCodeFilter("");
                    setSearchFilters((prev) => ({
                      ...prev,
                      columnCode: "",
                    }));
                    setShowSearchModal(false);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-6 max-w-6xl w-full shadow-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4 text-[#003087]">
                Audit Logs
              </h2>

              {/* Enhanced Filter Section */}
              <div className="mb-6 bg-white p-4 rounded-lg border border-gray-300">
                <h3 className="text-sm font-semibold text-[#003087] mb-3">
                  Filter Audit Logs
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Column Code
                    </label>
                    <input
                      type="text"
                      value={auditFilters.columnCode}
                      onChange={(e) =>
                        setAuditFilters((prev) => ({
                          ...prev,
                          columnCode: e.target.value,
                        }))
                      }
                      placeholder="Search column code..."
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Action
                    </label>
                    <select
                      value={auditFilters.action}
                      onChange={(e) =>
                        setAuditFilters((prev) => ({
                          ...prev,
                          action: e.target.value,
                        }))
                      }
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    >
                      <option value="">All Actions</option>
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                      <option value="OBSOLETE">Mark Obsolete</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={auditFilters.userId}
                      onChange={(e) =>
                        setAuditFilters((prev) => ({
                          ...prev,
                          userId: e.target.value,
                        }))
                      }
                      placeholder="Search user ID..."
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={auditFilters.dateFrom}
                      onChange={(e) =>
                        setAuditFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={auditFilters.dateTo}
                      onChange={(e) =>
                        setAuditFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                      className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() =>
                        setAuditFilters({
                          columnCode: "",
                          action: "",
                          userId: "",
                          dateFrom: "",
                          dateTo: "",
                        })
                      }
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-all text-sm w-full"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>

                {/* Filter Summary */}
                <div className="text-sm text-gray-600">
                  Showing {filterAudits(audits).length} of {audits.length} audit
                  entries
                </div>
              </div>

              {/* Enhanced Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 bg-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left font-semibold">
                        Timestamp
                      </th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">
                        Action
                      </th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">
                        Column Code
                      </th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">
                        Changes
                      </th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">
                        User ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterAudits(audits).length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border border-gray-300 p-4 text-center text-gray-500"
                        >
                          No audit entries found matching the current filters
                        </td>
                      </tr>
                    ) : (
                      filterAudits(audits).map((audit) => (
                        <tr key={audit._id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3">
                            <div className="font-medium">
                              {new Date(audit.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(audit.timestamp).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                audit.action === "CREATE"
                                  ? "bg-green-100 text-green-800"
                                  : audit.action === "UPDATE"
                                  ? "bg-blue-100 text-blue-800"
                                  : audit.action === "DELETE"
                                  ? "bg-red-100 text-red-800"
                                  : audit.action === "OBSOLETE"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {audit.action}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-3 font-mono">
                            {audit.columnCode}
                          </td>
                          <td className="border border-gray-300 p-3">
                            {audit.changes && audit.changes.length > 0 ? (
                              <div className="space-y-1">
                                {audit.changes.map((change, i) => (
                                  <div key={i} className="text-sm">
                                    <span className="font-medium text-gray-700">
                                      {change.field}:
                                    </span>
                                    <span className="text-red-600 mx-1">
                                      {String(change.from) || "null"}
                                    </span>
                                    →
                                    <span className="text-green-600 mx-1">
                                      {String(change.to) || "null"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                No changes recorded
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-3 font-mono text-sm">
                            {audit.userId}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Export and Close Buttons */}
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => {
                    const filteredData = filterAudits(audits);
                    const csvContent = [
                      "Timestamp,Action,Column Code,Changes,User ID",
                      ...filteredData.map(
                        (audit) =>
                          `"${new Date(audit.timestamp).toLocaleString()}","${
                            audit.action
                          }","${audit.columnCode}","${audit.changes
                            .map((c) => `${c.field}: ${c.from} → ${c.to}`)
                            .join("; ")}","${audit.userId}"`
                      ),
                    ].join("\n");

                    const blob = new Blob([csvContent], { type: "text/csv" });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `audit-logs-${
                      new Date().toISOString().split("T")[0]
                    }.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-all text-sm"
                >
                  Export to CSV
                </button>

                <button
                  onClick={() => {
                    setShowAuditModal(false);
                    setAuditFilters({
                      columnCode: "",
                      action: "",
                      userId: "",
                      dateFrom: "",
                      dateTo: "",
                    });
                  }}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-md w-full shadow-lg">
              <h2 className="text-lg font-bold mb-2 text-[#003087]">Help</h2>
              <p className="text-sm text-gray-700 mb-4">
                Use the Column Master to manage HPLC columns:
                <ul className="list-disc ml-5">
                  <li>Add new columns using the "Add New" button.</li>
                  <li>Edit or delete existing columns using the toolbar.</li>
                  <li>Use Ctrl+Click on a table row to view details.</li>
                  <li>
                    Search columns using the search filters or quick search.
                  </li>
                  <li>View audit logs to track changes.</li>
                  <li>Toggle between active and obsolete columns.</li>
                  <li>
                    Generate column codes automatically or enter manually.
                  </li>
                </ul>
              </p>
              <button
                onClick={() => setShowHelpModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
