/*
# Create inventory, sales, and credit management system

## Overview
Creates the complete schema for a business inventory and sales management system with credit tracking and cash register management.

## New Tables

### productos (Products)
- id (uuid, primary key)
- nombre (text, product name)
- codigo (text, unique product code/SKU)
- descripcion (text, product description)
- precio_venta (numeric, selling price)
- costo (numeric, purchase cost)
- stock (integer, current stock quantity)
- stock_minimo (integer, minimum stock threshold for alerts)
- categoria (text, product category)
- creado_en (timestamptz, creation timestamp)

### clientes (Customers)
- id (uuid, primary key)
- nombre (text, customer name)
- telefono (text, phone number)
- email (text, email address)
- direccion (text, physical address)
- credito_autorizado (numeric, authorized credit limit)
- creado_en (timestamptz, creation timestamp)

### ventas (Sales)
- id (uuid, primary key)
- cliente_id (uuid, FK to clientes, nullable for walk-in sales)
- fecha (timestamptz, sale date)
- total (numeric, sale total amount)
- tipo_pago (text, payment type: 'contado' or 'credito')
- estado (text, sale status: 'pagada', 'pendiente', 'cancelada')
- creado_en (timestamptz, creation timestamp)

### detalles_venta (Sale Details)
- id (uuid, primary key)
- venta_id (uuid, FK to ventas, cascade delete)
- producto_id (uuid, FK to productos)
- cantidad (integer, quantity sold)
- precio_unitario (numeric, unit price at time of sale)
- subtotal (numeric, line subtotal = cantidad * precio_unitario)

### abonos (Credit Payments)
- id (uuid, primary key)
- venta_id (uuid, FK to ventas, the credit sale being paid)
- cliente_id (uuid, FK to clientes)
- monto (numeric, payment amount)
- fecha (timestamptz, payment date)
- creado_en (timestamptz, creation timestamp)

### caja_negocio (Cash Register / Business Cash)
- id (uuid, primary key)
- concepto (text, concept/description of transaction)
- monto (numeric, transaction amount)
- tipo (text, 'ingreso' or 'egreso')
- fecha (timestamptz, transaction date)
- creado_en (timestamptz, creation timestamp)

## Security
- RLS enabled on all tables.
- Single-tenant app with no auth: policies allow anon + authenticated full CRUD on all tables.
*/
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  codigo text UNIQUE,
  descripcion text DEFAULT '',
  precio_venta numeric(12,2) NOT NULL DEFAULT 0,
  costo numeric(12,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  stock_minimo integer NOT NULL DEFAULT 0,
  categoria text DEFAULT '',
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_productos" ON productos;
CREATE POLICY "anon_select_productos" ON productos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_productos" ON productos;
CREATE POLICY "anon_insert_productos" ON productos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_productos" ON productos;
CREATE POLICY "anon_update_productos" ON productos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_productos" ON productos;
CREATE POLICY "anon_delete_productos" ON productos FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text DEFAULT '',
  email text DEFAULT '',
  direccion text DEFAULT '',
  credito_autorizado numeric(12,2) NOT NULL DEFAULT 0,
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clientes" ON clientes;
CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clientes" ON clientes;
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clientes" ON clientes;
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  fecha timestamptz DEFAULT now(),
  total numeric(12,2) NOT NULL DEFAULT 0,
  tipo_pago text NOT NULL DEFAULT 'contado' CHECK (tipo_pago IN ('contado','credito')),
  estado text NOT NULL DEFAULT 'pagada' CHECK (estado IN ('pagada','pendiente','cancelada')),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ventas" ON ventas;
CREATE POLICY "anon_select_ventas" ON ventas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ventas" ON ventas;
CREATE POLICY "anon_insert_ventas" ON ventas FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ventas" ON ventas;
CREATE POLICY "anon_update_ventas" ON ventas FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ventas" ON ventas;
CREATE POLICY "anon_delete_ventas" ON ventas FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS detalles_venta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0
);

ALTER TABLE detalles_venta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_detalles_venta" ON detalles_venta;
CREATE POLICY "anon_select_detalles_venta" ON detalles_venta FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_detalles_venta" ON detalles_venta;
CREATE POLICY "anon_insert_detalles_venta" ON detalles_venta FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_detalles_venta" ON detalles_venta;
CREATE POLICY "anon_update_detalles_venta" ON detalles_venta FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_detalles_venta" ON detalles_venta;
CREATE POLICY "anon_delete_detalles_venta" ON detalles_venta FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS abonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  monto numeric(12,2) NOT NULL DEFAULT 0,
  fecha timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE abonos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_abonos" ON abonos;
CREATE POLICY "anon_select_abonos" ON abonos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_abonos" ON abonos;
CREATE POLICY "anon_insert_abonos" ON abonos FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_abonos" ON abonos;
CREATE POLICY "anon_update_abonos" ON abonos FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_abonos" ON abonos;
CREATE POLICY "anon_delete_abonos" ON abonos FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS caja_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto text NOT NULL,
  monto numeric(12,2) NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  fecha timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE caja_negocio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_caja_negocio" ON caja_negocio;
CREATE POLICY "anon_select_caja_negocio" ON caja_negocio FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_caja_negocio" ON caja_negocio;
CREATE POLICY "anon_insert_caja_negocio" ON caja_negocio FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_caja_negocio" ON caja_negocio;
CREATE POLICY "anon_update_caja_negocio" ON caja_negocio FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_caja_negocio" ON caja_negocio;
CREATE POLICY "anon_delete_caja_negocio" ON caja_negocio FOR DELETE
  TO anon, authenticated USING (true);