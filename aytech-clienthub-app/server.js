require('dotenv').config();
const express = require('express');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// In-memory stats for Daily Summary
let dailyStats = {
  issuesOpened: 0,
  issuesClosed: 0,
  prsOpened: 0
};

const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');

// Webhook Validation
function verifyGitHubWebhook(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!signature) return res.status(401).send('Missing X-Hub-Signature-256');
  if (!req.rawBody) return res.status(400).send('Missing raw body');

  const computedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature))) {
    console.error('Signature verification failed!');
    return res.status(401).send('Signature verification failed.');
  }
  next();
}

// Helper: JWT Token Generate Karne Ke Liye
function generateJWT(appId, privateKey) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iat: now - 60,
    exp: now + 600,
    iss: appId
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256').update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');
  return `${header}.${payload}.${signature}`;
}

// Helper: GitHub Installation Token Lene Ke Liye
async function getInstallationToken(installationId, jwt) {
  const authResponse = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'AyTech-ClientHub-App'
    }
  });
  const authData = await authResponse.json();
  if (!authResponse.ok) throw new Error(JSON.stringify(authData));
  return authData.token;
}

// FEATURE 3: Automated Daily Summary Event Route
// Ise aap browser me http://localhost:3000/api/summary par dekh sakte hain
app.get('/api/summary', (req, res) => {
  const today = new Date().toLocaleDateString();
  const summaryMarkdown = `
# 📊 AyTech ClientHub - Daily Activity Summary
**Date:** ${today}
---
- 📝 **New Issues Logged:** ${dailyStats.issuesOpened}
- ✅ **Issues Closed/Resolved:** ${dailyStats.issuesClosed}
- 🔀 **Pull Requests Open for Review:** ${dailyStats.prsOpened}
---
*Powered by AyTech Solution Automation Bot 🚀*
  `;
  res.send(summaryMarkdown);
});

app.post('/webhook', verifyGitHubWebhook, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`Received GitHub Event: ${event}`);

  const installationId = payload.installation?.id;
  if (!installationId) return res.status(200).send('Event received but no installation found');

  try {
    const jwt = generateJWT(process.env.GITHUB_APP_ID, privateKey);
    const token = await getInstallationToken(installationId, jwt);

    // ====================================================
    // HANDLE: ISSUES EVENTS
    // ====================================================
    if (event === 'issues') {
      const action = payload.action;
      const repoName = payload.repository.name;
      const repoOwner = payload.repository.owner.login;
      const issueNumber = payload.issue.number;
      const userName = payload.issue.user.login;
      const issueNodeId = payload.issue.node_id; // Needed for Project V2 (Kanban)

      if (action === 'opened') {
        dailyStats.issuesOpened++;
        console.log(`Processing New issue #${issueNumber}...`);

        // First-Time Contributor Check
        let welcomeMessage = `Thanks for opening this issue, @${userName}! Powered by **AyTech Solution** 🚀`;
        if (payload.issue.author_association === 'FIRST_TIME_CONTRIBUTOR' || payload.issue.author_association === 'NONE') {
          welcomeMessage = `👋 Welcome @${userName} to our repository! This looks like one of your first interactions here. Thank you for opening this issue! Team **AyTech Solution** will look into this shortly. 🚀`;
        }

        // 1. Welcome Comment post karein
        await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'AyTech-ClientHub-App',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ body: welcomeMessage })
        });

        // Auto Assign to Repo Owner
        await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/assignees`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'AyTech-ClientHub-App',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ assignees: [repoOwner] })
        });

        // FEATURE 1: Auto-Create Kanban Card Link Simulation log
        console.log(`⚙️ [Kanban Automation]: Item ${issueNodeId} parsed and prepared for Project Board entry.`);

        // Auto Labeling Logic
        let labelsToAdd = [];
        const issueTitle = (payload.issue.title || '').toLowerCase();
        const issueBody = (payload.issue.body || '').toLowerCase();
        if (issueTitle.includes('bug') || issueTitle.includes('error') || issueTitle.includes('broken') || issueBody.includes('bug')) {
          labelsToAdd.push('bug');
        } else if (issueTitle.includes('feature') || issueTitle.includes('add') || issueBody.includes('feature')) {
          labelsToAdd.push('enhancement');
        }

        if (labelsToAdd.length > 0) {
          await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/labels`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github+json',
              'User-Agent': 'AyTech-ClientHub-App',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ labels: labelsToAdd })
          });
        }
      }

      if (action === 'closed') {
        dailyStats.issuesClosed++;
        await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'AyTech-ClientHub-App',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            body: `This issue has been successfully resolved and closed. Thank you for your contribution! If you face any further problems, feel free to reopen or create a new issue. Team **AyTech Solution** 🚀`
          })
        });
      }
    }

    // ====================================================
    // HANDLE: PULL REQUESTS
    // ====================================================
    if (event === 'pull_request' && payload.action === 'opened') {
      dailyStats.prsOpened++;
      const repoName = payload.repository.name;
      const repoOwner = payload.repository.owner.login;
      const prNumber = payload.number;
      const prTitle = (payload.pull_request.title || '').toLowerCase();
      const prBody = (payload.pull_request.body || '').toLowerCase();

      console.log(`Scanning PR #${prNumber} for potential leaks & configurations...`);

      let prChecklist = `Thanks for opening this Pull Request! Team **AyTech Solution** will review it soon. 🚀\n\n### 🛠️ Review Checklist Before Merge:\n- [ ] Code is properly formatted & clean.\n- [ ] Local build is passing without errors.\n- [ ] All environment variables are updated in .env.\n- [ ] Tested the changes locally.`;

      // Secret/.env Leak Scanner
      if (prTitle.includes('.env') || prBody.includes('secret') || prBody.includes('password') || prBody.includes('api_key')) {
        prChecklist += `\n\n⚠️ **SECURITY WARNING:** Our automated scanner detected keywords like '.env', 'secret', or 'password' in your PR metadata. Please double-check that you are **not** pushing hardcoded API keys or environment configuration files!`;
      }

      // Send Checklist Comment
      await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'AyTech-ClientHub-App',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: prChecklist })
      });

      // FEATURE 2: Auto-Request Reviewer (Assigning repo owner as default reviewer)
      await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}/requested_reviewers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'AyTech-ClientHub-App',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reviewers: [repoOwner] })
      }).catch(err => console.log('Reviewer self-assignment skipped or user is owner.'));
      
      console.log(`PR Automation and Reviewer Request triggered for PR #${prNumber}`);
    }

  } catch (err) {
    console.error('Error handling ultimate webhook event:', err.message);
  }

  res.status(200).send('Event received');
});

app.listen(PORT, () => {
  console.log(`GitHub App backend is listening on port ${PORT}`);
});

