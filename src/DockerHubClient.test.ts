import { DockerHubClient, DockerHubApiError } from './index';
import type { DockerHubRepository } from './index';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
  });
}

const repoFixture: DockerHubRepository = {
  user: 'library',
  name: 'nginx',
  namespace: 'library',
  repository_type: 'image',
  status: 1,
  status_description: 'active',
  description: 'Official build of Nginx.',
  is_private: false,
  is_automated: false,
  can_edit: false,
  star_count: 18000,
  pull_count: 1000000000,
  last_updated: '2024-01-01T00:00:00.000000Z',
  date_registered: '2013-01-01T00:00:00.000000Z',
  collaborator_count: 0,
  affiliation: '',
  hub_user: 'library',
  has_starred: false,
  full_description: 'Full description',
  permissions: { read: true, write: false, admin: false },
  media_types: ['application/vnd.docker.distribution.manifest.list.v2+json'],
  content_types: ['image'],
};

const tagFixture = {
  creator: 1156886,
  id: 12345,
  images: [
    {
      architecture: 'amd64',
      features: '',
      variant: null,
      digest: 'sha256:abc123',
      os: 'linux',
      os_features: '',
      os_version: null,
      size: 54789012,
      status: 'active',
      last_pulled: null,
      last_pushed: null,
    },
  ],
  last_updated: '2024-01-01T00:00:00.000000Z',
  last_updater: 1156886,
  last_updater_username: 'donotuse',
  name: 'latest',
  repository: 16353,
  full_size: 54789012,
  v2: true,
  tag_status: 'active',
  tag_last_pulled: null,
  tag_last_pushed: null,
  media_type: 'application/vnd.docker.distribution.manifest.list.v2+json',
  content_type: 'image',
  digest: 'sha256:abc123',
};

describe('DockerHubClient', () => {
  let hub: DockerHubClient;

  beforeEach(() => {
    mockFetch.mockClear();
    hub = new DockerHubClient();
  });

  describe('constructor', () => {
    it('uses default API URL', () => {
      const client = new DockerHubClient();
      expect(client).toBeInstanceOf(DockerHubClient);
    });

    it('accepts custom API URL', () => {
      const client = new DockerHubClient({ apiUrl: 'https://registry.example.com/v2' });
      expect(client).toBeInstanceOf(DockerHubClient);
    });

    it('strips trailing slash from apiUrl', async () => {
      const client = new DockerHubClient({ apiUrl: 'https://hub.docker.com/v2/' });
      mockResponse(repoFixture);
      await client.repository('library', 'nginx').get();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hub.docker.com/v2/repositories/library/nginx',
        expect.any(Object),
      );
    });
  });

  describe('repository()', () => {
    it('returns a RepositoryResource', () => {
      const repo = hub.repository('library', 'nginx');
      expect(repo).toBeDefined();
      expect(typeof repo.get).toBe('function');
      expect(typeof repo.tags).toBe('function');
    });

    it('can be awaited directly (repository metadata)', async () => {
      mockResponse(repoFixture);
      const result = await hub.repository('library', 'nginx');
      expect(result.name).toBe('nginx');
      expect(result.namespace).toBe('library');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hub.docker.com/v2/repositories/library/nginx',
        expect.any(Object),
      );
    });

    it('.get() fetches repository metadata', async () => {
      mockResponse(repoFixture);
      const result = await hub.repository('library', 'nginx').get();
      expect(result.pull_count).toBe(1000000000);
      expect(result.star_count).toBe(18000);
    });

    it('.tags() lists tags', async () => {
      mockResponse({
        count: 1,
        next: null,
        previous: null,
        results: [tagFixture],
      });
      const result = await hub.repository('library', 'nginx').tags();
      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('latest');
      expect(result.hasNextPage).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hub.docker.com/v2/repositories/library/nginx/tags',
        expect.any(Object),
      );
    });

    it('.tags() passes query params', async () => {
      mockResponse({ count: 1, next: null, previous: null, results: [tagFixture] });
      await hub.repository('library', 'nginx').tags({ page: 2, page_size: 10, name: 'stable' });
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('page=2');
      expect(url).toContain('page_size=10');
      expect(url).toContain('name=stable');
    });

    it('.tags() parses nextPage from next URL', async () => {
      mockResponse({
        count: 100,
        next: 'https://hub.docker.com/v2/repositories/library/nginx/tags?page=2&page_size=25',
        previous: null,
        results: [tagFixture],
      });
      const result = await hub.repository('library', 'nginx').tags();
      expect(result.hasNextPage).toBe(true);
      expect(result.nextPage).toBe(2);
    });

    it('throws DockerHubApiError on non-2xx response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      await expect(hub.repository('library', 'nonexistent').get()).rejects.toThrow(DockerHubApiError);
    });
  });

  describe('user()', () => {
    const userFixture = {
      id: 'abc123',
      uuid: 'abc123',
      username: 'johndoe',
      full_name: 'John Doe',
      location: 'San Francisco',
      company: 'Acme Inc',
      profile_url: '',
      date_joined: '2015-01-01T00:00:00.000000Z',
      gravatar_url: '',
      gravatar_email: '',
      type: 'User' as const,
    };

    it('returns a UserResource', () => {
      const user = hub.user('johndoe');
      expect(user).toBeDefined();
      expect(typeof user.get).toBe('function');
      expect(typeof user.repositories).toBe('function');
    });

    it('can be awaited directly (user profile)', async () => {
      mockResponse(userFixture);
      const result = await hub.user('johndoe');
      expect(result.username).toBe('johndoe');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hub.docker.com/v2/users/johndoe',
        expect.any(Object),
      );
    });

    it('.repositories() lists user repositories', async () => {
      mockResponse({ count: 1, next: null, previous: null, results: [repoFixture] });
      const result = await hub.user('johndoe').repositories();
      expect(result.results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hub.docker.com/v2/repositories/johndoe/',
        expect.any(Object),
      );
    });
  });

  describe('org()', () => {
    const orgFixture = {
      id: 'org123',
      uuid: 'org123',
      orgname: 'docker',
      full_name: 'Docker, Inc.',
      location: 'San Francisco',
      company: 'Docker',
      profile_url: '',
      date_joined: '2013-01-01T00:00:00.000000Z',
      gravatar_url: '',
      gravatar_email: '',
      type: 'Organization' as const,
    };

    it('fetches organization profile', async () => {
      mockResponse(orgFixture);
      const result = await hub.org('docker');
      expect(result.orgname).toBe('docker');
      expect(result.type).toBe('Organization');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hub.docker.com/v2/orgs/docker',
        expect.any(Object),
      );
    });
  });

  describe('search()', () => {
    const searchResultFixture = {
      repo_name: 'library/nginx',
      short_description: 'Official build of Nginx.',
      is_official: true,
      is_automated: false,
      star_count: 18000,
      pull_count: 1000000000,
    };

    it('calls the search endpoint with query params', async () => {
      mockResponse({ count: 1, next: null, previous: null, results: [searchResultFixture] });
      const result = await hub.search({ query: 'nginx', page_size: 10 });
      expect(result.count).toBe(1);
      expect(result.results[0].repo_name).toBe('library/nginx');
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/search/repositories');
      expect(url).toContain('query=nginx');
      expect(url).toContain('page_size=10');
    });

    it('returns hasNextPage=false when no next page', async () => {
      mockResponse({ count: 1, next: null, previous: null, results: [searchResultFixture] });
      const result = await hub.search({ query: 'nginx' });
      expect(result.hasNextPage).toBe(false);
      expect(result.nextPage).toBeUndefined();
    });
  });

  describe('login()', () => {
    it('POSTs credentials and returns the token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ token: 'my-jwt-token' }),
      });
      const token = await hub.login('myuser', 'mypassword');
      expect(token).toBe('my-jwt-token');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://hub.docker.com/v2/users/login');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ username: 'myuser', password: 'mypassword' });
    });

    it('throws DockerHubApiError on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn(),
      });
      await expect(hub.login('wrong', 'creds')).rejects.toThrow(DockerHubApiError);
    });
  });

  describe('on() event emitter', () => {
    it('emits request events on successful GET requests', async () => {
      mockResponse(repoFixture);
      const events: unknown[] = [];
      hub.on('request', (e) => events.push(e));
      await hub.repository('library', 'nginx').get();
      expect(events).toHaveLength(1);
      const event = events[0] as { url: string; method: string; statusCode: number };
      expect(event.url).toBe('https://hub.docker.com/v2/repositories/library/nginx');
      expect(event.method).toBe('GET');
      expect(event.statusCode).toBe(200);
    });

    it('emits request events with error on failed requests', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found', json: jest.fn() });
      const events: unknown[] = [];
      hub.on('request', (e) => events.push(e));
      await expect(hub.repository('library', 'nonexistent').get()).rejects.toThrow(DockerHubApiError);
      expect(events).toHaveLength(1);
      const event = events[0] as { error: Error };
      expect(event.error).toBeInstanceOf(DockerHubApiError);
    });

    it('supports method chaining', () => {
      const result = hub.on('request', () => undefined);
      expect(result).toBe(hub);
    });

    it('emits POST events on login()', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ token: 'tok' }),
      });
      const events: unknown[] = [];
      hub.on('request', (e) => events.push(e));
      await hub.login('user', 'pass');
      const event = events[0] as { method: string };
      expect(event.method).toBe('POST');
    });
  });

  describe('Authorization header', () => {
    it('does not send Authorization header when no token', async () => {
      mockResponse(repoFixture);
      await hub.repository('library', 'nginx').get();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('sends JWT token when provided', async () => {
      const client = new DockerHubClient({ token: 'my-jwt-token' });
      mockResponse(repoFixture);
      await client.repository('library', 'nginx').get();
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['Authorization']).toBe('JWT my-jwt-token');
    });
  });

  describe('AbortSignal', () => {
    it('passes signal to fetch on repository.get()', async () => {
      mockResponse(repoFixture);
      const controller = new AbortController();
      await hub.repository('library', 'nginx').get(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('passes signal to fetch on search()', async () => {
      mockResponse({ count: 0, next: null, previous: null, results: [] });
      const controller = new AbortController();
      await hub.search({ query: 'nginx' }, controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('propagates AbortError and still emits request event', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);
      const controller = new AbortController();
      const events: unknown[] = [];
      hub.on('request', (e) => events.push(e));
      await expect(hub.repository('library', 'nginx').get(controller.signal)).rejects.toThrow('The operation was aborted.');
      expect(events).toHaveLength(1);
      const event = events[0] as { error: Error };
      expect(event.error).toBeInstanceOf(Error);
    });
  });

  describe('DockerHubApiError', () => {
    it('has correct status and statusText', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn(),
      });
      try {
        await hub.repository('library', 'nonexistent').get();
      } catch (err) {
        expect(err).toBeInstanceOf(DockerHubApiError);
        if (err instanceof DockerHubApiError) {
          expect(err.status).toBe(404);
          expect(err.statusText).toBe('Not Found');
          expect(err.message).toBe('Docker Hub API error: 404 Not Found');
        }
      }
    });
  });
});
