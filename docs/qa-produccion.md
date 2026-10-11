# QA y preparación de producción

## Checks locales

Requisitos para las pruebas que dependen de la base: Docker activo y Supabase CLI disponible (`npx supabase`). La suite unitaria no necesita servicios externos.

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npx supabase start
npx supabase test db
```

Exportar las credenciales locales de Supabase en la terminal antes de ejecutar integración y concurrencia:

```bash
eval "$(npx supabase status -o env)"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
npm run test:integration
npm run test:concurrency
npm run test:e2e
npm run build
```

Las pruebas de integración crean usuarios y reservas temporales en el proyecto local y limpian los registros al terminar. No apuntarlas a producción. La prueba de concurrencia acredita diez intentos para el mismo horario y exige un único ganador junto con nueve devoluciones pendientes.

## Cobertura de seguridad

- Cada tabla pública del MVP debe tener RLS habilitado y al menos una policy. La comprobación está en `supabase/tests/database/rls.test.sql`.
- La suite de integración verifica aislamiento entre jugadores, actualización administrativa, rechazo de inserciones directas de reservas y no exposición del registro de otro jugador.
- Toda Server Action debe volver a comprobar sesión y rol; el proxy sirve únicamente como redirección optimista. Los pagos se confirman mediante webhook firmado y RPC de servicio.
- `SUPABASE_SERVICE_ROLE_KEY`, credenciales de Mercado Pago y `RESEND_API_KEY` son exclusivamente de servidor y no deben configurarse con prefijo `NEXT_PUBLIC_`.

## CI y release

GitHub Actions ejecuta lint, typecheck, unit tests y build. Un job separado levanta Supabase local, comprueba RLS, ejecuta integración y la carrera de diez pagos. Playwright mantiene un job independiente para las páginas públicas.

Antes de publicar un preview, configurar variables de staging separadas de producción, aplicar migraciones al proyecto Supabase de staging y verificar registro/login, permisos de jugador y dueño, reserva/cancelación, webhook de pago y emails con credenciales de prueba. Revisar el resultado del build y probar en preview sin habilitar pagos reales.

Para producción, configurar secretos en el proveedor de despliegue, verificar dominio y URLs OAuth/webhook, aplicar las migraciones revisadas al proyecto productivo mediante un paso explícito, confirmar backups/PITR y monitoreo, y recién entonces promover el build validado. No se ejecutan migraciones destructivas ni se activa un despliegue de producción automáticamente desde este pipeline.

La aplicación agrega `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`; HSTS se entrega solo en builds de producción servidos bajo HTTPS.