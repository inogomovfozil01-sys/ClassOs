"use client";
import { useState, useEffect, useRef } from "react";
import { Column, statusOptions } from "./model";
export function CellEditor({
  column,
  value,
  label,
  disabled,
  onSave,
  onDirty,
}: {
  column: Column;
  value: string;
  label: string;
  disabled?: boolean;
  onSave: (value: string) => Promise<boolean>;
  onDirty?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const last = useRef(value);
  useEffect(() => {
    setDraft(value);
    last.current = value;
  }, [value]);
  async function save(next: string) {
    if (next === last.current && !failed) return;
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    setFailed(!ok);
    if (ok) {
      last.current = next;
      onDirty?.(false);
    }
  }
  const props = {
    "aria-label": label,
    disabled: disabled || saving,
    "aria-invalid": failed || undefined,
  };
  if (column.type === "STATUS")
    return (
      <select
        {...props}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          void save(e.target.value);
        }}
      >
        <option value="">—</option>
        {Array.from(
          new Set([...statusOptions(column), ...(draft ? [draft] : [])]),
        ).map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    );
  if (column.type === "CHECKBOX")
    return (
      <div className="text-center">
        <input
          {...props}
          type="checkbox"
          checked={draft === "true"}
          onChange={(e) => {
            const v = String(e.target.checked);
            setDraft(v);
            void save(v);
          }}
        />
      </div>
    );
  return (
    <input
      {...props}
      type={
        column.type === "NUMBER"
          ? "number"
          : column.type === "DATE"
            ? "date"
            : "text"
      }
      value={draft}
      placeholder="—"
      onChange={(e) => {
        setDraft(e.target.value);
        onDirty?.(true);
      }}
      onBlur={() => void save(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(last.current);
          onDirty?.(false);
          e.currentTarget.value = last.current;
        }
      }}
    />
  );
}
