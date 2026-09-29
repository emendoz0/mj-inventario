/*
# Create initial schema for MJ & Elegance inventory system

1. New Tables
- `productos`: Product catalog with name, category, brand, gender, presentation,
  purchase price (precio_compra), profit margin (porcentaje_ganancia), stock,
  image URL, and observations.
- `clientes`: Customer records with name, phone, email, address, and authorized credit.
- `ventas`: Sales records with optional customer, total, payment type (contado/credito),
  and status (pagada/pendiente/cancelada).
- `detalles_venta`: Line items for each sale (product, quantity, unit price, subtotal).
- `abonos`: Payment installments for credit sales.
- `compras_inventario`: Inventory purchase orders with product, quantity, total cost,
  agency expense, status (en_proceso/recibido).
- `caja_negocio`: Cash flow movements (ingresos/egresos) with concept, amount, type.

2. Security
- RLS enabled on all tables.
- Policies scoped to `authenticated` with ownership via `auth.uid()` where applicable.
- Since this is a single-business app with login, all tables use `TO authenticated`
  with `USING (true)` for SELECT/INSERT/UPDATE/DELETE — all authenticated users share
  the same business data.

3. Important Notes
- All timestamps default to now().
- `fecha` fields are timestamptz to store exact date/time.
- The `costo_agencia` column on `productos` is kept for backward compatibility but
  is no longer used in the application logic — landed cost is calculated per purchase
  in `compras_inventario.gasto_agencia` and the result updates `productos.precio_compra`.
*/

CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text,
  marca text,
  genero text,
  presentacion text,
  precio_compra numeric NOT NULL DEFAULT 0,
  costo_agencia numeric NOT NULL DEFAULT 0,
  porcentaje_ganancia numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  imagen_url text,
  observaciones text,
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_productos" ON productos;
CREATE POLICY "select_productos" ON productos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_productos" ON productos;
CREATE POLICY "insert_productos" ON productos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_productos" ON productos;
CREATE POLICY "update_productos" ON productos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_productos" ON productos;
CREATE POLICY "delete_productos" ON productos FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  email text,
  direccion text,
  credito_autorizado numeric NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_clientes" ON clientes;
CREATE POLICY "select_clientes" ON clientes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_clientes" ON clientes;
CREATE POLICY "insert_clientes" ON clientes FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_clientes" ON clientes;
CREATE POLICY "update_clientes" ON clientes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_clientes" ON clientes;
CREATE POLICY "delete_clientes" ON clientes FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  fecha timestamptz DEFAULT now(),
  total numeric NOT NULL DEFAULT 0,
  tipo_pago text NOT NULL DEFAULT 'contado' CHECK (tipo_pago IN ('contado', 'credito')),
  estado text NOT NULL DEFAULT 'pagada' CHECK (estado IN ('pagada', 'pendiente', 'cancelada')),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ventas" ON ventas;
CREATE POLICY "select_ventas" ON ventas FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_ventas" ON ventas;
CREATE POLICY "insert_ventas" ON ventas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_ventas" ON ventas;
CREATE POLICY "update_ventas" ON ventas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_ventas" ON ventas;
CREATE POLICY "delete_ventas" ON ventas FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS detalles_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0
);

ALTER TABLE detalles_venta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_detalles_venta" ON detalles_venta;
CREATE POLICY "select_detalles_venta" ON detalles_venta FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_detalles_venta" ON detalles_venta;
CREATE POLICY "insert_detalles_venta" ON detalles_venta FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_detalles_venta" ON detalles_venta;
CREATE POLICY "update_detalles_venta" ON detalles_venta FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_detalles_venta" ON detalles_venta;
CREATE POLICY "delete_detalles_venta" ON detalles_venta FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS abonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  monto numeric NOT NULL DEFAULT 0,
  fecha timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE abonos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_abonos" ON abonos;
CREATE POLICY "select_abonos" ON abonos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_abonos" ON abonos;
CREATE POLICY "insert_abonos" ON abonos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_abonos" ON abonos;
CREATE POLICY "update_abonos" ON abonos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_abonos" ON abonos;
CREATE POLICY "delete_abonos" ON abonos FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS compras_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad integer NOT NULL DEFAULT 1,
  costo_total numeric NOT NULL DEFAULT 0,
  gasto_agencia numeric NOT NULL DEFAULT 0,
  fecha timestamptz DEFAULT now(),
  estado text NOT NULL DEFAULT 'en_proceso' CHECK (estado IN ('en_proceso', 'recibido')),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE compras_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_compras" ON compras_inventario;
CREATE POLICY "select_compras" ON compras_inventario FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_compras" ON compras_inventario;
CREATE POLICY "insert_compras" ON compras_inventario FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_compras" ON compras_inventario;
CREATE POLICY "update_compras" ON compras_inventario FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_compras" ON compras_inventario;
CREATE POLICY "delete_compras" ON compras_inventario FOR DELETE
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS caja_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'ingreso' CHECK (tipo IN ('ingreso', 'egreso')),
  fecha timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE caja_negocio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_caja" ON caja_negocio;
CREATE POLICY "select_caja" ON caja_negocio FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_caja" ON caja_negocio;
CREATE POLICY "insert_caja" ON caja_negocio FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_caja" ON caja_negocio;
CREATE POLICY "update_caja" ON caja_negocio FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_caja" ON caja_negocio;
CREATE POLICY "delete_caja" ON caja_negocio FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_detalles_venta_venta ON detalles_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_abonos_venta ON abonos(venta_id);
CREATE INDEX IF NOT EXISTS idx_compras_producto ON compras_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_caja_fecha ON caja_negocio(fecha);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
