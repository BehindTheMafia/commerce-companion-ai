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

<!-- COMMERCE AI RULES: always apply -->
## Commerce AI — Project Rules

### Mission
Mini SaaS for digital catalogs in <5min, no technical skills. Every decision answers: *"Does this help the user start selling faster?"*

### Architecture
- Multi-tenant: `business_id` FK on every business table, single DB
- RLS on all tables, never `service_role` from frontend
- UUIDs, snake_case (tables plural, columns singular)
- Soft delete, migrations only

### Route Structure
| Route | Description |
|---|---|
| `/` | Landing (redirects authed to `/app`) |
| `/auth` | Auth |
| `/onboarding` | Business creation |
| `/app/*` | Dashboard (sidebar + topbar, BusinessProvider) |
| `/go/:slug` | Public storefront (SSR, no auth) |

### Design
- Modern workspace feel, NOT admin panel
- Whitespace, soft borders, light shadows
- Cards: elevation + hover movement
- Modals: animated entrance (fade + scale + blur)
- Dashboard: quick actions, cards, stats — avoid giant tables

### Animations
- Custom cubic-bezier (`.22,.61,.36,1`), 60fps
- Buttons: elevation + scale 1.01–1.03

### Stack
React 19 + TanStack Router + TanStack Query | Supabase (PG, Auth, RLS) | Tailwind v4 + shadcn/ui | Vercel (Nitro SSR) | GSAP
