/*
# Add costo_unitario column, create all 6 atomic RPC functions, and clean transaction data

## What this migration does

### 1. Schema change
- Adds `costo_unitario` (numeric, default 0) to `detalles_venta` so the Dashboard
  can calculate real profit (total - cost of goods sold per line item).

### 2. Data cleanup
- Deletes ALL rows from: detalles_venta, abonos, caja_negocio, compras_inventario, ventas.
- Resets all productos: stock = 0, precio_compra = 0, costo_agencia = 0.
- Keeps productos catalog rows and clientes rows intact (only zeroes financial fields).

### 3. New RPC functions (all SECURITY INVOKER, search_path = public)
- `crear_venta(p_cliente_id, p_tipo_pago, p_items)` — creates a sale with line items,
  decrements stock, registers cash income if contado. Returns the venta UUID.
- `anular_venta(p_venta_id)` — cancels a sale and returns stock to inventory.
- `registrar_compra(p_producto_id, p_cantidad, p_costo_total, p_gasto_agencia, p_fecha)`
  — registers a purchase order (en_proceso), updates weighted-average cost on the
  product, registers cash egreso. Returns the compra UUID.
- `recibir_compra(p_compra_id)` — marks a purchase as recibido and adds stock.
- `eliminar_compra(p_compra_id)` — deletes a purchase; if it was recibido, reverses
  the stock addition first.
- `registrar_abono(p_venta_id, p_monto)` — registers a credit payment, records cash
  income, and marks the sale as pagada if the balance reaches zero.

### 4. Security notes
- All functions use SECURITY INVOKER so RLS policies of the authenticated caller apply.
- search_path is pinned to public to prevent path injection.
- No changes to existing RLS policies.
*/

-- =============================================================
-- 1. Schema: add costo_unitario to detalles_venta
-- =============================================================
ALTER TABLE detalles_venta
  ADD COLUMN IF NOT EXISTS costo_unitario numeric NOT NULL DEFAULT 0;

-- =============================================================
-- 2. Data cleanup: empty all transaction tables, reset products
-- =============================================================
DELETE FROM detalles_venta;
DELETE FROM abonos;
DELETE FROM caja_negocio;
DELETE FROM compras_inventario;
DELETE FROM ventas;

UPDATE productos SET stock = 0, precio_compra = 0, costo_agencia = 0;

-- =============================================================
-- 3. RPC functions
-- =============================================================

-- --- crear_venta -----------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_venta(
  p_cliente_id uuid,
  p_tipo_pago text,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_venta_id   uuid;
  v_total      numeric := 0;
  v_item       jsonb;
  v_subtotal   numeric;
  v_precio_compra numeric;
  v_prod_nombre text;
  v_concepto   text := '';
BEGIN
  IF NOT COALESCE(jsonb_array_length(p_items), 0) > 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un producto';
  END IF;

  INSERT INTO ventas (cliente_id, tipo_pago, estado, total)
  VALUES (
    p_cliente_id,
    p_tipo_pago,
    CASE WHEN p_tipo_pago = 'credito' THEN 'pendiente' ELSE 'pagada' END,
    0
  )
  RETURNING id INTO v_venta_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'cantidad')::numeric * (v_item->>'precio_unitario')::numeric;
    v_total    := v_total + v_subtotal;

    SELECT precio_compra, nombre
      INTO v_precio_compra, v_prod_nombre
      FROM productos
     WHERE id = (v_item->>'producto_id')::uuid;

    INSERT INTO detalles_venta
      (venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal)
    VALUES
      (v_venta_id,
       (v_item->>'producto_id')::uuid,
       (v_item->>'cantidad')::int,
       (v_item->>'precio_unitario')::numeric,
       COALESCE(v_precio_compra, 0),
       v_subtotal);

    UPDATE productos
       SET stock = GREATEST(0, stock - (v_item->>'cantidad')::int)
     WHERE id = (v_item->>'producto_id')::uuid;

    IF p_tipo_pago = 'contado' THEN
      v_concepto := v_concepto
        || (v_item->>'cantidad') || 'x '
        || COALESCE(v_prod_nombre, 'Producto') || ', ';
    END IF;
  END LOOP;

  UPDATE ventas SET total = v_total WHERE id = v_venta_id;

  IF p_tipo_pago = 'contado' THEN
    v_concepto := rtrim(v_concepto, ', ');
    INSERT INTO caja_negocio (concepto, monto, tipo)
    VALUES ('Venta contado: ' || v_concepto, v_total, 'ingreso');
  END IF;

  RETURN v_venta_id;
END;
$$;

-- --- anular_venta ---------------------------------------------
CREATE OR REPLACE FUNCTION public.anular_venta(p_venta_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_estado text;
BEGIN
  SELECT estado INTO v_estado FROM ventas WHERE id = p_venta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  IF v_estado = 'cancelada' THEN
    RAISE EXCEPTION 'Esta venta ya está cancelada';
  END IF;

  -- Return stock to inventory
  UPDATE productos p
     SET stock = p.stock + dv.cantidad
    FROM detalles_venta dv
   WHERE dv.venta_id = p_venta_id
     AND dv.producto_id = p.id;

  -- Mark as cancelled
  UPDATE ventas SET estado = 'cancelada' WHERE id = p_venta_id;
END;
$$;

-- --- registrar_compra -----------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_compra(
  p_producto_id   uuid,
  p_cantidad      int,
  p_costo_total   numeric,
  p_gasto_agencia numeric,
  p_fecha         timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_compra_id      uuid;
  v_gran_total     numeric;
  v_costo_unitario numeric;
  v_old_stock      int;
  v_old_precio     numeric;
  v_new_precio     numeric;
  v_prod_nombre    text;
BEGIN
  v_gran_total     := p_costo_total + p_gasto_agencia;
  v_costo_unitario := CASE WHEN p_cantidad > 0
                           THEN v_gran_total / p_cantidad
                           ELSE 0 END;

  INSERT INTO compras_inventario
    (producto_id, cantidad, costo_total, gasto_agencia, fecha, estado)
  VALUES
    (p_producto_id, p_cantidad, p_costo_total, p_gasto_agencia,
     COALESCE(p_fecha, now()), 'en_proceso')
  RETURNING id INTO v_compra_id;

  -- Weighted-average cost: (old_stock * old_cost + new_qty * new_unit_cost) / (old_stock + new_qty)
  SELECT stock, precio_compra INTO v_old_stock, v_old_precio
    FROM productos WHERE id = p_producto_id;

  IF v_old_stock + p_cantidad > 0 THEN
    v_new_precio := (v_old_stock * v_old_precio + p_cantidad * v_costo_unitario)
                    / (v_old_stock + p_cantidad);
  ELSE
    v_new_precio := v_costo_unitario;
  END IF;

  UPDATE productos
     SET precio_compra = ROUND(v_new_precio, 2)
   WHERE id = p_producto_id;

  -- Register egreso in caja
  SELECT nombre INTO v_prod_nombre FROM productos WHERE id = p_producto_id;
  INSERT INTO caja_negocio (concepto, monto, tipo, fecha)
  VALUES (
    'Compra de inventario: ' || p_cantidad || 'x ' || COALESCE(v_prod_nombre, 'Producto'),
    v_gran_total,
    'egreso',
    COALESCE(p_fecha, now())
  );

  RETURN v_compra_id;
END;
$$;

-- --- recibir_compra -------------------------------------------
CREATE OR REPLACE FUNCTION public.recibir_compra(p_compra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_producto_id uuid;
  v_cantidad    int;
  v_estado      text;
BEGIN
  SELECT producto_id, cantidad, estado
    INTO v_producto_id, v_cantidad, v_estado
    FROM compras_inventario
   WHERE id = p_compra_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compra no encontrada';
  END IF;

  IF v_estado = 'recibido' THEN
    RAISE EXCEPTION 'Esta compra ya fue recibida';
  END IF;

  UPDATE productos
     SET stock = stock + v_cantidad
   WHERE id = v_producto_id;

  UPDATE compras_inventario
     SET estado = 'recibido'
   WHERE id = p_compra_id;
END;
$$;

-- --- eliminar_compra ------------------------------------------
CREATE OR REPLACE FUNCTION public.eliminar_compra(p_compra_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_producto_id uuid;
  v_cantidad    int;
  v_estado      text;
BEGIN
  SELECT producto_id, cantidad, estado
    INTO v_producto_id, v_cantidad, v_estado
    FROM compras_inventario
   WHERE id = p_compra_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compra no encontrada';
  END IF;

  -- If the purchase was already received, reverse the stock addition
  IF v_estado = 'recibido' THEN
    UPDATE productos
       SET stock = GREATEST(0, stock - v_cantidad)
     WHERE id = v_producto_id;
  END IF;

  DELETE FROM compras_inventario WHERE id = p_compra_id;
END;
$$;

-- --- registrar_abono ------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_abono(
  p_venta_id uuid,
  p_monto    numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_venta          record;
  v_total_abonado  numeric;
  v_saldo          numeric;
BEGIN
  SELECT * INTO v_venta FROM ventas WHERE id = p_venta_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada';
  END IF;

  -- Insert the abono
  INSERT INTO abonos (venta_id, cliente_id, monto)
  VALUES (p_venta_id, v_venta.cliente_id, p_monto);

  -- Register income in caja
  INSERT INTO caja_negocio (concepto, monto, tipo)
  VALUES ('Abono venta ' || LEFT(p_venta_id::text, 8), p_monto, 'ingreso');

  -- If the balance reaches zero, mark the sale as paid
  SELECT COALESCE(SUM(monto), 0) INTO v_total_abonado
    FROM abonos
   WHERE venta_id = p_venta_id;

  v_saldo := v_venta.total - v_total_abonado - p_monto;

  IF v_saldo <= 0 THEN
    UPDATE ventas SET estado = 'pagada' WHERE id = p_venta_id;
  END IF;
END;
$$;