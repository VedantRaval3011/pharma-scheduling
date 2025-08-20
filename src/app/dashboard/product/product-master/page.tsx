// app/dashboard/product-master/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import WindowsToolbar from "@/components/layout/ToolBox";

interface Product {
  _id: string;
  productName: string;
  productCode: string;
  genericName: string;
  makeId: string;
  marketedBy: string;
  mfcs: string[];
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductMake {
  _id: string;
  makeName: string;
}

interface Mfc {
  _id: string;
  mfcNumber: string; // Assuming MFC has mfcNumber
  // Add other fields if needed
}

function ProductMaster() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [productMakes, setProductMakes] = useState<ProductMake[]>([]);
  const [mfcs, setMfcs] = useState<Mfc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    productName: "",
    productCode: "",
    genericName: "",
    makeId: "",
    marketedBy: "",
    mfcs: [] as string[],
  });
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(-1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownSelectedIndex, setDropdownSelectedIndex] = useState(-1);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const auditSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      const storedCompanyId = localStorage.getItem("companyId");
      const storedLocationId = localStorage.getItem("locationId");
      if (storedCompanyId && storedLocationId) {
        setCompanyId(storedCompanyId);
        setLocationId(storedLocationId);
      } else {
        setError("Company ID or Location ID not found in localStorage");
        setLoading(false);
      }
    }
  }, [status, router]);

  const fetchProductMakes = async () => {
    if (!companyId || !locationId) return;
    try {
      const response = await fetch(
        `/api/admin/product/productMake?companyId=${companyId}&locationId=${locationId}`
      );
      const data = await response.json();
      if (data.success) {
        setProductMakes(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch product makes");
    }
  };

  const fetchMfcs = async () => {
  if (!companyId || !locationId) {
    setError("Company ID or Location ID not found");
    return;
  }
  try {
    const response = await fetch(`/api/admin/mfc?companyId=${companyId}&locationId=${locationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Fix: Check for data.data instead of data.success
    if (data.data) {
      setMfcs(data.data || []);
      console.log("MFCs fetched successfully:", data.data); // Debug
    } else {
      throw new Error("No MFC data found in response");
    }
  } catch (err: any) {
    console.error("Error fetching MFCs:", err.message || err);
    setError(`Failed to fetch MFCs: ${err.message || "Unknown error"}`);
  }
};

  const fetchProducts = async () => {
    if (!companyId || !locationId) {
      setError("Please ensure company and location are set in localStorage");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = `/api/admin/product?companyId=${companyId}&locationId=${locationId}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-cache",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const validProducts = data.data
          .filter((product: Product) => {
            const isValid =
              product &&
              typeof product.productName === "string" &&
              product.productName.trim().length > 0 &&
              product.companyId === companyId &&
              product.locationId === locationId;
            return isValid;
          })
          .sort((a: Product, b: Product) =>
            a.productName
              .toLowerCase()
              .localeCompare(b.productName.toLowerCase())
          );

        setProducts(validProducts);

        if (validProducts.length < data.data.length) {
          const filteredCount = data.data.length - validProducts.length;
          setError(
            `Warning: ${filteredCount} invalid products were filtered out. Please check your database.`
          );
        } else if (validProducts.length === 0) {
          setError("No products found for the selected company and location.");
        }
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err: any) {
      if (err.message.includes("401")) {
        setError("Unauthorized access. Please log in again.");
      } else {
        setError(`Failed to fetch products: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (
    action: string,
    data: any,
    previousData?: any
  ) => {
    try {
      if (!companyId || !locationId) {
        return;
      }

      const response = await fetch("/api/admin/product/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id || "system",
          action,
          data,
          previousData,
          companyId,
          locationId,
          timestamp: new Date().toISOString(),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to log audit action:", await response.json());
      }
    } catch (err) {
      console.error("Failed to log audit action:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      if (!companyId || !locationId) {
        return;
      }

      const queryParams = new URLSearchParams({
        companyId,
        locationId,
      });

      if (selectedProduct) {
        queryParams.append("productName", selectedProduct.productName);
      }
      if (auditSearchTerm) {
        queryParams.append("searchTerm", auditSearchTerm);
      }
      if (auditActionFilter) {
        queryParams.append("action", auditActionFilter);
      }
      if (auditStartDate) {
        queryParams.append("startDate", auditStartDate);
      }
      if (auditEndDate) {
        queryParams.append("endDate", auditEndDate);
      }

      const response = await fetch(
        `/api/admin/product/audit?${queryParams.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data);
      } else {
        setError(data.error || "Failed to fetch audit logs");
      }
    } catch (err) {
      setError("Failed to fetch audit logs");
    }
  };

  useEffect(() => {
    if (companyId && locationId) {
      fetchProducts();
      fetchProductMakes();
      fetchMfcs();
    }
  }, [companyId, locationId]);

  const filteredProducts = products.filter((product) =>
    product.productName
      .toLowerCase()
      .startsWith(formData.productName.toLowerCase())
  );

  const handleAddNew = () => {
  setIsFormEnabled(true);
  setIsEditMode(false);
  setFormData({ productName: "", productCode: "", genericName: "", makeId: "", marketedBy: "", mfcs: [] });
  setSelectedProduct(null);
  setCurrentProductIndex(-1);
  setTimeout(() => inputRef.current?.focus(), 100);
};

  const handleSave = async () => {
    if (
      !isFormEnabled ||
      !formData.productName.trim() ||
      !formData.productCode.trim() ||
      !formData.makeId
    ) {
      setError("Product name, code, and make are required");
      return;
    }

    try {
      if (!companyId || !locationId) {
        setError("Company ID or Location ID not found in localStorage");
        return;
      }

      const url = "/api/admin/product";
      const method = isEditMode && selectedProduct ? "PUT" : "POST";
      const body = {
        id: isEditMode && selectedProduct ? selectedProduct._id : undefined,
        productName: formData.productName,
        productCode: formData.productCode,
        genericName: formData.genericName,
        makeId: formData.makeId,
        marketedBy: formData.marketedBy,
        mfcs: formData.mfcs,
        companyId,
        locationId,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await response.json();
      if (data.success) {
        await logAuditAction(
          isEditMode && selectedProduct ? "UPDATE" : "CREATE",
          {
            productName: formData.productName,
            productCode: formData.productCode,
            genericName: formData.genericName,
            makeId: formData.makeId,
            marketedBy: formData.marketedBy,
            mfcs: formData.mfcs,
            companyId,
            locationId,
          },
          isEditMode && selectedProduct
            ? {
                productName: selectedProduct.productName,
                productCode: selectedProduct.productCode,
                genericName: selectedProduct.genericName,
                makeId: selectedProduct.makeId,
                marketedBy: selectedProduct.marketedBy,
                mfcs: selectedProduct.mfcs,
                companyId: selectedProduct.companyId,
                locationId: selectedProduct.locationId,
              }
            : null
        );

        setFormData({
          productName: "",
          productCode: "",
          genericName: "",
          makeId: "",
          marketedBy: "",
          mfcs: [],
        });
        setIsFormEnabled(false);
        setIsEditMode(false);
        setSelectedProduct(null);
        setCurrentProductIndex(-1);
        await fetchProducts();
      } else {
        setError(data.error || "Failed to save product");
      }
    } catch (err: any) {
      setError(`Failed to save product: ${err.message}`);
    }
  };

  const handleClear = () => {
    setFormData({
      productName: "",
      productCode: "",
      genericName: "",
      makeId: "",
      marketedBy: "",
      mfcs: [],
    });
    setIsFormEnabled(false);
    setIsEditMode(false);
    setSelectedProduct(null);
    setCurrentProductIndex(-1);
    setShowDropdown(false);
  };

  const handleExit = () => {
    router.push("/dashboard");
  };

  const handleUp = () => {
    if (currentProductIndex > 0) {
      const newIndex = currentProductIndex - 1;
      setCurrentProductIndex(newIndex);
      const product = products[newIndex];
      setSelectedProduct(product);
      setFormData({
        productName: product.productName,
        productCode: product.productCode,
        genericName: product.genericName || "",
        makeId: product.makeId,
        marketedBy: product.marketedBy || "",
        mfcs: product.mfcs || [],
      });
    }
  };

  const handleDown = () => {
    if (currentProductIndex < products.length - 1) {
      const newIndex = currentProductIndex + 1;
      setCurrentProductIndex(newIndex);
      const product = products[newIndex];
      setSelectedProduct(product);
      setFormData({
        productName: product.productName,
        productCode: product.productCode,
        genericName: product.genericName || "",
        makeId: product.makeId,
        marketedBy: product.marketedBy || "",
        mfcs: product.mfcs || [],
      });
    } else if (currentProductIndex === -1 && products.length > 0) {
      setCurrentProductIndex(0);
      const product = products[0];
      setSelectedProduct(product);
      setFormData({
        productName: product.productName,
        productCode: product.productCode,
        genericName: product.genericName || "",
        makeId: product.makeId,
        marketedBy: product.marketedBy || "",
        mfcs: product.mfcs || [],
      });
    }
  };

  const handleSearch = () => {
    setShowSearchModal(true);
    setSearchTerm("");
    setDropdownSelectedIndex(-1);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleEdit = () => {
  if (selectedProduct) {
    setIsFormEnabled(true);
    setIsEditMode(true);
    setFormData({
      productName: selectedProduct.productName,
      productCode: selectedProduct.productCode,
      genericName: selectedProduct.genericName || "",
      makeId: selectedProduct.makeId,
      marketedBy: selectedProduct.marketedBy || "",
      mfcs: selectedProduct.mfcs || [],
    });
    setTimeout(() => inputRef.current?.focus(), 100);
  }
};

  const handleDelete = async () => {
    if (!selectedProduct) return;

    if (
      !confirm(
        `Are you sure you want to delete "${selectedProduct.productName}"?`
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/admin/product?id=${selectedProduct._id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        await logAuditAction("DELETE", {
          productName: selectedProduct.productName,
          productCode: selectedProduct.productCode,
          genericName: selectedProduct.genericName,
          makeId: selectedProduct.makeId,
          marketedBy: selectedProduct.marketedBy,
          mfcs: selectedProduct.mfcs,
          companyId: selectedProduct.companyId,
          locationId: selectedProduct.locationId,
        });

        await fetchProducts();
        setFormData({
          productName: "",
          productCode: "",
          genericName: "",
          makeId: "",
          marketedBy: "",
          mfcs: [],
        });
        setSelectedProduct(null);
        setCurrentProductIndex(-1);
        setIsFormEnabled(false);
        setIsEditMode(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete product");
    }
  };

  const handleAudit = async () => {
    await fetchAuditLogs();
    setShowAuditModal(true);
    setTimeout(() => auditSearchInputRef.current?.focus(), 100);
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Product Database Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5faff; }
            h1 { text-align: center; color: #0055a4; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #a6c8ff; }
            th, td { border: 1px solid #a6c8ff; padding: 8px; text-align: left; }
            th { background: linear-gradient(to bottom, #f0f0f0, #ffffff); color: #333; }
            .date { margin-bottom: 20px; color: #333; }
          </style>
        </head>
        <body>
          <h1>Product Database Report</h1>
          <p class="date">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <tr><th>Product Name</th><th>Code</th><th>Generic Name</th><th>Make</th><th>Marketed By</th><th>MFCs</th><th>Created Date</th></tr>
            ${products
              .map(
                (product) =>
                  `<tr><td>${product.productName}</td><td>${
                    product.productCode
                  }</td><td>${product.genericName || ""}</td><td>${
                    productMakes.find((m) => m._id === product.makeId)
                      ?.makeName || ""
                  }</td><td>${product.marketedBy || ""}</td><td>${product.mfcs
                    .map(
                      (id) => mfcs.find((m) => m._id === id)?.mfcNumber || ""
                    )
                    .join(", ")}</td><td>${new Date(
                    product.createdAt
                  ).toLocaleDateString()}</td></tr>`
              )
              .join("")}
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  const handleHelp = () => {
    setShowHelpModal(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropdownSelectedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (
          dropdownSelectedIndex >= 0 &&
          filteredProducts[dropdownSelectedIndex]
        ) {
          const product = filteredProducts[dropdownSelectedIndex];
          setFormData({
            productName: product.productName,
            productCode: product.productCode,
            genericName: product.genericName || "",
            makeId: product.makeId,
            marketedBy: product.marketedBy || "",
            mfcs: product.mfcs || [],
          });
          setSelectedProduct(product);
          setCurrentProductIndex(
            products.findIndex((c) => c._id === product._id)
          );
          setShowDropdown(false);
          setDropdownSelectedIndex(-1);
        }
        break;
      case "Escape":
        setShowDropdown(false);
        setDropdownSelectedIndex(-1);
        break;
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const searchResults = products.filter(
      (product) =>
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.genericName &&
          product.genericName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setDropdownSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setDropdownSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (
          dropdownSelectedIndex >= 0 &&
          searchResults[dropdownSelectedIndex]
        ) {
          const product = searchResults[dropdownSelectedIndex];
          setFormData({
            productName: product.productName,
            productCode: product.productCode,
            genericName: product.genericName || "",
            makeId: product.makeId,
            marketedBy: product.marketedBy || "",
            mfcs: product.mfcs || [],
          });
          setSelectedProduct(product);
          setCurrentProductIndex(
            products.findIndex((c) => c._id === product._id)
          );
          setShowSearchModal(false);
          setDropdownSelectedIndex(-1);
          setSearchTerm("");
        }
        break;
      case "Escape":
        setShowSearchModal(false);
        setDropdownSelectedIndex(-1);
        setSearchTerm("");
        break;
    }
  };

  const getMakeName = (makeId: string) =>
    productMakes.find((m) => m._id === makeId)?.makeName || "Unknown";

  const getMfcDetails = (mfcIds: string[]) =>
    mfcIds
      .map((id) => mfcs.find((m) => m._id === id)?.mfcNumber || "Unknown")
      .join(", ");

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#c0dcff] flex items-center justify-center">
        <div className="text-lg font-segoe text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#c0dcff] font-segoe"
      style={{
        backgroundImage: "linear-gradient(to bottom, #e6f0fa, #c0dcff)",
      }}
    >
      <WindowsToolbar
        modulePath="/dashboard/product-master"
        onAddNew={handleAddNew}
        onSave={handleSave}
        onClear={handleClear}
        onExit={handleExit}
        onUp={handleUp}
        onDown={handleDown}
        onSearch={handleSearch}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAudit={handleAudit}
        onPrint={handlePrint}
        onHelp={handleHelp}
      />

      <div>
        <div
          className="bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white px-4 py-2 flex items-center shadow-md"
          style={{ border: "1px solid #004080" }}
        >
          <div className="flex items-center space-x-2">
            <div
              className="w-4 h-4 bg-white rounded-sm flex items-center justify-center"
              style={{ border: "1px solid #004080" }}
            >
              <span className="text-[#0055a4] text-xs font-bold">P</span>
            </div>
            <span className="font-semibold text-sm">Product Master</span>
          </div>
        </div>

        <div className="container mx-auto p-6 px-2 max-w-7xl">
          {error && (
            <div
              className="bg-[#ffe6e6] border border-[#cc0000] text-[#cc0000] px-4 py-3 rounded mb-4 shadow-inner"
              style={{ borderStyle: "inset" }}
            >
              {error}
            </div>
          )}
          <div
            className="bg-white rounded-lg shadow-md p-6 mb-6"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Product Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={formData.productName}
                  disabled={!isFormEnabled}
                  onChange={(e) => {
                    setFormData({ ...formData, productName: e.target.value });
                    if (e.target.value && isFormEnabled && !isEditMode) {
                      setShowDropdown(true);
                      setDropdownSelectedIndex(-1);
                    } else {
                      setShowDropdown(false);
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => {
                    if (formData.productName && isFormEnabled && !isEditMode) {
                      setShowDropdown(true);
                    }
                  }}
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled
                      ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                      : "none",
                  }}
                  placeholder="Enter product name"
                />

                {showDropdown &&
                  filteredProducts.length > 0 &&
                  isFormEnabled &&
                  !isEditMode && (
                    <div
                      className="absolute z-10 w-full mt-1 bg-white border border-[#a6c8ff] rounded-md shadow-lg max-h-48 overflow-y-auto"
                      style={{
                        backgroundImage:
                          "linear-gradient(to bottom, #ffffff, #f5faff)",
                      }}
                    >
                      {filteredProducts.map((product, index) => (
                        <div
                          key={product._id}
                          className={`px-3 py-2 cursor-pointer ${
                            index === dropdownSelectedIndex
                              ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                              : "hover:bg-[#e6f0fa]"
                          }`}
                          onClick={() => {
                            setFormData({
                              productName: product.productName,
                              productCode: product.productCode,
                              genericName: product.genericName || "",
                              makeId: product.makeId,
                              marketedBy: product.marketedBy || "",
                              mfcs: product.mfcs || [],
                            });
                            setSelectedProduct(product);
                            setCurrentProductIndex(
                              products.findIndex((c) => c._id === product._id)
                            );
                            setShowDropdown(false);
                            setDropdownSelectedIndex(-1);
                          }}
                        >
                          <div className="font-medium text-gray-800">
                            {product.productName}
                          </div>
                          {product.genericName && (
                            <div className="text-sm text-gray-500">
                              {product.genericName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Code *
                </label>
                <input
                  type="text"
                  value={formData.productCode}
                  disabled={!isFormEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, productCode: e.target.value })
                  }
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled
                      ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                      : "none",
                  }}
                  placeholder="Enter product code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generic Name
                </label>
                <input
                  type="text"
                  value={formData.genericName}
                  disabled={!isFormEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, genericName: e.target.value })
                  }
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled
                      ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                      : "none",
                  }}
                  placeholder="Enter generic name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Make *
                </label>
                <select
                  value={formData.makeId}
                  disabled={!isFormEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, makeId: e.target.value })
                  }
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled
                      ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                      : "none",
                  }}
                >
                  <option value="">Select Make</option>
                  {productMakes.map((make) => (
                    <option key={make._id} value={make._id}>
                      {make.makeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marketed By
                </label>
                <input
                  type="text"
                  value={formData.marketedBy}
                  disabled={!isFormEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, marketedBy: e.target.value })
                  }
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled
                      ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                      : "none",
                  }}
                  placeholder="Enter marketed by"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select MFC
                </label>
                <select
                  multiple
                  value={formData.mfcs}
                  disabled={!isFormEnabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mfcs: Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      ),
                    })
                  }
                  className={`w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none ${
                    isFormEnabled ? "bg-white" : "bg-[#f0f0f0]"
                  }`}
                  style={{
                    borderStyle: "inset",
                    boxShadow: isFormEnabled
                      ? "inset 1px 1px 2px rgba(0,0,0,0.1)"
                      : "none",
                  }}
                >
                  {mfcs.map((mfc) => (
                    <option key={mfc._id} value={mfc._id}>
                      {mfc.mfcNumber}{" "}
                      {/* Should display e.g., "MFC/H/DBF121.01" */}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              {selectedProduct && (
                <div>
                  <span className="font-medium">Selected:</span>{" "}
                  {selectedProduct.productName}
                  <span className="ml-4 font-medium">Index:</span>{" "}
                  {currentProductIndex + 1} of {products.length}
                </div>
              )}
              {isFormEnabled && (
                <div className="text-[#008800] font-medium">
                  {isEditMode
                    ? "Edit Mode - Modify the selected product"
                    : "Add Mode - Enter new product details"}
                </div>
              )}
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-md"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
            }}
          >
            <div
              className="p-4 border-b border-[#a6c8ff]"
              style={{
                backgroundImage: "linear-gradient(to bottom, #f0f0f0, #ffffff)",
              }}
            >
              <h2 className="text-lg font-semibold text-gray-800">
                Products ({products.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0055a4] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No products found. Add your first product!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff]"
                    style={{ borderBottom: "1px solid #a6c8ff" }}
                  >
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Generic Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Make
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Marketed By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        MFCs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#a6c8ff]">
                    {products.map((product, index) => (
                      <tr
                        key={product._id}
                        className={`cursor-pointer ${
                          selectedProduct?._id === product._id
                            ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                            : "hover:bg-[#e6f0fa]"
                        }`}
                        onClick={() => {
                          if (!isFormEnabled) {
                            setSelectedProduct(product);
                            setCurrentProductIndex(index);
                            setFormData({
                              productName: product.productName,
                              productCode: product.productCode,
                              genericName: product.genericName || "",
                              makeId: product.makeId,
                              marketedBy: product.marketedBy || "",
                              mfcs: product.mfcs || [],
                            });
                          }
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-800">
                            {product.productName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.productCode}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {product.genericName || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getMakeName(product.makeId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.marketedBy || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-600 max-w-xs truncate">
                            {getMfcDetails(product.mfcs) || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSearchModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-96 max-h-96"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Search Products
            </h3>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownSelectedIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
              style={{
                borderStyle: "inset",
                boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
              }}
              placeholder="Type to search..."
            />

            <div
              className="max-h-48 overflow-y-auto border border-[#a6c8ff] rounded mt-2"
              style={{
                backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              }}
            >
              {products
                .filter(
                  (product) =>
                    product.productName
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    (product.genericName &&
                      product.genericName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()))
                )
                .map((product, index) => (
                  <div
                    key={product._id}
                    className={`px-3 py-2 cursor-pointer ${
                      index === dropdownSelectedIndex
                        ? "bg-gradient-to-r from-[#a6c8ff] to-[#c0dcff]"
                        : "hover:bg-[#e6f0fa]"
                    }`}
                    onClick={() => {
                      setFormData({
                        productName: product.productName,
                        productCode: product.productCode,
                        genericName: product.genericName || "",
                        makeId: product.makeId,
                        marketedBy: product.marketedBy || "",
                        mfcs: product.mfcs || [],
                      });
                      setSelectedProduct(product);
                      setCurrentProductIndex(
                        products.findIndex((c) => c._id === product._id)
                      );
                      setShowSearchModal(false);
                      setDropdownSelectedIndex(-1);
                      setSearchTerm("");
                    }}
                  >
                    <div className="font-medium text-gray-800">
                      {product.productName}
                    </div>
                    {product.genericName && (
                      <div className="text-sm text-gray-500">
                        {product.genericName}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setDropdownSelectedIndex(-1);
                  setSearchTerm("");
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] active:bg-gradient-to-b active:from-[#b3b3b3] active:to-[#999999]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuditModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-4/5 max-w-4xl max-h-[80vh] overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Audit Trail{" "}
              {selectedProduct
                ? `for ${selectedProduct.productName}`
                : "(All Products)"}
            </h3>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  ref={auditSearchInputRef}
                  type="text"
                  value={auditSearchTerm}
                  onChange={(e) => {
                    setAuditSearchTerm(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                  placeholder="Search product name or generic name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={auditStartDate}
                  onChange={(e) => {
                    setAuditStartDate(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={auditEndDate}
                  onChange={(e) => {
                    setAuditEndDate(e.target.value);
                    fetchAuditLogs();
                  }}
                  className="w-full px-3 py-2 border border-[#a6c8ff] rounded focus:ring-2 focus:ring-[#66a3ff] focus:outline-none bg-white"
                  style={{
                    borderStyle: "inset",
                    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
                  }}
                />
              </div>
            </div>

            <div
              className="max-h-64 overflow-y-auto border border-[#a6c8ff] rounded"
              style={{
                backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              }}
            >
              <table className="w-full text-sm">
                <thead
                  className="bg-gradient-to-b from-[#f0f0f0] to-[#ffffff] sticky top-0"
                  style={{ borderBottom: "1px solid #a6c8ff" }}
                >
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Timestamp
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">User</th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Action
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Product Name
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Generic Name
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Previous Product Name
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700">
                      Previous Generic Name
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a6c8ff]">
                  {auditLogs.map((log: any, index) => (
                    <tr key={index} className="hover:bg-[#e6f0fa]">
                      <td className="px-3 py-2">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{log.userId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.action === "CREATE"
                              ? "bg-[#ccffcc] text-[#008800]"
                              : log.action === "UPDATE"
                              ? "bg-[#ffffcc] text-[#666600]"
                              : log.action === "DELETE"
                              ? "bg-[#ffe6e6] text-[#cc0000]"
                              : "bg-[#f0f0f0]"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.productName || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.data.genericName || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.previousData?.productName || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-xs truncate">
                          {log.previousData?.genericName || "—"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  setAuditSearchTerm("");
                  setAuditActionFilter("");
                  setAuditStartDate("");
                  setAuditEndDate("");
                  setAuditLogs([]);
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#d9d9d9] to-[#b3b3b3] text-gray-800 rounded hover:bg-gradient-to-b hover:from-[#b3b3b3] hover:to-[#d9d9d9] active:bg-gradient-to-b active:from-[#b3b3b3] active:to-[#999999]"
                style={{
                  border: "1px solid #808080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div
          className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
          style={{ backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-lg p-6 w-4/5 max-w-2xl max-h-96 overflow-y-auto"
            style={{
              border: "1px solid #a6c8ff",
              backgroundImage: "linear-gradient(to bottom, #ffffff, #f5faff)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Product Master - Help
            </h3>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-[#0055a4]">
                  Keyboard Shortcuts:
                </h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F1
                    </kbd>{" "}
                    - Add New Product
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F2
                    </kbd>{" "}
                    - Save Current Entry
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F3
                    </kbd>{" "}
                    - Clear Form
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F4
                    </kbd>{" "}
                    - Exit to Dashboard
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F5
                    </kbd>{" "}
                    - Navigate Up
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F6
                    </kbd>{" "}
                    - Navigate Down
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F7
                    </kbd>{" "}
                    - Search Products
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F9
                    </kbd>{" "}
                    - Edit Selected Product
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F10
                    </kbd>{" "}
                    - Delete Selected Product
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F11
                    </kbd>{" "}
                    - View Audit Trail
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      F12
                    </kbd>{" "}
                    - Print Report
                  </li>
                  <li>
                    <kbd className="bg-[#f0f0f0] px-2 py-1 rounded border border-[#a6c8ff]">
                      Ctrl+H
                    </kbd>{" "}
                    - Show Help
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">How to Use:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • Use <b>Add (F1)</b> to enable form for new product entry
                  </li>
                  <li>
                    • Use <b>Edit (F9)</b> to modify selected product
                  </li>
                  <li>
                    • Use <b>Save (F2)</b> to save new or edited product
                  </li>
                  <li>
                    • Use <b>Clear (F3)</b> to reset form and disable inputs
                  </li>
                  <li>
                    • Use <b>Up (F5)/Down (F6)</b> to navigate products
                    alphabetically
                  </li>
                  <li>
                    • Use <b>Search (F7)</b> for full-text search with keyboard
                    navigation
                  </li>
                  <li>
                    • Use <b>Delete (F10)</b> to remove selected product
                  </li>
                  <li>
                    • Use <b>Audit (F11)</b> to view all changes
                  </li>
                  <li>
                    • Use <b>Print (F12)</b> to generate product report
                  </li>
                  <li>
                    • Use <b>Exit (F4)</b> to return to dashboard
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">
                  Status Indicators:
                </h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>
                    • <span className="text-[#008800]">Green text</span> - Form
                    is enabled for input
                  </li>
                  <li>
                    • <span className="text-[#0055a4]">Blue background</span> -
                    Selected product in list
                  </li>
                  <li>
                    • <span className="text-gray-500">Gray fields</span> -
                    Read-only mode
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-[#0055a4]">Tips:</h4>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• All fields are disabled by default until Add/Edit</li>
                  <li>
                    • Product name, code, and make are required for saving
                  </li>
                  <li>• Use arrow keys in search modal for quick navigation</li>
                  <li>• All actions are logged in audit trail</li>
                  <li>• Contact support at support@company.com for issues</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-gradient-to-b from-[#0055a4] to-[#0088d1] text-white rounded hover:bg-gradient-to-b hover:from-[#0088d1] hover:to-[#0055a4] active:bg-gradient-to-b active:from-[#004080] active:to-[#0066b3]"
                style={{
                  border: "1px solid #004080",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedProductMaster() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <ProductMaster />
    </ProtectedRoute>
  );
}
