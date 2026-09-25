# NEXUS // OSINT V13

NEXUS is a Cloudflare Pages/Workers + D1 web application for lawful public-source intelligence research. V13 turns the previously layered prototype into a single server-backed application path and removes the browser-only investigation/case flow from the primary experience.

## What is connected
- Account registration, login, logout and session management
- First-login onboarding and public-source use acknowledgement
- Personal/team workspace with owner/admin/analyst/member/viewer roles
- Controlled workspace invitations with hashed, expiring tokens
- Server-backed cases and shared case access
- Public-source investigations persisted in D1
- Domain/RDAP + DNS collection
- Public IPv4 metadata collection
- Safe URL parsing (no arbitrary server-side URL fetching)
- Public username HTTP checks on selected public platforms
- Email syntax/domain signals without private/breach databases
- Evidence, confidence, analyst notes and normalization
- Provider health checks and request rate limiting
- Server-backed investigation history and reports
- Plan/quota foundation and monthly investigation usage tracking
- Security headers and production deployment documentation

## Operational collectors
The primary investigation endpoint currently persists five collector types: `domain`, `ip`, `url`, `username`, and `email`. Other interface modules are analysis/workflow templates and should not be presented as active collectors until a provider-backed implementation is added.

## Security boundary
NEXUS is designed for lawful public-source research. It does not provide credential dumps, stolen databases, private-account access, authentication bypasses, or unauthorized surveillance.

## Deployment
1. Create a Cloudflare Pages/Workers project.
2. Create a D1 database and put its ID in `wrangler.toml`.
3. Apply migrations in order.
4. Configure production secrets with `wrangler secret put`; never commit secrets.
5. Deploy the repository.
6. Verify `/api/health` and `/api/ready`, then run the smoke-test checklist in `DEPLOYMENT.md`.

## Important production work
V13 is deployment-oriented but is not a security certification. Before public launch, perform an independent security review, configure backups/retention, add email verification and password recovery, verify provider terms, configure Cloudflare edge protections, and consider a managed identity provider.
