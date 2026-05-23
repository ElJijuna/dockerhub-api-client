/**
 * Raw paginated envelope returned by the Docker Hub API.
 * @internal
 */
export interface DockerHubPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Normalized paged response returned by all list methods in this client.
 */
export interface DockerHubPagedResponse<T> {
  /** Items on the current page */
  results: T[];
  /** Total number of items across all pages */
  count: number;
  /** Whether a next page exists */
  hasNextPage: boolean;
  /** Next page number, if available */
  nextPage?: number;
}
