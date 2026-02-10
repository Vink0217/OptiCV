import { useState } from "react";

export function CalendarDropdown({ value, onChange, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary"
        onClick={() => setOpen(!open)}
      >
        {value ? value : (placeholder || "Select date")}
      </button>
      {open && (
        <input
          type="date"
          className="absolute left-0 top-10 z-10 w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
