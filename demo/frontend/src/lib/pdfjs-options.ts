/** Local auxiliary resources must follow the deployed Vite base, including subpaths. */
export function pdfjsOptions() {
  const base = import.meta.env.BASE_URL
  return {
    wasmUrl: `${base}pdfjs/wasm/`,
    cMapUrl: `${base}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}pdfjs/standard_fonts/`,
  }
}
