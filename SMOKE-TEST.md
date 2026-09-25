# NEXUS // OSINT V13 Smoke Test

## Core account flow
- [ ] Register
- [ ] Login
- [ ] Onboarding acknowledgement
- [ ] Logout
- [ ] Revoke all sessions

## Workspace
- [ ] Personal workspace created
- [ ] Invite analyst
- [ ] Accept invitation with invited email
- [ ] Viewer cannot create investigations
- [ ] Workspace admin can manage members

## Intelligence
- [ ] Domain investigation
- [ ] IP investigation
- [ ] URL analysis
- [ ] Username public-profile checks
- [ ] Email public signals
- [ ] Findings persisted
- [ ] Confidence/notes persist
- [ ] Evidence graph loads
- [ ] Normalization works

## Cases/reports
- [ ] Create case
- [ ] Link investigation to case
- [ ] Shared case access works
- [ ] Case status permissions work
- [ ] Advanced report opens

## Operations
- [ ] Provider health endpoint
- [ ] Rate limiting
- [ ] Monthly quota enforcement
- [ ] `/api/health`
- [ ] `/api/ready`

Record any failure with the endpoint, HTTP status, timestamp and Cloudflare function log entry.
