# Análisis funcional — MVP Sistema de gestión de turnos de pádel

## 1. Objetivo

Desarrollar un sistema web para gestionar los turnos de una cancha de pádel que dispone de dos canchas.

El MVP permitirá:

- Al dueño gestionar manualmente los turnos tomados por fuera del sistema.
- Al dueño visualizar la disponibilidad de ambas canchas.
- Al dueño bloquear horarios recurrentes destinados, por ejemplo, a la escuela de pádel.
- A los jugadores consultar disponibilidad y reservar turnos.
- A los jugadores pagar una seña del 50% mediante Mercado Pago.
- A los jugadores cancelar sus reservas dentro del plazo permitido.
- Mantener un registro básico de jugadores y sus reservas.

El sistema se limita exclusivamente a la gestión de turnos de las dos canchas. No se contempla la gestión de otros productos o servicios.

---

## 2. Alcance del MVP

### Incluido

#### Gestión de turnos

- Turnos de duración fija de 90 minutos.
- Dos canchas disponibles.
- Disponibilidad las 24 horas.
- Generación de turnos en intervalos de 90 minutos.
- Consulta de disponibilidad por fecha.
- Reservas realizadas por jugadores.
- Reservas creadas manualmente por el dueño.
- Modificación de turnos por parte del dueño.
- Cancelación/eliminación de turnos por parte del dueño.
- Cancelación de reservas por parte del jugador.
- Bloqueos de horarios.
- Bloqueos recurrentes e indefinidos.
- Visualización de turnos disponibles, reservados y bloqueados.

#### Jugadores

- Registro e inicio de sesión.
- Nombre.
- Apellido.
- Email.
- Teléfono.
- Posibilidad de tener varios teléfonos.
- Consulta de reservas desde su perfil.

#### Pagos

- Seña obligatoria del 50% para reservas realizadas por jugadores.
- Pago de la seña mediante Mercado Pago.
- Confirmación automática de la reserva cuando la seña fue acreditada.
- El 50% restante se gestiona fuera del sistema.
- Registro de que corresponde devolver una seña cuando una reserva con pago es cancelada.

#### Dueño

- Creación de turnos manuales.
- Asociación opcional de un jugador a un turno manual.
- Los jugadores manuales pueden no estar registrados.
- Para un jugador manual solamente se almacena el nombre.
- Los turnos manuales quedan confirmados sin requerir una seña.
- Modificación de turnos.
- Cancelación de turnos.
- Creación y eliminación de bloqueos recurrentes.
- Visualización del calendario y tablero de turnos.

#### Notificaciones

- Envío de emails al jugador mediante Resend.
- No se contemplan notificaciones al dueño en el MVP.

---

## 3. Fuera de alcance

Quedan explícitamente fuera del MVP:

- Gestión de productos.
- Gestión de stock.
- Gestión de ventas de productos.
- Gestión de compras.
- Gestión de clientes fuera del contexto de jugadores.
- Gestión del pago del saldo restante de la cancha.
- Integración para cobrar el saldo restante.
- Devolución automática de señas.
- Notificaciones al dueño.
- Sistema de ranking.
- Gestión de escuelas de pádel más allá del bloqueo de horarios.
- Gestión de otras canchas o sedes.
- Gestión de múltiples negocios.
- Modificación de la duración de los turnos.
- Diferentes duraciones de turnos.
- Asociación automática entre jugadores registrados y reservas manuales históricas.
- Sistema de estados detallados visibles al jugador.
- Re-reserva desde el historial.

---

# 4. Actores

## 4.1. Dueño

Es el administrador del negocio y tiene control total sobre la agenda.

Puede:

- Ver la agenda.
- Crear turnos manuales.
- Modificar turnos.
- Cancelar turnos.
- Bloquear horarios.
- Crear bloqueos recurrentes.
- Eliminar bloqueos recurrentes.
- Gestionar la disponibilidad de ambas canchas.

## 4.2. Jugador

Es el usuario que utiliza el sistema para reservar una cancha.

Puede:

- Registrarse.
- Iniciar sesión.
- Consultar disponibilidad.
- Reservar un turno.
- Pagar la seña.
- Consultar sus reservas.
- Cancelar una reserva dentro del plazo permitido.

---

# 5. Conceptos principales

## 5.1. Turno

Representa un intervalo de 90 minutos correspondiente a una cancha determinada.

Cada turno pertenece a:

- Una fecha.
- Un horario de inicio.
- Un horario de finalización.
- Una de las dos canchas.

Los turnos tienen una duración fija de 90 minutos y no puede ser modificada.

## 5.2. Reserva

Representa la ocupación de un turno por parte de un jugador.

Puede originarse:

- Desde el sistema, realizada por un jugador.
- Manualmente, creada por el dueño.

Las reservas realizadas por jugadores requieren el pago de una seña del 50%.

Las reservas creadas manualmente por el dueño no requieren pago de seña dentro del sistema.

## 5.3. Bloqueo

Representa un horario en el que una cancha no puede ser reservada.

Puede utilizarse, por ejemplo, para:

- Escuela de pádel.
- Mantenimiento.
- Uso particular de la cancha.
- Cualquier otro motivo definido por el dueño.

## 5.4. Bloqueo recurrente

Permite bloquear un mismo horario de manera recurrente.

Ejemplo:

> Todos los martes de 18:00 a 19:30 en la cancha 1.

El bloqueo no tiene fecha de finalización obligatoria y permanece activo indefinidamente hasta que el dueño lo elimine.

---

# 6. Reglas de negocio

## RN-01 — Cantidad de canchas

El sistema administra exactamente dos canchas.

No se contempla la creación o eliminación de canchas desde el MVP.

## RN-02 — Duración

Todos los turnos tienen una duración fija de 90 minutos.

El dueño no puede modificar individualmente la duración de un turno.

## RN-03 — Disponibilidad horaria

El sistema permite gestionar turnos durante las 24 horas del día.

## RN-04 — Precio

Existe un precio vigente para los turnos.

El precio es el mismo para todos los turnos.

El dueño puede modificar el precio cuando lo considere necesario, por ejemplo, ante inflación.

## RN-05 — Precio histórico de una reserva

Una reserva conserva el precio vigente en el momento en que fue realizada.

Si posteriormente el dueño aumenta el precio general, las reservas existentes no modifican su precio.

## RN-06 — Seña

Las reservas realizadas por jugadores requieren una seña equivalente al 50% del precio del turno.

## RN-07 — Medio de pago

La seña se paga mediante Mercado Pago.

## RN-08 — Confirmación

Una reserva realizada por un jugador queda confirmada cuando se acredita correctamente el pago de la seña.

## RN-09 — Reserva sin pago

Si el jugador selecciona un turno pero no paga la seña, el turno continúa disponible.

No se genera una reserva confirmada.

## RN-10 — Concurrencia

Puede haber varios jugadores intentando reservar y pagar el mismo turno simultáneamente.

La reserva válida será la correspondiente al jugador cuya seña haya sido acreditada primero.

El sistema no debe considerar suficiente el simple inicio del proceso de pago para determinar quién ganó el turno.

## RN-11 — Turnos manuales

El dueño puede crear una reserva manual para un turno.

Una reserva manual:

- No requiere pago de seña.
- Queda confirmada inmediatamente.
- Puede asociarse a un jugador registrado.
- También puede asociarse a un jugador no registrado.

## RN-12 — Jugador manual

Cuando el dueño crea un turno manual para un jugador no registrado, solamente se registra su nombre.

No se realiza asociación automática posterior si ese jugador se registra en el sistema.

## RN-13 — Modificación de turnos

El dueño puede modificar un turno existente.

Puede modificar, según corresponda, la fecha, horario y cancha.

Una reserva modificada conserva su condición de reserva y el precio original.

## RN-14 — Cancelación por parte del dueño

El dueño puede cancelar un turno reservado.

Si la reserva tenía una seña pagada:

- La reserva queda cancelada.
- Se registra que corresponde devolver la seña al jugador.
- La devolución se gestiona fuera del sistema.
- El turno vuelve a estar disponible.

## RN-15 — Cambio de jugador por parte del dueño

El dueño no reemplaza directamente al jugador de una reserva existente.

Si necesita asignar ese horario a otro jugador, debe:

1. Cancelar el turno/reserva existente.
2. Resolver la devolución de la seña si corresponde.
3. Crear una nueva reserva manual para el nuevo jugador.

## RN-16 — Cancelación por jugador

El jugador puede cancelar su reserva hasta 12 horas antes del inicio del turno.

## RN-17 — Devolución por cancelación

Cuando el jugador cancela dentro del plazo permitido:

- La reserva queda cancelada.
- Se indica que corresponde devolver la seña.
- La devolución se gestiona fuera del sistema.
- El turno vuelve a estar disponible.

## RN-18 — Bloqueos

Un horario bloqueado no puede ser reservado normalmente por un jugador.

## RN-19 — Bloqueos recurrentes

Un bloqueo recurrente puede aplicarse a:

- Una sola cancha.
- Ambas canchas.

El bloqueo permanece vigente indefinidamente hasta que el dueño lo elimine.

## RN-20 — Bloqueo con reserva existente

El dueño puede crear un bloqueo aunque ya exista una reserva dentro del horario afectado.

El sistema debe advertir que existe una reserva afectada, pero no debe impedir el bloqueo.

La resolución de esa situación queda a cargo del dueño y se realiza fuera del sistema.

## RN-21 — Anticipación máxima

Un jugador puede reservar turnos con una anticipación máxima de 7 días.

Por ejemplo, si hoy es miércoles 07/10, puede reservar hasta el miércoles 14/10.

## RN-22 — Fecha y hora actual

Un jugador no puede reservar:

- Fechas anteriores a la fecha actual.
- Turnos cuyo inicio ya haya ocurrido.
- Turnos que ya estén en curso.

Ejemplo:

Si son las 20:15 y existe un turno de 20:00 a 21:30, ese turno ya no puede ser reservado.

## RN-23 — Turnos futuros

Un turno cuyo inicio todavía no ocurrió puede ser reservado siempre que cumpla las demás reglas de disponibilidad y el límite máximo de 7 días.

## RN-24 — Saldo restante

El 50% restante del precio de la cancha no se gestiona en el sistema.

El pago del saldo se realiza fuera del sistema.

## RN-25 — Historial del jugador

El jugador puede consultar sus reservas desde su perfil.

No se requiere un sistema de estados detallado visible al jugador para este MVP.

---

# 7. Flujo principal — Reserva de jugador

```text
Jugador inicia sesión
        ↓
Selecciona una fecha
        ↓
Visualiza las dos canchas y sus horarios
        ↓
Selecciona un turno disponible
        ↓
Visualiza el precio
        ↓
Inicia el proceso de reserva
        ↓
Paga el 50% mediante Mercado Pago
        ↓
¿Se acreditó primero su pago?
   ┌────┴────┐
   │         │
  Sí         No
   │         │
   ↓         ↓
Reserva     Turno ya
confirmada  reservado
   │         │
   ↓         ↓
Email       No se confirma
de confirmación
```

Si el jugador no completa el pago, el turno continúa disponible.

---

# 8. Flujo principal — Reserva manual

```text
Dueño accede al tablero
        ↓
Selecciona fecha
        ↓
Selecciona cancha y horario
        ↓
Ingresa opcionalmente el jugador
        ↓
Confirma la reserva
        ↓
Reserva confirmada
```

No se requiere pago de seña.

Si el jugador no está registrado, solamente se registra su nombre.

---

# 9. Flujo de cancelación por jugador

```text
Jugador consulta sus reservas
        ↓
Selecciona una reserva
        ↓
¿Faltan 12 horas o más?
   ┌────┴────┐
   │         │
  Sí         No
   │         │
   ↓         ↓
Puede       No puede
cancelar    cancelar
   │
   ↓
Reserva cancelada
   ↓
Se indica devolución de seña
   ↓
Turno disponible nuevamente
```

La devolución de la seña se realiza fuera del sistema.

---

# 10. Flujo de cancelación por dueño

```text
Dueño selecciona una reserva
        ↓
Cancela el turno
        ↓
¿Había seña pagada?
   ┌────┴────┐
   │         │
  Sí         No
   │         │
   ↓         ↓
Indicar que  Sin devolución
corresponde
devolución
   │
   ↓
Turno disponible
```

---

# 11. Tablero del dueño

El dueño contará con una vista tipo calendario/tablero donde podrá seleccionar una fecha y visualizar los turnos de ambas canchas.

Ejemplo:

| Horario | Cancha 1 | Cancha 2 |
|---|---|---|
| 08:00–09:30 | Disponible | Reservado |
| 09:30–11:00 | Bloqueado | Disponible |
| 11:00–12:30 | Reservado | Reservado |
| 12:30–14:00 | Disponible | Bloqueado |

Cada turno debe permitir identificar al menos:

- Horario.
- Cancha.
- Estado.
- Jugador, si corresponde.
- Precio.
- Información relacionada con la seña cuando corresponda.

El dueño puede navegar entre fechas y consultar semanas futuras.

---

# 12. Estados funcionales del turno

Para el funcionamiento del MVP se identifican tres situaciones principales:

## Disponible

El turno puede ser reservado.

## Reservado

El turno está asignado a un jugador.

Puede haber sido creado:

- Por un jugador y confirmado mediante pago.
- Manualmente por el dueño.

## Bloqueado

El turno no está disponible para reservas normales debido a un bloqueo.

Estos estados representan el estado visible del tablero del dueño.

---

# 13. Reglas de disponibilidad

Para que un turno sea reservable por un jugador deben cumplirse simultáneamente las siguientes condiciones:

1. Corresponde a una de las dos canchas.
2. La fecha no es anterior a la fecha actual.
3. El inicio del turno todavía no ocurrió.
4. El turno no está reservado.
5. El turno no está bloqueado.
6. Se encuentra dentro de los próximos 7 días.
7. La reserva puede realizarse en ese momento según las reglas del sistema.

---

# 14. Gestión de precios

El sistema utiliza un precio general vigente para los turnos.

Ejemplo:

> Precio actual: $15.000

Una reserva realizada a ese precio conserva el valor de $15.000 aunque posteriormente el dueño cambie el precio a $18.000.

Ejemplo:

| Reserva | Precio al reservar | Nuevo precio general |
|---|---:|---:|
| Reserva A | $15.000 | $18.000 |
| Reserva B | $18.000 | $18.000 |

La reserva A continúa teniendo un precio de $15.000.

---

# 15. Notificaciones

El sistema enviará emails al jugador mediante Resend.

El MVP contempla notificaciones relacionadas con las operaciones principales de la reserva, como:

- Confirmación de reserva.
- Confirmación del pago de la seña.
- Cancelación cuando corresponda.

No se contemplan notificaciones al dueño.

---

# 16. Requerimientos funcionales

## RF-01 — Registro

El sistema debe permitir que un jugador cree una cuenta.

## RF-02 — Autenticación

El sistema debe permitir al jugador iniciar sesión.

## RF-03 — Gestión de perfil

El jugador debe poder gestionar sus datos básicos:

- Nombre.
- Apellido.
- Email.
- Uno o más teléfonos.

## RF-04 — Consulta de disponibilidad

El jugador debe poder seleccionar una fecha y visualizar los horarios disponibles de las dos canchas.

## RF-05 — Reserva

El jugador debe poder seleccionar un turno disponible e iniciar su reserva.

## RF-06 — Pago de seña

El sistema debe permitir pagar el 50% del precio del turno mediante Mercado Pago.

## RF-07 — Confirmación

El sistema debe confirmar la reserva cuando se acredite correctamente la seña.

## RF-08 — Consulta de reservas

El jugador debe poder consultar sus reservas desde su perfil.

## RF-09 — Cancelación

El jugador debe poder cancelar una reserva hasta 12 horas antes del inicio.

## RF-10 — Gestión manual

El dueño debe poder crear reservas manuales.

## RF-11 — Modificación

El dueño debe poder modificar reservas.

## RF-12 — Cancelación administrativa

El dueño debe poder cancelar reservas.

## RF-13 — Bloqueos

El dueño debe poder bloquear horarios.

## RF-14 — Bloqueos recurrentes

El dueño debe poder crear bloqueos recurrentes sin fecha de finalización.

## RF-15 — Eliminación de bloqueos

El dueño debe poder eliminar bloqueos recurrentes.

## RF-16 — Tablero

El dueño debe poder visualizar las dos canchas por fecha en un tablero.

## RF-17 — Calendario

El dueño debe poder seleccionar fechas futuras desde un calendario.

## RF-18 — Notificaciones

El sistema debe enviar emails al jugador mediante Resend para los eventos relevantes de su reserva.

---

# 17. Requerimientos no funcionales relevantes al alcance

En esta etapa no se define tecnología ni infraestructura. Sin embargo, existen algunas condiciones funcionales que deberán ser respetadas por la futura implementación:

- La disponibilidad debe reflejar correctamente el estado actual de los turnos.
- La confirmación de una reserva debe respetar el orden real de acreditación de los pagos.
- No debe ser posible confirmar dos reservas para el mismo turno.
- El precio histórico de una reserva debe conservarse.
- Los horarios pasados no deben poder reservarse.
- Los turnos en curso tampoco deben poder reservarse.
- El límite de 7 días debe aplicarse correctamente.
- Las cancelaciones deben respetar el límite de 12 horas.
- Los bloqueos recurrentes deben afectar correctamente los turnos futuros.

---

# 18. Casos de uso principales

| ID | Actor | Caso de uso |
|---|---|---|
| CU-01 | Jugador | Registrarse |
| CU-02 | Jugador | Iniciar sesión |
| CU-03 | Jugador | Consultar disponibilidad |
| CU-04 | Jugador | Reservar turno |
| CU-05 | Jugador | Pagar seña |
| CU-06 | Jugador | Consultar reservas |
| CU-07 | Jugador | Cancelar reserva |
| CU-08 | Dueño | Consultar tablero |
| CU-09 | Dueño | Crear reserva manual |
| CU-10 | Dueño | Modificar reserva |
| CU-11 | Dueño | Cancelar reserva |
| CU-12 | Dueño | Crear bloqueo |
| CU-13 | Dueño | Crear bloqueo recurrente |
| CU-14 | Dueño | Eliminar bloqueo recurrente |

---

# 19. Criterios generales de aceptación del MVP

El MVP se considera funcional cuando:

- El dueño puede visualizar las dos canchas por fecha.
- El dueño puede crear, modificar y cancelar reservas manuales.
- El dueño puede bloquear horarios individuales o recurrentes.
- Los bloqueos recurrentes permanecen activos hasta ser eliminados.
- Un jugador puede registrarse e iniciar sesión.
- Un jugador puede consultar disponibilidad de hasta 7 días hacia adelante.
- Un jugador no puede reservar horarios pasados ni turnos actualmente en curso.
- Un jugador puede reservar un turno disponible.
- La reserva requiere una seña del 50%.
- La seña se procesa mediante Mercado Pago.
- La reserva se confirma una vez acreditado el pago.
- Si dos jugadores intentan reservar el mismo turno, solamente prevalece quien acredita primero la seña.
- Una reserva conserva el precio que tenía al momento de ser confirmada.
- El jugador puede cancelar hasta 12 horas antes.
- Las cancelaciones que corresponden generan el registro de que debe devolverse la seña.
- El turno vuelve a estar disponible después de una cancelación.
- El saldo restante de la cancha queda fuera del sistema.
- El jugador puede consultar sus reservas desde su perfil.
- El jugador recibe las notificaciones correspondientes por email.
- No se gestionan productos ni otras funcionalidades ajenas a los turnos.

---

# 20. Resumen del alcance

El MVP consiste en un sistema de reservas para **una única sede con dos canchas de pádel**, donde existen dos actores principales:

**Dueño**
- Gestiona la agenda.
- Crea reservas manuales.
- Modifica y cancela reservas.
- Administra bloqueos y bloqueos recurrentes.
- Visualiza disponibilidad.

**Jugador**
- Se registra.
- Consulta disponibilidad.
- Reserva un turno de 90 minutos.
- Paga el 50% de seña mediante Mercado Pago.
- Consulta sus reservas.
- Puede cancelar hasta 12 horas antes.

El sistema funciona únicamente como herramienta de **gestión de turnos y señas**. El pago restante de cada turno, las devoluciones efectivas y cualquier otra gestión comercial se realizan fuera del sistema.

El objetivo del MVP es resolver de forma simple y confiable el problema central: **saber qué cancha está disponible, reservada o bloqueada y permitir que un jugador pueda asegurar un turno mediante el pago de una seña.**
