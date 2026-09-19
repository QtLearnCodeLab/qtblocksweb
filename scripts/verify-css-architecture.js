#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const activeCss = [
  'css/tokens.css',
  'css/base.css',
  'css/workspace.css',
  'css/blockly-theme.css',
  'css/hardware.css',
  'css/navbar.css',
  'css/preview-drawer.css',
  'css/terminal-drawer.css',
  'css/modals.css',
  'css/prettify.min.css'
];
const activeSources = ['index.html', 'js/vanilla-core.js', 'js/qtblockpy.js', ...activeCss];
const removedAssets = [
  'css/bootstrap.min.3.3.6.css',
  'css/bootstrap.toggle.min.css',
  'css/qtblockpy.css',
  'js/bootstrap.min.3.3.6.js',
  'js/bootstrap.toggle.min.js',
  'js/microbit/bootstrap.min.js',
  'js/microbit/ie10-viewport-bug-workaround.js'
];
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

for (const relativePath of activeSources) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    errors.push(`Missing active source: ${relativePath}`);
  }
}

for (const relativePath of removedAssets) {
  if (fs.existsSync(path.join(root, relativePath))) {
    errors.push(`Removed dependency returned: ${relativePath}`);
  }
}

const index = read('index.html');
const requiredLinks = [
  'css/tokens.css',
  'css/base.css',
  'css/font-awesome.min.css',
  'css/workspace.css',
  'css/blockly-theme.css',
  'css/hardware.css',
  'css/navbar.css',
  'css/preview-drawer.css',
  'css/terminal-drawer.css',
  'css/modals.css'
];

for (const href of requiredLinks) {
  if (!index.includes(`href="${href}"`)) errors.push(`Missing stylesheet link: ${href}`);
}

const bannedPatterns = [
  [/bootstrap/i, 'framework reference'],
  [/data-(?:toggle|target|dismiss)=/i, 'framework data attribute'],
  [/(?:show|hidden)\.bs\.modal/i, 'framework dialog event'],
  [/\.bootstrapToggle\s*\(/, 'framework toggle API'],
  [/\.modal\s*\(/, 'framework dialog API'],
  [/\.tab\s*\(/, 'framework tab API']
];

for (const relativePath of activeSources) {
  const source = read(relativePath);
  for (const [pattern, label] of bannedPatterns) {
    if (pattern.test(source)) errors.push(`${label} found in ${relativePath}`);
  }
}

const css = activeCss.map(read).join('\n');
const definitions = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((match) => match[1]));
const usages = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/gi)].map((match) => match[1]));
for (const token of usages) {
  if (!definitions.has(token)) errors.push(`Undefined design token: ${token}`);
}

const navbarCss = read('css/navbar.css');
const stableUploadButton = [
  /\.btn-nav-flash\s*\{[\s\S]*?width:\s*34px;/,
  /\.btn-nav-flash\s*\{[\s\S]*?min-width:\s*34px;/,
  /\.btn-nav-flash\s*\{[\s\S]*?flex:\s*0 0 34px;/,
  /\.btn-nav-flash\s*\{[\s\S]*?transition:\s*none;/,
  /\.btn-nav-flash:hover\s*\{[\s\S]*?transform:\s*none\s*!important;/
];
if (stableUploadButton.some((pattern) => !pattern.test(navbarCss))) {
  errors.push('Upload button geometry guard is incomplete');
}

if (/survol|navbar-status-hint/.test(activeSources.map(read).join('\n'))) {
  errors.push('Legacy duplicate hover hint returned');
}

const localReferences = [...index.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => !/^(?:https?:|#|javascript:)/.test(reference));
for (const reference of localReferences) {
  const cleanReference = reference.split('?')[0];
  if (!fs.existsSync(path.join(root, cleanReference))) {
    errors.push(`Broken local reference: ${reference}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`CSS architecture verified: ${activeCss.length} stylesheets, ${definitions.size} tokens, ${localReferences.length} local references.`);
