# Eval results 2026-11-04-06-39

Agent model: sonnet · Judge model: sonnet · Repetitions with skills: 2 · Total cost: $1.35

| Scenario | Arm | Rep | Score | Forbidden violated | Skills loaded | Cost |
|---|---|---:|---:|---|---|---:|
| E01 Plain API with no client | baseline | 1 | 57% | none | none | $0.1988 |
| E01 Plain API with no client | skills | 1 | 93% | none | node-craft-init | $0.3392 |
| E01 Plain API with no client | skills | 2 | 93% | none | node-craft-init, node-craft | $0.3912 |
| E13 Failed migration and worker shutdown during deploy | baseline | 1 | 90% | none | none | $0.1092 |
| E13 Failed migration and worker shutdown during deploy | skills | 1 | 90% | none | none | $0.1646 |
| E13 Failed migration and worker shutdown during deploy | skills | 2 | 90% | none | none | $0.1446 |
