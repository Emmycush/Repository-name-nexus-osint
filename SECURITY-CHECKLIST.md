# NEXUS V11 Security Checklist

- [ ] HTTPS enabled and HSTS appropriate for the production domain.
- [ ] D1 production database is separate from staging/development.
- [ ] Secrets are stored with `wrangler secret put`, never committed.
- [ ] Cloudflare edge rate limiting/WAF rules are enabled.
- [ ] Login throttling is tested with realistic abuse cases.
- [ ] Password recovery and email verification are implemented before public signup.
- [ ] Session revocation is tested.
- [ ] Admin role is restricted to trusted accounts.
- [ ] Provider terms, robots/usage restrictions, and data retention are reviewed.
- [ ] Backups/export and incident-response procedures exist.
- [ ] Security headers are verified with the deployed domain.
- [ ] CSP is tightened further if inline JavaScript is removed.
- [ ] Independent application security review completed before handling sensitive investigations.
