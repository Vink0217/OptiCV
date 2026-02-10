import { useState } from "react";

export function DatePicker({ value, onChange, placeholder }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Select date"}
        className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        readOnly
      />
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
