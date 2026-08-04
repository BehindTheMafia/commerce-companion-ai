# Notificaciones push de nuevos pedidos (HyperBee / Commerce AI)

Sistema completo, estilo Shopify, con **dos canales que trabajan en paralelo**:

| Canal | Cuándo | Mecanismo |
| --- | --- | --- |
| **Tiempo real** | Panel abierto | Supabase Realtime (`postgres_changes` en `orders`) → toast glassmorphism + chime + refresh del dashboard |
| **Push** | Panel cerrado / dispositivo sin abrir | Web Push (Service Worker + VAPID + `web-push`) → notificación nativa del SO |

## Cómo fluye un pedido

```
Cliente hace checkout (catálogo /go/:slug)
  │
  ├─ supabase.rpc('create_order')          → guarda pedido + items (y auditoría)
  │
  ├─ realtime: trigger de INSERT en orders  → panel del admin muestra toast + sonido
  │
  └─ POST /api/push/send { order_id }       → el backend envía push a cada dispositivo
                                              del negocio (keepalive, no depende del tab)
```

## Estructura de archivos

```
supabase/migrations/20260804000000_add_push_notifications.sql   ← tablas + RLS + realtime
src/lib/server/
  supabase-admin.ts        ← cliente service-role (solo server)
  push/vapid.ts            ← configuración VAPID de web-push
  push/currency.ts         ← símbolos de moneda para el mensaje
  push/send.ts             ← envío con reintentos, dedupe y revocación
  push/log.ts              ← auditoría en notification_logs
src/routes/api.push.*.tsx  ← API: vapid, register, unregister, send
src/lib/push/
  types.ts  config.ts  device.ts  url-b64.ts  client-api.ts  manager.ts
  preferences.ts  use-notifications.ts  order-sound.ts
src/lib/realtime/use-realtime-orders.tsx   ← suscripción + toast + refresh
src/components/admin/
  notifications-provider.tsx   ← monta todo en el layout /app
  new-order-toast.tsx          ← toast premium
  notification-banner.tsx      ← banner para re-activar
  notification-prompt-dialog.tsx ← pregunta única al iniciar sesión
public/
  sw.js                      ← service worker (push + clics)
  manifest.webmanifest       ← PWA (push en iPhone requiere PWA instalada)
  icons/icon-192.png icon-512.png badge-96.png
scripts/
  generate-vapid.mjs         ← genera claves VAPID
  generate-icons.mjs         ← regenera los iconos
```

## Puesta en marcha (paso a paso)

### 1. Aplicar la migración

```bash
supabase link --project-ref kawhgpgdrvtgpmrhfuxt
supabase db push
```

La migración crea `push_subscriptions`, `notification_preferences`,
`notification_logs`, sus políticas RLS, índices, y añade `orders` a la
publicación `supabase_realtime`.

> **iPhone (Safari):** Safari solo recibe push de un PWA **instalado** en la
> pantalla de inicio. El manifest ya está configurado. El usuario debe
> "Añadir a pantalla de inicio" y abrir la app desde ahí una vez.

### 2. Generar claves VAPID

```bash
node scripts/generate-vapid.mjs
```

Copia el resultado a tu entorno (`.env` local y dashboard de Vercel):

| Variable | Dónde | Seguridad |
| --- | --- | --- |
| `VAPID_PUBLIC_KEY` | server | pública |
| `VAPID_PRIVATE_KEY` | server | **secreta** |
| `VAPID_SUBJECT` | server | pública |
| `VITE_VAPID_PUBLIC_KEY` | cliente (Vite) | pública |

Si no defines `VITE_VAPID_PUBLIC_KEY`, el cliente la resuelve con
`GET /api/push/vapid`.

### 3. Añadir `SUPABASE_SERVICE_ROLE_KEY` (obligatorio)

Las rutas `/api/push/*` necesitan el rol service (bypass de RLS) para leer
pedidos y escribir suscripciones. Se copia de:
Supabase Dashboard → **Settings → API → Service Role (secret)**.

### 4. (Opcional) Regenerar iconos de marca

Los iconos actuales se generan por script con la campana de marca. Sustituye
`public/icons/*` por tus diseños o re-ejecuta:

```bash
node scripts/generate-icons.mjs
```

## Seguridad

- **Solo autenticados** pueden registrar dispositivos (`/api/push/register`
  valida el token JWT con `auth.getUser`).
- El registro exige ser miembro del negocio con rol `owner | admin | staff`.
- **Aislamiento multi-tenant**: cada suscripción pertenece a un `business_id`;
  al enviar se filtran exclusivamente las del negocio del pedido.
- El envío público (storefront anónimo) solo acepta pedidos creados en los
  últimos **30 min** (protección anti-abuso).
- Los `endpoint` muertos (HTTP 404/410) se **revocan** automáticamente.
- Reintentos con backoff (3 intentos) para errores transitorios (429/5xx).
- RLS: un usuario solo gestiona sus propios dispositivos/preferencias; los
  logs son de solo lectura para miembros del negocio.

## Base de datos (resumen)

- `push_subscriptions` — un dispositivo por `(business_id, endpoint)`.
- `notification_preferences` — opt-in + estado del prompt por `(user, business)`.
- `notification_logs` — auditoría de cada envío (`sent`/`failed`).
- Índices: `business_id`, `user_id`, `status active`, `(business_id, created_at desc)`.

## UX implementada

- Pregunta única al iniciar sesión: "¿Deseas recibir notificaciones de nuevos
  pedidos?" (se guarda la respuesta).
- Si el usuario niega el permiso del navegador → **banner elegante** con botón
  para reactivar (aparece una vez por sesión).
- Cambio de dispositivo → se registra automáticamente al iniciar sesión.
- Rotación de suscripción (`pushsubscriptionchange`) → se re-registra.
- Sin toasts duplicados (dedupe por `order_id`).
- Varios pedidos en pocos segundos → se **agrupan** en un solo toast y un solo sonido.
- El sonido respeta `sound_enabled` y no se repite en la ventana de agrupación.

## Puntos de integración

- `src/routes/_authenticated/app.tsx` → `<NotificationsProvider>` envuelve el layout.
- `src/hooks/use-checkout.ts` → tras `create_order`, dispara `sendPushForOrder(id)`.
- `src/routes/_authenticated/app.orders.tsx` → deep link `/app/orders?order=<id>`
  abre el detalle del pedido.
- Dashboard se actualiza solo (invalida `orders` y `dashboard-stats`) al llegar un pedido.

## Nota sobre la fiabilidad del envío

El disparo del push se hace desde el cliente del catálogo con `keepalive`, lo
que funciona incluso con navegación inmediata a WhatsApp. Para una entrega 100%
servidor-driven (por si el cliente cierra el tab en el instante exacto), el
siguiente paso sería un Edge Function de Supabase llamada por trigger DB
(`pg_net`/`supabase_http`) que invoque `sendOrderNotification`. La lógica de
`src/lib/server/push/send.ts` ya está aislada para reutilizarse desde esa
función sin cambios.
