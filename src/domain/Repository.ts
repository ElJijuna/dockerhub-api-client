/**
 * Permissions on a Docker Hub repository.
 */
export interface DockerHubRepositoryPermissions {
  read: boolean;
  write: boolean;
  admin: boolean;
}

/**
 * Metadata for a Docker Hub image repository.
 */
export interface DockerHubRepository {
  user: string;
  name: string;
  namespace: string;
  repository_type: string;
  status: number;
  status_description: string;
  description: string;
  is_private: boolean;
  is_automated: boolean;
  can_edit: boolean;
  star_count: number;
  pull_count: number;
  last_updated: string;
  date_registered: string;
  collaborator_count: number;
  affiliation: string;
  hub_user: string;
  has_starred: boolean;
  full_description: string;
  permissions: DockerHubRepositoryPermissions;
  media_types: string[];
  content_types: string[];
}

/**
 * Parameters for listing repositories by namespace.
 */
export interface DockerHubRepositoriesParams {
  page?: number;
  page_size?: number;
  ordering?: string;
}
