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

## GitHub Pages

Pushes to `next` or `main` run [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml), which builds with Yarn and deploys `dist/` via GitHub Actions.

1. Repo **Settings → Pages → Build and deployment → Source**: **GitHub Actions**
2. Site URL: `https://jemsukie.github.io/mit-102-midterm-project/`

The original vanilla HTML/JS lab remains in `../scheduler/`.
