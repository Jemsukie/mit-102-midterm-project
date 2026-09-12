# MIT102 · CPU Scheduler (React + TypeScript)

Vite + React + TypeScript port of the midterms scheduling lab (FCFS / SJF / Priority + Round Robin).

## Setup

```bash
yarn install
yarn dev
```

```bash
yarn build
yarn preview
```

Uses Yarn 4 (`.yarn/releases/`). `node_modules/` is gitignored.

## Routes

| Path | Page |
|------|------|
| `/` | Non-preemptive (FCFS · SJF · Priority) |
| `/round-robin` | Round Robin |

The original vanilla HTML/JS lab remains in `../scheduler/`.
