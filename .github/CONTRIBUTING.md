# Contributing

Thank you for your interest in contributing to `dockerhub-api-client`!

## Development setup

```bash
git clone https://github.com/ElJijuna/dockerhub-api-client.git
cd dockerhub-api-client
npm install
```

## Running tests

```bash
npm test
npm run test:coverage
```

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automate releases via `semantic-release`.

| Prefix | What it does |
|--------|-------------|
| `feat:` | New feature → minor release |
| `fix:` | Bug fix → patch release |
| `docs:` | Documentation only |
| `chore:` | Maintenance, no release |
| `BREAKING CHANGE:` | Major release |

## Adding new endpoints

1. Add the domain type in `src/domain/`
2. Implement the method on the appropriate resource in `src/resources/`
3. Export any new public types from `src/index.ts`
4. Add tests in the corresponding `.test.ts` file
5. Update the README if a new endpoint was added

## Pull requests

- One feature or fix per PR
- All tests must pass (`npm test`)
- Follow the PR template
