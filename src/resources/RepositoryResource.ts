import type { DockerHubRepository, DockerHubRepositoriesParams } from '../domain/Repository';
import type { DockerHubTag, DockerHubTagsParams } from '../domain/Tag';
import type { DockerHubPagedResponse } from '../domain/Pagination';
import type { RequestFn, RequestListFn } from './types';

/**
 * Represents a Docker Hub image repository resource, providing access to
 * repository metadata and image tags.
 *
 * Implements `PromiseLike<DockerHubRepository>` so it can be awaited directly
 * to fetch repository metadata, while also exposing sub-resource methods.
 *
 * @example
 * ```typescript
 * // Await directly to get repository metadata
 * const repo = await hub.repository('library', 'nginx');
 *
 * // List tags
 * const tags = await hub.repository('library', 'nginx').tags();
 *
 * // List tags filtered by name prefix
 * const stable = await hub.repository('library', 'nginx').tags({ name: 'stable' });
 * ```
 */
export class RepositoryResource implements PromiseLike<DockerHubRepository> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly requestList: RequestListFn,
    private readonly namespace: string,
    private readonly name: string,
  ) {}

  /**
   * Allows the resource to be awaited directly, resolving with repository metadata.
   * Delegates to {@link RepositoryResource.get}.
   */
  then<TResult1 = DockerHubRepository, TResult2 = never>(
    onfulfilled?: ((value: DockerHubRepository) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches metadata for this repository.
   *
   * `GET /repositories/{namespace}/{name}`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns Repository metadata including pull count, star count, and description
   *
   * @example
   * ```typescript
   * const repo = await hub.repository('library', 'nginx').get();
   * console.log(repo.pull_count); // 1000000000
   * ```
   */
  async get(signal?: AbortSignal): Promise<DockerHubRepository> {
    return this.request<DockerHubRepository>(
      `/repositories/${this.namespace}/${this.name}`,
      undefined,
      signal,
    );
  }

  /**
   * Lists image tags for this repository.
   *
   * `GET /repositories/{namespace}/{name}/tags`
   *
   * @param params - Optional filters: `page`, `page_size`, `name`, `ordering`
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns A paged response of tags with per-platform image details
   *
   * @example
   * ```typescript
   * const { results } = await hub.repository('library', 'nginx').tags({ page_size: 10 });
   * results.forEach(t => console.log(t.name, t.digest));
   *
   * // Filter by name prefix
   * const stable = await hub.repository('library', 'nginx').tags({ name: 'stable' });
   * ```
   */
  async tags(
    params?: DockerHubTagsParams,
    signal?: AbortSignal,
  ): Promise<DockerHubPagedResponse<DockerHubTag>> {
    return this.requestList<DockerHubTag>(
      `/repositories/${this.namespace}/${this.name}/tags`,
      params as Record<string, string | number | boolean>,
      signal,
    );
  }
}

export type { DockerHubRepositoriesParams };
