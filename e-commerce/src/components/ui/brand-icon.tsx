import type { SVGProps } from "react";
import { type BrandIconName, brandIconPaths } from "@/lib/brand-icons";

type BrandIconProps = Omit<SVGProps<SVGSVGElement>, "children" | "name"> & {
  name: BrandIconName;
  label?: string;
};

export function BrandIcon({
  name,
  label,
  className = "size-5",
  ...props
}: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      data-icon={name}
      focusable="false"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      {label ? <title>{label}</title> : null}
      {brandIconPaths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
