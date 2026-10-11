# Turnero V3

Aplicación web para gestionar turnos de dos canchas de pádel. Usa Next.js 16, React 19, Tailwind CSS 4 y Supabase Auth/PostgreSQL.

## Requisitos

- Node.js 20 o superior y npm.
- Proyecto Supabase remoto o Supabase CLI para desarrollo local.
- Para login Google, credenciales OAuth de Google configuradas en Supabase Auth.

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Completar `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SITE_URL`. La aplicación muestra instrucciones de configuración cuando faltan credenciales; nunca expone claves de servicio al navegador.

## Base de datos

Aplicar la migración `supabase/migrations/202610080001_initial_schema.sql` al proyecto de Supabase. Con Supabase CLI instalado se puede iniciar un proyecto local con `supabase start` y aplicar migraciones con `supabase db reset`.

En Authentication, establecer la URL del sitio y permitir `http://localhost:3000/auth/callback` como URL de redirección. Para OAuth, habilitar Google y cargar el Client ID/secret en el proveedor Google de Supabase. En un entorno local con Supabase CLI, las variables del proveedor están declaradas en `supabase/config.toml`.

Todo usuario nuevo recibe el rol `player`. Para asignar el owner inicial, identificar y verificar la cuenta y ejecutar en el SQL Editor con permisos administrativos:

```sql
update public.profiles
set role = 'owner'
where email = 'owner@example.com';
```

Un usuario autenticado no puede cambiar su propio rol. El layout del segmento `/owner` vuelve a comprobar el rol del perfil en el servidor; el proxy sólo realiza comprobaciones optimistas de sesión.

## Checks

```bash
npm run lint
npm run typecheck
npm run test:unit
npx supabase start
npx supabase test db
eval "$(npx supabase status -o env)"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
npm run test:integration
npm run test:concurrency
npx playwright install chromium
npm run test:e2e
npm run build
```

Vitest cubre reglas de negocio, RLS y autorización; la prueba de concurrencia acredita diez pagos simultáneos y verifica un ganador y nueve devoluciones pendientes. Playwright verifica los flujos públicos iniciales. Los comandos de integración requieren Docker y deben apuntar únicamente a Supabase local. Ver [QA y preparación de producción](docs/qa-produccion.md) para el alcance y la lista de release.
