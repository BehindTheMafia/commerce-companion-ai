---
name: commerce-ai
description: >
  Project rules for Commerce AI Mini SaaS. Multi-tenant Supabase
  architecture (business_id, RLS, UUIDs), design system (whitespace,
  cards, workspace feel), animations (GSAP, cubic-bezier), stack
  (React 19, TanStack Router, Tailwind v4, shadcn/ui, Vercel).
  Active on commerce-companion-ai project.
---

# Commerce AI — Project Rules

## Mission & Vision
- Mini SaaS for digital catalogs in <5min, no technical skills
- All-in-one: catalog, subdomain, CRM, WhatsApp, AI, automations, analytics
- KPI: registration → first publication in <5min

## Architecture
- **Multi-tenant** — single DB, `business_id` FK on every business table
- **RLS** on all sensitive tables, never `service_role` from frontend
- **UUIDs**, `snake_case` (tables plural, columns singular)
- Main tables: `created_at`, `updated_at`, `created_by`, `updated_by`
- Soft delete, migrations only, Edge Functions for webhooks/AI/payments

## Route Structure
| Route | Description |
|---|---|
| `/` | Landing (redirects authed to `/app`) |
| `/auth` | Authentication |
| `/onboarding` | Business creation |
| `/app/*` | Dashboard (sidebar + topbar, BusinessProvider) |
| `/go/:slug` | Public storefront (SSR, no auth) |

## Design System
- Unified visual language, modern workspace feel (never admin panel)
- Whitespace, soft borders, light shadows, consistent spacing
- Cards: whitespace, soft borders, light shadows
- Inputs: minimal, uniform height, clear states, smooth transitions
- Modals: animated entrance (fade + scale + blur)
- Dashboard: quick actions, cards, stats — avoid giant tables

## Animations
- Custom cubic-bezier (`.22,.61,.36,1`) or Power3.Out
- Buttons: elevation + scale 1.01–1.03
- Cards: elevation + vertical movement on hover
- Scroll: stagger/fade, subtle parallax, 60fps

## Stack
React 19 + TanStack Router + TanStack Query | Supabase (PG, Auth, RLS, Storage) | Tailwind v4 + shadcn/ui | Vercel (Nitro SSR) | GSAP
