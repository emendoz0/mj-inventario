/*
# Create compras_inventario table

1. New Tables
- `compras_inventario`
  - `id` (uuid, primary key)
  - `producto_id` (uuid, foreign key to productos)
  - `cantidad` (integer, not null)
  - `costo_total` (numeric, not null)
  - `fecha` (timestamptz, default now())
  - `estado` (text: 'en_proceso' or 'recibido', default 'en_proceso')
  - `creado_en` (timestamptz, default now())

2. Security
- Enable RLS on `compras_inventario`.
- Authenticated-only CRUD policies matching existing tables.
*/

CREATE TABLE IF NOT EXISTS compras_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad integer NOT NULL DEFAULT 1,
  costo_total numeric NOT NULL DEFAULT 0,
  fecha timestamptz DEFAULT now(),
  estado text NOT NULL DEFAULT 'en_proceso' CHECK (estado IN ('en_proceso', 'recibido')),
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE compras_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_compras_inventario" ON compras_inventario;
CREATE POLICY "auth_select_compras_inventario"
ON compras_inventario FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_compras_inventario" ON compras_inventario;
CREATE POLICY "auth_insert_compras_inventario"
ON compras_inventario FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_compras_inventario" ON compras_inventario;
CREATE POLICY "auth_update_compras_inventario"
ON compras_inventario FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_compras_inventario" ON compras_inventario;
CREATE POLICY "auth_delete_compras_inventario"
ON compras_inventario FOR DELETE
TO authenticated USING (true);