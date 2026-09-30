const fs = require('fs');
const path = require('path');

const inputJsPath = path.join(__dirname, 'tron', 'input.js');
let inputJs = fs.readFileSync(inputJsPath, 'utf8');

// 1. Replace export const canvas = renderer.domElement; with export let canvas;
inputJs = inputJs.replace("export const canvas = renderer.domElement;", "export let canvas;");

// 2. We need to collect all top level addEventListener and canvas setup and put them in initInput(renderer)
// I will just use string replacement to add initInput at the end, and comment out the top-level ones.
// Better yet, I'll extract them.

const lines = inputJs.split('\n');

const listenersToMove = [
  "addEventListener('keydown', onDown, { passive: false, capture: true });",
  "addEventListener('keyup', onUp, { capture: true });",
  "addEventListener('blur', () => { for (const k in state.keys) state.keys[k] = false; if (!state.touchBlocking) state.player.blocking = false; });  // no stuck keys",
  "canvas.tabIndex = 0;",
  "canvas.style.outline = 'none';",
  "document.addEventListener('pointerlockerror', () => { if (!state.isTouchDevice) lockFailed = true; });",
  "canvas.addEventListener('click', () => { if (!state.isTouchDevice && state.running && !isLocked()) tryLock(); });",
  "addEventListener('contextmenu', e => e.preventDefault());",
  "window.addEventListener('touchstart', onTouchStart, { passive: false });",
  "window.addEventListener('touchmove', onTouchMove, { passive: false });",
  "window.addEventListener('touchend', onTouchEnd, { passive: false });",
  "window.addEventListener('touchcancel', onTouchEnd, { passive: false });",
  "bindMobileButtons();"
];

// For blocks, I'll identify their start and end.
// Block 1: canvas.addEventListener('mousedown'
// Block 2: document.addEventListener('pointerlockchange'
// Block 3: addEventListener('mousemove'
// Block 4: addEventListener('wheel'
// Block 5: addEventListener('mousedown'
// Block 6: addEventListener('mouseup'

const blocksToMove = [
  { start: "canvas.addEventListener('mousedown', () => {", end: "});" },
  { start: "document.addEventListener('pointerlockchange', () => {", end: "});" },
  { start: "addEventListener('mousemove', e => {", end: "});" },
  { start: "addEventListener('wheel', e => {", end: "}, { passive: true });" },
  { start: "addEventListener('mousedown', e => {", end: "});" },
  { start: "addEventListener('mouseup', e => {", end: "});" },
];

let extractedCode = [];
let insideBlock = false;
let currentBlock = null;
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let trimmed = line.trim();

  // skip the powershell mess up I made
  if (line.includes("// addEventListener('keydown', onDown... moved to initInput")) {
      extractedCode.push("addEventListener('keydown', onDown, { passive: false, capture: true });");
      continue;
  }

  if (listenersToMove.includes(trimmed)) {
    extractedCode.push(line);
    continue;
  }

  if (!insideBlock) {
    let matchedBlock = blocksToMove.find(b => line.startsWith(b.start));
    if (matchedBlock) {
      insideBlock = true;
      currentBlock = matchedBlock;
      extractedCode.push(line);
      continue;
    }
  } else {
    extractedCode.push(line);
    if (line.startsWith(currentBlock.end)) {
      insideBlock = false;
      currentBlock = null;
    }
    continue;
  }

  newLines.push(line);
}

const initInputFunc = `
export function initInput(renderer) {
  canvas = renderer.domElement;
  ${extractedCode.join('\n  ')}
}
`;

newLines.push(initInputFunc);

fs.writeFileSync(inputJsPath, newLines.join('\n'), 'utf8');

const mainJsPath = path.join(__dirname, 'tron', 'main.js');
let mainJs = fs.readFileSync(mainJsPath, 'utf8');

// Update main.js to import and call initInput
// In main.js: 
// import { ... tryLock ... } from './input.js';
// We need to add initInput to the import
if (!mainJs.includes('initInput')) {
  mainJs = mainJs.replace("import { EAT", "import { initInput, EAT");
}

// In main.js:
// document.addEventListener('DOMContentLoaded', () => {
//   try {
//     bindMainMenuEvents();
//     loop();
//   } catch (err) {
// ...
if (!mainJs.includes('initInput(')) {
  mainJs = mainJs.replace("bindMainMenuEvents();", "initInput(renderer);\n    bindMainMenuEvents();");
}

fs.writeFileSync(mainJsPath, mainJs, 'utf8');
console.log('Refactoring complete.');
