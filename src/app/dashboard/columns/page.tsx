"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

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
  // UPDATED OPTIONAL FIELDS - pH range
  description?: string;
  phMin?: number | null;
  phMax?: number | null;
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
  partNumber: string;
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
  endNumber: number;
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
  L16: "C2",
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
  L38: "SEC(GFC) AQUEOUS",
  L39: "PH-PM resin",
  L43: "PFP",
  L51: "CHIRALPAK AD-H",
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
  "SEC(GFC) AQUEOUS": "L38",
  "PH-PM resin": "L39",
  PFP: "L43",
  "CHIRALPAK AD-H": "L51",
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
  "C2",
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
  "SEC(GFC) AQUEOUS",
  "PH-PM resin",
  "PFP",
  "SCX polybutadiene-maleic acid",
  "CHIRALPAK AD-H",
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
  "L16",
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
  "L51",
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
  const [warningMessage, setWarningMessage] = useState<string>("");
  const carbonTypeDropdownRefs = useRef<{
    [key: number]: HTMLDivElement | null;
  }>({});
  const linkedCarbonTypeDropdownRefs = useRef<{
    [key: number]: HTMLDivElement | null;
  }>({});

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
    partNumber: "",
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
        // ADD THESE NEW FIELDS
        description: "",
        phMin: null as number | null,
        phMax: null as number | null,
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
    form.descriptions[0]?.linkedCarbonType,
    form.descriptions[0]?.innerDiameter,
    form.descriptions[0]?.length,
    form.descriptions[0]?.particleSize,
    form.descriptions[0]?.prefix,
    form.descriptions[0]?.suffix,
    form.descriptions[0]?.usePrefixForNewCode,
    form.descriptions[0]?.useSuffixForNewCode,
    selectedColumnId,
  ]);

  const exportToExcel = () => {
    try {
      // Get current data (active or obsolete columns based on current view)
      const dataToExport = showObsoleteTable ? obsoleteColumns : columns;

      // Helper functions to resolve lookup data (reusing existing functions)
      const resolveMakeName = (makeId: string | undefined) => {
        if (!makeId) return "";
        const make = makes.find(
          (m) => m._id.toString().trim() === makeId.toString().trim()
        );
        return make?.make || `Unknown Make (${makeId})`;
      };

      const resolvePrefixName = (prefixId: string | undefined) => {
        if (!prefixId) return "";
        const prefix = prefixes.find(
          (p) => p._id.toString().trim() === prefixId.toString().trim()
        );
        return prefix?.value || `Unknown Prefix (${prefixId})`;
      };

      const resolveSuffixName = (suffixId: string | undefined) => {
        if (!suffixId) return "";
        const suffix = suffixes.find(
          (s) => s._id.toString().trim() === suffixId.toString().trim()
        );
        return suffix?.value || `Unknown Suffix (${suffixId})`;
      };

      // Prepare data with resolved lookup values
      const excelData: any[] = [];
      let serialNo = 1;

      dataToExport.forEach((column) => {
        column.descriptions.forEach((desc, descIndex) => {
          const row: any = {
            "Serial No": descIndex === 0 ? serialNo : "",
            "Column Code": descIndex === 0 ? column.columnCode : "",
            "Part Number": descIndex === 0 ? column.partNumber || "" : "",
            Prefix: resolvePrefixName(desc.prefix),
            Suffix: resolveSuffixName(desc.suffix),
            "Carbon Type": desc.carbonType,
            "Linked Carbon Type": desc.linkedCarbonType,
            "Inner Diameter (mm)": desc.innerDiameter,
            "Length (mm)": desc.length,
            "Particle Size (µm)": desc.particleSize,
            Description: formatAlignedDescription(desc),
            Make: resolveMakeName(desc.make),
            "Column ID": desc.columnId,
            "Installation Date": desc.installationDate,
            "Make Specific":
              desc.usePrefixForNewCode || desc.useSuffixForNewCode
                ? "Yes"
                : "No",
            // ADD THESE NEW EXCEL COLUMNS
            Remark: desc.description || "",
            "pH Min": desc.phMin !== null ? desc.phMin : "",
            "pH Max": desc.phMax !== null ? desc.phMax : "",
            "pH Range":
              desc.phMin !== null && desc.phMax !== null
                ? `${desc.phMin} - ${desc.phMax}`
                : "",
          };

          excelData.push(row);
        });
        serialNo++;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 10 }, // Serial No
        { wch: 15 }, // Column Code
        { wch: 15 }, // Part Number
        { wch: 12 }, // Prefix
        { wch: 12 }, // Suffix
        { wch: 15 }, // Carbon Type
        { wch: 18 }, // Linked Carbon Type
        { wch: 15 }, // Inner Diameter
        { wch: 12 }, // Length
        { wch: 15 }, // Particle Size
        { wch: 35 }, // Description
        { wch: 20 }, // Make
        { wch: 15 }, // Column ID
        { wch: 15 }, // Installation Date
        { wch: 12 }, // Make Specific
        // ADD THESE NEW COLUMN WIDTHS
        { wch: 25 }, // Remark
        { wch: 10 }, // pH Min
        { wch: 10 }, // pH Max
        { wch: 15 }, // pH Range
      ];

      ws["!cols"] = colWidths;

      // Handle merged cells for Column Code and Serial No
      const merges: XLSX.Range[] = [];
      let currentRow = 2; // Start from row 2 (after header)

      dataToExport.forEach((column) => {
        const descCount = column.descriptions.length;
        if (descCount > 1) {
          // Merge Serial No cells (column A)
          merges.push({
            s: { r: currentRow - 1, c: 0 }, // start (0-indexed)
            e: { r: currentRow + descCount - 2, c: 0 }, // end
          });

          // Merge Column Code cells (column B)
          merges.push({
            s: { r: currentRow - 1, c: 1 }, // start (0-indexed)
            e: { r: currentRow + descCount - 2, c: 1 }, // end
          });
        }
        currentRow += descCount;
      });

      // Apply merges
      ws["!merges"] = merges;

      // Style the header row
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" },
      };

      // Apply header styling
      const headers = Object.keys(excelData[0] || {});
      headers.forEach((header, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
        if (!ws[cellRef]) ws[cellRef] = { v: header, t: "s" };
        ws[cellRef].s = headerStyle;
      });

      // Add worksheet to workbook
      const sheetName = showObsoleteTable
        ? "Obsolete Columns"
        : "Active Columns";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0];
      const filename = `Column_Master_${sheetName.replace(
        " ",
        "_"
      )}_${currentDate}.xlsx`;

      // Export file
      XLSX.writeFile(wb, filename);

      console.log(`Excel file exported: ${filename}`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      setError("Failed to export to Excel. Please try again.");
    }
  };
  const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, max - 1) + "…" : str;

  const formatAlignedDescription = (desc: ColumnDescription) => {
    const linkedCarbon =
      desc.linkedCarbonType || carbonTypeMap[desc.carbonType] || "-";
    const carbonType = desc.carbonType || "-";

    const parts = [
      truncate(linkedCarbon, 8).padEnd(8), // Linked Carbon
      truncate(carbonType, 12).padEnd(12), // Carbon Type
      `${desc.innerDiameter}mm`.padEnd(5), // Inner Diameter
      `${desc.length}mm`.padEnd(5),
      `${desc.particleSize}µm`.padEnd(0),
    ].filter((part) => part.trim() !== "");

    return parts.join("  ");
  };

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

  const resolveAuditValue = (field: string, value: any) => {
    if (!value || value === null || value === undefined) return "-";

    // Handle different field types
    switch (field) {
      case "makeId":
      case "make":
        return getMakeName(value);

      case "prefixId":
      case "prefix":
        return getPrefixName(value);

      case "suffixId":
      case "suffix":
        return getSuffixName(value);

      case "installationDate":
        if (typeof value === "string" && value.includes("-")) {
          return new Date(value).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          });
        }
        return value;

      case "carbonType":
      case "linkedCarbonType":
      case "innerDiameter":
      case "length":
      case "particleSize":
      case "columnId":
      case "description":
      case "phMin":
      case "phMax":
        return String(value);

      case "usePrefix":
      case "useSuffix":
      case "usePrefixForNewCode":
      case "useSuffixForNewCode":
      case "isObsolete":
        return value ? "Yes" : "No";

      default:
        // For unknown fields, try to resolve as string
        return typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    }
  };

  // Helper function to format field names for display
  const formatFieldName = (field: string) => {
    const fieldMap: { [key: string]: string } = {
      makeId: "Make",
      make: "Make",
      prefixId: "Prefix",
      prefix: "Prefix",
      suffixId: "Suffix",
      suffix: "Suffix",
      carbonType: "Carbon Type",
      linkedCarbonType: "Linked Carbon Type",
      innerDiameter: "Inner Diameter",
      length: "Length",
      particleSize: "Particle Size",
      columnId: "Column ID",
      installationDate: "Installation Date",
      usePrefix: "Use Prefix",
      useSuffix: "Use Suffix",
      usePrefixForNewCode: "Use Prefix for New Code",
      useSuffixForNewCode: "Use Suffix for New Code",
      isObsolete: "Is Obsolete",
      description: "Description",
      phMin: "pH Min",
      phMax: "pH Max",
    };

    return fieldMap[field] || field;
  };

  const scrollToSelectedItem = (
    dropdownRef: HTMLDivElement | null,
    selectedIndex: number
  ): void => {
    if (!dropdownRef) return;

    const items = dropdownRef.children;
    if (!items || items.length <= selectedIndex) return;

    const selectedItem = items[selectedIndex] as HTMLDivElement;
    if (!selectedItem) return;

    const dropdownHeight = dropdownRef.clientHeight;
    const dropdownScrollTop = dropdownRef.scrollTop;

    const itemTop = selectedItem.offsetTop;
    const itemHeight = selectedItem.offsetHeight;
    const itemBottom = itemTop + itemHeight;

    // If item is above visible area, scroll up
    if (itemTop < dropdownScrollTop) {
      dropdownRef.scrollTo({
        top: itemTop,
        behavior: "smooth",
      });
    }
    // If item is below visible area, scroll down
    else if (itemBottom > dropdownScrollTop + dropdownHeight) {
      dropdownRef.scrollTo({
        top: itemBottom - dropdownHeight,
        behavior: "smooth",
      });
    }
  };

  const getCoreAttributes = (desc: ColumnDescription): CoreAttributes => {
    return {
      carbonType: (desc.carbonType || "").toString().trim(),
      innerDiameter: Number(desc.innerDiameter),
      length: Number(desc.length),
      particleSize: Number(desc.particleSize),
    };
  };

  // Helper function to compare core attributes
  const coreAttributesChanged = (
    current: CoreAttributes,
    previous: CoreAttributes
  ): boolean => {
    const sameStr = (a: any, b: any) =>
      String(a ?? "")
        .trim()
        .toLowerCase() ===
      String(b ?? "")
        .trim()
        .toLowerCase();
    const sameNum = (a: any, b: any) => Number(a) === Number(b);

    return !(
      sameStr(current.carbonType, previous.carbonType) &&
      sameNum(current.innerDiameter, previous.innerDiameter) &&
      sameNum(current.length, previous.length) &&
      sameNum(current.particleSize, previous.particleSize)
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

  const fetchSingleColumnAudit = async (columnCode?: string) => {
    try {
      // Use the provided columnCode or the selected one
      const codeToAudit = columnCode || selectedColumnCodeForAudit;

      if (!codeToAudit) {
        setError("Please select a column first.");
        return;
      }

      const response = await fetch(
        `/api/admin/column/audit?companyId=${companyId}&locationId=${locationId}&columnCode=${codeToAudit}`,
        { credentials: "include" }
      );

      const data = await response.json();
      if (data.success) {
        setAudits(
          data.data.map((audit: any) => ({
            ...audit,
            changes: Array.isArray(audit.changes)
              ? audit.changes
              : [audit.changes],
          }))
        );
        // Pre-filter for this specific column
        setAuditFilters((prev) => ({
          ...prev,
          columnCode: codeToAudit,
        }));
        setShowAuditModal(true);
      } else {
        setError(data.error || "Failed to fetch audit logs.");
      }
    } catch (err: any) {
      setError(`Error fetching audits: ${err.message}`);
    }
  };

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

      const [columnsRes, obsoleteColumnsRes, makesRes, prefixRes, suffixRes] =
        await Promise.all([
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
        ]);

      console.log("=== API RESPONSE STATUS ===");
      const responses = [
        { name: "columns", response: columnsRes },
        { name: "obsoleteColumns", response: obsoleteColumnsRes },
        { name: "makes", response: makesRes },
        { name: "prefix", response: prefixRes },
        { name: "suffix", response: suffixRes },
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
      ] = await Promise.all([
        columnsRes.json(),
        obsoleteColumnsRes.json(),
        makesRes.json(),
        prefixRes.json(),
        suffixRes.json(),
      ]);

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

        setMakes(processedMakes);
      } else {
        console.error("Makes API failed:", makesData.error);
        setError(`Failed to fetch makes: ${makesData.error}`);
      }

      // Process PREFIXES
      if (prefixData.success && Array.isArray(prefixData.data)) {
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

      if (columnsData.success) {
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

    console.log("=== GENERATE COLUMN CODE DEBUG ===");
    console.log("Current core attributes:", currentCoreAttributes);
    console.log("Previous core attributes:", previousCoreAttributes);
    console.log("Core spec:", coreSpec);
    console.log("Full spec:", fullSpec);
    console.log("Is editing:", !!selectedColumnId);
    console.log("All other columns count:", allOtherColumns.length);

    // --- PRIORITY 1: Exact FULL spec match ---
    const exactFullMatch = allOtherColumns.find((col) =>
      col.descriptions.some((d) => createFullSpec(d, true) === fullSpec)
    );
    if (exactFullMatch) {
      console.log("Found exact full match:", exactFullMatch.columnCode);
      return exactFullMatch.columnCode;
    }

    // --- PRIORITY 2: Core spec match (ignoring prefix/suffix based on settings) ---
    const coreSpecMatch = allOtherColumns.find((col) =>
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
    if (coreSpecMatch) {
      console.log("Found core spec match:", coreSpecMatch.columnCode);
      return coreSpecMatch.columnCode;
    }

    // --- PRIORITY 3: Handle edit mode logic ---
    if (selectedColumnId && previousCoreAttributes) {
      const coreChanged = coreAttributesChanged(
        currentCoreAttributes,
        previousCoreAttributes
      );

      console.log("Core changed:", coreChanged);
      console.log(
        "Previous core spec:",
        createCoreSpec({
          carbonType: previousCoreAttributes.carbonType,
          innerDiameter: previousCoreAttributes.innerDiameter,
          length: previousCoreAttributes.length,
          particleSize: previousCoreAttributes.particleSize,
          prefix: "",
          suffix: "",
          make: "",
          columnId: "",
          installationDate: "",
          usePrefix: false,
          useSuffix: false,
          usePrefixForNewCode: false,
          useSuffixForNewCode: false,
          isObsolete: false,
          linkedCarbonType: "",
        })
      );

      if (!coreChanged) {
        // Core attributes haven't changed → keep original column code
        const currentColumn = [...columns, ...obsoleteColumns].find(
          (col) => col._id === selectedColumnId
        );
        if (currentColumn) {
          console.log(
            "Core unchanged, keeping original:",
            currentColumn.columnCode
          );
          return currentColumn.columnCode;
        }
      } else {
        // Core specs changed → check if another column has this new core spec
        const newCoreMatch = allOtherColumns.find((col) =>
          col.descriptions.some((d) => {
            if (desc.usePrefixForNewCode || desc.useSuffixForNewCode) {
              return createFullSpec(d, true) === fullSpec;
            } else {
              return createCoreSpec(d) === coreSpec;
            }
          })
        );

        if (newCoreMatch) {
          console.log(
            "Found existing column with new core spec:",
            newCoreMatch.columnCode
          );
          return newCoreMatch.columnCode;
        }

        // NEW LOGIC: If no existing match found AND this is the only description in current column,
        // keep the same column code instead of generating a new one
        const currentColumn = [...columns, ...obsoleteColumns].find(
          (col) => col._id === selectedColumnId
        );

        if (currentColumn && currentColumn.descriptions.length === 1) {
          console.log(
            "Core changed but only description in column, keeping same code:",
            currentColumn.columnCode
          );
          return currentColumn.columnCode;
        }

        // Only generate new code if there are multiple descriptions or no current column found
        console.log(
          "Core changed, no existing match found, generating new code"
        );
        return generateNewColumnCode(columns, obsoleteColumns);
      }
    }

    // --- PRIORITY 4: Generate new code for new entries or when no matches found ---
    console.log("Generating completely new column code");
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

    const usedNumbers = allColumnCodes
      .map((code) => {
        const match = code.match(/^(cl|CL)(\d+)$/i);
        return match ? parseInt(match[2]) : null;
      })
      .filter((num) => num !== null)
      .sort((a, b) => a - b);

    let nextNumber = 1;
    for (const num of usedNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else if (num > nextNumber) {
        break; // Found a gap
      }
    }

    const newColumnCode = `CL${nextNumber.toString().padStart(2, "0")}`;

    return newColumnCode;
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

    if (desc.phMin !== null && desc.phMax !== null && desc.phMin > desc.phMax) {
      errors[`phRange${0}`] = "pH minimum cannot be greater than pH maximum";
    }

    if (
      desc.phMax !== null &&
      (isNaN(desc.phMax) || desc.phMax < 0 || desc.phMax > 14)
    ) {
      errors[`phMax_0`] = "pH maximum must be between 0 and 14";
    }

    if (desc.phMin !== null && desc.phMax !== null && desc.phMin > desc.phMax) {
      errors[`phRange_0`] = "pH minimum cannot be greater than pH maximum";
    }

    // Optional: Both or neither validation
    if (
      (desc.phMin !== null && desc.phMax === null) ||
      (desc.phMin === null && desc.phMax !== null)
    ) {
      errors[`phRange_0`] =
        "Please provide both pH minimum and maximum, or neither";
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

    // Manual Column ID validation
    const columnIdError = validateColumnId(desc.columnId);
    if (columnIdError) {
      errors[`columnId_0`] = columnIdError;
    }

    // Check if there's a series-related error message already set
    if (
      error &&
      (error.includes("maximum number") || error.includes("end number"))
    ) {
      errors.seriesEndReached = error;
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
    forceUpdate: boolean = false // Add this parameter
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
        // For edit mode, get the ORIGINAL core attributes from database
        let originalCoreAttributes: CoreAttributes | undefined;

        if (selectedColumnId && selectedDescriptionIndex >= 0) {
          const originalColumn = [...columns, ...obsoleteColumns].find(
            (col) => col._id === selectedColumnId
          );
          if (
            originalColumn &&
            originalColumn.descriptions[selectedDescriptionIndex]
          ) {
            originalCoreAttributes = getCoreAttributes(
              originalColumn.descriptions[selectedDescriptionIndex]
            );

            // If we're editing and not forcing an update, check if we should preserve the existing code
            if (!forceUpdate) {
              const currentCoreAttributes = getCoreAttributes(desc);
              const coreChanged = coreAttributesChanged(
                currentCoreAttributes,
                originalCoreAttributes
              );

              // If core attributes haven't changed, keep the existing column code
              if (!coreChanged) {
                const existingColumnCode = originalColumn.columnCode;
                if (form.columnCode !== existingColumnCode) {
                  console.log(
                    "Preserving existing column code:",
                    existingColumnCode
                  );
                  setForm((prev) => ({
                    ...prev,
                    columnCode: existingColumnCode,
                  }));
                }
                return;
              }
            }
          }
        }

        // Generate new column code
        const newColumnCode = generateColumnCode(
          desc,
          columns,
          obsoleteColumns,
          originalCoreAttributes
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
    if (!makeId || makeId.trim() === "") return "-"; // Return dash for empty make
    if (makes.length === 0) return "Loading...";
    const make = makes.find(
      (m) => m._id.toString().trim() === makeId.toString().trim()
    );
    return make?.make || "Unknown Make (" + makeId + ")";
  };

  interface PrefixObject {
    _id?: string;
    name?: string | null;
  }

  type PrefixId = string | PrefixObject | undefined | null;

  interface SuffixObject {
    _id?: string;
    name?: string | null;
  }

  type SuffixId = string | SuffixObject | undefined | null;

  const getPrefixName = (prefixId: PrefixId): string => {
    if (!prefixId) return "-";
    // Handle object with name null (problem case in your DB)
    if (typeof prefixId === "object") {
      if (prefixId.name) return prefixId.name;
      return "-"; // <--- THIS handles name: null and any object-case
    }
    // Handle string empty
    if (typeof prefixId === "string") {
      if (prefixId.trim() === "") return "-";
    }
    if (prefixes.length === 0) return "Loading...";
    const prefix = prefixes.find(
      (p) => p._id.toString().trim() === prefixId.toString().trim()
    );
    return prefix?.value || "-";
  };

  const getSuffixName = (suffixId: SuffixId) => {
    if (!suffixId) return "-";
    // Handle object with name null (problem case in your DB)
    if (typeof suffixId === "object") {
      if (suffixId.name) return suffixId.name;
      return "-"; // Handles name: null and any object-case
    }
    // Handle string case, empty
    if (typeof suffixId === "string") {
      if (suffixId.trim() === "") return "-";
    }
    if (suffixes.length === 0) return "Loading...";
    const suffix = suffixes.find(
      (s) => s._id.toString().trim() === suffixId.toString().trim()
    );
    return suffix?.value || "-";
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

        // Update selection state
        setSelectedDropdownIndex((prev) => ({
          ...prev,
          [index]: { ...prev[index], [field]: nextIndex },
        }));

        // Scroll dropdown to keep selected item visible
        setTimeout(() => {
          const dropdownRef =
            field === "carbonType"
              ? carbonTypeDropdownRefs.current[index]
              : linkedCarbonTypeDropdownRefs.current[index];

          scrollToSelectedItem(dropdownRef, nextIndex);
        }, 10);
        break;

      case "ArrowUp":
        e.preventDefault();
        const prevIndex =
          currentSelectedIndex > 0
            ? currentSelectedIndex - 1
            : filteredOptions.length - 1;

        // Update selection state
        setSelectedDropdownIndex((prev) => ({
          ...prev,
          [index]: { ...prev[index], [field]: prevIndex },
        }));

        // Scroll dropdown to keep selected item visible
        setTimeout(() => {
          const dropdownRef =
            field === "carbonType"
              ? carbonTypeDropdownRefs.current[index]
              : linkedCarbonTypeDropdownRefs.current[index];

          scrollToSelectedItem(dropdownRef, prevIndex);
        }, 10);
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
        e.preventDefault();
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

      default:
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

    // Force update column code since this is a user-initiated change
    setTimeout(() => {
      updateColumnCode(index, false, true); // Force update = true
    }, 50);
  };

  const handleDescriptionChange = (
    index: number,
    field: keyof ColumnDescription,
    value: string | number | boolean
  ) => {
    console.log(`=== FIELD CHANGE: ${field} = ${value} ===`);

    setForm((prev) => {
      const newDescriptions = [...prev.descriptions];
      newDescriptions[index] = { ...newDescriptions[index], [field]: value };

      if (field === "prefix" && !value) {
        newDescriptions[index].usePrefixForNewCode = false;
      }
      if (field === "suffix" && !value) {
        newDescriptions[index].useSuffixForNewCode = false;
      }
      if (field === "make" && !value) {
        // Clear make field when set to empty/none
        newDescriptions[index].make = "";
      }

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
        // Force update for core attribute changes
        const isCoreField = [
          "carbonType",
          "innerDiameter",
          "length",
          "particleSize",
        ].includes(field);
        updateColumnCode(index, false, isCoreField);
      }, 50);
    }
  };

  const handleTableRowClick = (
    column: Column,
    descIndex: number,
    event: React.MouseEvent
  ) => {
    event.preventDefault();

    // Set the selection state first
    setSelectedColumnId(column._id);
    setSelectedDescriptionIndex(descIndex);
    setSelectedColumnCodeForAudit(column.columnCode);

    // Handle Ctrl+Click for popup - use setTimeout to ensure state is updated first
    if (event.ctrlKey) {
      setTimeout(() => {
        setShowDescriptionPopup(true);
      }, 0);
    }
  };

  const handleCloseForm = () => {
    console.log("=== CLOSING FORM ===");

    setIsFormOpen(false);
    setShowDescriptionPopup(false);

    // Reset form to initial state
    setForm({
      columnCode: "",
      partNumber: "",
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
          description: "",
          phMin: null,
          phMax: null,
        },
      ],
    });

    // Clear all errors
    setFormErrors({});

    // Reset selection states including series
    setSelectedColumnId("");
    setSelectedDescriptionIndex(-1);

    // Clear all form-related states including new dropdown states
    setCarbonTypeDropdowns({});
    setCarbonTypeFilters({});
    setLinkedCarbonTypeDropdowns({});
    setLinkedCarbonTypeFilters({});

    console.log("Form state reset completed");
  };

  const validateColumnId = (columnId: string): string | null => {
    if (!columnId.trim()) {
      return "Column ID is required";
    }

    // Check if the columnId is already in use (excluding current column being edited)
    const allColumns = [...columns, ...obsoleteColumns];
    const existingColumn = allColumns.find(
      (col) =>
        col.descriptions.some((desc) => desc.columnId === columnId) &&
        col._id !== selectedColumnId
    );

    if (existingColumn) {
      return `Column ID "${columnId}" is already in use by ${existingColumn.columnCode}`;
    }

    return null; // Valid
  };

  // 1. Fix the formattedDesc creation in handleSave function
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

      // Format description for backend (use finalColumnId)
      // Format description for backend
      const formattedDesc = {
        ...desc,
        columnId: desc.columnId,
        innerDiameter: Number(desc.innerDiameter),
        length: Number(desc.length),
        particleSize: Number(desc.particleSize),
        installationDate: desc.installationDate,
        isObsolete: !!desc.isObsolete,
        usePrefix: !!desc.usePrefix,
        useSuffix: !!desc.useSuffix,
        usePrefixForNewCode: !!desc.usePrefixForNewCode,
        useSuffixForNewCode: !!desc.useSuffixForNewCode,
        makeId: desc.make,
        prefixId: desc.prefix || undefined,
        suffixId: desc.suffix || undefined,
        // ADD THESE NEW FIELDS
        description: desc.description?.trim() || undefined,
        phMin: desc.phMin !== null ? Number(desc.phMin) : null,
        phMax: desc.phMax !== null ? Number(desc.phMax) : null,
      };

      console.log(
        "Formatted description for backend:",
        JSON.stringify(formattedDesc, null, 2)
      );

      const isObsolete = desc.isObsolete;
      const isEditingExisting =
        selectedColumnId && selectedDescriptionIndex >= 0;

      let url: string = "";
      let method: string = "POST";
      let requestBody: any = {};

      if (isEditingExisting) {
        // EDITING EXISTING DESCRIPTION
        console.log("Editing existing description");

        const currentColumn = [...columns, ...obsoleteColumns].find(
          (col) => col._id === selectedColumnId
        );

        if (!currentColumn) {
          throw new Error("Column not found for editing");
        }

        const currentDesc =
          currentColumn.descriptions[selectedDescriptionIndex];
        const wasObsolete = currentDesc?.isObsolete;
        const columnCodeChanged = currentColumn.columnCode !== form.columnCode;

        if (columnCodeChanged) {
          // COLUMN CODE CHANGED - Need to handle this carefully
          console.log(
            "Column code changed from",
            currentColumn.columnCode,
            "to",
            form.columnCode
          );

          // Check if target column code already exists
          const targetColumn = [...columns, ...obsoleteColumns].find(
            (col) =>
              col.columnCode === form.columnCode &&
              col.companyId === companyId &&
              col.locationId === locationId &&
              col._id !== selectedColumnId // Exclude current column
          );

          // Step 1: Remove description from current column
          const remainingDescriptions = currentColumn.descriptions.filter(
            (_, index) => index !== selectedDescriptionIndex
          );

          if (remainingDescriptions.length === 0) {
            // Delete current column if no descriptions remain
            const deleteUrl = wasObsolete
              ? `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}&id=${selectedColumnId}`
              : `/api/admin/column?companyId=${companyId}&locationId=${locationId}&id=${selectedColumnId}`;

            const deleteResponse = await fetch(deleteUrl, {
              method: "DELETE",
              credentials: "include",
            });

            if (!deleteResponse.ok) {
              let errorMessage = `Failed to remove obsolete column (${deleteResponse.status})`;
              try {
                const deleteData = await deleteResponse.json();
                errorMessage = `Failed to remove obsolete column: ${
                  deleteData.error || deleteResponse.statusText
                }`;
              } catch (jsonError) {
                // Response doesn't contain JSON, use status text
                errorMessage = `Failed to remove obsolete column: ${deleteResponse.statusText}`;
              }
              throw new Error(errorMessage);
            }
          } else {
            // Update current column with remaining descriptions
            const updateUrl = wasObsolete
              ? `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`
              : `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;

            const updateResponse = await fetch(updateUrl, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                id: selectedColumnId,
                columnCode: currentColumn.columnCode, // Keep original code
                descriptions: remainingDescriptions,
                companyId,
                locationId,
              }),
            });

            if (!updateResponse.ok) {
              const updateData = await updateResponse.json();
              throw new Error(
                `Failed to update old column: ${updateData.error}`
              );
            }
          }

          // Step 2: Add description to target column (or create new one)
          if (targetColumn) {
            // Add to existing target column
            const targetUrl = isObsolete
              ? `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`
              : `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;

            url = targetUrl;
            method = "PUT";
            requestBody = {
              id: targetColumn._id,
              columnCode: form.columnCode,
              descriptions: [...targetColumn.descriptions, formattedDesc],
              partNumber: form.partNumber,
              companyId,
              locationId,
            };
          } else {
            // Create new target column
            url = isObsolete
              ? `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`
              : `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;

            method = "POST";
            requestBody = {
              columnCode: form.columnCode,
              descriptions: [formattedDesc],
              companyId,
              locationId,
              partNumber: form.partNumber,
            };
          }
        } else if (wasObsolete && !isObsolete) {
          // MOVING FROM OBSOLETE TO ACTIVE (same column code)
          console.log("Moving description from obsolete to active");

          // Remove from obsolete column
          const updatedObsoleteDescriptions = currentColumn.descriptions.filter(
            (_, index) => index !== selectedDescriptionIndex
          );

          if (updatedObsoleteDescriptions.length === 0) {
            // Delete obsolete column
            const deleteResponse = await fetch(
              `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}&id=${selectedColumnId}`,
              { method: "DELETE", credentials: "include" }
            );
            if (!deleteResponse.ok) {
              const deleteData = await deleteResponse.json();
              throw new Error(
                `Failed to remove obsolete column: ${deleteData.error}`
              );
            }
          } else {
            // Update obsolete column
            const updateResponse = await fetch(
              `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  id: selectedColumnId,
                  columnCode: currentColumn.columnCode,
                  descriptions: updatedObsoleteDescriptions,
                  companyId,
                  locationId,
                }),
              }
            );
            if (!updateResponse.ok) {
              const updateData = await updateResponse.json();
              throw new Error(
                `Failed to update obsolete column: ${updateData.error}`
              );
            }
          }

          // Add to active column (or create new one)
          const activeColumn = columns.find(
            (col) =>
              col.columnCode === form.columnCode &&
              col.companyId === companyId &&
              col.locationId === locationId
          );

          if (activeColumn) {
            url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
            method = "PUT";
            requestBody = {
              id: activeColumn._id,
              columnCode: form.columnCode,
              descriptions: [...activeColumn.descriptions, formattedDesc],
              companyId,
              locationId,
              partNumber: form.partNumber,
            };
          } else {
            url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
            method = "POST";
            requestBody = {
              columnCode: form.columnCode,
              descriptions: [formattedDesc],
              companyId,
              locationId,
              partNumber: form.partNumber,
            };
          }
        } else if (!wasObsolete && isObsolete) {
          // MOVING FROM ACTIVE TO OBSOLETE (same column code)
          console.log("Moving description from active to obsolete");

          // Remove from active column
          const updatedActiveDescriptions = currentColumn.descriptions.filter(
            (_, index) => index !== selectedDescriptionIndex
          );

          if (updatedActiveDescriptions.length === 0) {
            // Delete active column
            const deleteResponse = await fetch(
              `/api/admin/column?companyId=${companyId}&locationId=${locationId}&id=${selectedColumnId}`,
              { method: "DELETE", credentials: "include" }
            );
            if (!deleteResponse.ok) {
              const deleteData = await deleteResponse.json();
              throw new Error(
                `Failed to remove active column: ${deleteData.error}`
              );
            }
          } else {
            // Update active column
            const updateResponse = await fetch(
              `/api/admin/column?companyId=${companyId}&locationId=${locationId}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  id: selectedColumnId,
                  columnCode: currentColumn.columnCode,
                  descriptions: updatedActiveDescriptions,
                  companyId,
                  locationId,
                }),
              }
            );
            if (!updateResponse.ok) {
              const updateData = await updateResponse.json();
              throw new Error(
                `Failed to update active column: ${updateData.error}`
              );
            }
          }

          // Add to obsolete column (or create new one)
          const obsoleteColumn = obsoleteColumns.find(
            (col) =>
              col.columnCode === form.columnCode &&
              col.companyId === companyId &&
              col.locationId === locationId
          );

          if (obsoleteColumn) {
            url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
            method = "PUT";
            requestBody = {
              id: obsoleteColumn._id,
              columnCode: form.columnCode,
              descriptions: [...obsoleteColumn.descriptions, formattedDesc],
              companyId,
              locationId,
              partNumber: form.partNumber,
            };
          } else {
            url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
            method = "POST";
            requestBody = {
              columnCode: form.columnCode,
              descriptions: [formattedDesc],
              companyId,
              locationId,
              partNumber: form.partNumber,
            };
          }
        } else {
          // UPDATING WITHIN SAME CATEGORY (no moves, just update description)
          console.log("Updating description within the same category");

          const updatedDescriptions = [...currentColumn.descriptions];
          updatedDescriptions[selectedDescriptionIndex] = formattedDesc;

          if (wasObsolete) {
            url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
          } else {
            url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
          }

          method = "PUT";
          requestBody = {
            id: selectedColumnId,
            columnCode: form.columnCode, // This should be the same as currentColumn.columnCode
            descriptions: updatedDescriptions,
            companyId,
            locationId,
            partNumber: form.partNumber,
          };
        }
      } else {
        // CREATING NEW COLUMN OR ADDING TO EXISTING
        console.log("Creating new or adding to existing column");

        // Check if column with this code already exists
        const existingColumn = [...columns, ...obsoleteColumns].find(
          (col) =>
            col.columnCode === form.columnCode &&
            col.companyId === companyId &&
            col.locationId === locationId
        );

        if (existingColumn) {
          // Add to existing column
          console.log("Adding to existing column with code:", form.columnCode);

          const targetIsObsolete = existingColumn.descriptions.some(
            (d) => d.isObsolete
          );

          if (isObsolete) {
            // Find in obsolete columns
            const obsoleteColumn = obsoleteColumns.find(
              (col) =>
                col.columnCode === form.columnCode &&
                col.companyId === companyId &&
                col.locationId === locationId
            );

            if (obsoleteColumn) {
              url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
              method = "PUT";
              requestBody = {
                id: obsoleteColumn._id,
                columnCode: form.columnCode,
                descriptions: [...obsoleteColumn.descriptions, formattedDesc],
                companyId,
                locationId,
                partNumber: form.partNumber,
              };
            } else {
              url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
              method = "POST";
              requestBody = {
                columnCode: form.columnCode,
                descriptions: [formattedDesc],
                companyId,
                locationId,
                partNumber: form.partNumber,
              };
            }
          } else {
            // Find in active columns
            const activeColumn = columns.find(
              (col) =>
                col.columnCode === form.columnCode &&
                col.companyId === companyId &&
                col.locationId === locationId
            );

            if (activeColumn) {
              url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
              method = "PUT";
              requestBody = {
                id: activeColumn._id,
                columnCode: form.columnCode,
                descriptions: [...activeColumn.descriptions, formattedDesc],
                companyId,
                locationId,
                partNumber: form.partNumber,
              };
            } else {
              url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
              method = "POST";
              requestBody = {
                columnCode: form.columnCode,
                descriptions: [formattedDesc],
                companyId,
                locationId,
                partNumber: form.partNumber,
              };
            }
          }
        } else {
          // Create completely new column
          console.log("Creating completely new column");

          if (isObsolete) {
            url = `/api/admin/obsolete-column?companyId=${companyId}&locationId=${locationId}`;
          } else {
            url = `/api/admin/column?companyId=${companyId}&locationId=${locationId}`;
          }

          method = "POST";
          requestBody = {
            columnCode: form.columnCode,
            descriptions: [formattedDesc],
            companyId,
            locationId,
            partNumber: form.partNumber,
          };
        }
      }

      // Ensure all variables are set
      if (!url || !method || !requestBody) {
        throw new Error(
          "Invalid configuration: URL, method, or request body not set"
        );
      }

      console.log("API Request:", {
        method,
        url,
        requestBody: JSON.stringify(requestBody, null, 2),
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

        console.log("Column saved successfully");
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

  const selectOrCreateColumn = (desc: ColumnDescription) => {
    const allColumns = [...columns, ...obsoleteColumns];
    const newColumnCode = generateColumnCode(desc, columns, obsoleteColumns);

    // Find if a column with the new code already exists
    const existingColumn = allColumns.find(
      (col) => col.columnCode === newColumnCode
    );

    if (existingColumn) {
      // Select the existing column
      setSelectedColumnId(existingColumn._id);
      setSelectedDescriptionIndex(0); // Select first description
      setSelectedColumnCodeForAudit(existingColumn.columnCode);

      // Update form with the existing column data
      const existingDesc = existingColumn.descriptions[0];
      setForm({
        columnCode: existingColumn.columnCode,
        partNumber: existingColumn.partNumber || "",
        descriptions: [
          {
            ...existingDesc,
            innerDiameter: existingDesc.innerDiameter.toString(),
            length: existingDesc.length.toString(),
            particleSize: existingDesc.particleSize.toString(),
            linkedCarbonType: carbonTypeMap[existingDesc.carbonType] || "",
            usePrefix: existingDesc.usePrefix ?? false,
            useSuffix: existingDesc.useSuffix ?? false,
            usePrefixForNewCode: desc.usePrefixForNewCode,
            useSuffixForNewCode: desc.useSuffixForNewCode,
            isObsolete: existingDesc.isObsolete ?? false,
            description: existingDesc.description || "",
            phMin: desc.phMin !== undefined ? desc.phMin : null,
            phMax: desc.phMax !== undefined ? desc.phMax : null,
          },
        ],
      });

      console.log("Selected existing column:", existingColumn.columnCode);
    } else {
      // Keep current form but with the new column code (will create new column on save)
      setForm((prev) => ({
        ...prev,
        columnCode: newColumnCode,
      }));

      console.log("Will create new column:", newColumnCode);
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

    // Generate new column code and select appropriate column
    setTimeout(() => {
      updateColumnCode(index, false, true); // Force update

      // After column code is updated, check if we should select an existing column
      // or create a new one based on the new specifications
      const desc = form.descriptions[index];
      if (checked && (desc.prefix || desc.suffix)) {
        selectOrCreateColumn(desc);
      }
    }, 100);
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
          partNumber: column.partNumber || "",
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
              description: desc.description || "",
              phMin: desc.phMin !== undefined ? desc.phMin : null,
              phMax: desc.phMax !== undefined ? desc.phMax : null,
            },
          ],
        });

        // IMPORTANT: Keep the selected column and description index
        // so handleSave knows this is an edit operation
        // Don't reset these values here!

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
      partNumber: selectedColumn.partNumber || "",
      descriptions: [
        {
          ...selectedDesc,
          innerDiameter: selectedDesc.innerDiameter.toString(),
          length: selectedDesc.length.toString(),
          particleSize: selectedDesc.particleSize.toString(),
          linkedCarbonType: carbonTypeMap[selectedDesc.carbonType] || "",
          usePrefix: selectedDesc.usePrefix ?? false,
          useSuffix: selectedDesc.useSuffix ?? false,
          usePrefixForNewCode: selectedDesc.usePrefixForNewCode ?? false,
          useSuffixForNewCode: selectedDesc.useSuffixForNewCode ?? false,
          isObsolete: selectedDesc.isObsolete ?? false,
          description: selectedDesc.description || "",
          phMin: selectedDesc.phMin !== undefined ? selectedDesc.phMin : null,
          phMax: selectedDesc.phMax !== undefined ? selectedDesc.phMax : null,
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

        const matchesDescText =
          !searchFilters.description ||
          (desc.description &&
            desc.description
              .toLowerCase()
              .includes(searchFilters.description.toLowerCase()));

        // OPTIONAL: Add pH range search
        // const matchesPhRange = !searchFilters.phRange ||
        //   (desc.phMin && desc.phMax &&
        //    `${desc.phMin}-${desc.phMax}`.includes(searchFilters.phRange));

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
          <div className="text-[#0052cc] text-sm">
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
          <div className="text-red-500 text-sm bg-[#ffe6e6] p-4 rounded border border-red-300">
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
        className="min-h-screen bg-gradient-to-b from-[#d7e6f5] to-[#a0b7d0] pt-4 p-3"
        style={{ fontFamily: "Verdana, Arial, sans-serif" }}>
        <WindowsToolbar
          modulePath="/dashboard/columns"
          onAddNew={() => {
            setForm({
              columnCode:
                columns.length === 0 && obsoleteColumns.length === 0
                  ? "CL01"
                  : "",
              partNumber: "",
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
                  description: "",
                  phMin: null,
                  phMax: null,
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
            if (selectedColumnCodeForAudit) {
              fetchSingleColumnAudit();
            } else {
              fetchAudits();
              setShowAuditModal(true);
            }
          }}
          onPrint={() => {
            const printContent = `
  <h1>${showObsoleteTable ? "Obsolete" : "Active"} Column Master</h1>
  <table border="1">
    <thead>
      <tr>
        <th>Serial No</th>
        <th>Column Code</th>
        <th>Description</th>
        <th>Make</th>
        <th>Column ID</th>
        <th>Installation Date</th>
        <!-- ADD THESE NEW PRINT HEADERS -->
        <th>Remark</th>
        <th>pH Value</th>
      </tr>
    </thead>
    <tbody>
      ${currentColumns
        .flatMap((column, index) =>
          column.descriptions.map(
            (desc, descIndex) =>
              `<tr>
                ${
                  descIndex === 0
                    ? `<td rowspan="${column.descriptions.length}">${
                        index + 1
                      }</td>`
                    : ""
                }
                ${
                  descIndex === 0
                    ? `<td rowspan="${column.descriptions.length}">${column.columnCode}</td>`
                    : ""
                }
                <td>${desc.prefix}-${desc.carbonType}-${desc.innerDiameter}x${
                desc.length
              }-${desc.particleSize}µm-${desc.suffix}</td>
                <td>${desc.make}</td>
                <td>${desc.columnId}</td>
                <td>${desc.installationDate}</td>
                <!-- ADD THESE NEW PRINT CELLS -->
                <td>${desc.description || "-"}</td>
               
              </tr>`
          )
        )
        .join("")}
    </tbody>
  </table>
`;

            const printWindow = window.open("", "_blank");
            printWindow?.document.write(
              `<html><head><title>Print Column Master</title></head><body>${printContent}</body></html>`
            );
            printWindow?.document.close();
            printWindow?.print();
          }}
          onHelp={() => setShowHelpModal(true)}
        />

        <div className="max-w-7xl mx-auto bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.2)] p-2 backdrop-blur-sm bg-opacity-80">
          <h1 className="text-xs font-bold mb-3 text-[#003087]">
            Column Master
          </h1>

          {error && (
            <p className="text-red-500 mb-3 bg-[#ffe6e6] p-2 rounded border border-red-300 text-xs">
              {error}
            </p>
          )}
          {loading && (
            <p className="text-[#0052cc] mb-3 bg-[#e6f0ff] p-2 rounded border border-[#add8e6] text-xs">
              Loading...
            </p>
          )}

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => {
                setShowObsoleteTable(!showObsoleteTable);
                setSelectedColumnId("");
                setSelectedDescriptionIndex(-1);
                handleCloseForm();
              }}
              className={`px-3 py-1 rounded-lg transition-all shadow-sm text-white text-xs ${
                showObsoleteTable
                  ? "bg-red-600 hover:bg-red-800"
                  : "bg-[#0052cc] hover:bg-[#003087]"
              }`}>
              {showObsoleteTable
                ? "Show Active Columns"
                : "Show Obsolete Columns"}
            </button>

            <button
              onClick={exportToExcel}
              disabled={
                loading ||
                (showObsoleteTable
                  ? obsoleteColumns.length === 0
                  : columns.length === 0)
              }
              className="px-3 py-1 rounded-lg transition-all shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs">
              📊 Export to Excel
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-300 rounded-lg shadow-sm">
            <table
              key={renderKey}
              className="w-full border-collapse border border-gray-300 bg-white text-xs">
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
                    "Make Specific",
                    // UPDATED NEW HEADERS - pH range instead of single value
                    "Remark",
                    "pH Min",
                    "pH Max",
                  ].map((header) => (
                    <th
                      key={header}
                      className="border border-gray-300 p-1 text-gray-700 font-semibold text-[10px]">
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
                      title="Click to select, Ctrl+Click for popup">
                      {descIndex === 0 && (
                        <>
                          <td
                            className="border border-gray-300 p-1 text-center"
                            rowSpan={column.descriptions.length}>
                            {colIndex + 1}
                          </td>
                          <td
                            className="border border-gray-300 p-1 text-center"
                            rowSpan={column.descriptions.length}>
                            {column.columnCode}
                          </td>
                        </>
                      )}
                      <td className="border border-gray-300 p-1 text-center">
                        {getPrefixName(desc.prefix) || "-"}
                      </td>
                      <td className="border border-gray-300 p-1 text-left font-mono text-xs">
                        {getSuffixName(desc.suffix) || "-"}
                      </td>

                      <td className="border border-gray-300 p-1 font-mono text-xs whitespace-pre">
                        {formatAlignedDescription(desc)}
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        {getMakeName(desc.make)}
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        {desc.columnId}
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        {desc.installationDate
                          ? new Date(desc.installationDate).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                              }
                            )
                          : "-"}
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        {desc.usePrefixForNewCode || desc.useSuffixForNewCode
                          ? "Yes"
                          : "No"}
                      </td>

                      <td
                        className="border border-gray-300 p-1 text-left text-xs max-w-[150px] truncate"
                        title={desc.description || "-"}>
                        {desc.description || "-"}
                      </td>

                      {/* pH Value Column */}
                      <td className="border border-gray-300 p-1 text-center text-xs">
                        {desc.phMin !== undefined && desc.phMin !== null
                          ? desc.phMin.toFixed(1)
                          : "-"}
                      </td>

                      {/* pH Max Column */}
                      <td className="border border-gray-300 p-1 text-center text-xs">
                        {desc.phMax !== undefined && desc.phMax !== null
                          ? desc.phMax.toFixed(1)
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Selection Info */}
          {selectedColumnId && selectedDescriptionIndex >= 0 && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Selected:</strong> {form.columnCode} -{" "}
                {form.descriptions[0]?.carbonType}{" "}
                {form.descriptions[0]?.innerDiameter}x
                {form.descriptions[0]?.length}{" "}
                {form.descriptions[0]?.particleSize}µm
                <span className="ml-3 text-[10px] text-gray-600">
                  (Ctrl+Click for popup, Use toolbar buttons for actions)
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Description Popup Modal */}
        {showDescriptionPopup &&
          selectedColumnId &&
          selectedDescriptionIndex >= 0 &&
          (() => {
            // Get the selected column and description
            const selectedColumn = [...columns, ...obsoleteColumns].find(
              (col) => col._id === selectedColumnId
            );
            const selectedDescription =
              selectedColumn?.descriptions[selectedDescriptionIndex];

            if (!selectedColumn || !selectedDescription) return null;

            return (
              <div className="fixed inset-0 backdrop-blur-md  bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-f0f0f0 border-2 border-3a6ea5 rounded-lg p-4 max-w-xl w-full shadow-lg">
                  <h2 className="text-lg font-bold mb-4 text-003087">
                    Column Description Details
                  </h2>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {/* Left Column */}
                    <div>
                      <div className="mb-2">
                        <span className="font-medium text-003087">
                          Column Code:
                        </span>
                        <div>{selectedColumn.columnCode}</div>
                      </div>

                      <div className="mb-2">
                        <span className="font-medium text-003087">
                          Carbon Type:
                        </span>
                        <div>{selectedDescription.carbonType || "-"}</div>
                      </div>

                      <div className="mb-2">
                        <span className="font-medium text-003087">
                          Inner Diameter:
                        </span>
                        <div>
                          {selectedDescription.innerDiameter
                            ? `${selectedDescription.innerDiameter} mm`
                            : "-"}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="font-medium text-003087">
                          Particle Size:
                        </span>
                        <div>
                          {selectedDescription.particleSize
                            ? `${selectedDescription.particleSize} μm`
                            : "-"}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="font-medium text-003087">
                          Installation Date:
                        </span>
                        <div>{selectedDescription.installationDate || "-"}</div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div>
                      <div className="mb-2">
                        <span className="font-medium text-003087">Make:</span>
                        <div>
                          {getMakeName(selectedDescription.make) || "-"}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="font-medium text-003087">
                          Linked Carbon Type:
                        </span>
                        <div>{selectedDescription.linkedCarbonType || "-"}</div>
                      </div>

                      <div className="mb-2">
                        <span className="font-medium text-003087">Length:</span>
                        <div>
                          {selectedDescription.length
                            ? `${selectedDescription.length} mm`
                            : "-"}
                        </div>
                      </div>

                      <div className="mb-2">
                        <span className="font-medium text-003087">
                          Column ID:
                        </span>
                        <div>{selectedDescription.columnId || "-"}</div>
                      </div>

                      {/* pH Range (if available) */}
                      {(selectedDescription.phMin !== null ||
                        selectedDescription.phMax !== null) && (
                        <div className="mb-2">
                          <span className="font-medium text-003087">
                            pH Range:
                          </span>
                          <div>
                            {selectedDescription.phMin !== null &&
                            selectedDescription.phMax !== null
                              ? `${selectedDescription.phMin} - ${selectedDescription.phMax}`
                              : selectedDescription.phMin !== null
                              ? `Min: ${selectedDescription.phMin}`
                              : `Max: ${selectedDescription.phMax}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description field if available */}
                  {selectedDescription.description && (
                    <div className="mt-4">
                      <span className="font-medium text-003087">
                        Description:
                      </span>
                      <div className="mt-1 p-2 bg-gray-50 rounded border text-sm">
                        {selectedDescription.description}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setShowDescriptionPopup(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-all">
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Add/Edit Form Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-3 max-w-2xl w-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] max-h-[85vh] overflow-y-auto relative">
              <h2 className="text-xs font-bold mb-2 text-[#003087]">
                {selectedColumnId ? "Edit Column Description" : "Add Column"}
              </h2>

              {form.descriptions.map((desc, index) => (
                <div key={index} className="mb-2 p-2 border rounded bg-white">
                  {formErrors.seriesEndReached && (
                    <div className="mb-3 p-2 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg text-xs">
                      <div className="flex items-center mb-1">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <strong>Series Limit Reached</strong>
                      </div>
                      <p className="text-xs">{formErrors.seriesEndReached}</p>
                      <div className="mt-1 text-xs">
                        <strong>Action Required:</strong>
                        <ul className="list-disc ml-4 mt-1">
                          <li>Go to Series Master</li>
                          <li>Increase the "End Number" value</li>
                          <li>Return here to continue</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {/* Make and Prefix */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
                          Make
                        </label>
                        <select
                          value={desc.make}
                          onChange={(e) => {
                            const selectedMake = makes.find(
                              (m) => m._id === e.target.value
                            );
                            handleDescriptionChange(
                              index,
                              "make",
                              e.target.value
                            );
                          }}
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          required>
                          <option value="">Select Make</option>
                          {makes.map((make) => (
                            <option key={make._id} value={make._id}>
                              {make.make}
                            </option>
                          ))}
                        </select>
                        {formErrors[`make_${index}`] && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors[`make_${index}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs">
                          <option value="">Select Prefix</option>
                          {prefixes.map((prefix) => (
                            <option key={prefix._id} value={prefix._id}>
                              {prefix.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Carbon Type and Linked Carbon Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className={`border-2 rounded-lg p-1 w-full bg-[#f8f8f8] text-xs ${
                            formErrors[`carbonType_${index}`]
                              ? "border-red-500"
                              : "border-[#3a6ea5]"
                          }`}
                          placeholder="Type C18, C8, C1... or use arrows"
                          required
                        />
                        {carbonTypeDropdowns[index] && (
                          <div
                            ref={(el) => {
                              carbonTypeDropdownRefs.current[index] = el;
                            }}
                            className="absolute z-10 w-full bg-[#f8f8f8] border-2 border-[#3a6ea5] rounded-lg mt-1 shadow-lg max-h-28 overflow-y-auto">
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
                                  className={`p-1 cursor-pointer flex justify-between text-[10px] ${
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
                                  }>
                                  <span>{option}</span>
                                  <span
                                    className={`text-[10px] ${
                                      optIndex ===
                                      (selectedDropdownIndex[index]
                                        ?.carbonType || 0)
                                        ? "text-gray-200"
                                        : "text-gray-500"
                                    }`}>
                                    → {carbonTypeMap[option] || "N/A"}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                        {formErrors[`carbonType_${index}`] && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors[`carbonType_${index}`]}
                          </p>
                        )}
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className={`border-2 rounded-lg p-1 w-full bg-[#f8f8f8] text-xs ${
                            formErrors[`linkedCarbonType_${index}`]
                              ? "border-red-500"
                              : "border-[#3a6ea5]"
                          }`}
                          placeholder="Type L1, L7, L3... or use arrows"
                        />
                        {linkedCarbonTypeDropdowns[index] && (
                          <div
                            ref={(el) => {
                              linkedCarbonTypeDropdownRefs.current[index] = el;
                            }}
                            className="absolute z-10 w-full bg-[#f8f8f8] border-2 border-[#3a6ea5] rounded-lg mt-1 shadow-lg max-h-28 overflow-y-auto">
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
                                  className={`p-1 cursor-pointer flex justify-between text-[10px] ${
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
                                  }>
                                  <span>{option}</span>
                                  <span
                                    className={`text-[10px] ${
                                      optIndex ===
                                      (selectedDropdownIndex[index]
                                        ?.linkedCarbonType || 0)
                                        ? "text-gray-200"
                                        : "text-gray-500"
                                    }`}>
                                    → {carbonTypeMap[option] || "N/A"}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                        {formErrors[`linkedCarbonType_${index}`] && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors[`linkedCarbonType_${index}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inner Diameter, Length, Particle Size */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                        {formErrors[`innerDiameter_${index}`] && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors[`innerDiameter_${index}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                        {formErrors[`length_${index}`] && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors[`length_${index}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                        {formErrors[`particleSize_${index}`] && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors[`particleSize_${index}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Suffix and Column ID */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs">
                          <option value="">Select Suffix</option>
                          {suffixes.map((suffix) => (
                            <option key={suffix._id} value={suffix._id}>
                              {suffix.value}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
                          Column ID
                        </label>
                        <input
                          type="text"
                          value={desc.columnId}
                          onChange={(e) => {
                            handleDescriptionChange(
                              index,
                              "columnId",
                              e.target.value
                            );
                            setFormErrors((prev) => ({
                              ...prev,
                              [`columnId_${index}`]: "",
                            }));
                          }}
                          className={`border-2 rounded-lg p-1 w-full bg-[#f8f8f8] text-xs ${
                            formErrors[`columnId_${index}`]
                              ? "border-red-500"
                              : "border-[#3a6ea5]"
                          }`}
                          placeholder="Enter Column ID (e.g., COL001)"
                          required
                        />
                        {formErrors[`columnId_${index}`] && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors[`columnId_${index}`]}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-600 mt-1">
                          Enter any unique identifier for this column
                        </p>
                      </div>
                    </div>

                    {/* Installation Date and Column Code */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Installation Date field (existing) */}
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          required
                        />
                      </div>

                      {/* ADD THESE NEW FIELDS */}
                      {/* Description Field */}
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={desc.description || ""}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          placeholder="Enter description"
                        />
                      </div>

                      {/* pH Value Field */}
                      {/* Replace the existing pH Value field with these two fields */}
                      {/* pH Min Field */}
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
                          pH Min (Optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="14"
                          step="0.1"
                          value={desc.phMin || ""}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "phMin",
                              e.target.value ? parseFloat(e.target.value) : ""
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          placeholder="0.0 - 14.0"
                        />
                      </div>

                      {/* pH Max Field */}
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
                          pH Max (Optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="14"
                          step="0.1"
                          value={desc.phMax || ""}
                          onChange={(e) =>
                            handleDescriptionChange(
                              index,
                              "phMax",
                              e.target.value ? parseFloat(e.target.value) : ""
                            )
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          placeholder="0.0 - 14.0"
                        />
                        <p className="text-[10px] text-gray-600 mt-1">
                          pH range: Min {desc.phMin || "?"} - Max{" "}
                          {desc.phMax || "?"}
                          {desc.phMin && desc.phMax && desc.phMin <= desc.phMax
                            ? " ✓"
                            : desc.phMin &&
                              desc.phMax &&
                              desc.phMin > desc.phMax
                            ? " ✗ Min > Max"
                            : ""}
                        </p>
                      </div>

                      {/* Column Code */}
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
                          Column Code
                        </label>
                        <input
                          type="text"
                          value={form.columnCode}
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs font-semibold opacity-50"
                          readOnly
                        />
                        {formErrors.columnCode && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors.columnCode}
                          </p>
                        )}
                      </div>

                      {/* ✅ ADD THIS PART NUMBER FIELD */}
                      <div>
                        <label className="block text-[10px] font-medium text-[#003087] mb-1">
                          Part Number
                        </label>
                        <input
                          type="text"
                          value={form.partNumber}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              partNumber: e.target.value,
                            }))
                          }
                          className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                          placeholder="Enter part number"
                        />
                        {formErrors.partNumber && (
                          <p className="text-red-500 text-[10px] mt-1">
                            {formErrors.partNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Column Code Generation Options */}
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="flex items-center gap-1">
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
                              disabled={!desc.prefix}
                              className={`form-checkbox h-3 w-3 ${
                                desc.prefix
                                  ? "text-[#3a6ea5] cursor-pointer"
                                  : "text-gray-300 cursor-not-allowed opacity-50"
                              }`}
                            />
                            <span
                              className={`text-[10px] font-medium ${
                                desc.prefix ? "text-[#003087]" : "text-gray-400"
                              }`}>
                              Use prefix to generate a new column code
                              {!desc.prefix && " (Select a prefix first)"}
                            </span>
                          </label>
                          {desc.prefix && (
                            <p className="text-[10px] text-gray-600 mt-1 ml-5">
                              When checked, different prefixes will create
                              separate column codes
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-1">
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
                              disabled={!desc.suffix}
                              className={`form-checkbox h-3 w-3 ${
                                desc.suffix
                                  ? "text-[#3a6ea5] cursor-pointer"
                                  : "text-gray-300 cursor-not-allowed opacity-50"
                              }`}
                            />
                            <span
                              className={`text-[10px] font-medium ${
                                desc.suffix ? "text-[#003087]" : "text-gray-400"
                              }`}>
                              Use suffix to generate a new column code
                              {!desc.suffix && " (Select a suffix first)"}
                            </span>
                          </label>
                          {desc.suffix && (
                            <p className="text-[10px] text-gray-600 mt-1 ml-5">
                              When checked, different suffixes will create
                              separate column codes
                            </p>
                          )}
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
                          className="form-checkbox h-3 w-3 text-[#3a6ea5]"
                        />
                        <span className="text-[10px] font-medium text-[#003087]">
                          Mark as Obsolete
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-2 justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-[#0052cc] text-white px-3 py-1 rounded-lg hover:bg-[#003087] transition-all disabled:opacity-50 text-xs">
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-all text-xs">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-3 max-w-sm w-full shadow-lg">
              <h2 className="text-xs font-bold mb-2 text-[#003087]">
                Quick Search Columns
              </h2>
              <input
                type="text"
                value={columnCodeFilter}
                onChange={(e) => setColumnCodeFilter(e.target.value)}
                placeholder="Enter Column Code..."
                className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setSearchFilters((prev) => ({
                      ...prev,
                      columnCode: columnCodeFilter,
                    }));
                    setShowSearchModal(false);
                  }}
                  className="bg-[#0052cc] text-white px-3 py-1 rounded-lg hover:bg-[#003087] transition-all text-xs">
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
                  className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-all text-xs">
                  Clear
                </button>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-all text-xs">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#f0f0f0] border-2 border-[#3a6ea5] rounded-lg p-2 max-w-5xl w-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] max-h-[85vh] overflow-y-auto">
              <h2 className="text-xs font-bold mb-3 text-[#003087]">
                {auditFilters.columnCode
                  ? `Audit Trail (${auditFilters.columnCode})`
                  : "Audit Trail (All Columns)"}
              </h2>

              <div className="grid grid-cols-4 gap-2 mb-2">
                <div>
                  <label className="block text-[10px] font-medium text-[#003087] mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search column code"
                    value={auditFilters.columnCode}
                    onChange={(e) =>
                      setAuditFilters((prev) => ({
                        ...prev,
                        columnCode: e.target.value,
                      }))
                    }
                    className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#003087] mb-1">
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
                    className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs">
                    <option value="">All Actions</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#003087] mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    placeholder="dd-mm-yyyy"
                    value={auditFilters.dateFrom}
                    onChange={(e) =>
                      setAuditFilters((prev) => ({
                        ...prev,
                        dateFrom: e.target.value,
                      }))
                    }
                    className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#003087] mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    placeholder="dd-mm-yyyy"
                    value={auditFilters.dateTo}
                    onChange={(e) =>
                      setAuditFilters((prev) => ({
                        ...prev,
                        dateTo: e.target.value,
                      }))
                    }
                    className="border-2 border-[#3a6ea5] rounded-lg p-1 w-full bg-[#f8f8f8] text-xs"
                  />
                </div>
              </div>

              {auditFilters.columnCode && (
                <div className="mb-3">
                  <button
                    onClick={() => {
                      setAuditFilters((prev) => ({ ...prev, columnCode: "" }));
                      fetchAudits();
                    }}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                    Show All Audits
                  </button>
                  <span className="ml-2 text-xs text-gray-600">
                    Currently showing audits for:{" "}
                    <strong>{auditFilters.columnCode}</strong>
                  </span>
                </div>
              )}

              <div className="overflow-x-auto border border-gray-300 rounded-lg bg-white max-h-80 overflow-y-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="border border-gray-300 p-1 text-left text-[10px] font-semibold">
                        Timestamp
                      </th>
                      <th className="border border-gray-300 p-1 text-left text-[10px] font-semibold">
                        User
                      </th>
                      <th className="border border-gray-300 p-1 text-left text-[10px] font-semibold">
                        Action
                      </th>
                      <th className="border border-gray-300 p-1 text-left text-[10px] font-semibold">
                        Column Code
                      </th>
                      <th className="border border-gray-300 p-1 text-left text-[10px] font-semibold">
                        Previous Value
                      </th>
                      <th className="border border-gray-300 p-1 text-left text-[10px] font-semibold">
                        Changed To
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterAudits(audits).length > 0 ? (
                      filterAudits(audits).map((audit) => (
                        <tr key={audit._id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-1 text-[10px]">
                            {new Date(audit.timestamp).toLocaleString("en-US", {
                              month: "numeric",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })}
                          </td>
                          <td className="border border-gray-300 p-1 text-[10px]">
                            {audit.userId}
                          </td>
                          <td className="border border-gray-300 p-1 text-[10px]">
                            <span
                              className={`px-1 py-0.5 rounded text-[10px] font-semibold ${
                                audit.action === "CREATE"
                                  ? "bg-green-100 text-green-800"
                                  : audit.action === "UPDATE"
                                  ? "bg-blue-100 text-blue-800"
                                  : audit.action === "DELETE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}>
                              {audit.action}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-1 text-[10px]">
                            {audit.columnCode || "-"}
                          </td>
                          <td className="border border-gray-300 p-1 text-[10px]">
                            {audit.action === "CREATE" ? (
                              <span className="text-gray-500 italic">
                                New Record
                              </span>
                            ) : audit.changes && audit.changes.length > 0 ? (
                              <div className="space-y-0.5 max-w-[200px]">
                                {audit.changes.map((change, idx) => (
                                  <div
                                    key={idx}
                                    className="text-[10px] break-words">
                                    <span className="font-medium text-gray-700">
                                      {formatFieldName(change.field)}:
                                    </span>{" "}
                                    <span className="text-red-600">
                                      {resolveAuditValue(
                                        change.field,
                                        change.from
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="border border-gray-300 p-1 text-[10px]">
                            {audit.action === "DELETE" ? (
                              <span className="text-gray-500 italic">
                                Deleted
                              </span>
                            ) : audit.action === "CREATE" ? (
                              <span className="text-green-600 italic">
                                Column Created
                              </span>
                            ) : audit.changes && audit.changes.length > 0 ? (
                              <div className="space-y-0.5 max-w-[200px]">
                                {audit.changes.map((change, idx) => (
                                  <div
                                    key={idx}
                                    className="text-[10px] break-words">
                                    <span className="font-medium text-gray-700">
                                      {formatFieldName(change.field)}:
                                    </span>{" "}
                                    <span className="text-green-600">
                                      {resolveAuditValue(
                                        change.field,
                                        change.to
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="border border-gray-300 p-2 text-center text-gray-500 text-[10px]">
                          No audit records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="bg-gray-500 text-white px-4 py-1 rounded-lg hover:bg-gray-600 transition-all text-xs">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}