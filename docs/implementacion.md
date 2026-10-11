# Backlog de Implementación — Turnero V3

## Criterio de implementación

El proyecto se implementará mediante **vertical slices**. Cada integración debe dejar una funcionalidad utilizable, integrando dentro de la misma iteración las capas necesarias de base de datos, backend, frontend y pruebas.

La siguiente reorganización agrupa el backlog original de 10 integraciones en **5 integraciones**, sin modificar los ítems que componían el backlog original.

---

# Integración 1 — Fundación, autenticación y perfiles

Agrupa las integraciones originales:

- Integración 0 — Foundation técnica
- Integración 1 — Auth & profiles

## 1. Foundation técnica

### Tareas

- Crear el proyecto Next.js con App Router y TypeScript.
- Configurar Tailwind CSS.
- Configurar Supabase.
- Configurar la estructura base de carpetas siguiendo arquitectura por features.
- Configurar variables de entorno.
- Configurar Supabase Auth.
- Crear la estructura inicial de la base de datos.
- Crear los tipos TypeScript compartidos.
- Configurar linting y typecheck.
- Configurar Vitest.
- Configurar Playwright.
- Preparar la base para las pruebas de concurrencia.
- Crear la estructura inicial de CI/CD.

### Pruebas

- Verificar que el proyecto compile correctamente.
- Verificar lint y typecheck.
- Verificar conexión con Supabase.
- Verificar que los tests unitarios se ejecuten.
- Verificar que los tests E2E puedan ejecutarse.

### Resultado

Proyecto base funcional y preparado para comenzar el desarrollo por vertical slices.

## 2. Auth & profiles

### Tareas

- Implementar registro de jugadores.
- Implementar inicio de sesión.
- Implementar autenticación mediante Google.
- Crear perfiles asociados a `auth.users`.
- Implementar los campos de perfil:
  - Nombre.
  - Apellido.
  - Email.
  - Uno o más teléfonos.
- Implementar roles `owner` y `player`.
- Implementar protección de rutas.
- Implementar RLS para perfiles.
- Implementar gestión del perfil del jugador.

### Pruebas

- Registro de jugador.
- Inicio de sesión.
- Login con Google.
- Acceso de jugador a sus propios datos.
- Restricción de acceso entre perfiles.
- Acceso del owner a las funcionalidades administrativas.

### Resultado

Un usuario puede registrarse, iniciar sesión y gestionar su perfil, con separación entre jugador y dueño.

---

# Integración 2 — Disponibilidad, tablero y bloqueos

Agrupa las integraciones originales:

- Integración 2 — Availability
- Integración 3 — Owner agenda
- Integración 5 — Locks

## 3. Availability

### Tareas

- Crear la gestión de las dos canchas.
- Crear la configuración del precio general vigente.
- Implementar consulta de disponibilidad por fecha.
- Generar slots de 90 minutos.
- Mostrar las dos canchas.
- Mostrar los estados:
  - Disponible.
  - Reservado.
  - Bloqueado.
- Aplicar límite de reserva de 7 días.
- Impedir reservas para horarios pasados.
- Impedir reservas para turnos en curso.
- Conservar el precio vigente correspondiente a cada reserva.

### Pruebas

- Consulta de disponibilidad.
- Cambio de fecha.
- Visualización correcta de las dos canchas.
- Generación correcta de slots.
- Aplicación del límite de 7 días.
- Imposibilidad de reservar horarios pasados.
- Imposibilidad de reservar turnos en curso.
- Correcta visualización de estados.

### Resultado

El jugador puede consultar qué turnos están disponibles para una fecha y conocer el precio vigente.

## 4. Owner agenda

### Tareas

- Crear tablero administrativo.
- Mostrar las dos canchas por fecha.
- Implementar selección de fechas futuras.
- Mostrar reservas en el tablero.
- Mostrar horarios libres.
- Mostrar horarios bloqueados.
- Permitir visualizar información de las reservas.
- Implementar diseño responsive del tablero.
- Implementar actualización de la información del tablero.

### Pruebas

- Visualización de las dos canchas.
- Cambio de fecha.
- Visualización de reservas.
- Visualización de horarios disponibles.
- Visualización de horarios bloqueados.
- Acceso exclusivo del owner.

### Resultado

El dueño puede visualizar el estado de las dos canchas para cualquier fecha futura desde un tablero administrativo.

## 5. Locks

### Tareas

- Crear bloqueos puntuales.
- Crear bloqueos recurrentes.
- Permitir bloquear una cancha.
- Permitir bloquear ambas canchas.
- Permitir indicar motivo del bloqueo.
- Permitir eliminar bloqueos recurrentes.
- Hacer que los bloqueos afecten la disponibilidad.
- Permitir crear bloqueos aunque exista una reserva afectada, mostrando una advertencia.
- Implementar RLS para bloqueos.

### Pruebas

- Crear bloqueo puntual.
- Crear bloqueo recurrente.
- Bloquear una cancha.
- Bloquear ambas canchas.
- Eliminar bloqueo recurrente.
- Verificar impacto sobre disponibilidad.
- Verificar impacto sobre el tablero.
- Verificar advertencia cuando un bloqueo afecta una reserva.

### Resultado

El dueño puede bloquear horarios puntuales o recurrentes y esos bloqueos se reflejan correctamente en la disponibilidad.

---

# Integración 3 — Reservas manuales y administración de reservas

Agrupa las integraciones originales:

- Integración 4 — Manual reservations
- Integración 8 — Admin booking management

## 6. Manual reservations

### Tareas

- Permitir crear reservas manuales.
- Permitir seleccionar una fecha.
- Permitir seleccionar cancha.
- Permitir seleccionar horario.
- Permitir asociar un jugador registrado.
- Permitir registrar una reserva mediante nombre cuando no exista jugador registrado.
- Permitir crear reservas manuales sin Mercado Pago.
- Mantener el precio histórico de la reserva.
- Integrar las reservas manuales con la disponibilidad.
- Integrar las reservas manuales con el tablero.

### Pruebas

- Crear reserva manual.
- Crear reserva para jugador registrado.
- Crear reserva mediante nombre.
- Crear reserva sin Mercado Pago.
- Verificar que el horario quede ocupado.
- Verificar que la reserva aparezca en el tablero.
- Verificar que no se puedan crear reservas superpuestas.

### Resultado

El dueño puede registrar reservas realizadas por teléfono o WhatsApp y estas ocupan correctamente el horario correspondiente.

## 7. Admin booking management

### Tareas

- Permitir modificar reservas.
- Permitir cancelar reservas.
- Actualizar correctamente la disponibilidad después de una modificación.
- Actualizar correctamente la disponibilidad después de una cancelación.
- Mantener el precio histórico de la reserva.
- Permitir cancelar administrativamente una reserva.
- Registrar correctamente la necesidad de devolución cuando corresponda.
- Mantener la trazabilidad de la reserva.

### Pruebas

- Modificación de reserva.
- Cancelación de reserva.
- Recalculo de disponibilidad.
- Conservación del precio histórico.
- Cancelación administrativa.
- Verificación de devolución cuando corresponda.

### Resultado

El dueño puede administrar las reservas existentes y los cambios se reflejan correctamente en disponibilidad y estado de la reserva.

---

# Integración 4 — Reserva online, pagos, cancelación y notificaciones

Agrupa las integraciones originales:

- Integración 6 — Online booking + Mercado Pago
- Integración 7 — My bookings + cancellation
- Integración 9 — Notifications

## 8. Online booking + Mercado Pago

### Tareas

- Implementar selección de turno disponible.
- Crear el flujo de inicio de reserva.
- Crear la preferencia de Mercado Pago.
- Implementar pago de seña del 50%.
- Implementar webhook de Mercado Pago.
- Verificar firma HMAC del webhook.
- Validar el estado del pago.
- Confirmar la reserva cuando la seña se acredite.
- Garantizar que el primero en acreditar el pago gane la reserva.
- Registrar intentos perdedores.
- Registrar devoluciones pendientes cuando corresponda.
- Mantener el precio histórico de la reserva.
- Implementar la confirmación atómica de la reserva.
- Implementar protección contra doble reserva.
- Integrar Mercado Pago mediante Route Handler.
- Implementar manejo de errores del proceso de pago.

### Pruebas

- Crear preferencia de pago.
- Pago exitoso.
- Webhook válido.
- Webhook inválido.
- Confirmación de reserva.
- Pago rechazado.
- Pago sin acreditación.
- Dos pagos simultáneos sobre el mismo turno.
- Prueba de concurrencia con 10 confirmaciones simultáneas.
- Verificar exactamente 1 ganador y 9 registros de devolución.
- Verificar conservación del precio histórico.

### Resultado

Un jugador puede seleccionar un turno, pagar la seña mediante Mercado Pago y obtener la reserva confirmada cuando el pago se acredita, incluso bajo concurrencia.

## 9. My bookings + cancellation

### Tareas

- Crear vista de reservas del jugador.
- Mostrar próximas reservas.
- Mostrar información del turno.
- Mostrar precio total.
- Mostrar seña pagada.
- Mostrar saldo restante.
- Permitir cancelar una reserva.
- Aplicar regla de cancelación de 12 horas.
- Registrar devolución cuando corresponda.
- Liberar el horario después de una cancelación.
- Impedir cancelaciones fuera del plazo permitido.

### Pruebas

- Visualización de reservas.
- Cancelación válida.
- Cancelación fuera de plazo.
- Liberación del horario.
- Registro de devolución.
- Conservación de información histórica.

### Resultado

El jugador puede consultar sus reservas y cancelar dentro de las condiciones establecidas por el MVP.

## 10. Notifications

### Tareas

- Configurar Resend.
- Implementar email de confirmación de reserva.
- Implementar email de confirmación del pago de la seña.
- Implementar email de cancelación cuando corresponda.
- Integrar las notificaciones con los eventos principales de la reserva.
- No implementar notificaciones al dueño.

### Pruebas

- Envío de confirmación de reserva.
- Envío de confirmación de pago.
- Envío de cancelación.
- Verificar que las notificaciones correspondan al jugador correcto.

### Resultado

El jugador recibe por email las notificaciones correspondientes a los eventos principales de sus reservas.

---

# Integración 5 — QA, seguridad y producción

Agrupa la integración original:

- Integración 10 — QA/security/production

## 11. QA/security/production

### Tareas

- Completar pruebas unitarias.
- Completar pruebas de integración.
- Completar pruebas E2E.
- Completar pruebas de concurrencia.
- Verificar RLS de todas las tablas.
- Verificar autorización de rutas y acciones.
- Verificar validaciones del lado servidor.
- Verificar protección del webhook de Mercado Pago.
- Verificar manejo de errores.
- Verificar reglas de negocio críticas.
- Verificar disponibilidad.
- Verificar límite de 7 días.
- Verificar cancelación de 12 horas.
- Verificar precio histórico.
- Verificar imposibilidad de doble reserva.
- Verificar bloqueos recurrentes.
- Configurar pipeline de CI/CD.
- Ejecutar lint.
- Ejecutar typecheck.
- Ejecutar tests unitarios.
- Ejecutar tests de integración.
- Ejecutar tests de concurrencia.
- Ejecutar tests E2E.
- Ejecutar build.
- Verificar preview.
- Preparar producción.

### Pruebas

- Suite completa de tests unitarios.
- Suite completa de tests de integración.
- Suite completa de tests E2E.
- Suite completa de concurrencia.
- Pruebas de seguridad y RLS.
- Pruebas de autorización.
- Pruebas de reglas de negocio.
- Build de producción.
- Validación del pipeline CI/CD.

### Resultado

MVP validado funcional y técnicamente, con las reglas críticas cubiertas y preparado para producción.

---

# Orden final de implementación

| Orden | Integración | Funcionalidad utilizable |
|---:|---|---|
| 1 | Fundación, autenticación y perfiles | Proyecto funcional con usuarios autenticados y perfiles |
| 2 | Disponibilidad, tablero y bloqueos | Consulta de disponibilidad y gestión de horarios bloqueados |
| 3 | Reservas manuales y administración de reservas | Gestión completa de reservas desde el dueño |
| 4 | Reserva online, pagos, cancelación y notificaciones | Flujo completo de reserva del jugador |
| 5 | QA, seguridad y producción | MVP validado y preparado para producción |

## Principio de implementación

Cada integración debe implementarse como un **vertical slice**. No se debe completar primero toda la base de datos, luego todo el backend y finalmente todo el frontend.

Dentro de cada integración se deben implementar las piezas necesarias de:

1. Persistencia.
2. Lógica de negocio.
3. Acciones/queries.
4. Interfaz.
5. Validaciones.
6. Pruebas.

De esta manera, al finalizar cada integración existe una funcionalidad ejecutable y verificable.

---

## Resultado esperado del backlog

Al completar las 5 integraciones, el MVP debe permitir:

- Autenticación y gestión de perfiles.
- Consulta de disponibilidad.
- Gestión de las dos canchas.
- Gestión de bloqueos puntuales y recurrentes.
- Gestión manual de reservas.
- Administración de reservas.
- Reservas online.
- Pago de seña mediante Mercado Pago.
- Protección contra doble reserva bajo concurrencia.
- Consulta y cancelación de reservas por parte del jugador.
- Notificaciones por email.
- Seguridad mediante RLS y autorización.
- Pruebas unitarias, integración, E2E y concurrencia.
- Despliegue preparado para producción.
