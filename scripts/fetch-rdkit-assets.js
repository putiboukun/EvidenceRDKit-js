#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const VERSION = process.argv[2] || '2024.3.5-1.0.0';
const CDN_BASE = `https://unpkg.com/@rdkit/rdkit@${VERSION}/dist/`;
const FILES = ['RDKit_minimal.js', 'RDKit_minimal.wasm'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fetchBuffer(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode, headers } = res;

        if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location && redirectCount < 5) {
          const redirected = new URL(headers.location, url).toString();
          res.resume();
          resolve(fetchBuffer(redirected, redirectCount + 1));
          return;
        }

        if (!statusCode || statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Request failed with status ${statusCode || 'unknown'} for ${url}`));
          res.resume();
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function download(fileName) {
  const url = `${CDN_BASE}${fileName}`;
  console.log(`Downloading ${url}`);
  const buffer = await fetchBuffer(url);
  const destPath = path.resolve(__dirname, '..', 'public', 'rdkit', fileName);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, buffer);
  console.log(`Saved ${fileName} (${buffer.length} bytes)`);
}

async function main() {
  for (const file of FILES) {
    await download(file);
  }
  console.log('RDKit assets downloaded to public/rdkit');
}

main().catch((error) => {
  console.error('Failed to fetch RDKit assets:', error);
  process.exitCode = 1;
});
