export type ProductKind = "jacket" | "trousers" | "tee" | "bag";

const outlines: Record<ProductKind, string> = {
  jacket:
    "M112 86 147 67 161 45 199 45 213 67 248 86 278 201 243 214 224 142 227 291 133 291 136 142 117 214 82 201Z",
  trousers:
    "M131 52 229 52 237 139 252 302 204 310 180 162 156 310 108 302 123 139Z",
  tee: "M115 82 148 67Q180 91 212 67L245 82 284 139 248 163 227 137 227 281 133 281 133 137 112 163 76 139Z",
  bag: "M109 135Q180 117 251 135L268 273Q180 297 92 273Z",
};

const detailCrops: Record<ProductKind, string> = {
  jacket: "128 134 104 104",
  trousers: "111 148 138 138",
  tee: "128 48 104 104",
  bag: "125 76 110 110",
};

/** Deliberately generic illustrations, replaced by actual product images later. */
export function ProductPlaceholder({
  kind,
  name,
  light = false,
  detail = false,
}: {
  kind: ProductKind;
  name: string;
  light?: boolean;
  detail?: boolean;
}) {
  const color = light ? "#8e8b83" : "#282828";
  const edge = light ? "#bdb8ad" : "#51514e";
  return (
    <svg
      role="img"
      aria-label={`Imagem provisória: ${name}`}
      viewBox={detail ? detailCrops[kind] : "0 0 360 360"}
      fill="none"
      className="size-full"
    >
      <title>{`Ilustração provisória de ${name.toLowerCase()}`}</title>
      <ellipse
        cx="180"
        cy="313"
        rx={kind === "bag" ? 83 : 65}
        ry="9"
        fill="#080808"
        opacity="0.1"
      />
      <path
        d={outlines[kind]}
        fill={color}
        stroke={edge}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {kind === "jacket" && (
        <g stroke={edge} strokeWidth="1.2">
          <path d="M180 75V291M161 45 151 78 176 105M199 45 209 78 184 105M144 191H166V219H144ZM194 191H216V219H194ZM143 136 136 274M217 136 224 274" />
          <path d="M156 277H204" opacity="0.4" />
        </g>
      )}
      {kind === "trousers" && (
        <g stroke={edge} strokeWidth="1.2">
          <path d="M133 65H227M180 65V132M146 66 139 105 125 111M214 66 221 105 235 111M126 169H151V211H121M209 169H234L239 211H214M116 291 153 297M207 297 245 291" />
          <path d="M160 91 161 142M199 91 198 142" opacity="0.35" />
        </g>
      )}
      {kind === "tee" && (
        <g stroke={edge} strokeWidth="1.2">
          <path d="M148 67Q180 105 212 67M151 70Q180 112 209 70M140 271H220M83 133 112 153M248 153 277 133" />
          <path d="M149 143 146 249M211 143 214 249" opacity="0.3" />
        </g>
      )}
      {kind === "bag" && (
        <g stroke={edge} strokeWidth="1.2">
          <path
            d="M137 137V105C137 52 223 52 223 105V137"
            stroke={color}
            strokeWidth="13"
          />
          <path d="M137 137V105C137 52 223 52 223 105V137M110 155Q180 140 250 155M123 165 112 262M237 165 248 262M154 185H206V223H154Z" />
        </g>
      )}
    </svg>
  );
}
