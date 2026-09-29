/*
# Update productos table to match business inventory requirements

## Overview
Replaces the old product fields (codigo, descripcion, stock_minimo, precio_venta) with
new business-specific fields: marca, genero, presentacion, costo_agencia, porcentaje_ganancia.
The selling price is now computed dynamically from: precio_compra + costo_agencia + (base * porcentaje_ganancia / 100).

## Changes to productos table

### Columns added:
- marca (text) — product brand
- genero (text) — product gender/category (e.g. hombre, mujer, unisex)
- presentacion (text) — product presentation/size (e.g. 50ml, 100ml)
- costo_agencia (numeric(12,2)) — agency cost added on top of purchase cost
- porcentaje_ganancia (numeric(5,2)) — profit margin percentage

### Columns renamed:
- costo → precio_compra (purchase price, same semantics, new name)

### Columns dropped:
- codigo (SKU, no longer needed)
- descripcion (free text description, no longer needed)
- stock_minimo (minimum stock threshold, no longer needed)
- precio_venta (selling price, now computed dynamically)

### Columns kept:
- id, nombre, categoria, stock, creado_en

## Important notes
1. stock is kept as the current existence/stock count.
2. Selling price = precio_compra + costo_agencia + ((precio_compra + costo_agencia) * porcentaje_ganancia / 100)
3. Renaming costo → precio_compra preserves existing data in that column.
4. Dropping columns is intentional per user request — this is a fresh schema alignment.
*/

-- Add new columns
ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca text DEFAULT '';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS genero text DEFAULT '';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS presentacion text DEFAULT '';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_agencia numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS porcentaje_ganancia numeric(5,2) NOT NULL DEFAULT 0;

-- Rename costo → precio_compra
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'costo') THEN
    ALTER TABLE productos RENAME COLUMN costo TO precio_compra;
  END IF;
END $$;

-- Drop old columns that are no longer needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'codigo') THEN
    ALTER TABLE productos DROP COLUMN codigo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'descripcion') THEN
    ALTER TABLE productos DROP COLUMN descripcion;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'stock_minimo') THEN
    ALTER TABLE productos DROP COLUMN stock_minimo;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'precio_venta') THEN
    ALTER TABLE productos DROP COLUMN precio_venta;
  END IF;
END $$;

-- Drop the unique constraint on codigo if it still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productos_codigo_key') THEN
    ALTER TABLE productos DROP CONSTRAINT productos_codigo_key;
  END IF;
END $$;
