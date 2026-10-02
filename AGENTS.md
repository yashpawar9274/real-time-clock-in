<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep authenticated workforce features under the managed `_authenticated` route; this centralizes access control.
- Use browser Supabase calls under RLS for attendance and payroll data; this preserves live updates and user-scoped access.
- Keep phone installation manifest-only unless offline operation is explicitly requested; attendance requires a live connection.
- Generate closed-month payroll in the database so scheduled and manual administrator runs use the same calculation.
- Keep the default build target managed by Lovable and use the dedicated `build:vercel` command for Vercel; this preserves both hosting paths.
