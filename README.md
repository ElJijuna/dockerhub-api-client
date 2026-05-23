# dockerhub-api-client

[![CI](https://github.com/ElJijuna/dockerhub-api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/dockerhub-api-client/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dockerhub-api-client)](https://www.npmjs.com/package/dockerhub-api-client)
[![npm downloads/week](https://img.shields.io/npm/dw/dockerhub-api-client)](https://www.npmjs.com/package/dockerhub-api-client)
[![npm downloads/month](https://img.shields.io/npm/dm/dockerhub-api-client)](https://www.npmjs.com/package/dockerhub-api-client)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/dockerhub-api-client)](https://bundlephobia.com/package/dockerhub-api-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/dockerhub-api-client)](https://nodejs.org/)

TypeScript client for the [Docker Hub REST API](https://docs.docker.com/reference/api/hub/latest/). Query repository metadata, image tags, user profiles, organizations, and search — from **Node.js** or the **browser**. Fully typed, zero runtime dependencies.

---

## Installation

```bash
npm install dockerhub-api-client
```

---

## Quick start

```typescript
import { DockerHubClient } from 'dockerhub-api-client';

// Public API — no auth required
const hub = new DockerHubClient();

// Authenticated — required for private repos
const token = await hub.login('myuser', 'mypassword');
const authedHub = new DockerHubClient({ token });

// Custom API URL (mirrors / private registries)
const hub = new DockerHubClient({ apiUrl: 'https://hub.docker.com/v2' });
```

---

## API reference

### Repository metadata

```typescript
// Await directly — fetches repository metadata
const repo = await hub.repository('library', 'nginx');
const repo = await hub.repository('library', 'nginx').get(); // same

console.log(repo.name);         // 'nginx'
console.log(repo.namespace);    // 'library'
console.log(repo.description);  // 'Official build of Nginx.'
console.log(repo.pull_count);   // 1000000000
console.log(repo.star_count);   // 18000
console.log(repo.is_private);   // false
console.log(repo.last_updated); // '2024-01-01T00:00:00.000000Z'
```

> For official Docker Hub images (nginx, node, python, etc.) use `'library'` as the namespace.

### Image tags

```typescript
// List all tags (first page)
const { results, count, hasNextPage, nextPage } = await hub.repository('library', 'nginx').tags();

console.log(count);       // total tags
console.log(hasNextPage); // true
console.log(nextPage);    // 2

results.forEach(tag => {
  console.log(tag.name);         // 'latest', '1.25.3-alpine', ...
  console.log(tag.digest);       // 'sha256:abc123...'
  console.log(tag.full_size);    // compressed size in bytes
  console.log(tag.last_updated); // ISO timestamp
});

// Pagination
const page2 = await hub.repository('library', 'nginx').tags({ page: 2, page_size: 25 });

// Filter by name prefix
const alpine = await hub.repository('library', 'nginx').tags({ name: 'alpine' });

// Per-platform details
results.forEach(tag => {
  tag.images.forEach(img => {
    console.log(`${img.os}/${img.architecture}`); // 'linux/amd64', 'linux/arm64'
    console.log(img.digest);                      // platform-specific digest
    console.log(img.size);                        // uncompressed size in bytes
    console.log(img.status);                      // 'active'
  });
});
```

### User profile

```typescript
// Await directly — fetches user profile
const user = await hub.user('johndoe');
const user = await hub.user('johndoe').get(); // same

console.log(user.username);    // 'johndoe'
console.log(user.full_name);   // 'John Doe'
console.log(user.type);        // 'User'
console.log(user.date_joined); // '2023-01-01T00:00:00.000000Z'
```

### User repositories

```typescript
const { results, count } = await hub.user('johndoe').repositories();
const { results, count } = await hub.user('johndoe').repositories({ page_size: 25 });

console.log(`${count} total repositories`);
results.forEach(r => {
  console.log(r.name, r.pull_count, r.is_private);
});
```

### Organization

```typescript
const org = await hub.org('docker');

console.log(org.orgname);    // 'docker'
console.log(org.full_name);  // 'Docker, Inc.'
console.log(org.type);       // 'Organization'
```

### Search

```typescript
const { results, count, hasNextPage } = await hub.search({ query: 'nginx' });
const { results } = await hub.search({ query: 'nginx', page_size: 10 });
const { results } = await hub.search({ query: 'nginx', page: 2, page_size: 25 });

console.log(`${count} total results`);
results.forEach(r => {
  console.log(r.repo_name);          // 'library/nginx'
  console.log(r.short_description);  // 'Official build of Nginx.'
  console.log(r.is_official);        // true
  console.log(r.star_count);         // 18000
  console.log(r.pull_count);         // 1000000000
});
```

### Authentication

```typescript
// Obtain a JWT token from username + password (or personal access token)
const token = await hub.login('myuser', 'mypassword');

// Pass it to a new client instance
const authedHub = new DockerHubClient({ token });

// All subsequent requests include: Authorization: JWT <token>
const privateRepo = await authedHub.repository('myorg', 'private-image').get();
```

---

## Chainable resource pattern

Every resource implements `PromiseLike`, so you can **await it directly** or **chain methods**:

```typescript
// Await directly → fetches repository metadata
const repo = await hub.repository('library', 'nginx');

// Chain → fetches tags
const tags = await hub.repository('library', 'nginx').tags({ page_size: 5 });

// Await directly → fetches user profile
const user = await hub.user('johndoe');

// Chain → fetches their repositories
const repos = await hub.user('johndoe').repositories();
```

---

## Cancelling requests

Pass an `AbortSignal` to any method to cancel the in-flight request:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

await hub.repository('library', 'nginx').get(controller.signal);
await hub.repository('library', 'nginx').tags({ page_size: 10 }, controller.signal);
await hub.user('johndoe').get(controller.signal);
await hub.user('johndoe').repositories({}, controller.signal);
await hub.org('docker', controller.signal);
await hub.search({ query: 'nginx' }, controller.signal);
await hub.login('user', 'pass', controller.signal);
```

When aborted, `fetch` throws a `DOMException` with `name === 'AbortError'`. The `request` event is still emitted with the error attached.

---

## Request events

Subscribe to every HTTP request for logging, monitoring, or debugging:

```typescript
hub.on('request', (event) => {
  console.log(`[${event.method}] ${event.url} → ${event.statusCode} (${event.durationMs}ms)`);
  if (event.error) {
    console.error('Request failed:', event.error.message);
  }
});
```

Supports method chaining: `hub.on('request', handler).on('request', anotherHandler)`.

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Full URL that was requested |
| `method` | `'GET' \| 'POST'` | HTTP method used |
| `startedAt` | `Date` | When the request started |
| `finishedAt` | `Date` | When the request finished |
| `durationMs` | `number` | Duration in milliseconds |
| `statusCode` | `number \| undefined` | HTTP status code, if a response was received |
| `error` | `Error \| undefined` | Present only if the request failed |

---

## Error handling

Non-2xx responses throw a `DockerHubApiError` with the HTTP status code and status text:

```typescript
import { DockerHubApiError } from 'dockerhub-api-client';

try {
  await hub.repository('library', 'nonexistent-image').get();
} catch (err) {
  if (err instanceof DockerHubApiError) {
    console.log(err.status);     // 404
    console.log(err.statusText); // 'Not Found'
    console.log(err.message);    // 'Docker Hub API error: 404 Not Found'
  }
}
```

---

## Pagination

All list methods return a `DockerHubPagedResponse<T>`:

```typescript
const page1 = await hub.repository('library', 'nginx').tags({ page_size: 25 });

console.log(page1.results);     // tag items on this page
console.log(page1.count);       // total number of tags across all pages
console.log(page1.hasNextPage); // true / false
console.log(page1.nextPage);    // 2 (page number), or undefined

// Fetch next page
if (page1.hasNextPage) {
  const page2 = await hub.repository('library', 'nginx').tags({
    page: page1.nextPage,
    page_size: 25,
  });
}

// Collect all pages
async function fetchAllTags(namespace: string, name: string) {
  const all = [];
  let page = 1;
  while (true) {
    const { results, hasNextPage } = await hub.repository(namespace, name).tags({ page, page_size: 100 });
    all.push(...results);
    if (!hasNextPage) break;
    page++;
  }
  return all;
}
```

---

## TypeScript types

All domain types are exported:

```typescript
import type {
  // Client
  DockerHubClientOptions,
  RequestEvent,
  DockerHubClientEvents,

  // Repository
  DockerHubRepository,
  DockerHubRepositoryPermissions,
  DockerHubRepositoriesParams,

  // Tags
  DockerHubTag,
  DockerHubImageDetail,
  DockerHubTagsParams,

  // User
  DockerHubUser,

  // Organization
  DockerHubOrganization,

  // Search
  DockerHubSearchResult,
  DockerHubSearchParams,

  // Pagination
  DockerHubPagedResponse,
  DockerHubPaginatedResponse,
} from 'dockerhub-api-client';
```

---

## Documentation

Full API documentation is published at:
**[https://eljijuna.github.io/dockerhub-api-client](https://eljijuna.github.io/dockerhub-api-client)**

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

---

## License

[MIT](LICENSE)
