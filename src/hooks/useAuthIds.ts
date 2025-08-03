import { useState, useEffect } from "react";

interface AuthIds {
  companyId: string | null;
  locationId: string | null;
  error: string | null;
}

export const useAuthIds = (): AuthIds => {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedCompanyId = localStorage.getItem("companyID");
      const storedLocationId = localStorage.getItem("locationID");

      if (!storedCompanyId || !storedLocationId) {
        setError("Company ID or Location ID is missing. Please log in again.");
        return;
      }

      if (storedCompanyId.trim() === "" || storedLocationId.trim() === "") {
        setError("Invalid Company ID or Location ID.");
        return;
      }

      setCompanyId(storedCompanyId);
      setLocationId(storedLocationId);
    } catch (err) {
      setError("Failed to access localStorage. Please ensure storage is enabled.");
      console.error("localStorage error:", err);
    }
  }, []);

  return { companyId, locationId, error };
};