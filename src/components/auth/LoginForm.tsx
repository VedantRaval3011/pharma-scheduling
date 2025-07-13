"use client";
import debounce from "lodash.debounce";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

interface Location {
  locationId: string;
  name: string;
}

interface Company {
  companyId: string;
  name: string;
  locations: Location[];
}

export default function LoginForm() {
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
    companyId: "",
    company: "",
    locationId: "",
    location: "",
    loginType: "credentials",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [enterCount, setEnterCount] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userExists, setUserExists] = useState(false);
  const router = useRouter();

  
  const fetchUserCompanies = useCallback(
    debounce(async (userId: string) => {
      if (!userId || userId.length < 3) {
        setFormData((prev) => ({
          ...prev,
          companyId: "",
          company: "",
          locationId: "",
          location: "",
        }));
        setCompanies([]);
        setUserExists(false);
        return;
      }

      setIsCompanyLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/user/${userId.toLowerCase()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setCompanies(data.user?.companies || []); // Updated to data.user.companies
          setUserExists(true);
          setFormData((prev) => ({
            ...prev,
            companyId: "",
            company: "",
            locationId: "",
            location: "",
          }));
          setError("");
        } else {
          setError(data.error || "User not found. Please check your User ID.");
          setUserExists(false);
          setCompanies([]);
          setFormData((prev) => ({
            ...prev,
            companyId: "",
            company: "",
            locationId: "",
            location: "",
          }));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch user details"
        );
        setFormData((prev) => ({
          ...prev,
          companyId: "",
          company: "",
          locationId: "",
          location: "",
        }));
        setCompanies([]);
        setUserExists(false);
      } finally {
        setIsCompanyLoading(false);
      }
    }, 800),
    []
  );

  useEffect(() => {
    fetchUserCompanies(formData.userId);
  }, [formData.userId, fetchUserCompanies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (
      !formData.userId ||
      !formData.password ||
      !formData.companyId ||
      !formData.locationId
    ) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        userId: formData.userId,
        password: formData.password,
        companyId: formData.companyId,
        company: formData.company,
        locationId: formData.locationId,
        location: formData.location,
        loginType: formData.loginType,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (enterCount === 0) {
        setEnterCount(1);
        fetchUserCompanies(formData.userId);
      } else if (enterCount === 1) {
        if (
          formData.userId &&
          formData.password &&
          formData.companyId &&
          formData.locationId
        ) {
          handleSubmit(e as any);
        } else {
          setError("Please fill in all required fields");
        }
      }
    }
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCompany = companies.find(
      (c) => c.companyId === e.target.value
    );
    setFormData({
      ...formData,
      companyId: e.target.value,
      company: selectedCompany?.name || "",
      locationId: "",
      location: "",
    });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCompany = companies.find(
      (c) => c.companyId === formData.companyId
    );
    const selectedLocation = selectedCompany?.locations.find(
      (l) => l.locationId === e.target.value
    );
    setFormData({
      ...formData,
      locationId: e.target.value,
      location: selectedLocation?.name || "",
    });
  };

  const resetForm = () => {
    setFormData({
      userId: "",
      password: "",
      companyId: "",
      company: "",
      locationId: "",
      location: "",
      loginType: "credentials",
    });
    setError("");
    setEnterCount(0);
    setCompanies([]);
    setUserExists(false);
  };

  const getAvailableLocations = () => {
    const selectedCompany = companies.find(
      (c) => c.companyId === formData.companyId
    );
    return selectedCompany?.locations || [];
  };

  return (
    <div
      className="min-h-screen flex items-center justify-start"
      style={{ backgroundColor: "#c0c0c0" }}
    >
      <div
        className="w-[40rem] h-auto min-h-[20rem] absolute left-56 top-20"
        style={{
          backgroundColor: "#f0f0f0",
          border: "2px outset #c0c0c0",
          fontFamily: "MS Sans Serif, sans-serif",
          fontSize: "11px",
        }}
      >
        <div
          className="h-6 flex items-center justify-between px-2"
          style={{
            background: "linear-gradient(to bottom, #0054e3, #0040a6)",
            color: "white",
            fontSize: "11px",
            fontWeight: "bold",
          }}
        >
          <span>Login Security</span>
          <button
            className="w-4 h-4 flex items-center justify-center text-white hover:bg-red-600"
            style={{
              backgroundColor: "#c0504d",
              border: "1px outset #c0c0c0",
              fontSize: "10px",
              fontWeight: "bold",
            }}
            onClick={resetForm}
          >
            ×
          </button>
        </div>

        <div className="flex">
          <div
            className=" mt-3 w-2/5 flex items-center justify-center"
            style={{ backgroundColor: "#f5f1e8" }}
          >
            <Image src="/lock.png" alt="lock" width={150} height={150} />
          </div>

          <div className="w-3/5 p-4" style={{ backgroundColor: "#f5f1e8" }}>
            <div className="mt-5 space-y-3">
              <div className="flex items-center">
                <label
                  className="w-20 text-right pr-2"
                  style={{
                    color: "#654321",
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                >
                  User ID:
                </label>
                <input
                  type="text"
                  required
                  className="w-60 h-5 px-1 border text-xs"
                  style={{
                    backgroundColor: "#fefefe",
                    border: "1px inset #c0c0c0",
                    fontFamily: "MS Sans Serif, sans-serif",
                  }}
                  value={formData.userId}
                  onChange={(e) => {
                    const userId = e.target.value;
                    setFormData({ ...formData, userId });
                    setEnterCount(0);
                  }}
                  onKeyDown={handleUserIdKeyDown}
                  placeholder="Enter your User ID (e.g., abc01)"
                />
                {isCompanyLoading && (
                  <span className="ml-2 text-xs text-blue-600">Loading...</span>
                )}
              </div>

              <div className="flex items-center">
                <label
                  className="w-20 text-right pr-2"
                  style={{
                    color: "#654321",
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                >
                  Password:
                </label>
                <input
                  type="password"
                  required
                  className="w-60 h-5 px-1 border text-xs"
                  style={{
                    backgroundColor: "#fefefe",
                    border: "1px inset #c0c0c0",
                    fontFamily: "MS Sans Serif, sans-serif",
                  }}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center">
                <label
                  className="w-20 text-right pr-2"
                  style={{
                    color: "#654321",
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                >
                  Company:
                </label>
                <select
                  required
                  disabled={isCompanyLoading || companies.length === 0}
                  className="w-60 h-5 px-1 border text-xs"
                  style={{
                    backgroundColor:
                      isCompanyLoading || companies.length === 0
                        ? "#e0e0e0"
                        : "#fefefe",
                    border: "1px inset #c0c0c0",
                    fontFamily: "MS Sans Serif, sans-serif",
                  }}
                  value={formData.companyId}
                  onChange={handleCompanyChange}
                >
                  <option value="">
                    {isCompanyLoading
                      ? "Loading companies..."
                      : companies.length === 0
                      ? "No companies associated"
                      : "Select Company"}
                  </option>
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.name} ({company.companyId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <label
                  className="w-20 text-right pr-2"
                  style={{
                    color: "#654321",
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                >
                  Location:
                </label>
                <select
                  required
                  disabled={
                    isCompanyLoading ||
                    !formData.companyId ||
                    getAvailableLocations().length === 0
                  }
                  className="w-60 h-5 px-1 border text-xs"
                  style={{
                    backgroundColor:
                      isCompanyLoading ||
                      !formData.companyId ||
                      getAvailableLocations().length === 0
                        ? "#e0e0e0"
                        : "#fefefe",
                    border: "1px inset #c0c0c0",
                    fontFamily: "MS Sans Serif, sans-serif",
                  }}
                  value={formData.locationId}
                  onChange={handleLocationChange}
                >
                  <option value="">
                    {!formData.companyId
                      ? "Select company first"
                      : getAvailableLocations().length === 0
                      ? "No locations associated"
                      : "Select Location"}
                  </option>
                  {getAvailableLocations().map((location) => (
                    <option
                      key={location.locationId}
                      value={location.locationId}
                    >
                      {location.name} ({location.locationId})
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div
                  className="text-red-600 text-xs mt-2 p-2 border"
                  style={{
                    fontFamily: "MS Sans Serif, sans-serif",
                    backgroundColor: "#ffe6e6",
                    border: "1px solid #ff9999",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.userId ||
                    !formData.password ||
                    !formData.companyId ||
                    !formData.locationId
                  }
                  className="px-4 py-1 text-xs disabled:opacity-50"
                  style={{
                    backgroundColor:
                      loading ||
                      !formData.userId ||
                      !formData.password ||
                      !formData.companyId ||
                      !formData.locationId
                        ? "#d0d0d0"
                        : "#e0e0e0",
                    border: "1px outset #c0c0c0",
                    fontFamily: "MS Sans Serif, sans-serif",
                    fontWeight: "normal",
                  }}
                  onClick={handleSubmit}
                >
                  {loading ? "Signing in..." : "Login"}
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs"
                  style={{
                    backgroundColor: "#e0e0e0",
                    border: "1px outset #c0c0c0",
                    fontFamily: "MS Sans Serif, sans-serif",
                    fontWeight: "normal",
                  }}
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
