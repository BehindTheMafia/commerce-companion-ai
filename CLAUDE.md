# Commerce AI — Project Rules

## Mission
Mini SaaS for any business to create a professional digital catalog in <5min, no technical skills. Every decision answers: *"Does this help the user start selling faster?"*

## Vision
All-in-one platform: catalog, subdomain, CRM, WhatsApp, AI agents, automations, analytics. Everything is one ecosystem, never separate experiences.

## Product Objectives
1. Create account in <1min
2. Professional catalog creation
3. Auto-generated subdomain
4. Instant sharing
5. Simple admin panel
6. Future: CRM, WhatsApp, IA, automations, analytics — without changing initial experience

**Primary KPI:** Time from registration to first publication — target <5min.

---

## Architecture

### Multi-Tenant
- Single database, each business is a tenant
- `business_id` on every business-related table (mandatory FK)
- Every query prepared for multi-company
- Never database-per-client, never duplicate structures

### Security
- Row Level Security (RLS) on all sensitive tables
- Never disable RLS, never use `service_role` from frontend
- Every policy must prevent cross-tenant reads/writes
- Security lives in PostgreSQL, never trust JS validations

### Database Conventions
- UUIDs everywhere (no auto-increment ints)
- `snake_case` naming — tables plural, columns singular
- All main tables: `created_at`, `updated_at`, `created_by`, `updated_by`
- Soft delete (`deleted_at`) instead of physical delete for important records
- Foreign keys on all relationships
- Migrations only — never edit production manually
- Indexes only when beneficial; analyze frequent queries

### Functions
- PG functions only when they reduce complexity, improve performance, or centralize logic
- Edge Functions for: webhooks, WhatsApp, AI, payments, automations, long processes

---

## Design System

### Visual Language
- All components share identical visual language — unified system
- Modern workspace feel, **never** an admin panel
- Generous whitespace, soft borders, light shadows, consistent spacing

### Components
- **Buttons:** consistent radius, soft shadows, ample padding, elegant hover, visible focus
- **Cards:** lots of whitespace, soft borders, light shadows, consistent separation
- **Inputs:** minimal, uniform height, clear states, smooth transitions
- **Modals:** animated entrance, blurred background, slight scale
- **Dropdowns:** fluid animations, no jerky movement

### Dashboard
- Quick actions, important info, cards, stats
- Avoid giant tables, avoid information overload
- Each module uses only the space it needs

### Animations
- Custom cubic-bezier curves (e.g. `.22,.61,.36,1`) or Power3.Out
- **Buttons:** slight elevation, scale 1.01–1.03, smooth shadow
- **Cards:** light elevation, few-pixel vertical movement on hover
- **Modals:** fade + scale + blur, never instant
- **Scroll:** section-based, stagger, fade, subtle parallax
- All animations must run at 60fps

---

## Stack
- React 19, TanStack Router (file-based), TanStack Query
- Supabase (PostgreSQL, Auth, RLS)
- Tailwind CSS v4, shadcn/ui components
- Vercel (Nitro preset)
- GSAP for complex animations

## Route Structure
- `/` — landing page
- `/auth` — authentication
- `/onboarding` — business creation
- `/app/*` — authenticated dashboard (sidebar + topbar layout)
- `/go/:slug` — public storefront (SSR, no auth required)
