# NEXUS // OSINT V12

## Team workspace layer
- Added persistent workspaces and workspace membership roles.
- New workspace dashboard and member list.
- Owner/admin-only invite generation with 7-day expiry.
- Invite acceptance is restricted to the invited email address.
- Invite tokens are stored hashed; raw tokens are returned only at creation for controlled/manual delivery.
- New accounts automatically receive a personal workspace.
- Added migration `0008_workspaces.sql`.

## Security notes
- No email is sent by this layer. Do not expose invite tokens in public logs or URLs.
- Workspace membership is an additional authorization layer; existing case-level permissions remain in force.
- Before production launch, connect a transactional email provider, add invite acceptance UX, audit workspace changes, and review role boundaries end-to-end.
