# Local RDKit assets

This directory should contain `RDKit_minimal.js` and `RDKit_minimal.wasm` that are served with the built site so the browser can initialise RDKit without relying on a CDN at runtime.

Run `node scripts/fetch-rdkit-assets.js` (optionally with a version argument such as `node scripts/fetch-rdkit-assets.js 2024.3.5-1.0.0`) to download the current RDKit release into this folder.
