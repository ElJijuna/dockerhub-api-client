/**
 * A Docker Hub user profile.
 */
export interface DockerHubUser {
  id: string;
  uuid: string;
  username: string;
  full_name: string;
  location: string;
  company: string;
  profile_url: string;
  date_joined: string;
  gravatar_url: string;
  gravatar_email: string;
  type: 'User' | 'Organization';
}
