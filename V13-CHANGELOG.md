# V13 CHANGELOG

## Connected application pass
- Replaced the primary browser-only investigation flow with the authenticated `/api/investigations` pipeline.
- Server-persisted investigation history now drives the dashboard/history UI.
- Reports open from persisted investigation IDs.
- Added server-backed Cases view and case creation.
- Added first-login onboarding and public-source policy acknowledgement.
- Added workspace invitation acceptance UI.
- Added workspace-aware case access for investigation, evidence graph and normalization routes.
- Added role checks for investigation creation and case status changes.
- Added monthly plan quota accounting to investigation creation.
- Added persisted daily usage increments.
- Added email as a safe persisted investigation type.
- Removed misleading demo/prototype wording from the primary user experience.

## Verification
- JavaScript syntax checked for frontend and all Cloudflare Functions.
- Deployment remains dependent on the user's Cloudflare D1/Pages environment and provider availability.
