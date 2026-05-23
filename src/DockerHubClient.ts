import { DockerHubApiError } from './errors/DockerHubApiError';
import { RepositoryResource } from './resources/RepositoryResource';
import { UserResource } from './resources/UserResource';
import type { DockerHubOrganization } from './domain/Organization';
import type { DockerHubSearchResult, DockerHubSearchParams } from './domain/Search';
import type { DockerHubPagedResponse, DockerHubPaginatedResponse } from './domain/Pagination';

const DEFAULT_API_URL = 'https://hub.docker.com/v2';

/**
 * Payload emitted on every HTTP request made by {@link DockerHubClient}.
 */
export interface RequestEvent {
  /** Full URL that was requested */
  url: string;
  /** HTTP method used */
  method: 'GET' | 'POST';
  /** Timestamp when the request started */
  startedAt: Date;
  /** Timestamp when the request finished (success or error) */
  finishedAt: Date;
  /** Total duration in milliseconds */
  durationMs: number;
  /** HTTP status code returned by the server, if a response was received */
  statusCode?: number;
  /** Error thrown, if the request failed */
  error?: Error;
}

/** Map of supported client events to their callback signatures */
export interface DockerHubClientEvents {
  request: (event: RequestEvent) => void;
}

/**
 * Constructor options for {@link DockerHubClient}.
 */
export interface DockerHubClientOptions {
  /**
   * JWT token obtained via {@link DockerHubClient.login} or a personal access token.
   * Sent as `Authorization: JWT <token>` on every request.
   */
  token?: string;
  /**
   * Base URL for the Docker Hub API (default: `'https://hub.docker.com/v2'`).
   * Override for private registries or mirrors.
   */
  apiUrl?: string;
}

/**
 * Main entry point for the Docker Hub REST API client.
 *
 * @example
 * ```typescript
 * import { DockerHubClient } from 'dockerhub-api-client';
 *
 * const hub = new DockerHubClient();
 *
 * // Get repository metadata
 * const repo = await hub.repository('library', 'nginx');
 *
 * // List tags
 * const { results } = await hub.repository('library', 'nginx').tags();
 *
 * // Search repositories
 * const results = await hub.search({ query: 'nginx', page_size: 10 });
 *
 * // Authenticated usage
 * const token = await hub.login('username', 'password');
 * const authedHub = new DockerHubClient({ token });
 * const user = await authedHub.user('username');
 * ```
 */
export class DockerHubClient {
  private readonly apiUrl: string;
  private readonly token?: string;
  private readonly listeners: Map<
    keyof DockerHubClientEvents,
    DockerHubClientEvents[keyof DockerHubClientEvents][]
  > = new Map();

  /**
   * @param options - Optional configuration for API URL and auth token
   */
  constructor(options: DockerHubClientOptions = {}) {
    this.apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
    this.token = options.token;
  }

  /**
   * Subscribes to a client event.
   *
   * @example
   * ```typescript
   * hub.on('request', (event) => {
   *   console.log(`${event.method} ${event.url} — ${event.durationMs}ms`);
   *   if (event.error) console.error('Request failed:', event.error);
   * });
   * ```
   */
  on<K extends keyof DockerHubClientEvents>(event: K, callback: DockerHubClientEvents[K]): this {
    const callbacks = this.listeners.get(event) ?? [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
    return this;
  }

  private emit<K extends keyof DockerHubClientEvents>(
    event: K,
    payload: Parameters<DockerHubClientEvents[K]>[0],
  ): void {
    const callbacks = this.listeners.get(event) ?? [];
    for (const cb of callbacks) {
      (cb as (p: typeof payload) => void)(payload);
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `JWT ${this.token}`;
    }
    return headers;
  }

  private async request<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = buildUrl(`${this.apiUrl}${path}`, params);
    const startedAt = new Date();
    let statusCode: number | undefined;
    try {
      const response = await fetch(url, { headers: this.buildHeaders(), signal });
      statusCode = response.status;
      if (!response.ok) {
        throw new DockerHubApiError(response.status, response.statusText);
      }
      const data = await response.json() as T;
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });
      return data;
    } catch (err) {
      const finishedAt = new Date();
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }

  private async requestList<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    signal?: AbortSignal,
  ): Promise<DockerHubPagedResponse<T>> {
    const raw = await this.request<DockerHubPaginatedResponse<T>>(path, params, signal);
    return {
      results: raw.results,
      count: raw.count,
      hasNextPage: raw.next !== null,
      nextPage: raw.next ? parseNextPage(raw.next) : undefined,
    };
  }

  private async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const startedAt = new Date();
    let statusCode: number | undefined;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal,
      });
      statusCode = response.status;
      if (!response.ok) {
        throw new DockerHubApiError(response.status, response.statusText);
      }
      const data = await response.json() as T;
      this.emit('request', {
        url,
        method: 'POST',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });
      return data;
    } catch (err) {
      const finishedAt = new Date();
      this.emit('request', {
        url,
        method: 'POST',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }

  /**
   * Returns a {@link RepositoryResource} for a given namespace and repository name,
   * providing access to metadata and image tags.
   *
   * The returned resource can be awaited directly to fetch repository metadata,
   * or chained to access nested resources.
   *
   * For official images, use `'library'` as the namespace (e.g. `hub.repository('library', 'nginx')`).
   *
   * @param namespace - The namespace (username or organization name)
   * @param name - The repository name
   * @returns A chainable repository resource
   *
   * @example
   * ```typescript
   * const repo = await hub.repository('library', 'nginx');
   * const tags = await hub.repository('library', 'nginx').tags({ page_size: 5 });
   * ```
   */
  repository(namespace: string, name: string): RepositoryResource {
    return new RepositoryResource(
      <T>(path: string, params?: Record<string, string | number | boolean>, signal?: AbortSignal) =>
        this.request<T>(path, params, signal),
      <T>(path: string, params?: Record<string, string | number | boolean>, signal?: AbortSignal) =>
        this.requestList<T>(path, params, signal),
      namespace,
      name,
    );
  }

  /**
   * Returns a {@link UserResource} for a given Docker Hub username, providing
   * access to the user's profile and their public repositories.
   *
   * The returned resource can be awaited directly to fetch the user profile,
   * or chained to access nested resources.
   *
   * @param username - The Docker Hub username
   * @returns A chainable user resource
   *
   * @example
   * ```typescript
   * const user  = await hub.user('johndoe');
   * const repos = await hub.user('johndoe').repositories();
   * ```
   */
  user(username: string): UserResource {
    return new UserResource(
      <T>(path: string, params?: Record<string, string | number | boolean>, signal?: AbortSignal) =>
        this.request<T>(path, params, signal),
      <T>(path: string, params?: Record<string, string | number | boolean>, signal?: AbortSignal) =>
        this.requestList<T>(path, params, signal),
      username,
    );
  }

  /**
   * Fetches a Docker Hub organization's profile.
   *
   * `GET /orgs/{orgname}`
   *
   * @param orgname - The organization name
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns The organization profile
   *
   * @example
   * ```typescript
   * const org = await hub.org('docker');
   * console.log(org.full_name);
   * ```
   */
  async org(orgname: string, signal?: AbortSignal): Promise<DockerHubOrganization> {
    return this.request<DockerHubOrganization>(`/orgs/${orgname}`, undefined, signal);
  }

  /**
   * Searches for repositories on Docker Hub.
   *
   * `GET /search/repositories`
   *
   * @param params - Search parameters (required: `query`)
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns A paged response of search results
   *
   * @example
   * ```typescript
   * const { results } = await hub.search({ query: 'nginx', page_size: 10 });
   * results.forEach(r => console.log(r.repo_name, r.pull_count));
   * ```
   */
  async search(
    params: DockerHubSearchParams,
    signal?: AbortSignal,
  ): Promise<DockerHubPagedResponse<DockerHubSearchResult>> {
    return this.requestList<DockerHubSearchResult>(
      '/search/repositories',
      params as unknown as Record<string, string | number | boolean>,
      signal,
    );
  }

  /**
   * Authenticates against Docker Hub and returns a JWT token.
   *
   * `POST /users/login`
   *
   * Pass the returned token to `new DockerHubClient({ token })` to make
   * authenticated requests.
   *
   * @param username - Docker Hub username
   * @param password - Docker Hub password or personal access token
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns A JWT token string
   *
   * @example
   * ```typescript
   * const token = await hub.login('myuser', 'mypassword');
   * const authedHub = new DockerHubClient({ token });
   * ```
   */
  async login(username: string, password: string, signal?: AbortSignal): Promise<string> {
    const result = await this.post<{ token: string }>(
      '/users/login',
      { username, password },
      signal,
    );
    return result.token;
  }
}

/**
 * Appends query parameters to a URL string, skipping `undefined` values.
 * @internal
 */
function buildUrl(base: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return base;
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return base;
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `${base}?${search.toString()}`;
}

/**
 * Extracts the page number from a Docker Hub `next` URL.
 *
 * Docker Hub `next` URL format:
 * `https://hub.docker.com/v2/repositories/library/nginx/tags?page=2&page_size=25`
 *
 * @internal
 */
function parseNextPage(nextUrl: string): number | undefined {
  try {
    const url = new URL(nextUrl);
    const page = url.searchParams.get('page');
    return page ? parseInt(page, 10) : undefined;
  } catch {
    return undefined;
  }
}
