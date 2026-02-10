import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, isValid, format } from "date-fns";

export function ReactDatePicker({ value, onChange, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const parseToDate = (val: string | undefined | null) => {
    if (!val) return null;
    // Try ISO style first (yyyy-MM-dd or full ISO)
    const iso = new Date(val);
    if (!Number.isNaN(iso.getTime())) return iso;
    // Try MM-yyyy and MM/yyyy
    const p1 = parse(val, "MM/yyyy", new Date());
    if (isValid(p1)) return p1;
    const p2 = parse(val, "MM-yyyy", new Date());
    if (isValid(p2)) return p2;
    return null;
  };

  const dateVal = parseToDate(value);

  return (
    <DatePicker
      selected={dateVal}
      onChange={(date: Date | null) => onChange(date ? format(date, "MM/yyyy") : "")}
      dateFormat="MM/yyyy"
      showMonthYearPicker
      placeholderText={placeholder || "MM/YYYY"}
      className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      isClearable
    />
  );
}
