# Noema Logo Assets

This folder contains the local source package for turning the current Noema logo into an SVG-based animation asset.

Files:
- `noema-logo-source.png`: exact copy of the current `app/icon.png`
- `noema-logo-exact.svg`: visually identical SVG wrapper that preserves the current logo as-is

Notes:
- The visible logo inside `noema-logo-exact.svg` is still the original raster artwork, embedded via an SVG `<image>` reference so the look stays exact.
- The SVG also includes hidden guide ids for later animation work:
  - `#noema-left-orbit`
  - `#noema-flow-path`
  - `#noema-right-node`
- If we later want path-lighting, ribbon deformation, or truly pixel-perfect per-layer animation, the next step is to replace the raster image with a traced layered vector version.
