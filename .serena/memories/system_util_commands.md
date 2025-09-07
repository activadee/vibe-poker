# System Utility Commands (Linux)

- Git
  - `git status`, `git switch -c <branch>`, `git add -p`, `git commit -m "..."`, `git push`
- Filesystem
  - `ls -la`, `cd <dir>`, `mkdir -p <dir>`, `rm -rf <path>` (careful)
- Search
  - `rg <pattern> <path>` — fast grep; use `-n` for line numbers, `-S` for literal.
  - `grep -R <pattern> .` — alternative if ripgrep unavailable.
- Node/NPM
  - `node -v`, `npm -v`, `npm ci` (clean install), `npm run <script>`
- Nx
  - `npx nx <target> <project>` — run a task.
  - `npx nx run-many -t <target> --projects <list>`
  - `npx nx graph` — dependency graph.
