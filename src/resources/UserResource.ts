import type { DockerHubUser } from '../domain/User';
import type { DockerHubRepository, DockerHubRepositoriesParams } from '../domain/Repository';
import type { DockerHubPagedResponse } from '../domain/Pagination';
import type { RequestFn, RequestListFn } from './types';

/**
 * Represents a Docker Hub user resource, providing access to the user's
 * profile and their public repositories.
 *
 * Implements `PromiseLike<DockerHubUser>` so it can be awaited directly to
 * fetch the user profile, while also exposing sub-resource methods.
 *
 * @example
 * ```typescript
 * // Await directly to get user profile
 * const user = await hub.user('johndoe');
 *
 * // List user's repositories
 * const repos = await hub.user('johndoe').repositories();
 * ```
 */
export class UserResource implements PromiseLike<DockerHubUser> {
  /** @internal */
  constructor(
    private readonly request: RequestFn,
    private readonly requestList: RequestListFn,
    private readonly username: string,
  ) {}

  /**
   * Allows the resource to be awaited directly, resolving with the user profile.
   * Delegates to {@link UserResource.get}.
   */
  then<TResult1 = DockerHubUser, TResult2 = never>(
    onfulfilled?: ((value: DockerHubUser) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.get().then(onfulfilled, onrejected);
  }

  /**
   * Fetches this user's profile.
   *
   * `GET /users/{username}`
   *
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns The user profile
   *
   * @example
   * ```typescript
   * const user = await hub.user('johndoe').get();
   * console.log(user.full_name);
   * ```
   */
  async get(signal?: AbortSignal): Promise<DockerHubUser> {
    return this.request<DockerHubUser>(`/users/${this.username}`, undefined, signal);
  }

  /**
   * Lists public repositories owned by this user.
   *
   * `GET /repositories/{username}/`
   *
   * @param params - Optional filters: `page`, `page_size`, `ordering`
   * @param signal - Optional `AbortSignal` to cancel the request
   * @returns A paged response of repositories
   *
   * @example
   * ```typescript
   * const { results } = await hub.user('johndoe').repositories({ page_size: 25 });
   * results.forEach(r => console.log(r.name, r.pull_count));
   * ```
   */
  async repositories(
    params?: DockerHubRepositoriesParams,
    signal?: AbortSignal,
  ): Promise<DockerHubPagedResponse<DockerHubRepository>> {
    return this.requestList<DockerHubRepository>(
      `/repositories/${this.username}/`,
      params as Record<string, string | number | boolean>,
      signal,
    );
  }
}
