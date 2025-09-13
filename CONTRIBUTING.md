Contributing Guide
==================

Thanks for your interest in contributing to ScrumPoker! This guide will help you get set up and make effective contributions.

Ground Rules
------------

- Be kind and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
- Write tests for changes and keep docs up to date.
- Prefer small, focused pull requests.
- Use clear commit messages and PR descriptions.

Local Development
-----------------

Prerequisites:

- Node.js 20.x and npm 10.x

Setup:

```sh
npm ci
```

Common tasks:

- Lint all projects: `npx nx run-many -t lint --all`
- Test all projects: `npx nx run-many -t test --all`
- Build all projects: `npx nx run-many -t build --all`
- Serve API locally: `npx nx serve api`
- Serve Web locally: `npx nx serve web`

Submitting Changes
------------------

1. Fork the repo and create a feature branch.
2. Make your changes with tests.
3. Run `npx nx run-many -t lint test build --all` and ensure everything passes.
4. Update relevant docs under `docs/` or app-specific `docs/` folders.
5. Open a pull request using the template and link related issues.

Issue Triage
------------

- Use the provided issue templates for bug reports and feature requests.
- Include reproduction steps and versions.

License
-------

By contributing, you agree that your contributions will be licensed under the terms of the [MIT License](LICENSE).

