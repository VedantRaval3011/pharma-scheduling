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
  isObsolete: boolean;
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
  C18: "L1",
  C8: "L7",
  L1: "C18",
  L7: "C8",
};

const carbonTypeOptions = ["C18", "C8", "L1", "L7"];

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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedColumnCodeForAudit, setSelectedColumnCodeForAudit] =
    useState("");
  const [carbonTypeDropdowns, setCarbonTypeDropdowns] = useState<{
    [key: number]: boolean;
  }>({});
  const [carbonTypeFilters, setCarbonTypeFilters] = useState<{
    [key: number]: string;
  }>({});
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");

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
        isObsolete: false,
      },
    ],
  });

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

  // Fetch data when auth is loaded
  useEffect(() => {
    if (authLoaded && companyId && locationId) {
      fetchData();
    }
  }, [companyId, locationId, authLoaded]);

  // Replace your fetchData function with this corrected version

  const fetchData = async () => {
  if (!companyId || !locationId) {
    setError("Missing company or location ID");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const [columnsRes, obsoleteColumnsRes, makesRes, prefixRes, suffixRes, seriesRes] = await Promise.all([
      fetch(`/api/admin/column?companyId=${companyId}&locationId=${locationId}`, {
        credentials: "include",
      }),
      fetch(`/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`, {
        credentials: "include",
      }),
      fetch(`/api/admin/column/make?companyId=${companyId}&locationId=${locationId}`, {
        credentials: "include",
      }),
      fetch(`/api/admin/prefixAndSuffix?type=PREFIX&companyId=${companyId}&locationId=${locationId}`, {
        credentials: "include",
      }),
      fetch(`/api/admin/prefixAndSuffix?type=SUFFIX&companyId=${companyId}&locationId=${locationId}`, {
        credentials: "include",
      }),
      fetch(`/api/admin/series?companyId=${companyId}&locationId=${locationId}`, {
        credentials: "include",
      }),
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
        console.error(`${name} API error:`, response.status, response.statusText, errorText);
        throw new Error(`${name} API error: ${response.statusText}`);
      }
    }

    const [columnsData, obsoleteColumnsData, makesData, prefixData, suffixData, seriesData] = await Promise.all([
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
          linkedCarbonType: desc.linkedCarbonType || carbonTypeMap[desc.carbonType] || "",
        })),
      }));
      setColumns(processedColumns);
    } else {
      setError(`Failed to fetch columns: ${columnsData.error}`);
    }

    if (obsoleteColumnsData.success) {
      const processedObsoleteColumns = obsoleteColumnsData.data.map((col: Column) => ({
        ...col,
        descriptions: col.descriptions.map((desc: any) => ({
          ...desc,
          columnId: desc.columnId || "",
          installationDate: desc.installationDate || "",
          linkedCarbonType: desc.linkedCarbonType || carbonTypeMap[desc.carbonType] || "",
        })),
      }));
      setObsoleteColumns(processedObsoleteColumns);
    } else {
      setError(`Failed to fetch obsolete columns: ${obsoleteColumnsData.error}`);
    }

    if (makesData.success) {
      setMakes(makesData.data.filter((make: any) => make && make.make?.trim()));
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

  const generateColumnCode = (desc: ColumnDescription) => {
    // Normalize carbon type using the equivalence map
    const normalizedCarbonType =
      carbonTypeMap[desc.carbonType] || desc.carbonType;

    // Create core specification (without prefix/suffix)
    const coreSpec = `${normalizedCarbonType}-${desc.innerDiameter}-${desc.length}-${desc.particleSize}`;

    // Create full specification (with prefix/suffix if used)
    const prefix = desc.usePrefix ? desc.prefix : "";
    const suffix = desc.useSuffix ? desc.suffix : "";
    const fullSpec = `${prefix}-${coreSpec}-${suffix}`;

    // Check for exact match (same core + same prefix/suffix usage)
    const existingColumn = [...columns, ...obsoleteColumns].find((col) =>
      col.descriptions.some((d) => {
        const dNormalizedCarbonType =
          carbonTypeMap[d.carbonType] || d.carbonType;
        const dCoreSpec = `${dNormalizedCarbonType}-${d.innerDiameter}-${d.length}-${d.particleSize}`;
        const dPrefix = d.usePrefix ? d.prefix : "";
        const dSuffix = d.useSuffix ? d.suffix : "";
        const dFullSpec = `${dPrefix}-${dCoreSpec}-${dSuffix}`;

        return dFullSpec === fullSpec;
      })
    );

    if (existingColumn) {
      return existingColumn.columnCode; // Reuse existing column code
    }

    // Generate new column code
    const maxNum = [...columns, ...obsoleteColumns].reduce(
      (max: number, col: Column) => {
        const num = parseInt(col.columnCode.replace("cl", "")) || 0;
        return Math.max(max, num);
      },
      0
    );

    return `cl${(maxNum + 1).toString().padStart(2, "0")}`;
  };

  const getNextColumnId = async (seriesId: string) => {
    console.log("=== GET NEXT COLUMN ID START ===");
    console.log("Series ID:", seriesId);
    console.log("Company ID:", companyId);
    console.log("Location ID:", locationId);

    try {
      const url = `/api/admin/series/next?seriesId=${seriesId}&companyId=${companyId}&locationId=${locationId}`;
      console.log("API URL:", url);

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();
      console.log("Response data:", JSON.stringify(data, null, 2));

      if (data.success) {
        console.log("Column ID generated successfully:", data.data.columnId);
        return data.data.columnId;
      } else {
        console.error("API error:", data.error);
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error("Network error in getNextColumnId:", err);
      setError(`Failed to fetch next column ID: ${err.message}`);
      return null;
    } finally {
      console.log("=== GET NEXT COLUMN ID END ===");
    }
  };

  const validateForm = () => {
    console.log("=== FORM VALIDATION START ===");
    const errors: { [key: string]: string } = {};
    const desc = form.descriptions[0];

    console.log("Validating description:", JSON.stringify(desc, null, 2));

    if (!desc.carbonType.trim()) {
      errors[`carbonType_0`] = "Carbon Type is required";
      console.log("Validation error: Carbon Type missing");
    }

    if (!desc.make) {
      errors[`make_0`] = "Make is required";
      console.log("Validation error: Make missing");
    }

    if (!desc.columnId.trim()) {
      errors[`columnId_0`] = "Column ID is required - please select a series";
      console.log("Validation error: Column ID missing");
    }

    if (!desc.installationDate) {
      errors[`installationDate_0`] = "Installation Date is required";
      console.log("Validation error: Installation Date missing");
    }

    const numFields = ["innerDiameter", "length", "particleSize"];
    numFields.forEach((field) => {
      const value = desc[field as keyof ColumnDescription];
      if (value !== "" && (isNaN(Number(value)) || Number(value) <= 0)) {
        errors[`${field}_0`] = `${field} must be a valid positive number`;
        console.log(`Validation error: ${field} invalid:`, value);
      }
    });

    console.log("Validation errors:", errors);
    console.log(
      "Validation result:",
      Object.keys(errors).length === 0 ? "PASSED" : "FAILED"
    );

    setFormErrors(errors);
    console.log("=== FORM VALIDATION END ===");
    return Object.keys(errors).length === 0;
  };
  const updateColumnCode = (index: number) => {
    const desc = form.descriptions[index];
    if (
      desc.carbonType &&
      desc.innerDiameter &&
      desc.length &&
      desc.particleSize
    ) {
      try {
        const newColumnCode = generateColumnCode(desc);
        setForm((prev) => ({ ...prev, columnCode: newColumnCode }));

        // Auto-generate new column ID if column code changed and no series selected
        if (newColumnCode !== form.columnCode && !selectedSeriesId) {
          // Clear column ID to force user to select series for new column code
          setForm((prev) => {
            const newDescriptions = [...prev.descriptions];
            newDescriptions[index] = {
              ...newDescriptions[index],
              columnId: "",
            };
            return { ...prev, descriptions: newDescriptions };
          });
          setSelectedSeriesId("");
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleCarbonTypeChange = (index: number, value: string) => {
    const linkedValue = carbonTypeMap[value] || "";
    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = {
        ...newDescriptions[index],
        carbonType: value,
        linkedCarbonType: linkedValue,
      };
      return { ...prev, descriptions: newDescriptions };
    });
    setCarbonTypeFilters((prev) => ({ ...prev, [index]: value }));

    setTimeout(() => updateColumnCode(index), 100);
  };

  const handleDescriptionChange = (
    index: number,
    field: keyof ColumnDescription,
    value: string | number | boolean
  ) => {
    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = { ...newDescriptions[index], [field]: value };
      return { ...prev, descriptions: newDescriptions };
    });
    setFormErrors((prev) => ({ ...prev, [`${field}_${index}`]: "" }));

    // Trigger column code update for relevant fields
    if (
      [
        "carbonType",
        "innerDiameter",
        "length",
        "particleSize",
        "usePrefix",
        "useSuffix",
        "prefix",
        "suffix",
      ].includes(field as string)
    ) {
      // Use setTimeout to ensure state is updated first
      setTimeout(() => {
        updateColumnCode(index);
      }, 100);
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
        },
      ],
    });

    if (event.ctrlKey) {
      setShowDescriptionPopup(true);
    }
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
        const errorMsg =
          "Column ID is required. Please select a series to generate a Column ID.";
        console.error("Validation error:", errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (!desc.installationDate) {
        const errorMsg = "Installation Date is required.";
        console.error("Validation error:", errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const columnCode = generateColumnCode(desc);
      console.log("Generated column code:", columnCode);

      const formattedDesc = {
        ...desc,
        innerDiameter: Number(desc.innerDiameter),
        length: Number(desc.length),
        particleSize: Number(desc.particleSize),
        columnId: desc.columnId.trim(),
        installationDate: desc.installationDate,
        isObsolete: !!desc.isObsolete,
      };

      console.log(
        "Formatted description:",
        JSON.stringify(formattedDesc, null, 2)
      );

      let column = null;
      if (selectedColumnId) {
        const response = await fetch(
          `/api/admin/column?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
          }
        );
        const data = await response.json();
        if (data.success) {
          column = data.data.find(
            (col: Column) => col._id === selectedColumnId
          );
        }
        if (!column) {
          const errorMsg = "Selected column not found.";
          console.error("Error:", errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
      }

      const existingColumn = [...columns, ...obsoleteColumns].find(
        (col) => col.columnCode.toLowerCase() === columnCode.toLowerCase()
      );

      console.log(
        "Existing column found:",
        !!existingColumn,
        existingColumn?._id
      );

      if (formattedDesc.isObsolete) {
        // Handle obsolete case: Move description to ObsoleteColumn collection
        console.log("Description marked as obsolete, moving to ObsoleteColumn");

        const obsoleteBody = {
          columnCode: columnCode,
          descriptions: [formattedDesc],
          companyId,
          locationId,
        };

        const obsoleteResponse = await fetch(
          `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(obsoleteBody),
            credentials: "include",
          }
        );

        const obsoleteData = await obsoleteResponse.json();

        if (!obsoleteData.success) {
          console.error("Failed to move to obsolete:", obsoleteData.error);
          setError(
            obsoleteData.error || "Failed to move column to obsolete table."
          );
          setLoading(false);
          return;
        }

        // Update or remove from Column collection
        if (selectedColumnId && selectedDescriptionIndex >= 0) {
          // Update existing column
          const updatedDescriptions = column.descriptions.filter(
            ( index: number) => index !== selectedDescriptionIndex
          );

          if (updatedDescriptions.length === 0) {
            // Delete entire column if no descriptions remain
            const deleteResponse = await fetch(
              `/api/admin/column/${selectedColumnId}?companyId=${companyId}&locationId=${locationId}`,
              {
                method: "DELETE",
                credentials: "include",
              }
            );
            const deleteData = await deleteResponse.json();
            if (!deleteData.success) {
              console.error("Failed to delete column:", deleteData.error);
              setError(deleteData.error || "Failed to delete column.");
              setLoading(false);
              return;
            }
          } else {
            // Update column with remaining descriptions
            const updateBody = {
              id: selectedColumnId,
              columnCode: column.columnCode,
              descriptions: updatedDescriptions,
            };

            const updateResponse = await fetch(
              `/api/admin/column?companyId=${companyId}&locationId=${locationId}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateBody),
                credentials: "include",
              }
            );

            const updateData = await updateResponse.json();
            if (!updateData.success) {
              console.error("Failed to update column:", updateData.error);
              setError(updateData.error || "Failed to update column.");
              setLoading(false);
              return;
            }
          }
        }
      } else {
        // Handle active column case
        let body;
        let method;
        let url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;

        if (selectedColumnId && selectedDescriptionIndex >= 0) {
          console.log("UPDATE MODE: Editing existing description");
          const updatedDescriptions = column.descriptions.map(
            (desc: ColumnDescription, index: number) =>
              index === selectedDescriptionIndex ? formattedDesc : desc
          );
          body = {
            id: selectedColumnId,
            columnCode: columnCode,
            descriptions: updatedDescriptions,
          };
          method = "PUT";
        } else if (existingColumn) {
          console.log("UPDATE MODE: Adding description to existing column");
          const response = await fetch(
            `/api/admin/column?companyId=${companyId}&locationId=${locationId}`,
            {
              credentials: "include",
            }
          );
          const data = await response.json();
          if (data.success) {
            const latestColumn = data.data.find(
              (col: Column) => col._id === existingColumn._id
            );
            if (latestColumn) {
              body = {
                id: existingColumn._id,
                columnCode: existingColumn.columnCode,
                descriptions: [...latestColumn.descriptions, formattedDesc],
              };
            } else {
              const errorMsg = "Existing column not found.";
              console.error("Error:", errorMsg);
              setError(errorMsg);
              setLoading(false);
              return;
            }
          } else {
            const errorMsg = "Failed to fetch latest column data.";
            console.error("Error:", errorMsg);
            setError(errorMsg);
            setLoading(false);
            return;
          }
          method = "PUT";
        } else {
          console.log("CREATE MODE: Creating new column");
          body = {
            columnCode: columnCode,
            descriptions: [formattedDesc],
          };
          method = "POST";
        }

        console.log("Request details:");
        console.log("- Method:", method);
        console.log("- URL:", url);
        console.log("- Body:", JSON.stringify(body, null, 2));

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });

        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);
        const data = await response.json();
        console.log("Response data:", JSON.stringify(data, null, 2));

        if (!data.success) {
          console.error("Save failed:", data.error);
          setError(data.error || "Failed to save column.");
          setLoading(false);
          return;
        }

        if (!selectedColumnId && !existingColumn && selectedSeriesId) {
          try {
            console.log("Incrementing series counter for:", selectedSeriesId);
            await fetch(
              `/api/admin/series/increment?seriesId=${selectedSeriesId}&companyId=${companyId}&locationId=${locationId}`,
              {
                method: "PUT",
                credentials: "include",
              }
            );
          } catch (err) {
            console.warn("Failed to increment series counter:", err);
          }
        }
      }

      await fetchData();
      handleCloseForm();
    } catch (err: any) {
      console.error("Network/Parse error:", err);
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
      console.log("=== SAVE OPERATION END ===");
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setShowDescriptionPopup(false);
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
          isObsolete: false,
        },
      ],
    });
    setFormErrors({});
    setSelectedColumnId("");
    setSelectedDescriptionIndex(-1);
    setSelectedSeriesId("");
  };

  const handleEdit = () => {
    if (selectedColumnId && selectedDescriptionIndex >= 0) {
      setIsFormOpen(true);
      setShowDescriptionPopup(false);
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
                            }</td><td>${desc.make}</td><td>${
                              desc.columnId
                            }</td><td>${desc.installationDate}</td><td>${
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
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-6 max-w-4xl w-full shadow-[0_4px_8px_rgba(0,0,0,0.2)] max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4 text-[#003087]">
                {selectedColumnId ? "Edit Column Description" : "Add Column"}
              </h2>

              {form.descriptions.map((desc, index) => (
                <div key={index} className="mb-4 p-4 border rounded">
                  <h3 className="text-md font-semibold text-[#003087] mb-2">
                    Description
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
                        Make
                      </label>
                      <select
                        value={desc.make}
                        onChange={(e) =>
                          handleDescriptionChange(index, "make", e.target.value)
                        }
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
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
                      <label className="flex items-center gap-1 text-sm font-medium text-[#003087] mb-1">
                        <input
                          type="checkbox"
                          checked={desc.usePrefix}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "usePrefix",
                              e.target.checked
                            )
                          }
                          className="form-checkbox h-4 w-4 text-[#3a6ea5]"
                        />
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
                        className={`border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] ${
                          !desc.usePrefix ? "opacity-50" : ""
                        }`}
                        disabled={!desc.usePrefix}
                      >
                        <option value="">Select Prefix</option>
                        {prefixes.map((prefix) => (
                          <option key={prefix._id} value={prefix.value}>
                            {prefix.value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-[#003087] mb-1">
                        Carbon Type
                      </label>
                      <input
                        type="text"
                        value={desc.carbonType}
                        onChange={(e) =>
                          handleCarbonTypeChange(index, e.target.value)
                        }
                        onFocus={() =>
                          setCarbonTypeDropdowns((prev) => ({
                            ...prev,
                            [index]: true,
                          }))
                        }
                        onBlur={() =>
                          setTimeout(
                            () =>
                              setCarbonTypeDropdowns((prev) => ({
                                ...prev,
                                [index]: false,
                              })),
                            150
                          )
                        }
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
                        placeholder="C18, C8, L1, L7"
                        required
                      />
                      {carbonTypeDropdowns[index] && (
                        <div className="absolute z-10 w-full bg-[#f8f8f8] border-2 border-[#3a6ea5] rounded-lg mt-1 shadow-lg">
                          {carbonTypeOptions
                            .filter((option) =>
                              option
                                .toLowerCase()
                                .includes(
                                  (carbonTypeFilters[index] || "").toLowerCase()
                                )
                            )
                            .map((option) => (
                              <div
                                key={option}
                                className="p-2 cursor-pointer hover:bg-[#d7e6f5]"
                                onClick={() =>
                                  handleCarbonTypeChange(index, option)
                                }
                              >
                                {option}
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

                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
                        Linked Carbon Type
                      </label>
                      <input
                        type="text"
                        value={desc.linkedCarbonType}
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] opacity-50"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
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
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
                        required
                      />
                      {formErrors[`innerDiameter_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`innerDiameter_${index}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
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
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
                        required
                      />
                      {formErrors[`length_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`length_${index}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
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
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
                        required
                      />
                      {formErrors[`particleSize_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`particleSize_${index}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-[#003087] mb-1">
                        <input
                          type="checkbox"
                          checked={desc.useSuffix}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "useSuffix",
                              e.target.checked
                            )
                          }
                          className="form-checkbox h-4 w-4 text-[#3a6ea5]"
                        />
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
                        className={`border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] ${
                          !desc.useSuffix ? "opacity-50" : ""
                        }`}
                        disabled={!desc.useSuffix}
                      >
                        <option value="">Select Suffix</option>
                        {suffixes.map((suffix) => (
                          <option key={suffix._id} value={suffix.value}>
                            {suffix.value}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
                        Series
                      </label>
                      <select
                        value={selectedSeriesId}
                        onChange={(e) =>
                          handleSeriesChange(index, e.target.value)
                        }
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
                        required
                      >
                        <option value="">Select Series</option>
                        {series.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-600 mt-1">
                        Current ID: {desc.columnId || "Select a series"}
                      </p>
                      {formErrors[`columnId_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`columnId_${index}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
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
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
                        required
                      />
                      {formErrors[`installationDate_${index}`] && (
                        <p className="text-red-500 text-xs mt-1">
                          {formErrors[`installationDate_${index}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#003087] mb-1">
                        Column Code (Auto-generated)
                      </label>
                      <input
                        type="text"
                        value={form.columnCode}
                        readOnly
                        className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] opacity-75 font-semibold"
                        title="Auto-generated based on carbon type, dimensions, and prefix/suffix"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4">
                    <div>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={desc.isObsolete}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "isObsolete",
                              e.target.checked
                            )
                          }
                          className="form-checkbox h-4 w-4 text-[#3a6ea5]"
                        />
                        <span className="text-sm font-medium text-[#003087]">
                          Mark as Obsolete
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-100 rounded border">
                    <label className="block text-sm font-medium text-[#003087] mb-1">
                      Preview:
                    </label>
                    <p className="text-lg font-semibold text-gray-800">
                      {desc.prefix && `${desc.prefix} `}
                      {desc.carbonType} {desc.innerDiameter} x {desc.length}{" "}
                      {desc.particleSize}µm
                      {desc.suffix && ` ${desc.suffix}`}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Column Code:{" "}
                      <span className="font-semibold">{form.columnCode}</span>
                    </p>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
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
                onChange={(e) => {
                  setColumnCodeFilter(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={(e) => {
                  const filteredItems = [...columns, ...obsoleteColumns]
                    .flatMap((col) =>
                      col.descriptions.map((desc, descIndex) => ({
                        column: col,
                        desc,
                        descIndex,
                      }))
                    )
                    .filter(
                      ({ column, desc }) =>
                        column.columnCode
                          .toLowerCase()
                          .includes(columnCodeFilter.toLowerCase()) ||
                        desc.carbonType
                          .toLowerCase()
                          .includes(columnCodeFilter.toLowerCase()) ||
                        desc.make
                          .toLowerCase()
                          .includes(columnCodeFilter.toLowerCase())
                    );
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                      prev < filteredItems.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                      prev > 0 ? prev - 1 : filteredItems.length - 1
                    );
                  } else if (e.key === "Enter" && selectedIndex >= 0) {
                    e.preventDefault();
                    const { column, desc, descIndex } =
                      filteredItems[selectedIndex];
                    setForm({
                      columnCode: column.columnCode,
                      descriptions: [
                        {
                          ...desc,
                          innerDiameter: desc.innerDiameter.toString(),
                          length: desc.length.toString(),
                          particleSize: desc.particleSize.toString(),
                          linkedCarbonType:
                            carbonTypeMap[desc.carbonType] || "",
                        },
                      ],
                    });
                    setSelectedColumnId(column._id);
                    setSelectedDescriptionIndex(descIndex);
                    setShowSearchModal(false);
                    setIsFormOpen(true);
                  }
                }}
                className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8]"
                placeholder="Search column code, carbon type, or make..."
                autoFocus
              />
              <div className="max-h-40 overflow-y-auto mt-2">
                {[...columns, ...obsoleteColumns]
                  .flatMap((col) =>
                    col.descriptions.map((desc, descIndex) => ({
                      column: col,
                      desc,
                      descIndex,
                    }))
                  )
                  .filter(
                    ({ column, desc }) =>
                      column.columnCode
                        .toLowerCase()
                        .includes(columnCodeFilter.toLowerCase()) ||
                      desc.carbonType
                        .toLowerCase()
                        .includes(columnCodeFilter.toLowerCase()) ||
                      desc.make
                        .toLowerCase()
                        .includes(columnCodeFilter.toLowerCase())
                  )
                  .map(({ column, desc, descIndex }, index) => (
                    <div
                      key={`${column._id}-${descIndex}`}
                      className={`p-2 cursor-pointer border-b ${
                        index === selectedIndex
                          ? "bg-[#add8e6]"
                          : "hover:bg-[#d7e6f5]"
                      }`}
                      onClick={() => {
                        setForm({
                          columnCode: column.columnCode,
                          descriptions: [
                            {
                              ...desc,
                              innerDiameter: desc.innerDiameter.toString(),
                              length: desc.length.toString(),
                              particleSize: desc.particleSize.toString(),
                              linkedCarbonType:
                                carbonTypeMap[desc.carbonType] || "",
                            },
                          ],
                        });
                        setSelectedColumnId(column._id);
                        setSelectedDescriptionIndex(descIndex);
                        setShowSearchModal(false);
                        setIsFormOpen(true);
                      }}
                    >
                      <div className="font-semibold">{column.columnCode}</div>
                      <div className="text-sm text-gray-600">
                        {desc.carbonType} {desc.innerDiameter}x{desc.length} -{" "}
                        {desc.make}
                      </div>
                    </div>
                  ))}
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                className="mt-2 bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Audit Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-lg">
              <h2 className="text-lg font-bold mb-2 text-[#003087]">
                Audit Logs
              </h2>
              <div className="mb-4">
                <select
                  value={selectedColumnCodeForAudit}
                  onChange={(e) =>
                    setSelectedColumnCodeForAudit(e.target.value)
                  }
                  className="border-2 border-[#3a6ea5] rounded-lg p-2 bg-[#f8f8f8]"
                >
                  <option value="">All Columns</option>
                  {[...columns, ...obsoleteColumns].map((col) => (
                    <option key={col._id} value={col.columnCode}>
                      {col.columnCode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#add8e6] to-[#8ab4f8]">
                      {["Action", "Timestamp", "User", "Details"].map(
                        (header) => (
                          <th
                            key={header}
                            className="border border-[#3a6ea5] p-2 text-[#003087] font-semibold"
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudits.map((audit) => (
                      <tr key={audit._id}>
                        <td className="border border-[#3a6ea5] p-2">
                          {audit.action}
                        </td>
                        <td className="border border-[#3a6ea5] p-2">
                          {new Date(audit.timestamp).toLocaleString()}
                        </td>
                        <td className="border border-[#3a6ea5] p-2">
                          {audit.userId}
                        </td>
                        <td className="border border-[#3a6ea5] p-2">
                          {audit.changes.length === 0 ? (
                            "No changes logged"
                          ) : (
                            <ul className="list-disc pl-4 text-sm">
                              {audit.changes.map((change, index) => (
                                <li key={index}>
                                  <strong>{change.field}:</strong> From "
                                  {change.from || "N/A"}" to "
                                  {change.to || "N/A"}"
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-4 max-w-md w-full shadow-lg">
              <h2 className="text-lg font-bold mb-2 text-[#003087]">Help</h2>
              <p className="text-sm text-gray-600">
                This is the Column Master module. Use the toolbar to add, edit,
                delete, or search columns. Ctrl+Click a table row to view
                details. Contact support for further assistance.
              </p>
              <button
                onClick={() => setShowHelpModal(false)}
                className="mt-4 bg-[#0052cc] text-white px-4 py-2 rounded-lg hover:bg-[#003087] transition-all"
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
