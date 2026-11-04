#!/usr/bin/env node
// Runs the task-based evals with the Claude Code CLI in headless mode.
//
//   node evals/run.mjs [--only E01,E05] [--reps 2] [--no-baseline] [--model sonnet] [--judge-model sonnet]
//                      [--concurrency 4] [--max-budget 3]
//
// Each scenario runs in a fresh temporary git repository. The "skills" arm gets this repository's skills in
// .claude/skills; the "baseline" arm gets none. Only project settings are loaded (--setting-sources project), so
// skills installed for the user do not leak into either arm. The agent may read files and load skills but cannot
// write files or run commands; it answers in its final message. A separate judge call scores the answer against the
// scenario's rubric and forbidden list without knowing which arm produced it.
//
// Scenarios marked `with_rn_craft: true` need the rn-craft skills: set RN_CRAFT_SKILLS to a folder that contains
// the rn-craft skill folders. Both arms get rn-craft, so the comparison isolates node-craft. Without it the
// scenario is reported as not run.

import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({
  options: {
    only: { type: 'string' },
    reps: { type: 'string', default: '2' },
    'no-baseline': { type: 'boolean', default: false },
    model: { type: 'string', default: 'sonnet' },
    'judge-model': { type: 'string', default: 'sonnet' },
    concurrency: { type: 'string', default: '4' },
    'max-budget': { type: 'string', default: '3' },
  },
});

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const workRoot = join(ROOT, 'evals', '.work', stamp);
const outDir = join(ROOT, 'evals', 'results', stamp);
mkdirSync(join(outDir, 'runs'), { recursive: true });

const SUFFIX = `

Answer in your final message. Do not create or edit files and do not run commands. If the working directory contains
a project, read it before answering. Be concrete: decisions with reasons, the files you would add or change, and the
key code or SQL.`;

function scenario(file) {
  const text = readFileSync(join(ROOT, 'evals', 'scenarios', file), 'utf8');
  const meta = Object.fromEntries(
    /^---\n([\s\S]*?)\n---/.exec(text)[1].split('\n').map((line) => {
      const i = line.indexOf(':');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
  );
  const section = (name) => new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm').exec(text)?.[1].trim() ?? '';
  return {
    file,
    ...meta,
    prompt: section('Prompt'),
    expected: section('Expected'),
    forbidden: section('Forbidden'),
    rubric: section('Rubric'),
  };
}

/** Runs `claude -p` and returns the final result, cost and the skills the agent loaded. */
function claude(cwd, prompt, model, tools) {
  return new Promise((resolve) => {
    const argv = [
      '-p', prompt,
      '--model', model,
      '--output-format', 'stream-json',
      '--verbose',
      '--no-session-persistence',
      '--setting-sources', 'project',
      '--max-budget-usd', args['max-budget'],
      '--allowedTools', tools.join(','),
      '--disallowedTools', 'Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Agent',
    ];
    const child = spawn('claude', argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    let stderr = '';
    const skills = [];
    let result;
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (event.type === 'assistant') {
          for (const part of event.message?.content ?? []) {
            if (part.type === 'tool_use' && part.name === 'Skill') skills.push(part.input?.skill);
          }
        }
        if (event.type === 'result') result = event;
      }
    });
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) =>
      resolve({
        ok: code === 0 && result && !result.is_error,
        text: result?.result ?? '',
        cost: result?.total_cost_usd ?? 0,
        turns: result?.num_turns ?? 0,
        skills,
        error: code === 0 ? undefined : stderr.slice(-2000) || `exit ${code}`,
      }),
    );
  });
}

function workspace(s, arm, rep) {
  const dir = join(workRoot, `${s.id}-${arm}-${rep}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  if (s.setup && s.setup !== 'none') cpSync(join(ROOT, 'evals', 'fixtures', s.setup), dir, { recursive: true });
  writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
  const skillsDir = join(dir, '.claude', 'skills');
  mkdirSync(skillsDir, { recursive: true });
  if (arm === 'skills') cpSync(join(ROOT, 'skills'), skillsDir, { recursive: true });
  if (s.with_rn_craft === 'true') {
    for (const name of readdirSync(process.env.RN_CRAFT_SKILLS)) {
      cpSync(join(process.env.RN_CRAFT_SKILLS, name), join(skillsDir, name), { recursive: true });
    }
  }
  return dir;
}

async function judge(s, answer) {
  const dir = join(workRoot, `judge-${s.id}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  const prompt = `You are grading an answer from an AI coding agent. Be strict and fair. Grade only what the answer
says, not what it might have meant. The "What a good answer contains" section is the reference: an answer that
matches it is correct even if you would have designed it differently.

# Task given to the agent
${s.prompt}

# What a good answer contains
${s.expected}

# Forbidden decisions
${s.forbidden}

# Rubric (score each item 0 = missing or wrong, 1 = partly, 2 = fully and correctly)
${s.rubric}

# The agent's answer
<answer>
${answer}
</answer>

Reply with only a JSON object, no prose and no code fence:
{"rubric": {"R1": {"score": 0, "reason": "..."}, ...}, "forbidden": [{"item": "...", "violated": false, "evidence": "..."}], "summary": "one sentence"}
List every forbidden item in the order given.`;
  const res = await claude(dir, prompt, args['judge-model'], []);
  const json = /\{[\s\S]*\}/.exec(res.text)?.[0];
  try {
    return { ...JSON.parse(json), cost: res.cost };
  } catch {
    return { error: `judge output was not JSON: ${res.error ?? res.text.slice(0, 300)}`, cost: res.cost };
  }
}

async function runOne(s, arm, rep) {
  const label = `${s.id}-${arm}-${rep}`;
  if (s.with_rn_craft === 'true' && !(process.env.RN_CRAFT_SKILLS && existsSync(process.env.RN_CRAFT_SKILLS))) {
    return { id: s.id, arm, rep, status: 'not-run', reason: 'RN_CRAFT_SKILLS not set' };
  }
  const cwd = workspace(s, arm, rep);
  const started = Date.now();
  const res = await claude(cwd, s.prompt + SUFFIX, args.model, ['Read', 'Glob', 'Grep', 'Skill']);
  if (!res.ok) {
    const failed = { id: s.id, arm, rep, status: 'error', error: res.error, cost: res.cost };
    writeFileSync(join(outDir, 'runs', `${label}.json`), JSON.stringify(failed, null, 2));
    return failed;
  }
  const grade = await judge(s, res.text);
  const items = Object.values(grade.rubric ?? {});
  const max = items.length * 2;
  const score = items.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  const violations = (grade.forbidden ?? []).filter((f) => f.violated).map((f) => f.item);
  const record = {
    id: s.id,
    title: s.title,
    arm,
    rep,
    status: grade.error ? 'judge-error' : 'graded',
    score,
    max,
    percent: max ? Math.round((score / max) * 100) : null,
    violations,
    expectedSkills: s.skills.split(',').map((x) => x.trim()),
    loadedSkills: [...new Set(res.skills)],
    turns: res.turns,
    seconds: Math.round((Date.now() - started) / 1000),
    cost: Number((res.cost + (grade.cost ?? 0)).toFixed(4)),
    grade,
    answer: res.text,
  };
  writeFileSync(join(outDir, 'runs', `${label}.json`), JSON.stringify(record, null, 2));
  console.log(`${label}: ${record.status} ${record.percent ?? '-'}% violations=${violations.length} $${record.cost}`);
  return record;
}

async function pool(tasks, size) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < tasks.length) {
        const task = tasks[next++];
        results.push(await task());
      }
    }),
  );
  return results;
}

const only = args.only?.split(',');
const scenarios = readdirSync(join(ROOT, 'evals', 'scenarios'))
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map(scenario)
  .filter((s) => !only || only.includes(s.id));

const tasks = [];
for (const s of scenarios) {
  for (let rep = 1; rep <= Number(args.reps); rep++) tasks.push(() => runOne(s, 'skills', rep));
  if (!args['no-baseline']) tasks.push(() => runOne(s, 'baseline', 1));
}

const results = await pool(tasks, Number(args.concurrency));
results.sort((a, b) => a.id.localeCompare(b.id) || a.arm.localeCompare(b.arm) || a.rep - b.rep);

const total = results.reduce((sum, r) => sum + (r.cost ?? 0), 0);
const lines = [
  `# Eval results ${stamp}`,
  '',
  `Agent model: ${args.model} · Judge model: ${args['judge-model']} · Repetitions with skills: ${args.reps} · Total cost: $${total.toFixed(2)}`,
  '',
  '| Scenario | Arm | Rep | Score | Forbidden violated | Skills loaded | Cost |',
  '|---|---|---:|---:|---|---|---:|',
  ...results.map((r) =>
    r.status === 'graded'
      ? `| ${r.id} ${r.title} | ${r.arm} | ${r.rep} | ${r.percent}% | ${r.violations.join('; ') || 'none'} | ${r.loadedSkills.join(', ') || 'none'} | $${r.cost} |`
      : `| ${r.id} | ${r.arm} | ${r.rep} | ${r.status} | ${r.reason ?? r.error ?? ''} | | |`,
  ),
];
writeFileSync(join(outDir, 'summary.md'), lines.join('\n') + '\n');
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(results.map(({ answer, grade, ...r }) => r), null, 2));
console.log(`\nWrote ${join(outDir, 'summary.md')}`);
