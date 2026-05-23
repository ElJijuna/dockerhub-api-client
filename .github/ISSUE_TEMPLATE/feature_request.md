---
name: Feature request
about: Suggest a new endpoint or capability
labels: enhancement
---

## Which Docker Hub API endpoint should be added?

<!-- e.g. GET /repositories/{namespace}/{name}/images -->

## Use case

<!-- Why is this endpoint useful? What problem does it solve? -->

## Proposed API surface

```typescript
// How you'd like to call it
await hub.repository('myorg', 'myimage').images();
```
