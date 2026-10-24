import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { brandIconPaths } from "../../src/lib/brand-icons";

const directory = "public/brand/icons";
await mkdir(directory, { recursive: true });
const entries = Object.entries(brandIconPaths);
const paths = (items: readonly string[]) =>
  items.map((d) => `<path d="${d}"/>`).join("");
const attributes =
  'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"';
const inline = (items: readonly string[], size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${attributes} aria-hidden="true">${paths(items)}</svg>`;
for (const [name, items] of entries) {
  await writeFile(
    `${directory}/${name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${attributes}><title>${name}</title>${paths(items)}</svg>\n`,
  );
}
await writeFile(
  `${directory}/manifest.json`,
  `${JSON.stringify(
    {
      name: "BLACK HEM / Cut",
      version: "0.1.0",
      viewBox: "0 0 24 24",
      strokeWidth: 1.5,
      icons: entries.map(([name]) => ({ name, file: `${name}.svg` })),
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  `${directory}/index.html`,
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BLACK HEM / Cut — Ícones</title><style>*{box-sizing:border-box}body{background:#080808;color:#ece9e2;font:14px Arial,sans-serif;margin:0;padding:clamp(24px,5vw,70px)}h1{font-size:clamp(30px,5vw,64px);font-weight:400;letter-spacing:-.05em}p{color:#96938d;line-height:1.7}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;background:#ece9e224;border:1px solid #ece9e224;margin-top:40px}article{background:#080808;padding:24px}figure{margin:0;display:flex;gap:24px;align-items:center;min-height:80px}figcaption{font-size:11px;color:#96938d}a{color:inherit;text-underline-offset:4px}a:focus-visible{outline:2px solid #ece9e2;outline-offset:5px}footer{margin-top:30px}svg{flex-shrink:0}</style><header><h1>BLACK HEM / Cut</h1><p>20 ícones originais · grade de 24 × 24 · traço de 1,5 px · cantos facetados.<br>Sem rotação funcional: a direção de cada símbolo mantém seu significado.</p></header><main>${entries.map(([name, items]) => `<article><a href="${name}.svg" download>${name}</a><figure>${[16, 20, 24, 32].map((size) => `<div>${inline(items, size)}<figcaption>${size}px</figcaption></div>`).join("")}</figure></article>`).join("")}</main><footer><a href="manifest.json">Manifesto da coleção</a></footer></html>`,
);

function sheet(showBrand: boolean) {
  const grid = entries
    .map(([name, items], index) => {
      const x = (index % 5) * 240;
      const y = 100 + Math.floor(index / 5) * 150;
      return `<g transform="translate(${x},${y})"><path d="M0 0H240M0 0V150" stroke="#ece9e224"/><text x="24" y="32" fill="#96938d" font-size="12">${name}</text>${[16, 20, 24, 32].map((size, i) => `<g transform="translate(${24 + i * 51},60) scale(${size / 24})" color="#ece9e2" ${attributes}>${paths(items)}</g><text x="${24 + i * 51}" y="120" fill="#96938d" font-size="9">${size}px</text>`).join("")}</g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="#080808"/><g font-family="Arial,sans-serif"><text x="24" y="48" fill="#ece9e2" font-size="30">${showBrand ? "BLACK HEM / Cut" : "Coleção de ícones"}</text><text x="24" y="76" fill="#96938d" font-size="12">Grade 24 × 24 · Terminais retos · Contornos facetados · Sem efeitos</text>${grid}</g></svg>`;
}
for (const [name, showBrand] of [
  ["collection", true],
  ["collection-no-brand", false],
] as const) {
  const svg = sheet(showBrand);
  await writeFile(`${directory}/${name}.svg`, svg);
  await sharp(Buffer.from(svg)).png().toFile(`${directory}/${name}.png`);
}
process.stdout.write(
  `Exported ${entries.length} original SVG icons, HTML gallery and two rendered sheets.\n`,
);
