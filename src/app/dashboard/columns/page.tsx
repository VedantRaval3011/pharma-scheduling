"use client";
import { useState, useEffect, useMemo } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";
import { useRouter } from "next/navigation";

interface ColumnDescription {
  prefix: string; // This will now be prefixId
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: string | number;
  length: string | number;
  particleSize: string | number;
  suffix: string; // This will now be suffixId
  make: string; // This will now be makeId
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
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
  // L to C mapping
  L1: "C18",
  L2: "C18 core-shell",
  L3: "Spherical Silica",
  L4: "Porous silica core",
  L7: "C8",
  L8: "NH₂",
  L9: "SCX",
  L10: "CN",
  L11: "Phenyl",
  L12: "SAX",
  L13: "C1",
  L14: "SAX",
  L15: "C6",
  L17: "SCX resin H⁺ form",
  L19: "SCX resin Ca²⁺ form",
  L20: "Diol",
  L21: "SVDB-polystyrene resin",
  L22: "PS-SCX",
  L23: "PM-AQ",
  L25: "PM-S-EX",
  L26: "C4",
  L27: "Large silica",
  L33: "Dextran-SEC",
  L34: "SCX resin Pb²⁺ form",
  L37: "PM-Protein SEC",
  L38: "PM-Water SEC",
  L39: "PH-PM resin",
  L43: "PFP",
  L55: "SCX polybutadiene-maleic acid",
  L59: "Protein silica hydrophilic",
  L68: "Amide HILIC",
  L78: "RP + WAX",
  L79: "HSA chiral",
  L80: "Cellulose chiral",
  L82: "NH₂–PVA",
  L83: "SAX latex",
  L84: "WCX resin",
  L85: "RP + WCX",
  L86: "OH-Core",
  L122: "ZIC-HILIC",

  // C to L mapping
  C18: "L1",
  "C18 core-shell": "L2",
  "Spherical Silica": "L3",
  "Porous silica core": "L4",
  C8: "L7",
  "NH₂": "L8",
  SCX: "L9",
  CN: "L10",
  Phenyl: "L11",
  SAX: "L12",
  C1: "L13",
  C6: "L15",
  "SCX resin H⁺ form": "L17",
  "SCX resin Ca²⁺ form": "L19",
  Diol: "L20",
  "SVDB-polystyrene resin": "L21",
  "PS-SCX": "L22",
  "PM-AQ": "L23",
  "PM-S-EX": "L25",
  C4: "L26",
  "Large silica": "L27",
  "Dextran-SEC": "L33",
  "SCX resin Pb²⁺ form": "L34",
  "PM-Protein SEC": "L37",
  "PM-Water SEC": "L38",
  "PH-PM resin": "L39",
  PFP: "L43",
  "SCX polybutadiene-maleic acid": "L55",
  "Protein silica hydrophilic": "L59",
  "Amide HILIC": "L68",
  "RP + WAX": "L78",
  "HSA chiral": "L79",
  "Cellulose chiral": "L80",
  "NH₂–PVA": "L82",
  "SAX latex": "L83",
  "WCX resin": "L84",
  "RP + WCX": "L85",
  "OH-Core": "L86",
  "ZIC-HILIC": "L122",
};

const carbonTypeOptions = [
  "C18",
  "C18 core-shell",
  "Spherical Silica",
  "Porous silica core",
  "C8",
  "NH₂",
  "SCX",
  "CN",
  "Phenyl",
  "SAX",
  "C1",
  "C6",
  "SCX resin H⁺ form",
  "SCX resin Ca²⁺ form",
  "Diol",
  "SVDB-polystyrene resin",
  "PS-SCX",
  "PM-AQ",
  "PM-S-EX",
  "C4",
  "Large silica",
  "Dextran-SEC",
  "SCX resin Pb²⁺ form",
  "PM-Protein SEC",
  "PM-Water SEC",
  "PH-PM resin",
  "PFP",
  "SCX polybutadiene-maleic acid",
  "Protein silica hydrophilic",
  "Amide HILIC",
  "RP + WAX",
  "HSA chiral",
  "Cellulose chiral",
  "NH₂–PVA",
  "SAX latex",
  "WCX resin",
  "RP + WCX",
  "OH-Core",
  "ZIC-HILIC",
];

const linkedCarbonTypeOptions = [
  "L1",
  "L2",
  "L3",
  "L4",
  "L7",
  "L8",
  "L9",
  "L10",
  "L11",
  "L12",
  "L13",
  "L14",
  "L15",
  "L17",
  "L19",
  "L20",
  "L21",
  "L22",
  "L23",
  "L25",
  "L26",
  "L27",
  "L33",
  "L34",
  "L37",
  "L38",
  "L39",
  "L43",
  "L55",
  "L59",
  "L68",
  "L78",
  "L79",
  "L80",
  "L82",
  "L83",
  "L84",
  "L85",
  "L86",
  "L122",
];

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
  const [selectedSeriesName, setSelectedSeriesName] = useState<string>("");
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
  const [renderKey, setRenderKey] = useState(0);

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
    console.log("=== FETCH DATA START ===");
    console.log("Auth data:", { companyId, locationId });

    if (!companyId || !locationId) {
      console.error("Missing auth data:", { companyId, locationId });
      setError("Missing company or location ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("=== MAKING API CALLS ===");

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
            headers: { "Cache-Control": "no-cache" },
          }
        ),
        fetch(
          `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
          }
        ),
        fetch(
          `/api/admin/column/make?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
          }
        ),
        fetch(
          `/api/admin/prefixAndSuffix?type=PREFIX&companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
          }
        ),
        fetch(
          `/api/admin/prefixAndSuffix?type=SUFFIX&companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
          }
        ),
        fetch(
          `/api/admin/series?companyId=${companyId}&locationId=${locationId}`,
          {
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
          }
        ),
      ]);

      console.log("=== API RESPONSE STATUS ===");
      const responses = [
        { name: "columns", response: columnsRes },
        { name: "obsoleteColumns", response: obsoleteColumnsRes },
        { name: "makes", response: makesRes },
        { name: "prefix", response: prefixRes },
        { name: "suffix", response: suffixRes },
        { name: "series", response: seriesRes },
      ];

      // Log all response statuses and headers
      for (const { name, response } of responses) {
        console.log(`${name} API:`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`${name} API error:`, {
            status: response.status,
            statusText: response.statusText,
            errorText,
            url: response.url,
          });
          throw new Error(`${name} API error: ${response.statusText}`);
        }
      }

      console.log("=== PARSING JSON RESPONSES ===");

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

      console.log("=== RAW API RESPONSES ===");
      console.log(
        "Raw columns response:",
        JSON.stringify(columnsData, null, 2)
      );
      console.log(
        "Raw obsolete columns response:",
        JSON.stringify(obsoleteColumnsData, null, 2)
      );
      console.log("Raw makes response:", JSON.stringify(makesData, null, 2));
      console.log(
        "Raw prefixes response:",
        JSON.stringify(prefixData, null, 2)
      );
      console.log(
        "Raw suffixes response:",
        JSON.stringify(suffixData, null, 2)
      );
      console.log("Raw series response:", JSON.stringify(seriesData, null, 2));

      // Process MAKES first (highest priority for debugging)
      console.log("=== PROCESSING MAKES ===");
      if (makesData.success) {
        console.log("Makes data structure:", {
          isArray: Array.isArray(makesData.data),
          length: makesData.data?.length,
          firstItem: makesData.data?.[0],
          sampleItems: makesData.data?.slice(0, 3),
        });

        const processedMakes = makesData.data.filter((make: any) => {
          const isValid = make && make.make?.trim() && make._id;
          console.log("Make validation:", {
            make,
            isValid,
            hasId: !!make?._id,
            hasName: !!make?.make,
            nameTrimmed: make?.make?.trim(),
          });
          return isValid;
        });

        console.log(
          "Processed makes:",
          JSON.stringify(processedMakes, null, 2)
        );
        console.log("Makes count:", {
          original: makesData.data?.length,
          processed: processedMakes.length,
        });
        setMakes(processedMakes);
      } else {
        console.error("Makes API failed:", makesData.error);
        setError(`Failed to fetch makes: ${makesData.error}`);
      }

      // Process PREFIXES
      console.log("=== PROCESSING PREFIXES ===");
      if (prefixData.success && Array.isArray(prefixData.data)) {
        console.log("Prefixes data structure:", {
          isArray: Array.isArray(prefixData.data),
          length: prefixData.data.length,
          firstItem: prefixData.data[0],
          sampleItems: prefixData.data.slice(0, 3),
        });

        const processedPrefixes = prefixData.data
          .filter((item: any) => {
            const isValid = item && item.name?.trim() && item._id;
            console.log("Prefix validation:", {
              item,
              isValid,
              hasId: !!item?._id,
              hasName: !!item?.name,
              nameTrimmed: item?.name?.trim(),
            });
            return isValid;
          })
          .map((item: any) => ({
            _id: item._id,
            value: item.name,
          }));

        console.log(
          "Processed prefixes:",
          JSON.stringify(processedPrefixes, null, 2)
        );
        console.log("Prefixes count:", {
          original: prefixData.data.length,
          processed: processedPrefixes.length,
        });
        setPrefixes(processedPrefixes);
      } else {
        console.error("Prefixes API failed or invalid data:", {
          success: prefixData.success,
          isArray: Array.isArray(prefixData.data),
          data: prefixData.data,
          error: prefixData.error,
        });
        setPrefixes([]);
      }

      // Process SUFFIXES
      console.log("=== PROCESSING SUFFIXES ===");
      if (suffixData.success && Array.isArray(suffixData.data)) {
        console.log("Suffixes data structure:", {
          isArray: Array.isArray(suffixData.data),
          length: suffixData.data.length,
          firstItem: suffixData.data[0],
          sampleItems: suffixData.data.slice(0, 3),
        });

        const processedSuffixes = suffixData.data
          .filter((item: any) => {
            const isValid = item && item.name?.trim() && item._id;
            console.log("Suffix validation:", {
              item,
              isValid,
              hasId: !!item?._id,
              hasName: !!item?.name,
              nameTrimmed: item?.name?.trim(),
            });
            return isValid;
          })
          .map((item: any) => ({
            _id: item._id,
            value: item.name,
          }));

        console.log(
          "Processed suffixes:",
          JSON.stringify(processedSuffixes, null, 2)
        );
        console.log("Suffixes count:", {
          original: suffixData.data.length,
          processed: processedSuffixes.length,
        });
        setSuffixes(processedSuffixes);
      } else {
        console.error("Suffixes API failed or invalid data:", {
          success: suffixData.success,
          isArray: Array.isArray(suffixData.data),
          data: suffixData.data,
          error: suffixData.error,
        });
        setSuffixes([]);
      }

      console.log("=== PROCESSING COLUMNS ===");
      if (columnsData.success) {
        console.log("Columns data structure:", {
          isArray: Array.isArray(columnsData.data),
          length: columnsData.data?.length,
          firstColumn: columnsData.data?.[0],
          firstColumnDescriptions: columnsData.data?.[0]?.descriptions,
        });

        const processedColumns = columnsData.data.map((col: Column) => {
          const processedCol = {
            ...col,
            descriptions: col.descriptions.map((desc: any) => {
              const processedDesc = {
                ...desc,
                columnId: desc.columnId || "",
                installationDate: desc.installationDate || "",
                linkedCarbonType:
                  desc.linkedCarbonType || carbonTypeMap[desc.carbonType] || "",

                // FIXED: Handle nested object structure properly
                make: desc.makeId?._id || desc.make || "",
                prefix: desc.prefixId?._id || desc.prefix || "",
                suffix: desc.suffixId?._id || desc.suffix || "",

                // Keep original nested objects for reference if needed
                makeObj: desc.makeId || null,
                prefixObj: desc.prefixId || null,
                suffixObj: desc.suffixId || null,
              };

              console.log("Column description processing:", {
                original: {
                  makeId: desc.makeId,
                  prefixId: desc.prefixId,
                  suffixId: desc.suffixId,
                  make: desc.make,
                  prefix: desc.prefix,
                  suffix: desc.suffix,
                },
                processed: {
                  make: processedDesc.make,
                  prefix: processedDesc.prefix,
                  suffix: processedDesc.suffix,
                },
                types: {
                  makeType: typeof processedDesc.make,
                  prefixType: typeof processedDesc.prefix,
                  suffixType: typeof processedDesc.suffix,
                },
              });

              return processedDesc;
            }),
          };

          console.log("Processed column:", {
            columnCode: processedCol.columnCode,
            descriptionsCount: processedCol.descriptions.length,
            sampleDescription: processedCol.descriptions[0],
          });

          return processedCol;
        });

        console.log(
          "Final processed columns:",
          JSON.stringify(processedColumns, null, 2)
        );
        console.log("Columns summary:", {
          totalColumns: processedColumns.length,
          totalDescriptions: processedColumns.reduce(
            (sum: number, col: { descriptions: ColumnDescription[] }) =>
              sum + col.descriptions.length,
            0
          ),
        });
        setColumns(processedColumns);
      } else {
        console.error("Columns API failed:", columnsData.error);
        setError(`Failed to fetch columns: ${columnsData.error}`);
      }

      // Apply the same fix to OBSOLETE COLUMNS processing:
      console.log("=== PROCESSING OBSOLETE COLUMNS ===");
      if (obsoleteColumnsData.success) {
        console.log("Obsolete columns data structure:", {
          isArray: Array.isArray(obsoleteColumnsData.data),
          length: obsoleteColumnsData.data?.length,
        });

        const processedObsoleteColumns = obsoleteColumnsData.data.map(
          (col: Column) => ({
            ...col,
            descriptions: col.descriptions.map((desc: any) => ({
              ...desc,
              columnId: desc.columnId || "",
              installationDate: desc.installationDate || "",
              linkedCarbonType:
                desc.linkedCarbonType || carbonTypeMap[desc.carbonType] || "",

              // FIXED: Handle nested object structure properly
              make: desc.makeId?._id || desc.make || "",
              prefix: desc.prefixId?._id || desc.prefix || "",
              suffix: desc.suffixId?._id || desc.suffix || "",

              // Keep original nested objects for reference if needed
              makeObj: desc.makeId || null,
              prefixObj: desc.prefixId || null,
              suffixObj: desc.suffixId || null,
            })),
          })
        );

        console.log(
          "Processed obsolete columns:",
          JSON.stringify(processedObsoleteColumns, null, 2)
        );
        setObsoleteColumns(processedObsoleteColumns);
      } else {
        console.error(
          "Obsolete columns API failed:",
          obsoleteColumnsData.error
        );
        setError(
          `Failed to fetch obsolete columns: ${obsoleteColumnsData.error}`
        );
      }

      // Process SERIES
      console.log("=== PROCESSING SERIES ===");
      if (seriesData.success) {
        console.log("Series data:", JSON.stringify(seriesData.data, null, 2));
        setSeries(seriesData.data);
      } else {
        console.error("Series API failed:", seriesData.error);
        setError(`Failed to fetch series: ${seriesData.error}`);
      }

      console.log("=== FINAL STATE SUMMARY ===");
      console.log("State will be set to:", {
        makesCount: makesData.success
          ? makesData.data?.filter((m: any) => m && m.make?.trim() && m._id)
              .length
          : 0,
        prefixesCount: prefixData.success
          ? prefixData.data?.filter((p: any) => p && p.name?.trim() && p._id)
              .length
          : 0,
        suffixesCount: suffixData.success
          ? suffixData.data?.filter((s: any) => s && s.name?.trim() && s._id)
              .length
          : 0,
        columnsCount: columnsData.success ? columnsData.data?.length : 0,
        obsoleteColumnsCount: obsoleteColumnsData.success
          ? obsoleteColumnsData.data?.length
          : 0,
        seriesCount: seriesData.success ? seriesData.data?.length : 0,
      });
    } catch (err: any) {
      console.error("=== FETCH DATA ERROR ===");
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      console.log("=== FETCH DATA COMPLETE ===");
      setLoading(false);
    }
  };

  const generateColumnCode = (
    desc: ColumnDescription,
    columns: Column[],
    obsoleteColumns: Column[],
    previousCoreAttributes?: CoreAttributes
  ): string => {
    const currentCoreAttributes = getCoreAttributes(desc);
    const coreSpec = createCoreSpec(desc);
    const fullSpec = createFullSpec(desc, true);

    const allOtherColumns = [...columns, ...obsoleteColumns].filter(
      (col) => col._id !== selectedColumnId
    );

    // --- PRIORITY 1: Exact FULL spec match ---
    const exactFullMatch = allOtherColumns.find((col) =>
      col.descriptions.some((d) => createFullSpec(d, true) === fullSpec)
    );
    if (exactFullMatch) return exactFullMatch.columnCode;

    // --- PRIORITY 2: Match based on prefix/suffix rules ---
    const matchIgnoringPrefixSuffix = allOtherColumns.find((col) =>
      col.descriptions.some((d) => {
        if (desc.usePrefixForNewCode || desc.useSuffixForNewCode) {
          // Prefix/suffix matter → must match full spec including them
          return createFullSpec(d, true) === fullSpec;
        } else {
          // Prefix/suffix ignored → match on core spec only
          return createCoreSpec(d) === coreSpec;
        }
      })
    );
    if (matchIgnoringPrefixSuffix) return matchIgnoringPrefixSuffix.columnCode;

    // --- PRIORITY 3: On update, reuse matched core spec from another column ---
    if (selectedColumnId && previousCoreAttributes) {
      const coreChanged =
        currentCoreAttributes.carbonType !==
          previousCoreAttributes.carbonType ||
        currentCoreAttributes.innerDiameter !==
          previousCoreAttributes.innerDiameter ||
        currentCoreAttributes.length !== previousCoreAttributes.length ||
        currentCoreAttributes.particleSize !==
          previousCoreAttributes.particleSize;

      if (coreChanged) {
        const otherCoreMatch = allOtherColumns.find((col) =>
          col.descriptions.some((d) => createCoreSpec(d) === coreSpec)
        );
        if (otherCoreMatch) return otherCoreMatch.columnCode;
      } else {
        // Core same → keep original
        const currentColumn = [...columns, ...obsoleteColumns].find(
          (col) => col._id === selectedColumnId
        );
        if (currentColumn) return currentColumn.columnCode;
      }
    }

    // --- PRIORITY 4: Generate new code ---
    return generateNewColumnCode(columns, obsoleteColumns);
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
      const existingIds = allColumns
        .flatMap((col) => col.descriptions.map((desc) => desc.columnId))
        .filter((id) => id && id.startsWith(selectedSeries.prefix));

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
      const nextColumnId = `${selectedSeries.prefix}${nextNumber
        .toString()
        .padStart(selectedSeries.padding, "0")}`;

      return nextColumnId;
    } catch (err) {
      console.error("Error generating next column ID:", err);
      throw err;
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

    // Always generate column code when all required fields are filled
    if (
      desc.carbonType &&
      desc.innerDiameter &&
      desc.length &&
      desc.particleSize
    ) {
      try {
        // For updates, always pass the previous core attributes
        const newColumnCode = generateColumnCode(
          desc,
          columns,
          obsoleteColumns,
          previousCoreAttributes ||
            (selectedColumnId ? getCoreAttributes(desc) : undefined)
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
    }
  };

  const getMakeName = (makeId: string | undefined) => {
    if (!makeId) return "-";
    if (makes.length === 0) return "Loading...";
    const make = makes.find(
      (m) => m._id.toString().trim() === makeId.toString().trim()
    );
    return make?.make || `Unknown Make (${makeId})`;
  };

  const getPrefixName = (prefixId: string | undefined) => {
    if (!prefixId) return "-";
    if (prefixes.length === 0) return "Loading...";
    const prefix = prefixes.find(
      (p) => p._id.toString().trim() === prefixId.toString().trim()
    );
    return prefix?.value || `Unknown Prefix (${prefixId})`;
  };

  const getSuffixName = (suffixId: string | undefined) => {
    if (!suffixId) return "-";
    if (suffixes.length === 0) return "Loading...";
    const suffix = suffixes.find(
      (s) => s._id.toString().trim() === suffixId.toString().trim()
    );
    return suffix?.value || `Unknown Suffix (${suffixId})`;
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

    // Find the series that matches this column's columnId
    const matchingSeries = series.find((s) =>
      desc.columnId.startsWith(s.prefix)
    );

    if (matchingSeries) {
      setSelectedSeriesId(matchingSeries._id);
      setSelectedSeriesName(matchingSeries.name);
    } else {
      setSelectedSeriesId("");
      setSelectedSeriesName("");
    }

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

    // Reset selection states including series
    setSelectedColumnId("");
    setSelectedDescriptionIndex(-1);
    setSelectedSeriesId("");
    setSelectedSeriesName(""); // Add this line

    // Clear all form-related states including new dropdown states
    setCarbonTypeDropdowns({});
    setCarbonTypeFilters({});
    setLinkedCarbonTypeDropdowns({});
    setLinkedCarbonTypeFilters({});

    console.log("Form state reset completed");
  };

  // 1. Fix the formattedDesc creation in handleSave function
  // Replace your existing handleSave function with this fixed version
  const handleSave = async () => {
    console.log("=== SAVE OPERATION START ===");
    console.log("Form state:", JSON.stringify(form, null, 2));

    // Validate form
    if (!validateForm()) {
      console.log("Form validation failed");
      setError("Please correct the form errors before saving.");
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
        throw new Error(errorMsg);
      }

      if (!desc.installationDate) {
        const errorMsg = "Installation Date is required.";
        console.error("Validation error:", errorMsg);
        throw new Error(errorMsg);
      }

      // Format description for backend
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
        makeId: desc.make, // Ensure this is the ID
        prefixId: desc.prefix || undefined, // Ensure this is the ID or undefined
        suffixId: desc.suffix || undefined, // Ensure this is the ID or undefined
      };

      console.log(
        "Formatted description for backend:",
        JSON.stringify(formattedDesc, null, 2)
      );

      // Prepare the body for the API call
      const body = {
        columnCode: form.columnCode,
        descriptions: [formattedDesc],
        companyId,
        locationId,
      };

      console.log("Request body:", JSON.stringify(body, null, 2));

      // Determine the API endpoint based on obsolete status and whether it's new/existing
      const isObsolete = desc.isObsolete;
      const isNewColumn = !selectedColumnId;
      const isEditingExisting =
        selectedColumnId && selectedDescriptionIndex >= 0;

      let url: string;
      let method: string;
      let requestBody: any = body;

      if (isEditingExisting) {
        // For editing existing columns, we need to handle state transitions
        const currentColumn = [...columns, ...obsoleteColumns].find(
          (col) => col._id === selectedColumnId
        );
        const currentDesc =
          currentColumn?.descriptions[selectedDescriptionIndex];
        const wasObsolete = currentDesc?.isObsolete;

        if (wasObsolete && !isObsolete) {
          // Moving from obsolete to active
          console.log("Moving column from obsolete to active");

          // First, delete from obsolete column
          try {
            const deleteResponse = await fetch(
              `/api/admin/obsolete-column/${selectedColumnId}?companyId=${companyId}&locationId=${locationId}`,
              {
                method: "DELETE",
                credentials: "include",
              }
            );

            if (!deleteResponse.ok) {
              const deleteData = await deleteResponse.json();
              throw new Error(
                `Failed to remove from obsolete: ${deleteData.error}`
              );
            }
            console.log("Successfully removed from obsolete table");
          } catch (deleteErr) {
            console.error("Error removing from obsolete:", deleteErr);
            throw new Error("Failed to move column from obsolete to active");
          }

          // Then create as new active column
          url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
          method = "POST";
        } else if (!wasObsolete && isObsolete) {
          // Moving from active to obsolete
          console.log("Moving column from active to obsolete");

          // First, delete from active column
          try {
            const deleteResponse = await fetch(
              `/api/admin/column/${selectedColumnId}?companyId=${companyId}&locationId=${locationId}`,
              {
                method: "DELETE",
                credentials: "include",
              }
            );

            if (!deleteResponse.ok) {
              const deleteData = await deleteResponse.json();
              throw new Error(
                `Failed to remove from active: ${deleteData.error}`
              );
            }
            console.log("Successfully removed from active table");
          } catch (deleteErr) {
            console.error("Error removing from active:", deleteErr);
            throw new Error("Failed to move column from active to obsolete");
          }

          // Then create as obsolete column
          url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
          method = "POST";
        } else {
          // Updating within the same category (active to active, or obsolete to obsolete)
          if (wasObsolete) {
            // Update obsolete column
            url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
            method = "POST"; // Obsolete API handles updates via POST
          } else {
            // Update active column
            url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
            method = "PUT";
            requestBody = { ...body, id: selectedColumnId };
          }
        }
      } else {
        // Creating new column
        if (isObsolete) {
          // Create new obsolete column
          url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
          method = "POST";
          console.log("Creating new obsolete column");
        } else {
          // Create new active column
          url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
          method = "POST";
          console.log("Creating new active column");
        }
      }

      console.log("API Request:", {
        method,
        url,
        isObsolete,
        isNewColumn,
        isEditingExisting,
      });

      // Make the API call
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(requestBody),
        credentials: "include",
      });

      console.log("API Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      const data = await response.text();
      console.log("Raw response data:", data);

      let jsonData;
      try {
        jsonData = JSON.parse(data);
      } catch (parseErr) {
        console.error("Failed to parse response:", parseErr, "Raw data:", data);
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        console.error("API error:", {
          status: response.status,
          statusText: response.statusText,
          error: jsonData.error || "Unknown error",
        });
        throw new Error(jsonData.error || "Failed to save column");
      }

      if (jsonData.success) {
        console.log("Save successful:", jsonData);
        // Refresh data after successful save
        await fetchData();
        handleCloseForm();

        // Show success message
        console.log(
          `Column ${isObsolete ? "moved to obsolete" : "saved successfully"}`
        );
      } else {
        console.error("API returned success: false", jsonData);
        throw new Error(jsonData.error || "Failed to save column");
      }
    } catch (err) {
      console.error("Save operation failed:", err);
      setError(
        `Failed to save column: ${
          err instanceof Error ? err.message : "An unknown error occurred."
        }`
      );
    } finally {
      setLoading(false);
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

  const handleEdit = () => {
    if (selectedColumnId && selectedDescriptionIndex >= 0) {
      const column = [...columns, ...obsoleteColumns].find(
        (col) => col._id === selectedColumnId
      );
      if (column) {
        const desc = column.descriptions[selectedDescriptionIndex];

        // Find the series that matches this column's columnId
        const matchingSeries = series.find((s) =>
          desc.columnId.startsWith(s.prefix)
        );

        if (matchingSeries) {
          setSelectedSeriesId(matchingSeries._id);
          setSelectedSeriesName(matchingSeries.name);
        }

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
    const currentColumns = useMemo(
      () => filterColumns(showObsoleteTable ? obsoleteColumns : columns),
      [columns, obsoleteColumns, showObsoleteTable, searchFilters]
    );
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

            // Find the "Internal Column ID" series
            const internalSeries = series.find(
              (s) => s.name === "Internal Column ID"
            );
            const defaultSeriesId = internalSeries ? internalSeries._id : "";

            // Initialize form
            setForm({
              columnCode: initialColumnCode,
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

            // Set default series and generate column ID if available
            setSelectedSeriesId(defaultSeriesId);
            setSelectedSeriesName(defaultSeriesId ? "Internal Column ID" : "");
            if (defaultSeriesId) {
              handleSeriesChange(0, defaultSeriesId);
            }

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
              className={`px-4 py-2 rounded-lg transition-all shadow-sm text-white 
    ${
      showObsoleteTable
        ? "bg-red-600 hover:bg-red-800" // Obsolete table active
        : "bg-[#0052cc] hover:bg-[#003087]" // Active table
    }`}
            >
              {showObsoleteTable
                ? "Show Active Columns"
                : "Show Obsolete Columns"}
            </button>
          </div>
          <div className="overflow-x-auto border-2 border-gray-300 rounded-lg shadow-sm">
            <table
              key={renderKey}
              className="w-full border-collapse border border-gray-300 bg-white"
            >
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
                        {getPrefixName(desc.prefix) || "-"}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {getSuffixName(desc.suffix) || "-"}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {getPrefixName(desc.prefix)} {desc.carbonType}{" "}
                        {desc.innerDiameter} x {desc.length} {desc.particleSize}
                        µm {getSuffixName(desc.suffix)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {getMakeName(desc.make)}
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
                    <p>{getMakeName(form.descriptions[0]?.make)}</p>
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
                          onChange={(e) => {
                            // Find the selected make object and store its ID instead of the string
                            const selectedMake = makes.find(
                              (m) => m._id === e.target.value
                            );
                            handleDescriptionChange(
                              index,
                              "make",
                              e.target.value
                            );
                          }}
                          className="border-2 border-[#3a6ea5] rounded-lg p-2 w-full bg-[#f8f8f8] text-xs"
                          required
                        >
                          <option value="">Select Make</option>
                          {makes.map((make) => (
                            <option key={make._id} value={make._id}>
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
                            <option key={prefix._id} value={prefix._id}>
                              {" "}
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
                            <option key={suffix._id} value={suffix._id}>
                              {" "}
                              {suffix.value}
                            </option>
                          ))}
                        </select>
                      </div>
                      {!selectedColumnId ? (
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
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-[#003087] mb-1">
                            Series (Read-only)
                          </label>
                          <input
                            type="text"
                            value={selectedSeriesName || "Unknown Series"}
                            className="border-2 border-gray-300 rounded-lg p-2 w-full bg-gray-100 text-xs opacity-60"
                            readOnly
                          />
                          <p className="text-xs text-gray-600 mt-1">
                            Column ID: {desc.columnId}
                          </p>
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
      </div>
    </ProtectedRoute>
  );
}
