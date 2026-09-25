# NEXUS // OSINT V13 Deployment & Smoke Test

## 1. Cloudflare setup

1. Create a Cloudflare Pages/Workers project for this repository.
2. Create a D1 database named `nexus-osint-db`.
3. Put the real D1 database ID in `wrangler.toml`.
4. Apply the migrations in order:
   `wrangler d1 migrations apply nexus-osint-db --remote`
5. Configure production secrets with Cloudflare secret storage. Do not commit credentials or API keys.
6. Deploy the Pages application using the project's normal Cloudflare deployment workflow.

## 2. Environment checks

After deployment, verify:
- `/api/health` returns application health without exposing secrets.
- `/api/ready` confirms the D1 binding is available.
- `/api/config` contains only safe public configuration.

## 3. Smoke test

1. Register a new account with a 12+ character password.
2. Confirm the first-login onboarding screen appears.
3. Accept the public-source research policy.
4. Confirm a personal workspace exists.
5. Create a case.
6. Run a domain investigation such as `example.com`.
7. Confirm the investigation appears in History and the dashboard counters change.
8. Open the investigation report.
9. Open the case evidence workbench and verify findings are visible.
10. Invite another test account and verify the invitation token is required to join.
11. Sign in as the invited account and verify workspace/case access matches its role.
12. Test viewer permissions: viewers can read shared cases but cannot create investigations or change case status.
13. Test logout and revoke-all-sessions.
14. Check provider health and rate-limit behavior.

## 4. Production controls

Enable Cloudflare edge protections for authentication, investigation, provider-health and report endpoints. Configure backups/retention and monitor D1 errors. Verify the terms and acceptable-use requirements of every external provider used by the collectors.

## 5. Authentication note

The included authentication is a deployment-oriented application foundation. Before a public SaaS launch, perform an independent security review and consider managed identity with verified email, password recovery, MFA and mature session/device controls.
