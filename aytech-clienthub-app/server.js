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

app.post('/webhook', verifyGitHubWebhook, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`Received GitHub Event: ${event}`);

  // Base variable check for API calls
  const installationId = payload.installation?.id;
  if (!installationId) return res.status(200).send('Event received but no installation found');

  try {
    const jwt = generateJWT(process.env.GITHUB_APP_ID, privateKey);
    const token = await getInstallationToken(installationId, jwt);

    // ====================================================
    // HANDLE: ISSUES EVENTS (Opened & Closed + Auto Assign)
    // ====================================================
    if (event === 'issues') {
      const action = payload.action;
      const repoName = payload.repository.name;
      const repoOwner = payload.repository.owner.login;
      const issueNumber = payload.issue.number;

      if (action === 'opened') {
        const issueTitle = (payload.issue.title || '').toLowerCase();
        const issueBody = (payload.issue.body || '').toLowerCase();
        console.log(`Processing New issue #${issueNumber}...`);

        // 1. Welcome Comment post karein
        await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'AyTech-ClientHub-App',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            body: `Thanks for opening this issue! Powered by **AyTech Solution** 🚀`
          })
        });

        // FEATURE 1: Auto Assign to Repo Owner (Aapko khud assign kar dega)
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
        console.log(`Issue #${issueNumber} assigned to ${repoOwner}`);

        // Auto Labeling Logic
        let labelsToAdd = [];
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
        console.log('Closure comment posted successfully!');
      }
    }

    // ====================================================
    // FEATURE 2: PULL REQUESTS EVENTS (Checklist Welcome)
    // ====================================================
    if (event === 'pull_request' && payload.action === 'opened') {
      const repoName = payload.repository.name;
      const repoOwner = payload.repository.owner.login;
      const prNumber = payload.number;

      console.log(`Processing New Pull Request #${prNumber}...`);

      const prChecklist = `Thanks for opening this Pull Request! Team **AyTech Solution** will review it soon. 🚀\n\n### 🛠️ Review Checklist Before Merge:\n- [ ] Code is properly formatted & clean.\n- [ ] Local build is passing without errors.\n- [ ] All environment variables are updated in .env.\n- [ ] Tested the changes locally.`;

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
      console.log(`PR Welcome checklist sent for PR #${prNumber}`);
    }

    // ====================================================
    // FEATURE 3: REPOSITORY STAR EVENTS (Star Greet)
    // ====================================================
    if (event === 'star' && payload.action === 'created') {
      const sender = payload.sender.login;
      console.log(`🌟 Boom! Repository starred by user: ${sender}`);
      // Star events handle karne ke liye usually system log ya analytics use hoti hai.
      // Aap chahein toh backend level par tracks maintain kar sakte hain!
    }

  } catch (err) {
    console.error('Error handling webhook event:', err.message);
  }

  res.status(200).send('Event received');
});

app.listen(PORT, () => {
  console.log(`GitHub App backend is listening on port ${PORT}`);
});
