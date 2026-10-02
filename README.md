# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Deploy to Vercel

Import the connected Git repository into Vercel. The included `vercel.json`
uses the framework's Vercel server preset, so server-rendered pages and direct
links work without custom redirects.

Add these environment variables to Vercel for Production, Preview, and
Development:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Use the same public Lovable Cloud values already configured for this project.
Do not add a service-role key. After the first deployment, add the Vercel
production and preview domains to the authentication redirect URL allowlist so
email recovery and Google sign-in can return to the app.

Vercel runs `bun run build:vercel`; the normal `bun run build` remains reserved
for Lovable publishing. Month-end payroll remains scheduled by Lovable Cloud
and must not be duplicated as a Vercel Cron Job.
