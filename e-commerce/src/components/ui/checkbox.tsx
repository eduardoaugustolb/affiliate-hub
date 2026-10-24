"use client";
import { useId, useState } from "react";

type Props = {
  label: string;
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};
/** Native button keyboard behavior with a custom checkbox surface and form value. */
export function Checkbox({
  label,
  name,
  value,
  checked,
  defaultChecked = false,
  disabled = false,
  onCheckedChange,
}: Props) {
  const [internal, setInternal] = useState(defaultChecked),
    id = useId();
  const selected = checked ?? internal;
  return (
    <span className="app-check-field">
      {/* biome-ignore lint/a11y/useSemanticElements: App checkbox intentionally uses a custom surface with button keyboard behavior and a hidden successful form control. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        className="app-checkbox"
        onClick={() => {
          if (checked === undefined) setInternal(!selected);
          onCheckedChange?.(!selected);
        }}
      >
        <span className="app-checkbox-box" aria-hidden="true">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
            <path
              d="m3 8 3 3 7-7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span id={`${id}-label`}>{label}</span>
      </button>
      {selected && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
    </span>
  );
}
