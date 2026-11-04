# Eval results 2026-11-04-06-18

Agent model: sonnet · Judge model: sonnet · Repetitions with skills: 2 · Total cost: $5.36

| Scenario | Arm | Rep | Score | Forbidden violated | Skills loaded | Cost |
|---|---|---:|---:|---|---|---:|
| E01 Plain API with no client | skills | 1 | 86% | none | node-craft-init | $0.2186 |
| E01 Plain API with no client | skills | 2 | 93% | none | node-craft, node-craft-init | $0.3372 |
| E02 Complex roles and admin domain | skills | 1 | 92% | none | node-craft-init, node-craft-arch | $0.2137 |
| E02 Complex roles and admin domain | skills | 2 | 83% | none | node-craft-arch, node-craft-init | $0.2023 |
| E03 Existing backend keeps its decisions | skills | 1 | 93% | none | node-craft | $0.2255 |
| E03 Existing backend keeps its decisions | skills | 2 | 93% | none | node-craft | $0.2112 |
| E04 Next.js client integration without mobile dependencies | skills | 1 | 100% | none | node-craft-contract | $0.2021 |
| E04 Next.js client integration without mobile dependencies | skills | 2 | 100% | none | node-craft-contract | $0.199 |
| E05 Working together with an rn-craft React Native app | skills | 1 | 100% | none | node-craft-contract, rn-craft-arch, node-craft-arch | $0.4004 |
| E05 Working together with an rn-craft React Native app | skills | 2 | 100% | none | node-craft-contract, rn-craft-arch, node-craft-arch | $0.3996 |
| E06 Turkish and unsupported locales | skills | 1 | 100% | none | node-craft-contract | $0.1459 |
| E06 Turkish and unsupported locales | skills | 2 | 100% | none | node-craft-contract | $0.1495 |
| E07 The same write delivered twice at the same time | skills | 1 | 100% | none | node-craft-arch, node-craft-contract | $0.1813 |
| E07 The same write delivered twice at the same time | skills | 2 | 100% | none | node-craft-arch | $0.1568 |
| E08 Accessing another tenant's resource | skills | 1 | 100% | none | node-craft-arch | $0.1884 |
| E08 Accessing another tenant's resource | skills | 2 | 100% | none | node-craft-arch | $0.2081 |
| E09 Out-of-order subscription webhooks | skills | 1 | 100% | none | node-craft-arch | $0.1479 |
| E09 Out-of-order subscription webhooks | skills | 2 | 92% | none | node-craft-arch | $0.1527 |
| E10 Language change before a queued notification | skills | 1 | 100% | none | node-craft-arch | $0.1441 |
| E10 Language change before a queued notification | skills | 2 | 100% | none | node-craft-arch | $0.1345 |
| E11 Account switch and an old push token | skills | 1 | 100% | none | node-craft, node-craft-arch | $0.2062 |
| E11 Account switch and an old push token | skills | 2 | 100% | none | node-craft-arch | $0.2005 |
| E12 Old mobile client and a new API change | skills | 1 | 100% | none | node-craft-contract | $0.1988 |
| E12 Old mobile client and a new API change | skills | 2 | 100% | none | node-craft-contract | $0.2049 |
| E13 Failed migration and worker shutdown during deploy | skills | 1 | 90% | none | node-craft-ops, node-craft-arch | $0.1747 |
| E13 Failed migration and worker shutdown during deploy | skills | 2 | 100% | none | node-craft-ops | $0.1555 |
