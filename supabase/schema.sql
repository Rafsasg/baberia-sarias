-- ============================================================
-- BABERÍA SARIAS - Esquema de Base de Datos (Supabase/PostgreSQL)
-- ============================================================

-- 1. TABLA: usuarios (un solo barbero)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL DEFAULT 'Barbero',
  telefono TEXT,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLA: citas (corazón del algoritmo de scheduling)
CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  servicio TEXT NOT NULL CHECK (servicio IN ('corte', 'barba', 'combo')),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
  tipo TEXT NOT NULL CHECK (tipo IN ('web', 'presencial')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 3. TABLA: servicios (catálogo dinámico de servicios)
CREATE TABLE IF NOT EXISTS servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  precio INTEGER NOT NULL,
  duracion INTEGER NOT NULL DEFAULT 30,
  incluye TEXT[] NOT NULL DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLA: transacciones (contabilidad)
CREATE TABLE IF NOT EXISTS transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto DECIMAL(10,2) NOT NULL,
  categoria TEXT NOT NULL,
  metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia')),
  descripcion TEXT,
  fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  cita_id UUID REFERENCES citas(id) ON DELETE SET NULL
);

-- 5. ÍNDICES para rendimiento del algoritmo de colisión
CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora ON citas(fecha, hora_inicio, hora_fin);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_fecha_estado ON citas(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_citas_expires ON citas(expires_at) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones(tipo);

-- 6. ROW LEVEL SECURITY (RLS)
-- Solo el barbero (un usuario) puede leer/escribir en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;

-- Políticas para citas (lectura pública limitada, escritura pública para web)
CREATE POLICY "Cualquiera puede leer slots disponibles"
  ON citas FOR SELECT
  USING (true);

CREATE POLICY "Clientes web pueden crear citas pendientes"
  ON citas FOR INSERT
  WITH CHECK (tipo = 'web' AND estado = 'pendiente');

CREATE POLICY "Barbero puede actualizar citas"
  ON citas FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM usuarios));

-- Políticas para transacciones (solo barbero)
CREATE POLICY "Barbero puede leer transacciones"
  ON transacciones FOR SELECT
  USING (auth.uid() IN (SELECT id FROM usuarios));

CREATE POLICY "Barbero puede crear transacciones"
  ON transacciones FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM usuarios));

CREATE POLICY "Barbero puede actualizar transacciones"
  ON transacciones FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM usuarios));

-- Políticas para servicios (lectura pública, escritura solo barbero)
CREATE POLICY "Cualquiera puede leer servicios activos"
  ON servicios FOR SELECT
  USING (true);

CREATE POLICY "Barbero puede gestionar servicios"
  ON servicios FOR ALL
  USING (auth.uid() IN (SELECT id FROM usuarios));

-- 7. SEED: Crear usuario barbero por defecto
-- Password: admin123 (cambiar en producción)
INSERT INTO usuarios (email, password_hash, nombre, telefono, estado)
VALUES (
  'barbero@baberiasarias.com',
  '$2b$10$MrosmvhQEmYhbmCDa5hyC.LWRAdLsLy356JbgVgsg6uykOH5DFBGK',
  'Barbero',
  '+573182305080',
  'disponible'
)
ON CONFLICT (email) DO NOTHING;

-- 8. SEED: Servicios por defecto
INSERT INTO servicios (slug, nombre, descripcion, precio, duracion, incluye)
VALUES
  (
    'corte',
    'Corte Clásico',
    'Corte moderno con navaja, tijera y máquina. Incluye lavado y peinado.',
    15000,
    30,
    ARRAY['Lavado con shampoo profesional', 'Corte con tijera y máquina', 'Peinado con gel o cera', 'Toalla caliente']
  ),
  (
    'barba',
    'Barba Premium',
    'Perfilado de barba con toalla caliente, aceite y bálsamo hidratante.',
    10000,
    20,
    ARRAY['Toalla caliente', 'Perfilado con navaja', 'Aceite hidratante', 'Bálsamo calmante']
  ),
  (
    'combo',
    'Combo Completo',
    'Corte + Barba + Cejas + Toalla caliente. Nuestro servicio estrella.',
    22000,
    45,
    ARRAY['Corte clásico completo', 'Barba premium', 'Arreglo de cejas', 'Toalla caliente', 'Lavado con shampoo', 'Peinado final']
  )
ON CONFLICT (slug) DO NOTHING;
