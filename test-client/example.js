import { DockerHubClient } from '../dist/index.js';

const hub = new DockerHubClient();

// Log every request with timing
hub.on('request', (e) => {
  const status = e.statusCode ? ` [${e.statusCode}]` : '';
  const err = e.error ? ` ERROR: ${e.error.message}` : '';
  console.log(`  ${e.method} ${e.url}${status} — ${e.durationMs}ms${err}`);
});

async function main() {
  const NAMESPACE = 'pilmee';
  const REPO = 'bitbucket-datacenter-gist';

  console.log('\n=== RepositoryResource ===');

  // Await directly — repository metadata
  const repo = await hub.repository(NAMESPACE, REPO);
  console.log('Name:         ', repo.name);
  console.log('Namespace:    ', repo.namespace);
  console.log('Description:  ', repo.description || '(none)');
  console.log('Private:      ', repo.is_private);
  console.log('Pull count:   ', repo.pull_count);
  console.log('Star count:   ', repo.star_count);
  console.log('Last updated: ', repo.last_updated);
  console.log('Type:         ', repo.repository_type);

  // List tags (first page, up to 10)
  console.log('\n--- Tags (page 1, page_size=10) ---');
  const { results: tags, count, hasNextPage, nextPage } = await hub.repository(NAMESPACE, REPO).tags({ page_size: 10 });
  console.log(`Total tags: ${count} | hasNextPage: ${hasNextPage}${hasNextPage ? ` (next: ${nextPage})` : ''}`);
  tags.forEach(t => {
    const platforms = t.images.map(i => `${i.os}/${i.architecture}`).join(', ');
    console.log(`  - ${t.name.padEnd(20)} digest: ${t.digest.slice(0, 19)}...  size: ${formatBytes(t.full_size)}  platforms: [${platforms}]`);
  });

  // Latest tag detail
  console.log('\n--- Latest tag detail ---');
  const latestTags = await hub.repository(NAMESPACE, REPO).tags({ name: 'latest', page_size: 1 });
  if (latestTags.results.length > 0) {
    const latest = latestTags.results[0];
    console.log('Tag name:     ', latest.name);
    console.log('Digest:       ', latest.digest);
    console.log('Last pushed:  ', latest.tag_last_pushed ?? '(unknown)');
    console.log('Last pulled:  ', latest.tag_last_pulled ?? '(unknown)');
    console.log('Media type:   ', latest.media_type);
    console.log('Images:');
    latest.images.forEach(img => {
      console.log(`  - ${img.os}/${img.architecture}  size: ${formatBytes(img.size)}  digest: ${img.digest.slice(0, 19)}...`);
    });
  } else {
    console.log('  (no tag named "latest" found)');
  }

  console.log('\n=== UserResource ===');

  // Await directly — user profile
  const user = await hub.user(NAMESPACE);
  console.log('Username:    ', user.username);
  console.log('Full name:   ', user.full_name || '(none)');
  console.log('Type:        ', user.type);
  console.log('Date joined: ', user.date_joined);

  // List user repositories
  console.log('\n--- Repositories by', NAMESPACE, '---');
  const { results: repos, count: repoCount } = await hub.user(NAMESPACE).repositories({ page_size: 10 });
  console.log(`Total: ${repoCount}`);
  repos.forEach(r => {
    console.log(`  - ${r.name.padEnd(30)} pulls: ${String(r.pull_count).padStart(6)}  private: ${r.is_private}`);
  });

  console.log('\n=== Search ===');

  // Search for the image by name
  const search = await hub.search({ query: REPO, page_size: 5 });
  console.log(`Results for "${REPO}" (${search.count} total):`);
  search.results.forEach(r => {
    console.log(`  - ${r.repo_name.padEnd(40)} stars: ${r.star_count}  official: ${r.is_official}`);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
