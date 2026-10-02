# Add Vercel hosting support

## What will change
- Add a dedicated Vercel build command that targets Vercel without changing Lovable's existing deployment target.
- Add Vercel project configuration for reproducible installs and builds.
- Document the required hosted environment settings and Git-based deployment steps.
- Record and verify the deployment setup.

## Technical details
- Use Nitro's supported `vercel` preset, which generates Vercel's server-rendered output and preserves TanStack routes.
- Keep the standard build command unchanged so Lovable publishing continues to use its managed target.
- Do not duplicate attendance payroll scheduling in Vercel; the existing backend schedule remains authoritative.
