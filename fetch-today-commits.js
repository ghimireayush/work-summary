const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GIT_TOKEN;
const AUTHOR = 'ghimireayush';
const OUTPUT_DIR = __dirname;

// Today's branches
const branches = [
  { owner: 'ghimireayush', repo: 'bagamati', branch: 'main' },
  { owner: 'ghimireayush', repo: 'bagamati', branch: 'admin_panel' }
];

// Today's date range
const SINCE = '2026-02-16';
const UNTIL = '2026-02-17'; // Until next day to include all of today

// Helper function to make HTTPS requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Node.js Script',
        ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Fetch commits for a specific branch with date range
async function fetchCommits(owner, repo, branch, author, since, until) {
  let allCommits = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?author=${author}&since=${since}&until=${until}&sha=${branch}&per_page=100&page=${page}`;
    
    try {
      console.log(`Fetching ${owner}/${repo} (${branch}) - page ${page}...`);
      const commits = await makeRequest(url);
      
      if (!Array.isArray(commits) || commits.length === 0) {
        hasMore = false;
        break;
      }
      
      allCommits = allCommits.concat(commits);
      
      if (commits.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(`Error fetching commits from ${owner}/${repo} (${branch}):`, error.message);
      hasMore = false;
    }
  }
  
  return allCommits;
}

// Format commits for output
function formatCommits(commits, owner, repo, branch) {
  if (commits.length === 0) {
    return `No commits found for ${owner}/${repo} (${branch}) on 2026-02-16.\n`;
  }

  let output = `Repository: ${owner}/${repo}\n`;
  output += `Branch: ${branch}\n`;
  output += `Author: ${AUTHOR}\n`;
  output += `Total Commits: ${commits.length}\n`;
  output += `Date: 2026-02-16\n`;
  output += `\n${'='.repeat(80)}\n\n`;

  commits.forEach((commit, index) => {
    output += `Commit #${index + 1}\n`;
    output += `SHA: ${commit.sha}\n`;
    output += `Author: ${commit.commit.author.name}\n`;
    output += `Date: ${commit.commit.author.date}\n`;
    output += `Message: ${commit.commit.message}\n`;
    output += `URL: ${commit.html_url}\n`;
    output += `\n${'-'.repeat(80)}\n\n`;
  });

  return output;
}

// Main function
async function main() {
  console.log(`\nFetching today's commits (2026-02-16)...\n`);

  let totalCommits = 0;
  const results = [];

  for (const { owner, repo, branch } of branches) {
    const commits = await fetchCommits(owner, repo, branch, AUTHOR, SINCE, UNTIL);
    const formatted = formatCommits(commits, owner, repo, branch);
    
    // Create filename
    const filename = `${owner}-${repo}-${branch}-today-commits.txt`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    // Write to file
    fs.writeFileSync(filepath, formatted, 'utf8');
    console.log(`✓ Saved: ${filename} (${commits.length} commits)`);
    
    totalCommits += commits.length;
    results.push({ owner, repo, branch, count: commits.length });
  }

  // Create a summary report
  const summaryPath = path.join(OUTPUT_DIR, 'TODAY_WORK_SUMMARY.txt');
  const summary = `GitHub Commits Report - Today (2026-02-16)
Generated: ${new Date().toISOString()}
Author: ${AUTHOR}
Date: 2026-02-16
Branches Scanned: ${branches.length}
Total Commits Found: ${totalCommits}

Branches:
${results.map(r => `- ${r.owner}/${r.repo} (${r.branch}): ${r.count} commits`).join('\n')}

Output Files:
${results.map(r => `- ${r.owner}-${r.repo}-${r.branch}-today-commits.txt`).join('\n')}

Note: If GITHUB_TOKEN is not set, API rate limits may apply (60 requests/hour).
To increase limits, set GITHUB_TOKEN environment variable with a valid GitHub token.
`;

  fs.writeFileSync(summaryPath, summary, 'utf8');
  console.log(`\n✓ Summary report saved: TODAY_WORK_SUMMARY.txt`);
  console.log(`\nAll reports saved to: ${OUTPUT_DIR}`);
  console.log(`\nTotal commits found today: ${totalCommits}`);
}

main().catch(console.error);
