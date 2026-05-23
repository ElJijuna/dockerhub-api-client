import type { DockerHubPagedResponse } from '../domain/Pagination';

export type RequestFn = <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  signal?: AbortSignal,
) => Promise<T>;

export type RequestListFn = <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  signal?: AbortSignal,
) => Promise<DockerHubPagedResponse<T>>;
