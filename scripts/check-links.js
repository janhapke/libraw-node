#!/usr/bin/env node
// scripts/check-links.js
//
// T26: walks README.md and every docs/**/*.md file, finds every relative
// Markdown link and image (`[text](target)` / `![alt](target)`), and
// resolves `target` against the filesystem -- a bare path must exist as a
// file, and a `#fragment` (either alone, meaning "a heading in this same
// file", or appended to a path, meaning "a heading in that file") must
// match one of the target file's headings, slugified the same way GitHub
// renders heading anchors (lowercase, strip anything that isn't a word
// character/space/hyphen, spaces -> hyphens, duplicates suffixed -1/-2/...).
//
// Absolute URLs (http/https/mailto/etc.) and bare `#` anchors with no
// fragment are not checked -- only same-repo relative links are this
// script's job. Link/image syntax found inside fenced code blocks (```...```)
// is ignored, since those are examples, not real links.
//
// Usage: node scripts/check-links.js
// Prints "broken links: none" and exits 0 if everything resolves; otherwise
// lists every broken link (source file, line, target) and exits 1.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function listMarkdownFiles() {
  const files = [path.join(ROOT, 'README.md')];
  const docsDir = path.join(ROOT, 'docs');

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(full);
      }
    }
  }
  walk(docsDir);
  return files;
}

// Strips fenced code blocks (``` ... ```, any info string) so link-like
// syntax inside example code is never mistaken for a real link. Keeps line
// count identical (replaces each stripped line with an empty line) so
// reported line numbers for real matches stay accurate.
function stripFencedCodeBlocks(content) {
  const lines = content.split('\n');
  let inFence = false;
  let fenceMarker = null;
  for (let i = 0; i < lines.length; i++) {
    const fenceMatch = lines[i].match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0];
        lines[i] = '';
        continue;
      }
      // Only a matching-or-longer fence of the same character closes it.
      if (fenceMatch[1][0] === fenceMarker && fenceMatch[1].length >= 3) {
        inFence = false;
        fenceMarker = null;
        lines[i] = '';
        continue;
      }
    }
    if (inFence) lines[i] = '';
  }
  return lines.join('\n');
}

// GitHub-style heading slug: lowercase, strip anything that isn't a word
// character/space/hyphen, spaces -> hyphens. Inline code/emphasis markers
// (`` ` ``, `*`, `_` used as markdown syntax around the heading text) are
// stripped as ordinary punctuation by the same regex, matching how GitHub
// slugifies the *rendered* heading text.
function slugify(heading, seen) {
  let slug = heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]/g, '')
    .replace(/ /g, '-');
  const count = seen.get(slug) || 0;
  seen.set(slug, count + 1);
  if (count > 0) slug = `${slug}-${count}`;
  return slug;
}

const headingCache = new Map();

function headingSlugsFor(filePath) {
  if (headingCache.has(filePath)) return headingCache.get(filePath);
  let slugs;
  try {
    const content = stripFencedCodeBlocks(fs.readFileSync(filePath, 'utf8'));
    const seen = new Map();
    slugs = new Set();
    for (const line of content.split('\n')) {
      const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (m) slugs.add(slugify(m[2], seen));
    }
  } catch {
    slugs = null; // file unreadable; caller reports the missing-file error separately
  }
  headingCache.set(filePath, slugs);
  return slugs;
}

// Matches [text](target) and ![alt](target). `target` may carry a Markdown
// title after a space (`"..."`), which is stripped before resolving.
const LINK_RE = /!?\[[^\]]*\]\(([^)]+)\)/g;

function isExternal(target) {
  return /^([a-z][a-z0-9+.-]*:)/i.test(target); // any URI scheme (http:, https:, mailto:, data:, ...)
}

function main() {
  const files = listMarkdownFiles();
  const broken = [];

  for (const file of files) {
    const rawContent = fs.readFileSync(file, 'utf8');
    const scanContent = stripFencedCodeBlocks(rawContent);
    const lines = scanContent.split('\n');

    lines.forEach((line, idx) => {
      let match;
      LINK_RE.lastIndex = 0;
      while ((match = LINK_RE.exec(line))) {
        let target = match[1].trim();
        // Strip an optional Markdown title: (path "title") or (path 'title').
        target = target.replace(/\s+["'][^"']*["']$/, '');
        if (!target || isExternal(target)) continue;

        const [rawPath, ...fragParts] = target.split('#');
        const fragment = fragParts.length > 0 ? fragParts.join('#') : null;
        const lineNo = idx + 1;

        let targetFile;
        if (rawPath === '') {
          targetFile = file; // "#anchor" -- same file
        } else {
          const decoded = decodeURIComponent(rawPath);
          targetFile = path.resolve(path.dirname(file), decoded);
          if (!fs.existsSync(targetFile)) {
            broken.push({ file, line: lineNo, target, reason: 'not found' });
            continue;
          }
          if (fs.statSync(targetFile).isDirectory()) {
            if (fragment) {
              broken.push({ file, line: lineNo, target, reason: 'target is a directory, cannot have a heading anchor' });
            }
            continue; // a directory link (e.g. "./bench/") resolves by existing; no headings to check
          }
        }

        if (fragment !== null && fragment !== '') {
          if (!targetFile.endsWith('.md')) continue; // anchor check only meaningful for our own .md files
          const slugs = headingSlugsFor(targetFile);
          if (slugs && !slugs.has(fragment.toLowerCase())) {
            broken.push({
              file,
              line: lineNo,
              target,
              reason: `heading "#${fragment}" not found in ${path.relative(ROOT, targetFile)}`,
            });
          }
        }
      }
    });
  }

  if (broken.length === 0) {
    console.log('broken links: none');
    return;
  }

  console.log(`broken links: ${broken.length}`);
  for (const b of broken) {
    console.log(`  ${path.relative(ROOT, b.file)}:${b.line}: [${b.target}] -- ${b.reason}`);
  }
  process.exitCode = 1;
}

main();
