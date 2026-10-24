import Link from "next/link";
import { BrandIcon } from "@/components/ui/brand-icon";
import type { StorefrontOption } from "@/lib/storefront";
export function ColorNavigation({
  colors,
  current,
  basePath = "/",
  outfit = false,
  title,
  compact = false,
}: {
  colors: StorefrontOption[];
  current?: string;
  basePath?: string;
  outfit?: boolean;
  title?: string;
  compact?: boolean;
}) {
  if (!colors.length) return null;
  const href = (id?: string) =>
    `${basePath}${id ? `?color=${encodeURIComponent(id)}` : ""}${outfit ? "" : "#pecas"}`;
  return (
    <nav
      aria-label={outfit ? "Filtrar outfit por cor" : "Explorar peças por cor"}
      className={compact ? "" : "border-t border-line py-6"}
    >
      <p className="mb-4 text-[0.65rem] uppercase tracking-[0.16em] text-muted">
        {title ?? (outfit ? "Navegue por cor" : "Explore por cor")}
      </p>
      <div className="flex flex-wrap gap-2">
        {outfit && (
          <Link
            href={href()}
            scroll={false}
            aria-current={!current ? "page" : undefined}
            className="color-link"
          >
            Todas
          </Link>
        )}
        {colors.map((color) => (
          <Link
            key={color.id}
            href={href(color.id)}
            scroll={false}
            aria-current={current === color.id ? "page" : undefined}
            className="color-link"
          >
            {color.name}
            <BrandIcon
              name="arrow-right"
              className="size-4 shrink-0 -rotate-45"
            />
          </Link>
        ))}
      </div>
    </nav>
  );
}
