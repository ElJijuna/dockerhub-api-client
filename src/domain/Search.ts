/**
 * A single result item from a Docker Hub repository search.
 */
export interface DockerHubSearchResult {
  repo_name: string;
  short_description: string;
  is_official: boolean;
  is_automated: boolean;
  star_count: number;
  pull_count: number;
}

/**
 * Parameters for searching Docker Hub repositories.
 */
export interface DockerHubSearchParams {
  /** Search query string */
  query: string;
  page?: number;
  page_size?: number;
  /** Filter by content type: `'image'` */
  type?: 'image';
}
