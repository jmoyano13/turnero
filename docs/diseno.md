# ESPECIFICACIÓN TÉCNICA Y DE ARQUITECTURA DE SOFTWARE
## Sistema de Gestión de Turnos para Canchas de Pádel

---

### TABLA DE CONTENIDOS
1. [Diseño Arquitectónico (Arquitectura del Sistema)](#1-diseño-arquitectónico-arquitectura-del-sistema)
2. [Diseño de la Base de Datos (Especificación de Datos)](#2-diseño-de-la-base-de-datos-especificación-de-datos)
3. [Diseño de Interfaces (API & Endpoints)](#3-diseño-de-interfaces-api--endpoints)
4. [Diseño de Componentes Clave](#4-diseño-de-componentes-clave)
5. [Diseño de Interfaz de Usuario (UI Layouts / Wireframes)](#5-diseño-de-interfaz-de-usuario-ui-layouts--wireframes)
6. [Estrategia de Verificación y Validación (V&V / Plan de Pruebas)](#6-estrategia-de-verificación-y-validación-vv--plan-de-pruebas)
7. [Configuración de Entornos y Despliegue (CI/CD)](#7-configuración-de-entornos-y-despliegue-cicd)

---

### 1. DISEÑO ARQUITECTÓNICO (ARQUITECTURA DEL SISTEMA)

#### 1.1. Visión General de la Arquitectura
Sistema de tres capas desacopladas que utiliza Next.js App Router como backend/frontend unificado, Supabase como motor de persistencia/autenticación y servicios externos desacoplados para pagos (Mercado Pago) y notificaciones (Resend).

```
+-----------------------------------------------------------------------------------+
|                                 CAPA DE CLIENTE                                   |
|   Dispositivos Móviles / Desktop (Navegador Web)                                 |
|   Tailwind CSS (UI Responsive Mobile-First)                                       |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTP/HTTPS (RSC, Server Actions)
                                         v
+-----------------------------------------------------------------------------------+
|                           CAPA DE APLICACIÓN (NEXT.JS)                            |
|  - Server Components (RSC): Lectura directa de disponibilidad y perfil            |
|  - Server Actions: Mutaciones (Reservas, Cancelaciones, Bloqueos)                 |
|  - Route Handlers: Endpoint Webhook Mercado Pago (`/api/webhooks/mercadopago`)   |
|  - Middleware: Validación de sesión Supabase y redirección por rol (Owner/Player) |
+-----------------------------------------------------------------------------------+
                       |                                       |
       Supabase SDK    |                                       | HTTP REST API
       (PostgreSQL/RLS)|                                       v
                       v                       +-----------------------------------+
+------------------------------------+         |    SERVICIOS EXTERNOS             |
|    CAPA DE DATOS (SUPABASE)        |         | - Mercado Pago API: Procesamiento |
| - PostgreSQL Engine                |         |   de seña 50%                     |
| - Row Level Security (RLS)         |         | - Resend API: Transaccional Email |
| - RPC (Funciones Atómicas / Locks) |         +-----------------------------------+
+------------------------------------+
```

#### 1.2. Estructura de Proyecto Feature-Based
Organizar la aplicación estrictamente dentro de la carpeta `src/`, distribuyendo componentes, acciones, servicios y tipos por dominio funcional en `src/features/`.

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (player)/
│   │   ├── availability/
│   │   │   └── page.tsx
│   │   └── reservations/
│   │       └── page.tsx
│   ├── (owner)/
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── api/
│   │   └── webhooks/
│   │       ├── mercadopago/
│   │       │   └── route.ts
│   │       └── resend/
│   │           └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── features/
│   ├── auth/
│   │   ├── actions/
│   │   │   └── auth-actions.ts
│   │   ├── components/
│   │   │   ├── login-form.tsx
│   │   │   └── register-form.tsx
│   │   ├── services/
│   │   │   └── auth-service.ts
│   │   └── types/
│   │       └── auth.types.ts
│   ├── courts/
│   │   ├── components/
│   │   │   ├── court-badge.tsx
│   │   │   └── court-grid.tsx
│   │   ├── services/
│   │   │   └── court-service.ts
│   │   └── types/
│   │       └── court.types.ts
│   ├── bookings/
│   │   ├── actions/
│   │   │   ├── create-booking.ts
│   │   │   ├── cancel-booking.ts
│   │   │   └── modify-booking.ts
│   │   ├── components/
│   │   │   ├── slot-picker.tsx
│   │   │   ├── booking-card.tsx
│   │   │   └── payment-button.tsx
│   │   ├── services/
│   │   │   ├── booking-service.ts
│   │   │   └── mercadopago-service.ts
│   │   └── types/
│   │       └── booking.types.ts
│   ├── locks/
│   │   ├── actions/
│   │   │   ├── create-lock.ts
│   │   │   ├── create-recurring-lock.ts
│   │   │   └── delete-recurring-lock.ts
│   │   ├── components/
│   │   │   ├── lock-modal.tsx
│   │   │   └── recurring-lock-list.tsx
│   │   └── types/
│   │       └── lock.types.ts
│   ├── owner-dashboard/
│   │   ├── components/
│   │   │   ├── schedule-board.tsx
│   │   │   ├── date-selector.tsx
│   │   │   └── manual-booking-modal.tsx
│   │   ├── services/
│   │   │   └── dashboard-service.ts
│   │   └── types/
│   │       └── dashboard.types.ts
│   └── notifications/
│       ├── services/
│       │   └── email-service.ts
│       └── templates/
│           ├── booking-confirmation-email.tsx
│           └── cancellation-email.tsx
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   └── header.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── mercadopago.ts
│   │   └── resend.ts
│   ├── utils/
│   │   └── date-utils.ts
│   └── types/
│       └── database.types.ts
└── middleware.ts
```

#### 1.3. Reglas de Renderizado y Flujo de Datos en Next.js App Router
1. **Server Components por Defecto**:
   - Usar Server Components en todas las páginas (`page.tsx`) y componentes de lectura de datos.
   - Consultar la base de datos Supabase directamente en el servidor utilizando `@supabase/ssr` (`createClient` de servidor).
   - Prohibido hacer `fetch` HTTP a rutas API propias desde Server Components.

2. **Client Components Aislados (`'use client'`)**:
   - Marcar con `'use client'` únicamente hojas del árbol de componentes que requieran interactividad (formularios, selectores de fecha, modales, controladores de eventos `onClick`).
   - Mantener el estado local mínimo (ej. fecha seleccionada en `date-selector.tsx`).

3. **Mutaciones mediante Server Actions**:
   - Ejecutar escrituras de datos (creación de reserva manual, cancelación, bloqueos) mediante Server Actions definidas en `src/features/[feature]/actions/`.
   - Revalidar la caché de la página usando `revalidatePath('/availability')` o `revalidateTag('schedule')` inmediatamente después de mutar datos.

4. **Webhooks mediante Route Handlers**:
   - Procesar la confirmación asíncrona de pagos de Mercado Pago exclusivamente en `src/app/api/webhooks/mercadopago/route.ts`.
   - Validar la firma de la notificación HTTP POST recibida de Mercado Pago antes de procesar el estado de la transacción.

#### 1.4. Modelo de Concurrencia y Control de Carreras (RN-10)
1. **Problema de Concurrencia**:
   - Múltiples jugadores intentando reservar el mismo slot (cancha + fecha + hora inicio) simultáneamente.
   - El inicio del pago en Mercado Pago NO reserva la cancha. Prevalece la seña acreditada primero.

2. **Mecanismo de Resolución Atómica en PostgreSQL (RPC)**:
   - Crear la función almacenada `confirm_booking_payment` en Supabase PostgreSQL.
   - Ejecutar la mutación dentro de una transacción explícita con bloqueo de fila (`SELECT ... FOR UPDATE` en el turno correspondiente).

3. **Firma del Contrato RPC Supabase (`confirm_booking_payment`)**:
```sql
CREATE OR REPLACE FUNCTION confirm_booking_payment(
    p_court_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_player_id UUID,
    p_payment_id TEXT,
    p_amount_paid NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_booking_id UUID;
    v_is_locked BOOLEAN;
    v_existing_booking UUID;
BEGIN
    -- Bloquear consulta de disponibilidad para este slot específico
    PERFORM 1 FROM courts WHERE id = p_court_id FOR UPDATE;

    -- Verificar si existe un bloqueo en ese horario
    SELECT EXISTS (
        SELECT 1 FROM locks 
        WHERE court_id = p_court_id 
          AND lock_date = p_date 
          AND start_time = p_start_time
    ) INTO v_is_locked;

    IF v_is_locked THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SLOT_LOCKED');
    END IF;

    -- Verificar si ya fue confirmado por otro pago
    SELECT id INTO v_existing_booking 
    FROM bookings 
    WHERE court_id = p_court_id 
      AND booking_date = p_date 
      AND start_time = p_start_time 
      AND status = 'CONFIRMED'
    FOR UPDATE;

    IF v_existing_booking IS NOT NULL THEN
        -- Registrar intento fallido para gestionar devolución manual fuera de sistema
        INSERT INTO deposit_refunds_log (player_id, payment_id, amount, reason, created_at)
        VALUES (p_player_id, p_payment_id, p_amount_paid, 'CONCURRENCY_LOST', NOW());

        RETURN jsonb_build_object('success', false, 'reason', 'SLOT_ALREADY_BOOKED');
    END IF;

    -- Crear la reserva confirmada
    INSERT INTO bookings (
        court_id, booking_date, start_time, end_time, 
        player_id, payment_id, deposit_amount, status
    ) VALUES (
        p_court_id, p_date, p_start_time, p_end_time, 
        p_player_id, p_payment_id, p_amount_paid, 'CONFIRMED'
    ) RETURNING id INTO v_booking_id;

    RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.5. Estrategia Mobile-First y Sistema de Diseño UI
1. **Configuración Tailwind CSS**:
   - Prohibición explícita de archivos CSS personalizados o reglas CSS puras. Usar únicamente utilidades atomizadas de Tailwind.
   - Definir diseño base pensado para pantallas de smartphones (360px - 430px) y escalar a pantallas más anchas mediante modificadores de breakpoint (`sm:`, `md:`, `lg:`).

2. **Patrones de Layout Responsivo**:
   - **Tablero del Dueño**:
     - Mobile (`< 768px`): Tablero vertical con pestañas de selección de Cancha 1 y Cancha 2 (`flex flex-col w-full`).
     - Desktop (`>= 768px`): Grilla comparativa de 2 columnas lado a lado (`grid grid-cols-2 gap-4`).
   - **Grilla de Disponibilidad del Jugador**:
     - Mobile: Vista de lista simple scrollable verticalmente con slots de 90 minutos en formato de tarjetas tildables (`w-full py-3 px-4 mb-2 rounded-lg border`).
     - Desktop: Tabla matricial por horarios (`md:grid md:grid-cols-2`).

3. **Directivas de Estilizado UI**:
   - Estados de slot en Tailwind:
     - `Disponible`: `bg-emerald-50 border-emerald-500 text-emerald-900 hover:bg-emerald-100`
     - `Reservado`: `bg-rose-50 border-rose-300 text-rose-700 cursor-not-allowed`
     - `Bloqueado`: `bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed`

# Especificación Técnica: Diseño de Base de Datos y Persistencia

## 1. Esquema Relacional PostgreSQL (DDL Completo)

Ejecutar las siguientes sentencias DDL en Supabase para crear las tablas, enumerados e índices del sistema.

```sql
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tipos Enumerados
CREATE TYPE user_role AS ENUM ('owner', 'player');
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('none', 'pending', 'paid', 'refund_pending');
CREATE TYPE lock_type AS ENUM ('one_time', 'recurring');
CREATE TYPE lock_scope AS ENUM ('single', 'both');
CREATE TYPE refund_status AS ENUM ('pending_manual_refund', 'resolved');

-- 2. Tabla Perfiles (Extiende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_numbers TEXT[] NOT NULL DEFAULT '{}',
  role user_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla Canchas (Exactamente 2 canchas - RN-01)
CREATE TABLE public.courts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserción inicial fija de las 2 canchas del MVP
INSERT INTO public.courts (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Cancha 1'),
  ('22222222-2222-2222-2222-222222222222', 'Cancha 2');

-- 4. Configuración Global de Precios (RN-04)
CREATE TABLE public.system_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_price NUMERIC(10, 2) NOT NULL CHECK (current_price > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Inserción inicial de precio base
INSERT INTO public.system_settings (id, current_price) VALUES (1, 15000.00);

-- 5. Tabla Reservas (Turnos)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Nullable para reservas manuales
  manual_player_name TEXT, -- Usado cuando player_id es NULL en reserva manual (RN-12)
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'confirmed',
  is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  total_price NUMERIC(10, 2) NOT NULL, -- Preserva precio histórico al momento de reservar (RN-05)
  deposit_amount NUMERIC(10, 2) NOT NULL, -- 50% del total_price (RN-06)
  payment_status payment_status NOT NULL DEFAULT 'none',
  payment_id TEXT UNIQUE, -- Preference ID o Payment ID de Mercado Pago
  paid_at TIMESTAMPTZ,
  refund_required BOOLEAN NOT NULL DEFAULT FALSE, -- Indica devolución pendiente si se cancela (RN-14, RN-17)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Validaciones de integridad a nivel de fila
  CONSTRAINT check_duration CHECK (end_time = start_time + INTERVAL '90 minutes'),
  CONSTRAINT check_manual_player CHECK (
    (is_manual = FALSE AND player_id IS NOT NULL) OR
    (is_manual = TRUE AND (player_id IS NOT NULL OR manual_player_name IS NOT NULL))
  )
);

-- 6. Tabla Bloqueos de Horario (Puntuales y Recurrentes - RN-18, RN-19)
CREATE TABLE public.locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE, -- NULL si court_scope = 'both'
  court_scope lock_scope NOT NULL DEFAULT 'single',
  lock_type lock_type NOT NULL,
  reason TEXT NOT NULL,
  specific_date DATE, -- Obligatorio para lock_type = 'one_time'
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo..6=Sábado. Obligatorio para lock_type = 'recurring'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT check_lock_target CHECK (
    (court_scope = 'single' AND court_id IS NOT NULL) OR
    (court_scope = 'both' AND court_id IS NULL)
  ),
  CONSTRAINT check_lock_type_data CHECK (
    (lock_type = 'one_time' AND specific_date IS NOT NULL AND day_of_week IS NULL) OR
    (lock_type = 'recurring' AND day_of_week IS NOT NULL AND specific_date IS NULL)
  )
);

-- 7. Tabla Registro de Devolución de Señas (RN-14, RN-17, RN-10)
CREATE TABLE public.deposit_refunds_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id),
  manual_player_name TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL, -- 'cancelled_by_player', 'cancelled_by_owner', 'concurrency_overpayment'
  status refund_status NOT NULL DEFAULT 'pending_manual_refund',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Índices de Alto Rendimiento
CREATE INDEX idx_bookings_date_court ON public.bookings(booking_date, court_id) WHERE status = 'confirmed';
CREATE INDEX idx_bookings_player ON public.bookings(player_id);
CREATE INDEX idx_bookings_payment_id ON public.bookings(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_locks_one_time ON public.locks(specific_date, court_id) WHERE lock_type = 'one_time' AND is_active = TRUE;
CREATE INDEX idx_locks_recurring ON public.locks(day_of_week, court_id) WHERE lock_type = 'recurring' AND is_active = TRUE;
```

---

## 2. Políticas de Seguridad Supabase (Row Level Security - RLS)

Aplicar las políticas de seguridad estrictas a nivel de fila. Ninguna tabla queda sin RLS habilitado.

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_refunds_log ENABLE ROW LEVEL SECURITY;

-- Función Auxiliar: Verificar si el usuario autenticado es Dueño
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- POLÍTICAS PARA PROFILES ---
CREATE POLICY "Lectura pública de perfiles propios y del dueño"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_owner());

CREATE POLICY "Actualización de perfil propio"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())); -- Previene auto-escalación a 'owner'

-- --- POLÍTICAS PARA COURTS ---
CREATE POLICY "Lectura pública de canchas"
  ON public.courts FOR SELECT
  USING (TRUE);

-- --- POLÍTICAS PARA SYSTEM_SETTINGS ---
CREATE POLICY "Lectura pública del precio actual"
  ON public.system_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Escritura exclusiva del dueño en configuración"
  ON public.system_settings FOR UPDATE
  USING (public.is_owner());

-- --- POLÍTICAS PARA BOOKINGS ---
CREATE POLICY "Jugadores ven sus propias reservas"
  ON public.bookings FOR SELECT
  USING (auth.uid() = player_id OR public.is_owner());

CREATE POLICY "Permitir inserción de reservas por jugador autenticado o dueño"
  ON public.bookings FOR INSERT
  WITH CHECK (
    (auth.uid() = player_id AND is_manual = FALSE) OR
    public.is_owner()
  );

CREATE POLICY "Actualización de reservas exclusiva para el dueño o cancelación propia"
  ON public.bookings FOR UPDATE
  USING (
    public.is_owner() OR 
    (auth.uid() = player_id AND status = 'confirmed')
  );

-- --- POLÍTICAS PARA LOCKS ---
CREATE POLICY "Lectura pública de bloqueos"
  ON public.locks FOR SELECT
  USING (TRUE);

CREATE POLICY "Gestión total de bloqueos exclusiva para el dueño"
  ON public.locks FOR ALL
  USING (public.is_owner());

-- --- POLÍTICAS PARA DEPOSIT_REFUNDS_LOG ---
CREATE POLICY "Acceso exclusivo de devolución al dueño"
  ON public.deposit_refunds_log FOR ALL
  USING (public.is_owner());
```

---

## 3. Funciones PL/pgSQL, Triggers y RPC (Lógica Crítica en DB)

### 3.1. Auto-creación de Perfil al Registrarse (Trigger Auth)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone_numbers, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    CASE 
      WHEN NEW.raw_user_meta_data->>'phone' IS NOT NULL THEN ARRAY[NEW.raw_user_meta_data->>'phone']
      ELSE '{}'::TEXT[]
    END,
    'player'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.2. Proceso Atómico de Confirmación de Pago y Resolución de Concurrencia (RPC - RN-10)
Garantiza exclusión mutua mediante `SELECT ... FOR UPDATE` para resolver intentos simultáneos de reserva sobre un mismo turno.

```sql
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_booking_id UUID,
  p_payment_id TEXT,
  p_amount_paid NUMERIC(10, 2)
)
RETURNS JSONB AS $$
DECLARE
  v_booking RECORD;
  v_conflict_exists BOOLEAN;
BEGIN
  -- 1. Bloquear la fila de la reserva a confirmar para evitar condiciones de carrera
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'BOOKING_NOT_FOUND');
  END IF;

  -- 2. Si ya está pagada y confirmada con este mismo payment_id (idempotencia)
  IF v_booking.payment_status = 'paid' AND v_booking.payment_id = p_payment_id THEN
    RETURN jsonb_build_object('success', true, 'status', 'ALREADY_PROCESSED');
  END IF;

  -- 3. Verificar si existe OTRA reserva confirmada que compita exactamente en el mismo slot
  SELECT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE court_id = v_booking.court_id
      AND booking_date = v_booking.booking_date
      AND start_time = v_booking.start_time
      AND status = 'confirmed'
      AND payment_status = 'paid'
      AND id <> p_booking_id
  ) INTO v_conflict_exists;

  -- 4. Si ganó la carrera otro jugador (RN-10)
  IF v_conflict_exists THEN
    -- Cancelar esta reserva por colisión y registrar la seña para devolución fuera del sistema
    UPDATE public.bookings
    SET status = 'cancelled',
        payment_status = 'refund_pending',
        refund_required = TRUE,
        payment_id = p_payment_id,
        updated_at = NOW()
    WHERE id = p_booking_id;

    INSERT INTO public.deposit_refunds_log (
      booking_id, player_id, manual_player_name, amount, reason, status
    ) VALUES (
      p_booking_id, v_booking.player_id, v_booking.manual_player_name, p_amount_paid, 'concurrency_overpayment', 'pending_manual_refund'
    );

    RETURN jsonb_build_object('success', false, 'reason', 'SLOT_ALREADY_TAKEN_REFUND_REGISTERED');
  END IF;

  -- 5. Si la cancha está libre, confirmar la reserva
  UPDATE public.bookings
  SET status = 'confirmed',
      payment_status = 'paid',
      payment_id = p_payment_id,
      paid_at = NOW(),
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'status', 'CONFIRMED');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Contratos e Interfaces TypeScript (`src/shared/types/database.ts`)

Generar tipos estáticos estrictos mapeados directamente contra el esquema de Supabase.

```typescript
export type UserRole = 'owner' | 'player';
export type BookingStatus = 'confirmed' | 'cancelled';
export type PaymentStatus = 'none' | 'pending' | 'paid' | 'refund_pending';
export type LockType = 'one_time' | 'recurring';
export type LockScope = 'single' | 'both';
export type RefundStatus = 'pending_manual_refund' | 'resolved';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_numbers: string[];
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Court {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface SystemSettings {
  id: number;
  current_price: number;
  updated_at: string;
  updated_by?: string | null;
}

export interface Booking {
  id: string;
  court_id: string;
  player_id?: string | null;
  manual_player_name?: string | null;
  booking_date: string; // ISO Format YYYY-MM-DD
  start_time: string;   // Format HH:mm:ss
  end_time: string;     // Format HH:mm:ss
  status: BookingStatus;
  is_manual: boolean;
  total_price: number;
  deposit_amount: number;
  payment_status: PaymentStatus;
  payment_id?: string | null;
  paid_at?: string | null;
  refund_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lock {
  id: string;
  court_id?: string | null;
  court_scope: LockScope;
  lock_type: LockType;
  reason: string;
  specific_date?: string | null;
  day_of_week?: number | null; // 0..6
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface DepositRefundLog {
  id: string;
  booking_id: string;
  player_id?: string | null;
  manual_player_name?: string | null;
  amount: number;
  reason: string;
  status: RefundStatus;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
}

// Estructura DTO consolidada para Slots de Disponibilidad en UI
export interface TimeSlotDTO {
  start_time: string;
  end_time: string;
  court_id: string;
  court_name: string;
  status: 'available' | 'booked' | 'locked';
  booking_id?: string;
  lock_reason?: string;
  price: number;
}
```

# Especificación Técnica: Diseño de Interfaces (API & Endpoints)

## 1. Arquitectura de Interfaces en Next.js App Router

El sistema no expone una API REST tradicional de endpoints para consumo interno del cliente UI. En su lugar, utiliza dos patrones nativos de Next.js según el tipo de interacción:

1. **Mutaciones de Datos (Internas)**: Implementadas mediante **React Server Actions** ubicadas en cada módulo de `src/features/[feature]/actions/`. Ejecutan en el servidor con seguridad integrada (`'use server'`).
2. **Integraciones de Terceros (Externas)**: Implementadas mediante **Route Handlers** en `src/app/api/webhooks/` para recepcionar callbacks asíncronos (Mercado Pago IPN / Webhooks).
3. **Lecturas de Datos (Internas)**: Ejecutadas directamente desde Server Components usando la Capa de Acceso a Datos (**Data Access Layer - DAL**) en `src/features/[feature]/queries/` sin sobrecosto de red HTTP.

---

## 2. Tipos de Estado y Contratos Generales (`src/shared/types/api.ts`)

```typescript
export type ActionState<T = void> = 
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

---

## 3. Webhook de Integración Externa: Mercado Pago

### Endpoint: `POST /api/webhooks/mercadopago`
* **Archivo:** `src/app/api/webhooks/mercadopago/route.ts`
* **Propósito:** Recepcionar notificaciones de pago de Mercado Pago, verificar autenticidad de la firma, validar estado del pago y confirmar la reserva atómicamente.

#### Headers Requeridos
* `x-signature`: String en formato `ts=...,v1=...` generado por Mercado Pago.
* `x-request-id`: UUID generado por Mercado Pago.

#### Estrategia de Autenticación y Verificación de Firma HMAC
1. Extraer timestamp `ts` y hash `v1` del header `x-signature`.
2. Obtener la clave secreta `MERCADOPAGO_WEBHOOK_SECRET` del entorno.
3. Construir manifest: `id:[data.id_from_query];request-id:[x-request-id];ts:[ts];`.
4. Generar HMAC SHA-256 usando la clave secreta y comparar con `v1` mediante `crypto.timingSafeEqual`. Si no coincide, rechazar con HTTP 401.

#### Flujo de Procesamiento Interno
```text
POST /api/webhooks/mercadopago
  │
  ├─► Validar firma HMAC-SHA256 con MERCADOPAGO_WEBHOOK_SECRET
  │    ├─► Inválida ──► HTTP 401 Unauthorized
  │
  ├─► Parsear Body / Query (type === "payment")
  │    ├─► Tipo != "payment" ──► HTTP 200 OK (Ignorar evento no relevante)
  │
  ├─► Fetch detalles del pago a la API REST de Mercado Pago (GET /v1/payments/{id})
  │
  ├─► Verificar status === "approved"
  │    ├─► Status != "approved" ──► HTTP 200 OK (Sin acción en base de datos)
  │
  ├─► Obtener external_reference (booking_id) y mp_payment_id
  │
  ├─► Ejecutar RPC Supabase: public.confirm_booking_payment(p_booking_id, p_payment_id, p_deposit_amount)
  │    ├─► Transacción exitosa ──► Disparar email vía Resend (resend.emails.send) ──► HTTP 200 OK
  │    └─► Colisión/Error en RPC ──► Loguear en deposit_refunds_log ──► HTTP 200 OK
```

#### Respuestas HTTP
* `200 OK`: Notificación procesada correctamente (o ignorada si no es un evento de pago aprobado).
* `400 Bad Request`: Payload malformado o faltan parámetros indispensables.
* `401 Unauthorized`: Firma HMAC inválida.
* `500 Internal Server Error`: Fallo de conexión con Mercado Pago o Supabase SDK.

---

## 4. ESPECIFICACIÓN DE SERVER ACTIONS (MUTACIONES)

### 4.1. Módulo Bookings (`src/features/bookings/actions/`)

#### `createBookingPreferenceAction`
* **Archivo:** `src/features/bookings/actions/create-preference.action.ts`
* **Propósito:** Iniciar el flujo de reserva de un jugador. Crea una reserva en estado `pending_payment` y genera la preferencia de pago en Mercado Pago.
* **Firmas e Interfaces:**

```typescript
import { z } from 'zod';
import { ActionState } from '@/shared/types/api';

export const CreateBookingSchema = z.object({
  courtId: z.string().uuid(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startTime: z.string().regex(/^\d{2}:\d{2}:00$/),      // HH:mm:ss (ej. 18:00:00)
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export interface BookingPreferenceOutput {
  bookingId: string;
  preferenceId: string;
  initPoint: string;
}

export async function createBookingPreferenceAction(
  input: CreateBookingInput
): Promise<ActionState<BookingPreferenceOutput>>;
```

* **Reglas de Negocio Aplicadas:**
  * Validar RN-21: `bookingDate` <= Fecha Actual + 7 días.
  * Validar RN-22: `bookingDate` + `startTime` > Fecha/Hora Actual UTC-3.
  * Validar RN-13: Verificar que el turno no esté bloqueado ni reservado (`status = 'confirmed'`).
  * Consultar `system_settings` para obtener `current_price` y calcular `deposit_amount = current_price * 0.50` (RN-06).
  * Crear registro en `bookings` con `payment_status = 'pending'`, `total_price`, `deposit_amount` (RN-05).
  * Llamar al SDK de Mercado Pago `preference.create()` asignando `external_reference = booking.id`.

---

#### `cancelBookingPlayerAction`
* **Archivo:** `src/features/bookings/actions/cancel-booking-player.action.ts`
* **Propósito:** Permite a un jugador cancelar una reserva confirmada desde su perfil.
* **Firmas e Interfaces:**

```typescript
export const CancelBookingPlayerSchema = z.object({
  bookingId: z.string().uuid(),
});

export type CancelBookingPlayerInput = z.infer<typeof CancelBookingPlayerSchema>;

export interface CancelBookingPlayerOutput {
  success: boolean;
  refundRequired: boolean;
}

export async function cancelBookingPlayerAction(
  input: CancelBookingPlayerInput
): Promise<ActionState<CancelBookingPlayerOutput>>;
```

* **Reglas de Negocio Aplicadas:**
  * Verificar autenticación: El `user_id` del token JWT debe coincidir con `bookings.player_id`.
  * Validar RN-16: Diferencia entre la fecha/hora actual y `booking_date + start_time` >= 12 horas. Si es < 12 horas, retornar `ActionState` con error `"No se puede cancelar la reserva con menos de 12 horas de anticipación."`.
  * Ejecutar actualización en DB: `status = 'cancelled_by_player'`, `refund_required = (payment_status == 'paid')`.
  * Revalidar caché usando `revalidatePath('/profile/bookings')` y `revalidateTag('court-availability')`.

---

### 4.2. Módulo Owner Dashboard (`src/features/owner-dashboard/actions/`)

#### `createManualBookingAction`
* **Archivo:** `src/features/owner-dashboard/actions/create-manual-booking.action.ts`
* **Propósito:** Permitir al dueño agendar un turno manualmente sin cobro de seña.
* **Firmas e Interfaces:**

```typescript
export const CreateManualBookingSchema = z.object({
  courtId: z.string().uuid(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}:00$/),
  isRegisteredPlayer: z.boolean(),
  playerId: z.string().uuid().optional(),
  manualPlayerName: z.string().min(2).max(100).optional(),
}).refine(data => {
  if (data.isRegisteredPlayer) return !!data.playerId;
  return !!data.manualPlayerName;
}, { message: "Debe proveer un jugador registrado o un nombre manual." });

export type CreateManualBookingInput = z.infer<typeof CreateManualBookingSchema>;

export async function createManualBookingAction(
  input: CreateManualBookingInput
): Promise<ActionState<{ bookingId: string }>>;
```

* **Reglas de Negocio Aplicadas:**
  * Requiere rol `owner` en `profiles`.
  * Validar RN-11: Se inserta con `status = 'confirmed'`, `booking_type = 'manual'`, `payment_status = 'unpaid'`, `deposit_amount = 0`.
  * Validar RN-12: Si `isRegisteredPlayer` es `false`, se guarda exclusivamente `manual_player_name` y `player_id = NULL`.
  * Revalidar caché con `revalidatePath('/dashboard')` y `revalidateTag('court-availability')`.

---

#### `updateBookingOwnerAction`
* **Archivo:** `src/features/owner-dashboard/actions/update-booking.action.ts`
* **Propósito:** Permitir al dueño cambiar de cancha, fecha o horario de un turno existente.
* **Firmas e Interfaces:**

```typescript
export const UpdateBookingOwnerSchema = z.object({
  bookingId: z.string().uuid(),
  newCourtId: z.string().uuid(),
  newBookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newStartTime: z.string().regex(/^\d{2}:\d{2}:00$/),
});

export type UpdateBookingOwnerInput = z.infer<typeof UpdateBookingOwnerSchema>;

export async function updateBookingOwnerAction(
  input: UpdateBookingOwnerInput
): Promise<ActionState<{ success: boolean }>>;
```

* **Reglas de Negocio Aplicadas:**
  * Requiere rol `owner`.
  * Validar RN-13: Preservar `total_price`, `deposit_amount` y `payment_status` originales.
  * Verificar disponibilidad del nuevo destino (cancha, fecha, hora). Retornar error si ya está reservado o bloqueado.

---

#### `cancelBookingOwnerAction`
* **Archivo:** `src/features/owner-dashboard/actions/cancel-booking-owner.action.ts`
* **Propósito:** Permitir al dueño cancelar de forma administrativa cualquier reserva.
* **Firmas e Interfaces:**

```typescript
export const CancelBookingOwnerSchema = z.object({
  bookingId: z.string().uuid(),
  cancellationReason: z.string().optional(),
});

export type CancelBookingOwnerInput = z.infer<typeof CancelBookingOwnerSchema>;

export async function cancelBookingOwnerAction(
  input: CancelBookingOwnerInput
): Promise<ActionState<{ success: boolean; refundRequired: boolean }>>;
```

* **Reglas de Negocio Aplicadas:**
  * Requiere rol `owner`.
  * Validar RN-14: Cambiar `status = 'cancelled_by_owner'`. Si `payment_status === 'paid'`, establecer `refund_required = true` e insertar registro en `deposit_refunds_log`.

---

### 4.3. Módulo Locks (`src/features/locks/actions/`)

#### `createLockAction`
* **Archivo:** `src/features/locks/actions/create-lock.action.ts`
* **Propósito:** Crear un bloqueo de cancha individual o recurrente.
* **Firmas e Interfaces:**

```typescript
export const CreateLockSchema = z.object({
  scope: z.enum(['single', 'both']),
  courtId: z.string().uuid().optional(), // Requerido si scope === 'single'
  lockType: z.enum(['one_time', 'recurring']),
  lockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Requerido si lockType === 'one_time'
  dayOfWeek: z.number().int().min(0).max(6).optional(),       // Requerido si lockType === 'recurring' (0=Dom, 6=Sáb)
  startTime: z.string().regex(/^\d{2}:\d{2}:00$/),
  endTime: z.string().regex(/^\d{2}:\d{2}:00$/),
  reason: z.string().min(2),
}).refine(data => {
  if (data.scope === 'single' && !data.courtId) return false;
  if (data.lockType === 'one_time' && !data.lockDate) return false;
  if (data.lockType === 'recurring' && data.dayOfWeek === undefined) return false;
  return true;
}, { message: "Parámetros de bloqueo inconsistentes con el alcance y tipo elegidos." });

export type CreateLockInput = z.infer<typeof CreateLockSchema>;

export interface AffectedBookingWarning {
  bookingId: string;
  playerIdentifier: string;
  bookingDate: string;
  startTime: string;
}

export async function createLockAction(
  input: CreateLockInput
): Promise<ActionState<{ lockId: string; warnings: AffectedBookingWarning[] }>>;
```

* **Reglas de Negocio Aplicadas:**
  * Requiere rol `owner`.
  * Validar RN-18, RN-19: Insertar registro en la tabla `locks`.
  * Validar RN-20: Ejecutar consulta sobre `bookings` confirmados que coincidan con la cancha y horario del bloqueo. Si existen reservas, NO abortar ni cancelar las reservas; devolver la lista de reservas solapadas en la propiedad `warnings` para advertir al dueño en UI.

---

#### `deleteLockAction`
* **Archivo:** `src/features/locks/actions/delete-lock.action.ts`
* **Propósito:** Eliminar un bloqueo existente (puntual o recurrente).
* **Firmas e Interfaces:**

```typescript
export const DeleteLockSchema = z.object({
  lockId: z.string().uuid(),
});

export type DeleteLockInput = z.infer<typeof DeleteLockSchema>;

export async function deleteLockAction(
  input: DeleteLockInput
): Promise<ActionState<{ success: boolean }>>;
```

---

### 4.4. Módulo Auth & Profile (`src/features/auth/actions/`)

#### `updateProfileAction`
* **Archivo:** `src/features/auth/actions/update-profile.action.ts`
* **Propósito:** Actualizar datos personales y teléfonos del jugador.
* **Firmas e Interfaces:**

```typescript
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phoneNumbers: z.array(z.string().min(8)),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ActionState<{ success: boolean }>>;
```

---

## 5. CAPA DE CONSULTAS (DATA ACCESS LAYER - DAL / SERVER QUERIES)

Funciones asíncronas optimizadas ejecutadas exclusivamente en Server Components para la hidratación directa del HTML.

### 5.1. `getAvailabilityByDateQuery`
* **Archivo:** `src/features/courts/queries/get-availability.query.ts`
* **Firma:** `export async function getAvailabilityByDateQuery(date: string): Promise<TimeSlotDTO[]>`
* **Lógica Interna:**
  1. Generar todos los slots de 90 minutos de las 24 horas para la fecha solicitada y para ambas canchas (Cancha 1 y Cancha 2).
  2. Consultar reservas activas (`bookings`) para esa fecha.
  3. Consultar bloqueos puntuales y recurrentes (`locks`) aplicables al día de la semana correspondiente.
  4. Mapear y calcular las reglas de disponibilidad (RN-13, RN-21, RN-22).
  5. Retornar arreglo estructurado de `TimeSlotDTO`.

### 5.2. `getPlayerBookingsQuery`
* **Archivo:** `src/features/bookings/queries/get-player-bookings.query.ts`
* **Firma:** `export async function getPlayerBookingsQuery(): Promise<BookingWithCourt[]>`
* **Lógica Interna:**
  1. Obtener usuario autenticado vía `supabase.auth.getUser()`.
  2. Consultar `bookings` donde `player_id = user.id` ordenado por `booking_date DESC, start_time DESC`.
  3. Incluir relación con tabla `courts`.

### 5.3. `getDailyDashboardQuery`
* **Archivo:** `src/features/owner-dashboard/queries/get-daily-dashboard.query.ts`
* **Firma:** `export async function getDailyDashboardQuery(date: string): Promise<DashboardDayViewDTO>`
* **Lógica Interna:**
  1. Consultar ambas canchas.
  2. Obtener reservas confirmadas y manuales del día con los datos de perfiles asociados o nombres manuales.
  3. Obtener bloqueos vigentes del día.
  4. Retornar la estructura para renderizado directo del tablero matricial de turnos.
TargetFile: /workspace/scratch/diseno-interfaces-api.md

# Especificación Técnica de Arquitectura: Diseño de Componentes Clave

## 1. Principios de Fronteras de Renderizado (RSC Boundaries)
* **Server Components (RSC) por Defecto**: Todos los componentes en `src/features/` y `src/app/` son RSC a menos que requieran explícitamente APIs del navegador, hooks de estado (`useState`, `useReducer`), hooks de ciclo de vida (`useEffect`) o manejadores de eventos DOM (`onClick`, `onChange`).
* **Client Component Isolation**: Aislar las hojas del árbol visual con `'use client'` al menor nivel posible para maximizar el código ejecutable en el servidor y reducir el bundle bundle transferido al cliente.
* **Composición Servidor/Cliente**: Pasar Server Components como `children` a Client Components cuando un contenedor cliente (ej. un modal o colapsable) necesite renderizar subárboles con fetching de servidor.
* **Inyección de Server Actions**: Pasar Server Actions como callbacks o invocar directamente desde `useActionState` y `useTransition` dentro de Client Components.

---

## 2. Módulo `courts` (Disponibilidad y Canchas)

### 2.1. `CourtGridServer`
* **Ruta de Archivo**: `src/features/courts/components/CourtGridServer.tsx`
* **Tipo**: React Server Component (RSC).
* **Firma de Props**:
  ```typescript
  interface CourtGridServerProps {
    selectedDate: string; // Formato YYYY-MM-DD
    userRole: 'owner' | 'player' | 'guest';
    userId?: string;
  }
  ```
* **Responsabilidad**:
  * Ejecutar la consulta `getAvailabilityByDateQuery(selectedDate, userRole, userId)` directamente en la capa de datos.
  * Mapear los intervalos de 90 minutos para las dos canchas.
  * Componer la grilla y delegar la interacción de cada celda a `TimeSlotCard`.
* **Dependencias**: `getAvailabilityByDateQuery`, `TimeSlotCard`.

### 2.2. `TimeSlotCard`
* **Ruta de Archivo**: `src/features/courts/components/TimeSlotCard.tsx`
* **Tipo**: Client Component (`'use client'`).
* **Firma de Props**:
  ```typescript
  import { TimeSlotDTO } from '@/shared/types/database';

  interface TimeSlotCardProps {
    slot: TimeSlotDTO;
    userRole: 'owner' | 'player' | 'guest';
    onSelectSlot: (slot: TimeSlotDTO) => void;
  }
  ```
* **Estado Interno**: Ninguno.
* **Responsabilidad**:
  * Renderizar la tarjeta del turno con estilos condicionales Tailwind CSS según `slot.status` (`available`: `bg-emerald-950/40 border-emerald-500/30 text-emerald-400`, `booked`: `bg-rose-950/40 border-rose-500/30 text-rose-400`, `locked`: `bg-slate-900 border-slate-800 text-slate-500`).
  * Aplicar soporte táctil mobile-first (`touch-manipulation active:scale-95 transition-transform`).
  * Disparar callback `onSelectSlot` al hacer tap/click.

### 2.3. `DatePickerBar`
* **Ruta de Archivo**: `src/features/courts/components/DatePickerBar.tsx`
* **Tipo**: Client Component (`'use client'`).
* **Firma de Props**:
  ```typescript
  interface DatePickerBarProps {
    currentDate: string; // Formato YYYY-MM-DD
    isOwner: boolean;
  }
  ```
* **Estado Interno**:
  * `selectedDate`: Estado derivado de los parámetros de búsqueda de la URL.
* **Hooks Utilizados**: `useRouter()`, `useSearchParams()`, `usePathname()`.
* **Responsabilidad**:
  * Renderizar barra horizontal deslizable (`flex overflow-x-auto snap-x scrollbar-none gap-2 py-2`).
  * Para jugadores, restringir opciones a un máximo estricto de 7 días futuros a partir de la fecha actual (RN-21).
  * Para el dueño, permitir navegación libre en el calendario.
  * Mutar los query params de la URL (`?date=YYYY-MM-DD`) mediante `router.push()` con `{ scroll: false }` para activar re-renderizado en el servidor mediante RSC.

---

## 3. Módulo `bookings` (Gestión y Procesamiento de Reservas)

### 3.1. `PlayerBookingModal`
* **Ruta de Archivo**: `src/features/bookings/components/PlayerBookingModal.tsx`
* **Tipo**: Client Component (`'use client'`).
* **Firma de Props**:
  ```typescript
  import { TimeSlotDTO } from '@/shared/types/database';

  interface PlayerBookingModalProps {
    slot: TimeSlotDTO | null;
    isOpen: boolean;
    onClose: () => void;
  }
  ```
* **Estado Interno**:
  * `isPending`: Obtención del estado de transición con `useTransition()`.
  * `errorMessage`: Estado local para fallos en la generación de la preferencia de pago.
* **Responsabilidad**:
  * Desplegar sheet modal interactivo amigable para móviles (`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-slate-900 p-6 shadow-xl md:relative md:rounded-xl`).
  * Mostrar resumen desglosado: Cancha, Fecha, Horario (90 min), Precio Total ($100%) y Monto de Seña a Pagar ($50%).
  * Al confirmar, invocar la Server Action `createBookingPreferenceAction`.
  * Redireccionar inmediatamente la ventana al Checkout de Mercado Pago (`window.location.href = initPoint`).

### 3.2. `OwnerManualBookingModal`
* **Ruta de Archivo**: `src/features/bookings/components/OwnerManualBookingModal.tsx`
* **Tipo**: Client Component (`'use client'`).
* **Firma de Props**:
  ```typescript
  import { TimeSlotDTO } from '@/shared/types/database';

  interface OwnerManualBookingModalProps {
    slot: TimeSlotDTO | null;
    isOpen: boolean;
    onClose: () => void;
    registeredPlayers: Array<{ id: string; fullName: string; email: string }>;
  }
  ```
* **Estado Interno**:
  * `isRegisteredUser`: Toggle booleano (`true`: seleccionar usuario registrado, `false`: ingresar jugador no registrado).
  * `selectedPlayerId`: ID del jugador seleccionado del desplegable.
  * `manualPlayerName`: Nombre en texto plano del jugador no registrado.
* **Responsabilidad**:
  * Permitir al dueño crear una reserva manual instantánea sin cobro de seña dentro del sistema (RN-11).
  * Alternar entre selector autocompletado de usuarios registrados y campo de texto plano para almacenar únicamente el nombre del jugador manual (RN-12).
  * Procesar el formulario mediante `useActionState` con `createManualBookingAction`.

### 3.3. `PlayerBookingsListServer`
* **Ruta de Archivo**: `src/features/bookings/components/PlayerBookingsListServer.tsx`
* **Tipo**: React Server Component (RSC).
* **Firma de Props**:
  ```typescript
  interface PlayerBookingsListServerProps {
    userId: string;
  }
  ```
* **Responsabilidad**:
  * Consultar `getPlayerBookingsQuery(userId)` directamente en PostgreSQL.
  * Renderizar la lista de reservas pasadas y futuras ordenadas cronológicamente.
  * Renderizar subcomponente `CancelBookingButton` únicamente en las reservas activas.

### 3.4. `CancelBookingButton`
* **Ruta de Archivo**: `src/features/bookings/components/CancelBookingButton.tsx`
* **Tipo**: Client Component (`'use client'`).
* **Firma de Props**:
  ```typescript
  interface CancelBookingButtonProps {
    bookingId: string;
    startTime: string; // Formato ISO String
    isOwner: boolean;
  }
  ```
* **Estado Interno**:
  * `isConfirmOpen`: Control del diálogo modal de confirmación de cancelación.
* **Responsabilidad**:
  * Para jugadores, validar si el horario de inicio cumple la regla de al menos 12 horas previas (`diffInHours >= 12`) (RN-16). Si restan menos de 12 horas, deshabilitar el botón y mostrar mensaje indicativo.
  * Para el dueño, permitir cancelación en cualquier momento.
  * Invocar `cancelBookingPlayerAction` o `cancelBookingOwnerAction` según el rol activo.

---

## 4. Módulo `owner-dashboard` (Tablero de Control del Dueño)

### 4.1. `OwnerDashboardGrid`
* **Ruta de Archivo**: `src/features/owner-dashboard/components/OwnerDashboardGrid.tsx`
* **Tipo**: React Server Component (RSC).
* **Firma de Props**:
  ```typescript
  interface OwnerDashboardGridProps {
    date: string; // Formato YYYY-MM-DD
  }
  ```
* **Responsabilidad**:
  * Consultar `getDailyDashboardQuery(date)` en el servidor.
  * Construir la matriz visual comparativa de 2 columnas (Cancha 1 vs Cancha 2) agrupada por bloques horarios de 90 minutos (RN-16).
  * Transmitir la información del jugador, estado de la seña y alertas de devoluciones a las celdas cliente.

### 4.2. `BookingEditModal`
* **Ruta de Archivo**: `src/features/owner-dashboard/components/BookingEditModal.tsx`
* **Tipo**: Client Component (`'use client'`).
* **Firma de Props**:
  ```typescript
  import { Booking } from '@/shared/types/database';

  interface BookingEditModalProps {
    booking: Booking | null;
    isOpen: boolean;
    onClose: () => void;
  }
  ```
* **Responsabilidad**:
  * Permitir al dueño cambiar la fecha, el horario de inicio o la cancha asignada a una reserva existente (RN-13).
  * Reenviar los datos a la Server Action `updateBookingOwnerAction`.

---

## 5. Módulo `locks` (Gestión de Bloqueos)

### 5.1. `LockModal`
* **Ruta de Archivo**: `src/features/locks/components/LockModal.tsx`
* **Tipo**: Client Component (`'use client'`).
* **Firma de Props**:
  ```typescript
  interface LockModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultCourtId?: string;
    defaultStartTime?: string;
  }
  ```
* **Estado Interno**:
  * `isRecurring`: Booleano para alternar entre bloqueo puntual y bloqueo recurrente (RN-19).
  * `courtScope`: `'single' | 'both'` (bloquear una cancha o ambas canchas).
  * `dayOfWeek`: Selector de día de la semana (0-6) activo cuando `isRecurring` es `true`.
  * `reason`: Texto descriptivo (ej. "Escuela de Pádel", "Mantenimiento").
* **Responsabilidad**:
  * Capturar la configuración de bloqueos del dueño.
  * Invocar `createLockAction`. Si el servidor retorna una advertencia (`warning`) informando que existe una reserva afectada en ese rango, desplegar banner de confirmación sin bloquear la acción (RN-20).

### 5.2. `RecurringLocksList`
* **Ruta de Archivo**: `src/features/locks/components/RecurringLocksList.tsx`
* **Tipo**: React Server Component (RSC).
* **Responsabilidad**:
  * Consultar la tabla `locks` filtrando registros con `is_recurring = true`.
  * Presentar la lista de reglas activas indicando cancha, día y rango horario.
  * Incluir botón cliente `DeleteLockButton` para invocar `deleteLockAction` y eliminar el bloqueo indefinido (RN-15).

---

## 6. Diagrama de Composición y Jerarquía de Componentes

```text
src/app/(dashboard)/availability/page.tsx (RSC Page)
 ├── DatePickerBar (Client Component)
 └── Suspense [Fallback: CourtGridSkeleton]
      └── CourtGridServer (RSC)
           ├── CourtHeader (RSC)
           └── TimeSlotCard (Client Component x N)
                └── PlayerBookingModal (Client Component)

src/app/(owner)/admin/dashboard/page.tsx (RSC Page)
 ├── DatePickerBar (Client Component)
 └── Suspense [Fallback: DashboardSkeleton]
      └── OwnerDashboardGrid (RSC)
           ├── OwnerSlotCell (Client Component x N)
           ├── OwnerManualBookingModal (Client Component)
           ├── BookingEditModal (Client Component)
           └── LockModal (Client Component)
```

# Especificación Técnica de Arquitectura: Punto 5 — Diseño de Interfaz de Usuario (UI Layouts / Wireframes)

## 5.1 Sistema de Diseño y Tokens de UI (Tailwind CSS)

### 5.1.1 Configuración de Tailwind CSS (`tailwind.config.ts`)
No usar CSS puro ni archivos `.css` adicionales con reglas personalizadas. Todos los estilos deben derivarse estrictamente de utilidades de Tailwind CSS v3+.

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          900: '#0f172a',
        },
        court: {
          available: {
            bg: '#f0fdf4',
            border: '#86efac',
            text: '#166534',
          },
          booked: {
            bg: '#fef2f2',
            border: '#fca5a5',
            text: '#991b1b',
          },
          locked: {
            bg: '#f1f5f9',
            border: '#cbd5e1',
            text: '#475569',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 5.1.2 Tokens de Estado de Turnos (Badges y Contenedores)
Mapeo exacto de estados funcionales a clases utilitarias de Tailwind CSS:

| Estado | Clase Contenedor Tailwind | Clase Badge Tailwind | Texto Badge |
| :--- | :--- | :--- | :--- |
| **Disponible** | `bg-emerald-50 border-emerald-300 hover:border-emerald-500 text-emerald-900` | `bg-emerald-100 text-emerald-800 border-emerald-200` | `Disponible` |
| **Reservado** | `bg-rose-50 border-rose-200 text-rose-900` | `bg-rose-100 text-rose-800 border-rose-200` | `Reservado` |
| **Bloqueado** | `bg-slate-100 border-slate-300 text-slate-600` | `bg-slate-200 text-slate-700 border-slate-300` | `Bloqueado` |
| **Seleccionado (Active)** | `ring-2 ring-emerald-600 bg-emerald-100 border-emerald-600` | `bg-emerald-600 text-white` | `Seleccionado` |

---

## 5.2 Layout Principal y Estructura Mobile-First

### 5.2.1 Shell de la Aplicación (`src/app/layout.tsx`)
*   **Viewport**: Optimizado para dispositivos móviles (`width=device-width, initial-scale=1, maximum-scale=1`).
*   **Navegación Móvil (Bottom Bar)**: Visible en `< md` (`block md:hidden`).
*   **Navegación Escritorio (Top Header)**: Visible en `>= md` (`hidden md:flex`).

```text
+-------------------------------------------------------------+
| [Header Desktop: Logo | Nav Links | Auth Profile] (hidden md) |
+-------------------------------------------------------------+
|                                                             |
|                    <main class="pb-16 md:pb-0">             |
|                       [Contenido de Vista]                  |
|                    </main>                                  |
|                                                             |
+-------------------------------------------------------------+
| [Bottom Nav Mobile: Disponibilidad | Mis Reservas | Perfil] |
| (fixed bottom-0 left-0 right-0 z-40 bg-white border-t)      |
+-------------------------------------------------------------+
```

### 5.2.2 Clases de Estructura de Layout (Tailwind)
```tsx
// src/app/layout.tsx (Fragmento)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full bg-slate-50">
      <body className="flex min-h-full flex-col text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        {/* Top Navbar Desktop */}
        <header className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="rounded-lg bg-emerald-600 p-1.5 text-white">🎾</span>
              <span>PadelControl</span>
            </div>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <a href="/courts" className="text-slate-600 hover:text-emerald-600">Disponibilidad</a>
              <a href="/profile/bookings" className="text-slate-600 hover:text-emerald-600">Mis Reservas</a>
              <a href="/admin/dashboard" className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">Panel Dueño</a>
            </nav>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 pb-20 md:pb-8">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Bottom Nav Mobile */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white py-2 px-3 md:hidden">
          <a href="/courts" className="flex flex-col items-center gap-1 text-xs font-medium text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Turnos</span>
          </a>
          <a href="/profile/bookings" className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 001.105 1.79l.05.025A2 2 0 005 15.555V17a2 2 0 002 2h10a2 2 0 002-2v-1.445a2 2 0 001.105-1.74l.05-.025A2 2 0 0020 10V7a2 2 0 00-2-2H5z" /></svg>
            <span>Reservas</span>
          </a>
          <a href="/profile" className="flex flex-col items-center gap-1 text-xs font-medium text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span>Perfil</span>
          </a>
        </nav>
      </body>
    </html>
  );
}
```

---

## 5.3 Vista Jugador: Consulta de Disponibilidad (`/courts`)

### 5.3.1 Wireframe Estructural (Mobile & Desktop)

```text
+-------------------------------------------------------------+
| Selector de Fecha Horizontal (ScrollX en Mobile)            |
| [< Hoy (Mié 07)]  [Jue 08]  [Vie 09] ... [Mié 14 (+7d)]     |
+-------------------------------------------------------------+
| Indicador de Leyenda:                                       |
| [🟢 Disponible] [🔴 Reservado] [⚪ Bloqueado]                |
+-------------------------------------------------------------+
| Vista Mobile (Tabs de Cancha) / Desktop (Columnas)          |
| Mobile: [ Cancha 1 (Active) ] [ Cancha 2 ]                  |
|                                                             |
| Horario    Estado       Precio     Acción                   |
| 08:00-09:30 Disponible  $15.000    [Reservar (Seña $7.500)] |
| 09:30-11:00 Reservado   $15.000    [No Disponible]          |
| 11:00-12:30 Bloqueado   $15.000    [Escuela de Pádel]       |
+-------------------------------------------------------------+
```

### 5.3.2 Marcado de Layouts y Clases CSS

```tsx
// src/features/courts/components/CourtAvailabilityView.tsx (Wireframe UI)
export function CourtAvailabilityView() {
  return (
    <div className="space-y-4">
      {/* Selector de fecha: scroll horizontal en mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {/* Item de Fecha Activa */}
        <button className="flex min-w-[72px] flex-col items-center rounded-xl bg-emerald-600 p-2.5 text-white shadow-sm ring-2 ring-emerald-600">
          <span className="text-xs font-medium uppercase opacity-80">Mié</span>
          <span className="text-lg font-bold">07</span>
          <span className="text-[10px] font-medium bg-emerald-700 px-1.5 py-0.5 rounded-full mt-1">Hoy</span>
        </button>
        {/* Item de Fecha Inactiva */}
        <button className="flex min-w-[72px] flex-col items-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:border-slate-300">
          <span className="text-xs font-medium uppercase text-slate-400">Jue</span>
          <span className="text-lg font-bold">08</span>
        </button>
      </div>

      {/* Tabs Cancha 1 / Cancha 2 visible solo en mobile */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 md:hidden">
        <button className="rounded-lg bg-white py-2 text-center text-xs font-bold text-slate-900 shadow-sm">Cancha 1</button>
        <button className="rounded-lg py-2 text-center text-xs font-medium text-slate-600">Cancha 2</button>
      </div>

      {/* Grilla: 1 columna en mobile, 2 columnas en md */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Cancha 1 */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="hidden text-base font-bold text-slate-900 md:block">Cancha 1</h2>
          
          {/* Card Turno Disponible */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/60 p-3.5 transition-all">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">08:00 – 09:30</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Disponible</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Precio total: <span className="font-semibold text-slate-700">$15.000</span> (Seña: $7.500)</p>
            </div>
            <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95">
              Reservar
            </button>
          </div>

          {/* Card Turno Reservado */}
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 opacity-80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-500 line-through">09:30 – 11:00</span>
                <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">Reservado</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">No disponible para reserva</p>
            </div>
            <button disabled className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400">
              Ocupado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5.4 Vista Jugador: Modal / Bottom Sheet de Reserva y Pago

### 5.4.1 Layout de Confirmación de Seña
Formato **Bottom Sheet** en pantallas móviles (`fixed bottom-0 inset-x-0 rounded-t-2xl`) y **Modal Centrado** en escritorio (`md:relative md:max-w-lg md:rounded-2xl`).

```text
+-------------------------------------------------------------+
| Modal: Confirmar Reserva de Turno                      [X]  |
+-------------------------------------------------------------+
| Detalle de Turno:                                           |
|  - Cancha: Cancha 1                                         |
|  - Fecha: Miércoles 07/10/2026                              |
|  - Horario: 11:00 - 12:30 (90 min)                          |
+-------------------------------------------------------------+
| Desglose Financiero:                                        |
|  Precio Total Turno:                             $15.000    |
|  Seña Obligatoria (50% Mercado Pago):            $7.500     |
|  Saldo Restante (A pagar en cancha):             $7.500     |
+-------------------------------------------------------------+
| Aviso RN-16:                                                |
| ℹ️ Puedes cancelar con reembolso de seña hasta 12 hs        |
|    antes del turno.                                         |
+-------------------------------------------------------------+
| [ Botón: Pagar Seña con Mercado Pago ($7.500) ]             |
+-------------------------------------------------------------+
```

### 5.4.2 Implementación Tailwind Modal/Sheet

```tsx
// src/features/bookings/components/PlayerBookingSheet.tsx
export function PlayerBookingSheet() {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-bold text-slate-900">Confirmar Reserva</h3>
          <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        <div className="my-5 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resumen del Turno</p>
            <p className="mt-1 text-base font-bold text-slate-900">Cancha 1 — 90 Minutos</p>
            <p className="text-sm font-medium text-slate-600">Miércoles 07 de Octubre, 11:00 a 12:30 hs</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Precio total del turno:</span>
              <span className="font-semibold text-slate-900">$15.000</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold text-base bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              <span>Seña a pagar ahora (50%):</span>
              <span>$7.500</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 px-1">
              <span>Saldo pendiente en cancha:</span>
              <span>$7.500</span>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 flex gap-2">
            <span>ℹ️</span>
            <span>La seña se abona mediante Mercado Pago. La cancelación con devolución es válida hasta 12 horas antes.</span>
          </div>
        </div>

        <button className="w-full rounded-xl bg-sky-600 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-700 active:scale-[0.98]">
          Pagar Seña $7.500 con Mercado Pago
        </button>
      </div>
    </div>
  );
}
```

---

## 5.5 Vista Jugador: Mis Reservas (`/profile/bookings`)

### 5.5.1 Layout de Lista de Reservas
*   Muestra tarjetas individuales con estado de confirmación.
*   Botonera condicional: Si faltan `>= 12 hs` muestra botón "Cancelar Reserva". Si faltan `< 12 hs`, muestra aviso "Plazo de cancelación vencido".

```tsx
// src/features/bookings/components/PlayerBookingsList.tsx
export function PlayerBookingsList() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Mis Reservas</h1>

      {/* Card Reserva Confirmada */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Confirmada (Seña Acreditada)
            </span>
            <h3 className="mt-2 text-lg font-bold text-slate-900">Cancha 2</h3>
            <p className="text-sm font-medium text-slate-600">Viernes 09/10/2026 — 18:00 a 19:30 hs</p>
          </div>
          <span className="text-lg font-extrabold text-slate-900">$15.000</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Seña pagada: $7.500 (Mercado Pago)</span>
          <button className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-100">
            Cancelar Reserva
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 5.6 Vista Dueño: Tablero de Turnos (`/admin/dashboard`)

### 5.6.1 Matriz de Comparación Diaria (Cancha 1 vs Cancha 2)
Tablero responsivo. En móvil muestra cada horario con la comparación horizontal de ambas canchas; en escritorio renderiza una tabla/matriz limpia.

```tsx
// src/features/owner-dashboard/components/OwnerDashboardGrid.tsx
export function OwnerDashboardGrid() {
  return (
    <div className="space-y-4">
      {/* Barra Superior con Selector de Fecha Abrir Calendario */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white">
        <div>
          <p className="text-xs text-slate-400">Panel de Control</p>
          <h1 className="text-lg font-bold">Tablero de Turnos</h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700">
            ➕ Crear Reserva Manual
          </button>
          <button className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
            🔒 Bloquear Horario
          </button>
        </div>
      </div>

      {/* Matriz Diaria de Turnos */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 uppercase">
          <div className="col-span-3 sm:col-span-2">Horario</div>
          <div className="col-span-4 sm:col-span-5">Cancha 1</div>
          <div className="col-span-5 sm:col-span-5">Cancha 2</div>
        </div>

        {/* Fila de Turno 08:00 - 09:30 */}
        <div className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm">
          <div className="col-span-3 sm:col-span-2 font-bold text-slate-800">08:00 - 09:30</div>
          
          {/* Cancha 1: Reservado por Jugador Manual */}
          <div className="col-span-4 sm:col-span-5 pr-2">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs">
              <span className="font-bold text-emerald-900 block">Juan Pérez (Manual)</span>
              <span className="text-[10px] text-emerald-700">Confirmado sin seña</span>
            </div>
          </div>

          {/* Cancha 2: Disponible */}
          <div className="col-span-5 sm:col-span-5 pl-2">
            <div className="rounded-lg border border-dashed border-slate-300 p-2 text-xs text-center text-slate-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer">
              + Asignar Turno
            </div>
          </div>
        </div>

        {/* Fila de Turno 09:30 - 11:00 */}
        <div className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm bg-slate-50/50">
          <div className="col-span-3 sm:col-span-2 font-bold text-slate-800">09:30 - 11:00</div>
          
          {/* Cancha 1: Bloqueado Recurrente */}
          <div className="col-span-4 sm:col-span-5 pr-2">
            <div className="rounded-lg bg-slate-200 border border-slate-300 p-2 text-xs text-slate-700">
              <span className="font-bold block">🔒 Escuela de Pádel</span>
              <span className="text-[10px] text-slate-500">Bloqueo Recurrente</span>
            </div>
          </div>

          {/* Cancha 2: Reservado con Seña */}
          <div className="col-span-5 sm:col-span-5 pl-2">
            <div className="rounded-lg bg-sky-50 border border-sky-200 p-2 text-xs">
              <span className="font-bold text-sky-900 block">Carlos Gómez</span>
              <span className="text-[10px] text-sky-700">Seña Pagada $7.500</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5.7 Vista Dueño: Modales Administrativos

### 5.7.1 Layout de Modal de Reserva Manual (`OwnerManualBookingModal`)
*   Permite alternar entre "Jugador Registrado" (combobox/select) y "Jugador No Registrado" (input `text` para nombre).

```tsx
// src/features/owner-dashboard/components/OwnerManualBookingModal.tsx
export function OwnerManualBookingModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Crear Reserva Manual</h3>
        <p className="text-xs text-slate-500 mb-4">Esta reserva queda confirmada inmediatamente sin cobro de seña.</p>

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cancha y Horario</label>
            <input type="text" disabled value="Cancha 1 — 07/10/2026 (12:30 a 14:00)" className="w-full rounded-lg bg-slate-100 border-slate-200 text-xs p-2.5 text-slate-600 font-medium" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Jugador</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button type="button" className="rounded-lg bg-emerald-50 border border-emerald-500 p-2 font-bold text-emerald-800">No Registrado</button>
              <button type="button" className="rounded-lg border border-slate-200 p-2 font-medium text-slate-600">Registrado</button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Jugador Manual *</label>
            <input type="text" placeholder="Ej: Roberto Roberto" className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none" />
            <p className="text-[10px] text-slate-400 mt-1">Solo se almacenará el nombre (RN-12).</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Confirmar Reserva</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 5.7.2 Layout de Modal de Bloqueo Horario / Recurrente (`LockModal`)
*   Soporta bloqueo puntual o recurrente indefinido por día de la semana (`single` | `both` canchas).
*   Despliega banner de advertencia si la consulta de disponibilidad detecta una reserva activa en ese rango (RN-20).

```tsx
// src/features/locks/components/LockModal.tsx
export function LockModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">Bloquear Horario</h3>
        
        <form className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ámbito de Canchas</label>
            <select className="w-full rounded-lg border border-slate-300 p-2.5 text-xs">
              <option value="single">Solo Cancha 1</option>
              <option value="single">Solo Cancha 2</option>
              <option value="both">Ambas Canchas (Cancha 1 y 2)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="recurring" className="rounded text-emerald-600" />
            <label htmlFor="recurring" className="text-xs font-bold text-slate-800">Bloqueo Recurrente Indefinido (RN-19)</label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Motivo del Bloqueo</label>
            <input type="text" placeholder="Ej: Escuela de Pádel / Mantenimiento" className="w-full rounded-lg border border-slate-300 p-2.5 text-xs" />
          </div>

          {/* Banner Advertencia RN-20 */}
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1">⚠️ Advertencia de Reserva Afectada (RN-20)</p>
            <p className="text-[11px] text-amber-800">
              Existe una reserva activa de <strong>Carlos Gómez</strong> en Cancha 1 para este horario. El bloqueo se creará pero deberás resolver la reserva fuera del sistema.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button>
            <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">Crear Bloqueo</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

# Especificación Técnica: Estrategia de Verificación y Validación (V&V / Plan de Pruebas)

## 1. Estrategia General de V&V
La estrategia de Verificación y Validación asegura el cumplimiento estricto de las Reglas de Negocio (RN) y Requerimientos Funcionales (RF) definidos en `analisis.md`, garantizando la integridad de datos en entornos concurrentes, la seguridad de accesos vía RLS en Supabase y la estabilidad de la UI mobile-first en Next.js App Router.

```
       [ E2E Tests ]           -> Playwright (Flujos completos Jugador y Dueño)
     [ Integration Tests ]     -> Vitest + Supabase Local (Server Actions, RLS, Webhooks)
    [ Concurrency Tests ]      -> k6 / Scripts Node.js (Atomicidad RPC confirm_booking_payment)
  [ Unit & Domain Tests ]      -> Vitest + Zod (Reglas de Negocio aisladas, Utilidades)
```

---

## 2. Niveles de Pruebas y Cobertura

### 2.1. Pruebas Unitarias (Unit Testing)
- **Herramienta**: `Vitest`
- **Ubicación**: `src/features/[feature]/utils/__tests__/` y `src/shared/lib/__tests__/`
- **Alcance**: Funciones puras, utilidades de fecha/hora, esquemas de validación Zod y cálculo de precios.

#### Casos de Prueba Críticos:
1. **Validación de Fechas y Anticipación (RN-21, RN-22)**:
   - `assertValidBookingDate(selectedDate, now)`:
     - Retorna `false` para fechas anteriores a `now`.
     - Retorna `false` para turnos cuya hora de inicio ya ocurrió en el día actual.
     - Retorna `false` para fechas con más de 7 días de anticipación respecto a `now`.
     - Retorna `true` para turnos futuros dentro del rango permitido (0 a 7 días).
2. **Cálculo de Seña y Precio Histórico (RN-04, RN-06)**:
   - `calculateDeposit(totalPrice)`:
     - Entrada: `$15000` -> Salida: `$7500` (exactamente 50%).
3. **Ventana de Cancelación de Jugador (RN-16)**:
   - `isEligibleForCancellation(bookingStartTime, now)`:
     - Retorna `true` si `bookingStartTime - now >= 12 horas`.
     - Retorna `false` si `bookingStartTime - now < 12 horas` (ej. 11 horas y 59 minutos).
4. **Validación de Esquemas Zod**:
   - Validar sintaxis y obligatoriedad en `manualBookingSchema`, `lockSchema` y `profileSchema`.

---

### 2.2. Pruebas de Integración y Server Actions
- **Herramienta**: `Vitest` + `@supabase/supabase-js` (ejecutado contra instancia local de Supabase vía Docker CLI).
- **Ubicación**: `src/features/[feature]/actions/__tests__/`
- **Alcance**: Server Actions, integración con base de datos real y evaluación de Row Level Security (RLS).

#### Casos de Prueba Críticos:
1. **Creación de Reserva Manual (RN-11, RN-12)**:
   - Ejecutar `createManualBookingAction` con rol `owner`:
     - Verifica la inserción en `public.bookings` con `status = 'confirmed'` y `payment_status = 'not_required'`.
     - Permite `player_id = null` registrando únicamente `manual_player_name`.
   - Ejecutar `createManualBookingAction` con rol `player`:
     - Debe arrojar excepción de autorización (`Unauthorized / 403`).
2. **Políticas de Seguridad RLS en Supabase**:
   - `player_a` intenta consultar `public.bookings` pertenecientes a `player_b`:
     - La consulta retorna arreglo vacío o filtro automático por `auth.uid()`.
   - `player_a` intenta actualizar una reserva ajena vía cliente Supabase:
     - Operación rechazada por política RLS (`42501 rls_violation`).
   - Usuario anónimo intenta escribir en `public.locks`:
     - Operación rechazada.
3. **Gestión de Bloqueos y Advertencia de Solapamientos (RN-18, RN-19, RN-20)**:
   - Ejecutar `createLockAction` en horario con reserva preexistente:
     - La acción registra el bloqueo en `public.locks`.
     - Retorna objeto `{ success: true, warning: 'EXISTING_BOOKINGS_AFFECTED', affectedBookingsCount: 1 }`.
4. **Webhook de Mercado Pago (`POST /api/webhooks/mercadopago`)**:
   - Simular request HTTP POST con firma HMAC `x-signature` inválida -> Retorna `401 Unauthorized`.
   - Simular request HTTP POST con firma válida y `action = "payment.updated"` -> Invoca la función RPC `confirm_booking_payment` y retorna `200 OK`.

---

### 2.3. Pruebas de Concurrencia y Atomicidad (Stress Testing)
- **Herramienta**: `k6` / Script en Node.js ejecutor de peticiones concurrentes (`Promise.all`).
- **Objetivo**: Validar el cumplimiento estricto de **RN-10 (Concurrencia)**.

#### Protocolo de Prueba de Concurrencia:
1. **Escenario**:
   - Se crea un turno libre en estado `available` (`court_id = 1`, `booking_date = '2026-10-15'`, `start_time = '10:00:00'`).
   - Se lanzan **10 peticiones simultáneas** invocando la función RPC `public.confirm_booking_payment`:
     ```ts
     // Script de prueba de concurrencia
     const requests = Array.from({ length: 10 }).map((_, index) =>
       supabase.rpc('confirm_booking_payment', {
         p_court_id: 1,
         p_booking_date: '2026-10-15',
         p_start_time: '10:00:00',
         p_end_time: '11:30:00',
         p_player_id: `player-uuid-${index}`,
         p_payment_id: `mp-pay-${index}`,
         p_amount: 7500
       })
     );
     const results = await Promise.all(requests);
     ```
2. **Criterio de Aceptación Imperativo**:
   - **Exactamente 1 petición** retorna `{ success: true, booking_id: '...' }`.
   - **Las 9 peticiones restantes** retornan `{ success: false, reason: 'SLOT_ALREADY_BOOKED' }`.
   - En la tabla `public.bookings` existe **únicamente 1 registro** para ese turno.
   - En la tabla `public.deposit_refunds_log` se generan **exactamente 9 registros** marcados con `refund_status = 'pending'` asociados a los `payment_id` excedentes.

---

### 2.4. Pruebas End-to-End (E2E)
- **Herramienta**: `Playwright`
- **Ubicación**: `e2e/`
- **Entorno**: Ejecución contra compilación local de Next.js (`next start`) integrada con contenedor local de Supabase.

#### Matriz de Escenarios E2E:

```typescript
// e2e/player-booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Flujo Principal de Reserva de Jugador (CU-03, CU-04, CU-05)', () => {
  test('Jugador consulta disponibilidad, selecciona turno y completa reserva simulada', async ({ page }) => {
    // 1. Login de Jugador
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'jugador@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/courts');

    // 2. Selección de Fecha
    await page.click('button[data-testid="date-picker-day-2"]');

    // 3. Selección de Turno Disponible
    const availableSlot = page.locator('button[data-testid="slot-available"]').first();
    await availableSlot.click();

    // 4. Verificación de Resumen en Modal
    await expect(page.locator('[data-testid="booking-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="deposit-amount"]')).toContainText('$7.500');

    // 5. Iniciar Pago (Simulación de Checkout Mercado Pago)
    await page.click('button[data-testid="pay-deposit-button"]');
    await expect(page).toHaveURL(/.*mercadopago.com\/checkout.*/);
  });
});

test.describe('Flujo de Cancelación por Jugador (CU-07, RN-16)', () => {
  test('Impide cancelación si faltan menos de 12 horas', async ({ page }) => {
    await page.goto('/profile/bookings');
    const lateBookingCard = page.locator('[data-testid="booking-card-late"]');
    const cancelBtn = lateBookingCard.locator('button[data-testid="cancel-booking-btn"]');
    
    await expect(cancelBtn).toBeDisabled();
    await expect(lateBookingCard.locator('[data-testid="cancellation-warning"]')).toContainText('No cancelable (menos de 12hs)');
  });
});
```

#### Escenarios de Dueño (E2E):
1. **Tablero y Bloqueos (CU-08, CU-13)**:
   - Login como `dueño@test.com` -> Navegación a `/admin/dashboard`.
   - Creación de bloqueo recurrente los Martes de 18:00 a 19:30 en Cancha 1.
   - Verificación de renderizado de celda con badge "Bloqueado" y tipo "Recurrente".
2. **Reserva Manual (CU-09)**:
   - Selección de turno libre -> Apertura de modal manual.
   - Ingreso de nombre "Jugador Temporal No Registrado" -> Confirmar.
   - Verificación instantánea de celda actualizada a "Reservado" sin requerir seña.

---

### 2.5. Pruebas de Interfaz Móvil y Responsive (Visual Regression)
- **Herramienta**: `Playwright Component Testing` / Viewport Emulation.
- **Dispositivos Objetivo**:
  - Mobile Small: iPhone SE (`375px x 667px`).
  - Mobile Standard: iPhone 14 / Samsung Galaxy S21 (`390px x 844px`).
  - Desktop: 1080p (`1920px x 1080px`).
- **Verificaciones**:
  - Verificación de la barra de navegación inferior (`BottomBar`) visible exclusivamente en viewports `< 768px`.
  - Verificación de touch targets (`button`, `a`, `input`) con altura mínima de `44px` (`min-h-[44px]`).
  - Ausencia de desbordamiento horizontal (`scrollWidth === clientWidth`) en vistas `/courts` y `/admin/dashboard`.

---

## 3. Matriz de Trazabilidad de Pruebas vs. Reglas de Negocio

| Regla de Negocio / RF | Nivel de Prueba | Herramienta | Criterio de Éxito |
| :--- | :--- | :--- | :--- |
| **RN-01** (2 Canchas) | Integración / UI | Vitest / Playwright | Tablero y grilla renderizan exactamente 2 columnas/pestañas de cancha. |
| **RN-02** (Duración 90 min) | Unitaria / DB | Vitest / DDL Check | Constraint `CHECK (end_time = start_time + '90 mins')` rechaza intervalos distintos. |
| **RN-05** (Precio Histórico) | Integración | Vitest + Supabase | Modificación de `system_settings.default_price` no altera `bookings.total_price` preexistente. |
| **RN-08** (Confirmación Seña) | Integración / Webhook | Vitest | Webhook con pago acreditado cambia `status = 'confirmed'` y `payment_status = 'completed'`. |
| **RN-10** (Concurrencia) | Concurrencia | k6 / Node.js | Invocación simultánea de RPC asigna 1 sola reserva y envía N-1 a `deposit_refunds_log`. |
| **RN-11 / RN-12** (Reserva Manual) | Integración / Actions | Vitest | Inserción directa en estado `confirmed` permitiendo `player_id = null` con `manual_player_name`. |
| **RN-16** (Cancelación 12hs) | Unitaria / E2E | Vitest / Playwright | Función rechaza cancelación si `start_time - now < 12h`. UI inhabilita botón. |
| **RN-19** (Bloqueos Recurrentes) | Integración | Vitest | Bloqueo con `is_recurring = true` aplica a todas las fechas coincidentes con `day_of_week`. |
| **RN-21** (Anticipación 7 días) | Unitaria / UI | Vitest / Playwright | DatePicker inhabilita selección de fechas superiores a `today + 7 days` para rol `player`. |

---

## 4. Pipeline de Automatización V&V en CI/CD

```yaml
# Control de calidad ejecutado en cada Pull Request
qa_pipeline:
  stages:
    - lint_and_typecheck:
        command: pnpm lint && pnpm typecheck
    - unit_tests:
        command: pnpm test:unit
    - integration_and_rls_tests:
        command: supabase start && pnpm test:integration
    - concurrency_stress_tests:
        command: pnpm test:concurrency
    - e2e_tests:
        command: pnpm exec playwright test
```

# 7. Configuración de Entornos y Despliegue (CI/CD)

## 7.1. Matriz de Entornos y Variables de Entorno

### Entornos de Ejecución
* **Local / Development**: Ejecución local con `next dev` y Supabase Local CLI (`supabase start`).
* **Preview / Staging**: Despliegue automático por Pull Request en Vercel con proyecto staging en Supabase.
* **Production**: Entorno productivo en Vercel asignado a la rama `main` y proyecto de producción en Supabase.

### Tabla de Variables de Entorno

| Variable | Descripción | Ámbito | Sensible | Valor Ejemplo / Referencia |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Cliente / Servidor | No | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública para cliente Supabase con RLS | Cliente / Servidor | No | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave administrativa (Bypass RLS) | Solo Servidor | **SÍ** | `eyJhbGciOi...` |
| `SUPABASE_DB_URL` | String de conexión directo a PostgreSQL | CI/CD / Migraciones | **SÍ** | `postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de API Credenciales Mercado Pago | Solo Servidor | **SÍ** | `APP_USR-xxxx-xxxx-xxxx` |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret para validación de firma HMAC Webhook | Solo Servidor | **SÍ** | `whsec_xxxxxx` |
| `RESEND_API_KEY` | Token de API para envío de correos | Solo Servidor | **SÍ** | `re_xxxxxx` |
| `RESEND_FROM_EMAIL` | Remitente de correos transaccionales | Solo Servidor | No | `reservas@padelclub.com` |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicación | Cliente / Servidor | No | `https://padel.vercel.app` |

---

## 7.2. Configuración del Proyecto Next.js (`next.config.ts`)

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['padel.vercel.app', 'localhost:3000'],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

## 7.3. Estrategia de Branching y Control de Versiones

* **`main`**: Rama protegida. Código listo para producción. Cada merge desencadena despliegue automático a producción.
* **`feature/[nombre]`**: Ramas cortas para desarrollo de funcionalidades específicas (`feature/bookings`, `feature/locks`).
* **`fix/[nombre]`**: Ramas para corrección de errores.

### Reglas de Protección de Rama (`main`)
1. Requerir Pull Request antes de fusionar.
2. Requerir que las comprobaciones de estado de CI/CD pasen exitosamente.
3. Deshabilitar `force push` y `deletion`.

---

## 7.4. Pipeline CI/CD con GitHub Actions (`.github/workflows/ci-cd.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript Compiler
        run: npx tsc --noEmit

  unit-and-integration-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Vitest Suite
        run: npm run test:unit
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}

  db-migrations:
    name: Apply Supabase Migrations
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: unit-and-integration-tests
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link and Push DB Migrations
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  build-and-deploy:
    name: Build & Deploy to Vercel
    runs-on: ubuntu-latest
    needs: [unit-and-integration-tests]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js Application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Deploy to Vercel (Production / Preview)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: ${{ github.ref == 'refs/heads/main' && '--prod' || '' }}
```

---

## 7.5. Configuración de Desarrollo Local

### Comandos de Inicialización
```bash
# 1. Clonar e instalar dependencias
git clone git@github.com:org/padel-court-management.git
cd padel-court-management
npm install

# 2. Iniciar servicios locales de Supabase (Docker requerido)
npx supabase start

# 3. Aplicar migraciones y semillas
npx supabase db reset

# 4. Iniciar servidor de desarrollo Next.js
npm run dev
```

### Script de Semillas (`supabase/seed.sql`)
```sql
-- Insertar Canchas iniciales
INSERT INTO public.courts (id, name, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Cancha 1', true),
  ('22222222-2222-2222-2222-222222222222', 'Cancha 2', true)
ON CONFLICT (id) DO NOTHING;

-- Configuración Inicial de Precio General ($15.000)
INSERT INTO public.system_settings (id, slot_price, updated_at)
VALUES (1, 15000.00, NOW())
ON CONFLICT (id) DO NOTHING;
```

---

## 7.6. Plan de Contingencia y Rollback

### Rollback de Aplicación (Vercel)
1. Acceder al Panel de Vercel -> Deployments.
2. Seleccionar el despliegue previo estable.
3. Ejecutar `Instant Rollback`. Tiempo estimado de degradación: < 10 segundos.

### Rollback de Base de Datos (Supabase)
1. Las migraciones DDL deben escribirse de forma no destructiva (evitar `DROP COLUMN` directo sin fase intermedia).
2. Para reversiones críticas de esquema, ejecutar script de migración inversa numerado:
   ```bash
   npx supabase migration new revert_last_change
   supabase db push
   ```
3. Copias de seguridad automáticas diarias administradas por Supabase con Point-in-Time Recovery (PITR) activado para producción.
