#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get git commit hash (short)
let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch (err) {
  console.warn('Could not get git commit hash:', err.message);
}

// Get build timestamp
const buildTime = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

// Build info string
const buildInfo = `build ${commitHash} • ${buildTime}`;

// Replace in main.js (where the actual constant is)
const mainJsPath = path.join(__dirname, '../dist-demo/main.js');
let mainJs = fs.readFileSync(mainJsPath, 'utf-8');
mainJs = mainJs.replace('__BUILD_INFO__', buildInfo);
fs.writeFileSync(mainJsPath, mainJs, 'utf-8');

console.log(`✓ Injected build info: ${buildInfo}`);
