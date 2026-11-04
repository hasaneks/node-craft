import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const read = (path) => readFileSync(join(ROOT, path), 'utf8');
export const exists = (path) => existsSync(join(ROOT, path));

/** Skill folder names under skills/. */
export function skillNames() {
  return readdirSync(join(ROOT, 'skills')).filter((name) => statSync(join(ROOT, 'skills', name)).isDirectory());
}

/** Every .md file under a folder, as paths relative to the repository root. */
export function markdownFiles(folder = '.') {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const path = join(dir, name);
      if (statSync(join(ROOT, path)).isDirectory()) walk(path);
      else if (name.endsWith('.md')) out.push(relative('.', path));
    }
  };
  walk(folder);
  return out;
}

/** Minimal frontmatter parser: flat `key: value` pairs, values optionally double-quoted. */
export function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split('\n')) {
    const pair = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!pair) continue;
    let value = pair[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = JSON.parse(value);
    data[pair[1]] = value;
  }
  return data;
}

/** Text without fenced code blocks, so example code does not count as links or headings. */
export function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}

/** Relative Markdown links `[text](target)`, without external URLs and mail links. */
export function links(text) {
  const out = [];
  for (const match of stripCode(text).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:)/.test(target)) continue;
    out.push(target);
  }
  return out;
}

/** GitHub-style heading anchor. */
export function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

/** Anchors of every heading in a Markdown text, with GitHub's -1, -2 suffixes for repeats. */
export function anchors(text) {
  const seen = new Map();
  const out = new Set();
  for (const match of stripCode(text).matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = slug(match[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    out.add(count ? `${base}-${count}` : base);
  }
  return out;
}

/** Resolve a link target written in `file` to a repository-relative path and optional anchor. */
export function resolveLink(file, target) {
  const [path, anchor] = target.split('#');
  const resolved = path ? relative(ROOT, resolve(ROOT, dirname(file), path)) : file;
  return { path: resolved, anchor };
}
