/**
 * A Docker Hub organization profile.
 */
export interface DockerHubOrganization {
  id: string;
  uuid: string;
  orgname: string;
  full_name: string;
  location: string;
  company: string;
  profile_url: string;
  date_joined: string;
  gravatar_url: string;
  gravatar_email: string;
  type: 'Organization';
}
