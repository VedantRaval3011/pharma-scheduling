import React, { useEffect } from "react";
import { useColumnDisplayTexts } from "@/lib/columnDisplayUtils";

interface ColumnDisplayTextProps {
  columnId: string;
  placeholder?: string;
  className?: string;
  cacheKey: string;
}

export const ColumnDisplayText: React.FC<ColumnDisplayTextProps> = ({
  columnId,
  placeholder,
  className,
  cacheKey,
}) => {
  const { loadColumnDisplayText, getColumnDisplayText } = useColumnDisplayTexts();

  useEffect(() => {
    if (columnId) {
      loadColumnDisplayText(columnId, cacheKey);
    }
  }, [columnId, cacheKey, loadColumnDisplayText]);

  const displayText = getColumnDisplayText(cacheKey) || columnId || "";

  return (
    <input
      type="text"
      value={displayText}
      readOnly
      placeholder={placeholder}
      className={className}
    />
  );
};