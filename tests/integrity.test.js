import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  read,
  exists,
  skillNames,
  markdownFiles,
  frontmatter,
  stripCode,
  links,
  anchors,
  resolveLink,
} from './lib/markdown.js';

const SKILLS = skillNames();
const VERIFY_KINDS = ['lint', 'test', 'contract', 'measurement', 'review'];

// `node-craft-arch` → `references/auth.md` points into another skill; a bare `references/x.md` is local.
const CROSS_REF = /`(node-craft(?:-[a-z]+)?)`\s*→\s*`references\/([\w.-]+\.md)`/g;
const LOCAL_REF = /`references\/([\w.-]+\.md)`/g;

function referenceMentions(text) {
  const body = stripCode(text);
  const cross = [...body.matchAll(CROSS_REF)].map((m) => ({ skill: m[1], file: m[2] }));
  const local = [...body.replace(CROSS_REF, '').matchAll(LOCAL_REF)].map((m) => m[1]);
  return { cross, local };
}

describe('skills', () => {
  it('there are seven skills', () => {
    assert.deepEqual(SKILLS.sort(), [
      'node-craft',
      'node-craft-arch',
      'node-craft-contract',
      'node-craft-fix',
      'node-craft-init',
      'node-craft-ops',
      'node-craft-perf',
    ]);
  });

  for (const skill of SKILLS) {
    describe(skill, () => {
      const path = `skills/${skill}/SKILL.md`;
      const text = exists(path) ? read(path) : '';
      const meta = frontmatter(text);

      it('has SKILL.md with frontmatter', () => {
        assert.ok(text, `${path} is missing`);
        assert.ok(meta, `${path} has no frontmatter`);
      });

      it('name matches the folder', () => assert.equal(meta?.name, skill));

      it('description says when to use it and fits the 1024 character limit', () => {
        assert.ok(meta?.description, 'description is empty');
        assert.ok(meta.description.length <= 1024, `description is ${meta.description.length} characters`);
        assert.match(meta.description, /Use (it )?when/);
      });

      it('stays short; detail lives in references', () => {
        const lines = text.split('\n').length;
        assert.ok(lines <= 150, `${path} has ${lines} lines`);
      });

      it('every reference it names exists', () => {
        for (const file of referenceMentions(text).local) {
          assert.ok(exists(`skills/${skill}/references/${file}`), `${path} names missing references/${file}`);
        }
      });

      it('every reference file is named in SKILL.md', () => {
        const dir = join(ROOT, 'skills', skill, 'references');
        if (!existsSync(dir)) return;
        const named = new Set(referenceMentions(text).local);
        for (const file of readdirSync(dir)) {
          assert.ok(named.has(file), `skills/${skill}/references/${file} is never named in SKILL.md`);
        }
      });
    });
  }
});

describe('skill files stand alone', () => {
  const files = SKILLS.flatMap((skill) => markdownFiles(`skills/${skill}`));

  it('no skill file links outside its own skill folder', () => {
    for (const file of files) {
      const skill = file.split('/')[1];
      for (const target of links(read(file))) {
        const { path } = resolveLink(file, target);
        assert.ok(path.startsWith(`skills/${skill}/`), `${file} links outside its skill: ${target}`);
      }
      assert.doesNotMatch(stripCode(read(file)), /\.\.\/(node-craft|skills)/, `${file} uses a ../ path`);
    }
  });

  it('cross-skill mentions name a real skill and reference', () => {
    for (const file of files) {
      for (const { skill, file: ref } of referenceMentions(read(file)).cross) {
        assert.ok(SKILLS.includes(skill), `${file} names unknown skill ${skill}`);
        assert.ok(exists(`skills/${skill}/references/${ref}`), `${file} names missing ${skill} → references/${ref}`);
      }
    }
  });

  it('references name only their own skill references or cross-skill mentions', () => {
    for (const file of files.filter((f) => f.includes('/references/'))) {
      const skill = file.split('/')[1];
      for (const ref of referenceMentions(read(file)).local) {
        assert.ok(exists(`skills/${skill}/references/${ref}`), `${file} names missing references/${ref}`);
      }
    }
  });
});

describe('links', () => {
  for (const file of markdownFiles('.').filter((f) => !f.startsWith('evals/results/'))) {
    it(`${file}: relative links and anchors resolve`, () => {
      for (const target of links(read(file))) {
        const { path, anchor } = resolveLink(file, target);
        assert.ok(exists(path), `${file} → ${target}: ${path} does not exist`);
        if (anchor && path.endsWith('.md')) {
          assert.ok(anchors(read(path)).has(anchor), `${file} → ${target}: no heading #${anchor}`);
        }
      }
    });
  }
});

describe('no placeholders', () => {
  for (const file of markdownFiles('.').filter((f) => !f.startsWith('evals/results/'))) {
    it(file, () => {
      assert.doesNotMatch(stripCode(read(file)), /\b(TODO|TBD|FIXME)\b|lorem ipsum/);
    });
  }
});

describe('READMEs', () => {
  for (const file of ['README.md', 'README.tr.md']) {
    it(`${file} lists exactly the skills in skills/`, () => {
      const listed = new Set([...(exists(file) ? read(file) : '').matchAll(/\[`(node-craft(?:-[a-z]+)?)`\]\(skills\//g)].map((m) => m[1]));
      assert.deepEqual([...listed].sort(), [...SKILLS].sort());
    });
  }
});

describe('RULES.md', () => {
  const text = exists('RULES.md') ? read('RULES.md') : '';
  const rules = stripCode(text).split(/^### /m).slice(1);

  it('has rules', () => assert.ok(rules.length >= 20, `only ${rules.length} rules`));

  it('the README counts per verification kind match RULES.md', () => {
    const counts = Object.fromEntries(VERIFY_KINDS.map((kind) => [kind, 0]));
    for (const rule of rules) {
      const verify = /\*\*Verify:\*\*\s*([^\n]+)/.exec(rule)?.[1] ?? '';
      for (const kind of new Set([...verify.matchAll(/`([a-z]+)`/g)].map((m) => m[1]))) {
        if (kind in counts) counts[kind]++;
      }
    }
    for (const file of ['README.md', 'README.tr.md']) {
      const readme = exists(file) ? read(file) : '';
      for (const kind of VERIFY_KINDS) {
        const row = new RegExp(`^\\|\\s*\`${kind}\`[^|]*\\|\\s*(\\d+)\\s*\\|`, 'm').exec(readme);
        assert.equal(Number(row?.[1]), counts[kind], `${file}: ${kind}`);
      }
      assert.match(readme, new RegExp(`\\b${rules.length}\\b`), `${file} states the rule total`);
    }
  });

  for (const rule of rules) {
    const id = rule.split('\n')[0].trim();
    it(id, () => {
      assert.match(id, /^[a-z0-9-]+$/, 'rule ids are kebab-case');
      for (const field of ['Rule', 'Why', 'How', 'Verify', 'Exceptions', 'Skill']) {
        assert.match(rule, new RegExp(`\\*\\*${field}:\\*\\*`), `missing **${field}:**`);
      }
      const verify = /\*\*Verify:\*\*\s*([^\n]+)/.exec(rule)[1];
      const kinds = [...verify.matchAll(/`([a-z]+)`/g)].map((m) => m[1]).filter((k) => VERIFY_KINDS.includes(k));
      assert.ok(kinds.length, `Verify must name one of ${VERIFY_KINDS.join(', ')}`);
      const skill = /\*\*Skill:\*\*\s*`(node-craft(?:-[a-z]+)?)`(?:\s*→\s*`references\/([\w.-]+\.md)`)?/.exec(rule);
      assert.ok(skill, 'Skill must name a skill');
      assert.ok(SKILLS.includes(skill[1]), `unknown skill ${skill[1]}`);
      if (skill[2]) assert.ok(exists(`skills/${skill[1]}/references/${skill[2]}`), `missing ${skill[2]}`);
    });
  }
});

const SCENARIOS = existsSync(join(ROOT, 'evals/scenarios'))
  ? readdirSync(join(ROOT, 'evals/scenarios')).filter((f) => f.endsWith('.md'))
  : [];

describe('eval scenarios', () => {
  it('there are at least thirteen', () => assert.ok(SCENARIOS.length >= 13, `${SCENARIOS.length} scenarios`));

  for (const file of SCENARIOS) {
    it(file, () => {
      const text = read(`evals/scenarios/${file}`);
      const meta = frontmatter(text);
      assert.ok(meta, 'frontmatter');
      assert.equal(meta.id, file.split('-')[0], 'id matches the file name');
      for (const skill of meta.skills.split(',').map((s) => s.trim())) {
        assert.ok(SKILLS.includes(skill), `unknown skill ${skill}`);
      }
      for (const section of ['Prompt', 'Expected', 'Forbidden', 'Rubric']) {
        assert.match(text, new RegExp(`^## ${section}$`, 'm'), `missing ## ${section}`);
      }
    });
  }
});

describe('requirements coverage', () => {
  const text = exists('docs/requirements-coverage.md') ? read('docs/requirements-coverage.md') : '';
  const rows = text
    .split('\n')
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => line.split('|').map((cell) => cell.trim()));
  const ids = new Set(SCENARIOS.map((f) => f.split('-')[0]));

  it('covers sections 1-34 exactly once', () => {
    const numbers = rows.map((cells) => Number(cells[1]));
    assert.deepEqual(numbers, Array.from({ length: 34 }, (_, i) => i + 1));
  });

  for (const cells of rows) {
    it(`section ${cells[1]} points to real files and checks`, () => {
      const row = cells.join('|');
      assert.ok(links(row).length, 'no file link');
      const verify = cells[4] ?? '';
      assert.ok(VERIFY_KINDS.some((kind) => verify.includes(`\`${kind}\``)), 'no verification kind');
      for (const id of row.matchAll(/\b(E\d{2})\b/g)) assert.ok(ids.has(id[1]), `unknown eval ${id[1]}`);
    });
  }
});
