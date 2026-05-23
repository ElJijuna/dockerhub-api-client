/**
 * Per-platform image details within a tag.
 */
export interface DockerHubImageDetail {
  architecture: string;
  features: string;
  variant: string | null;
  digest: string;
  os: string;
  os_features: string;
  os_version: string | null;
  size: number;
  status: string;
  last_pulled: string | null;
  last_pushed: string | null;
}

/**
 * A Docker Hub image tag.
 */
export interface DockerHubTag {
  creator: number;
  id: number;
  images: DockerHubImageDetail[];
  last_updated: string;
  last_updater: number;
  last_updater_username: string;
  name: string;
  repository: number;
  full_size: number;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string | null;
  tag_last_pushed: string | null;
  media_type: string;
  content_type: string;
  digest: string;
}

/**
 * Parameters for listing tags on a repository.
 */
export interface DockerHubTagsParams {
  page?: number;
  page_size?: number;
  /** Filter tags by name prefix */
  name?: string;
  ordering?: string;
}
