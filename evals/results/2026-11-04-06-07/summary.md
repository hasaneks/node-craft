# Eval results 2026-11-04-06-07

Agent model: sonnet · Judge model: sonnet · Repetitions with skills: 2 · Total cost: $7.28

| Scenario | Arm | Rep | Score | Forbidden violated | Skills loaded | Cost |
|---|---|---:|---:|---|---|---:|
| E01 Plain API with no client | baseline | 1 | 79% | none | none | $0.1775 |
| E01 Plain API with no client | skills | 1 | 93% | none | node-craft-init, node-craft | $0.3265 |
| E01 Plain API with no client | skills | 2 | 93% | none | node-craft-init | $0.2259 |
| E02 Complex roles and admin domain | baseline | 1 | 50% | none | none | $0.132 |
| E02 Complex roles and admin domain | skills | 1 | 83% | none | node-craft, node-craft-arch, node-craft-init | $0.2282 |
| E02 Complex roles and admin domain | skills | 2 | 75% | none | node-craft-init, node-craft-arch | $0.204 |
| E03 Existing backend keeps its decisions | baseline | 1 | 93% | none | none | $0.1691 |
| E03 Existing backend keeps its decisions | skills | 1 | 93% | none | node-craft, node-craft-contract | $0.2088 |
| E03 Existing backend keeps its decisions | skills | 2 | 86% | none | node-craft, node-craft-contract | $0.233 |
| E04 Next.js client integration without mobile dependencies | baseline | 1 | 92% | none | none | $0.1141 |
| E04 Next.js client integration without mobile dependencies | skills | 1 | 100% | none | node-craft-contract | $0.1934 |
| E04 Next.js client integration without mobile dependencies | skills | 2 | 100% | none | node-craft-contract | $0.1935 |
| E05 Working together with an rn-craft React Native app | baseline | 1 | 100% | none | none | $0.4118 |
| E05 Working together with an rn-craft React Native app | skills | 1 | 100% | none | node-craft-contract, rn-craft-arch, node-craft-arch | $0.3233 |
| E05 Working together with an rn-craft React Native app | skills | 2 | 100% | none | node-craft-contract, rn-craft-arch, node-craft-arch | $0.3368 |
| E06 Turkish and unsupported locales | baseline | 1 | 100% | none | none | $0.2084 |
| E06 Turkish and unsupported locales | skills | 1 | 100% | none | node-craft-contract | $0.1398 |
| E06 Turkish and unsupported locales | skills | 2 | 100% | none | node-craft-contract | $0.1431 |
| E07 The same write delivered twice at the same time | baseline | 1 | 60% | none | none | $0.1059 |
| E07 The same write delivered twice at the same time | skills | 1 | 100% | none | node-craft-arch, node-craft-contract | $0.1827 |
| E07 The same write delivered twice at the same time | skills | 2 | 100% | none | node-craft-arch | $0.158 |
| E08 Accessing another tenant's resource | baseline | 1 | 100% | none | none | $0.1147 |
| E08 Accessing another tenant's resource | skills | 1 | 100% | none | node-craft-arch | $0.1925 |
| E08 Accessing another tenant's resource | skills | 2 | 100% | none | node-craft-arch | $0.1958 |
| E09 Out-of-order subscription webhooks | baseline | 1 | 67% | none | none | $0.1064 |
| E09 Out-of-order subscription webhooks | skills | 1 | 100% | none | node-craft-arch | $0.1546 |
| E09 Out-of-order subscription webhooks | skills | 2 | 100% | none | node-craft-arch | $0.1548 |
| E10 Language change before a queued notification | baseline | 1 | 80% | none | none | $0.0878 |
| E10 Language change before a queued notification | skills | 1 | 100% | none | node-craft-arch | $0.137 |
| E10 Language change before a queued notification | skills | 2 | 90% | none | none | $0.1386 |
| E11 Account switch and an old push token | baseline | 1 | 90% | none | none | $0.1208 |
| E11 Account switch and an old push token | skills | 1 | 100% | none | node-craft, node-craft-arch | $0.2728 |
| E11 Account switch and an old push token | skills | 2 | 100% | none | node-craft-arch | $0.1649 |
| E12 Old mobile client and a new API change | baseline | 1 | 90% | none | none | $0.1189 |
| E12 Old mobile client and a new API change | skills | 1 | 100% | none | node-craft-contract, node-craft-arch | $0.2088 |
| E12 Old mobile client and a new API change | skills | 2 | 100% | none | node-craft-contract | $0.2036 |
| E13 Failed migration and worker shutdown during deploy | baseline | 1 | 70% | none | none | $0.119 |
| E13 Failed migration and worker shutdown during deploy | skills | 1 | 90% | none | node-craft-ops, node-craft-arch | $0.1854 |
| E13 Failed migration and worker shutdown during deploy | skills | 2 | 90% | none | node-craft-ops, node-craft-arch | $0.1849 |
