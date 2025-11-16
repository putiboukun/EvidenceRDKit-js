const CDN_CANDIDATES = [
  // try common CDN paths (unversioned -> latest)
  "https://unpkg.com/@rdkit/rdkit/dist/",
  "https://cdn.jsdelivr.net/npm/@rdkit/rdkit/dist/",
  // a known recent version as a fallback
  "https://unpkg.com/@rdkit/rdkit@2024.3.5-1.0.0/dist/",
];

let rdkitPromise;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      // If the script already finished loading, resolve immediately
      if ((existing.getAttribute('data-loaded') || '') === 'true') {
        resolve();
      }
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

async function tryInitFromBase(base) {
  // base is the directory containing RDKit_minimal.js and RDKit_minimal.wasm
  const jsUrl = `${base}RDKit_minimal.js`;

  // If initRDKitModule already exists globally, try to initialize using this base
  if (typeof window.initRDKitModule === 'function') {
    try {
      const module = await window.initRDKitModule({
        locateFile: (file) => `${base}${file}`,
      });
      return module;
    } catch (e) {
      // fall through to try loading the script from this base
      console.warn('initRDKitModule present but initialization failed for base', base, e);
    }
  }

  // Load the JS from the CDN base then initialize
  await loadScript(jsUrl);

  if (typeof window.initRDKitModule !== 'function') {
    throw new Error(`initRDKitModule not found after loading ${jsUrl}`);
  }

  const module = await window.initRDKitModule({
    locateFile: (file) => `${base}${file}`,
  });
  return module;
}

export function loadRDKit() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('RDKit.js can only be loaded in the browser'));
  }

  if (window.__rdkitModule) {
    return Promise.resolve(window.__rdkitModule);
  }

  if (rdkitPromise) {
    return rdkitPromise;
  }

  rdkitPromise = (async () => {
    const errors = [];
    for (const base of CDN_CANDIDATES) {
      try {
        console.log(`Attempting to load RDKit from ${base}`);
        const module = await tryInitFromBase(base);
        if (module && typeof module.get_mol === 'function') {
          window.__rdkitModule = module;
          console.log('RDKit.js successfully loaded from', base);
          return module;
        }
        errors.push(new Error(`Invalid module from ${base}`));
      } catch (e) {
        console.warn(`Failed to initialize RDKit from ${base}:`, e?.message || e);
        errors.push(e instanceof Error ? e : new Error(String(e)));
      }
    }

    // All candidates failed
    rdkitPromise = undefined;
    const combined = new Error('Failed to load the RDKit.js library from CDN candidates. See console for details.');
    combined.cause = errors;
    throw combined;
  })();

  return rdkitPromise;
}
