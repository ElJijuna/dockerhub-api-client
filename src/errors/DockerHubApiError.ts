/**
 * Thrown when the Docker Hub API returns a non-2xx response.
 *
 * @example
 * ```typescript
 * import { DockerHubApiError } from 'dockerhub-api-client';
 *
 * try {
 *   await hub.repository('library', 'nonexistent-xyz').get();
 * } catch (err) {
 *   if (err instanceof DockerHubApiError) {
 *     console.log(err.status);     // 404
 *     console.log(err.statusText); // 'Not Found'
 *     console.log(err.message);    // 'Docker Hub API error: 404 Not Found'
 *   }
 * }
 * ```
 */
export class DockerHubApiError extends Error {
  /** HTTP status code (e.g. `404`, `401`, `403`) */
  readonly status: number;
  /** HTTP status text (e.g. `'Not Found'`, `'Unauthorized'`) */
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`Docker Hub API error: ${status} ${statusText}`);
    this.name = 'DockerHubApiError';
    this.status = status;
    this.statusText = statusText;
  }
}
