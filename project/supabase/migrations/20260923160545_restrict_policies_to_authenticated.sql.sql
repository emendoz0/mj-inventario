/*
# Restrict RLS policies to authenticated users only

## Changes
- All tables (productos, clientes, ventas, detalles_venta, abonos, caja_negocio) 
  previously allowed both `anon` and `authenticated` roles with USING (true).
- Now that the app requires Supabase Auth login, policies are restricted to 
  `TO authenticated` only. Unauthenticated (anon) users can no longer read or 
  write any data.
- Data remains shared among all authenticated users (single-business app, 
  not multi-tenant), so USING (true) is correct for the authenticated scope.

## Security
- anon role loses all CRUD access on every table.
- authenticated role retains full CRUD access (shared business data).
*/

-- productos
DROP POLICY IF EXISTS "anon_select_productos" ON productos;
CREATE POLICY "auth_select_productos" ON productos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_productos" ON productos;
CREATE POLICY "auth_insert_productos" ON productos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_productos" ON productos;
CREATE POLICY "auth_update_productos" ON productos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_productos" ON productos;
CREATE POLICY "auth_delete_productos" ON productos FOR DELETE TO authenticated USING (true);

-- clientes
DROP POLICY IF EXISTS "anon_select_clientes" ON clientes;
CREATE POLICY "auth_select_clientes" ON clientes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clientes" ON clientes;
CREATE POLICY "auth_insert_clientes" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;
CREATE POLICY "auth_update_clientes" ON clientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clientes" ON clientes;
CREATE POLICY "auth_delete_clientes" ON clientes FOR DELETE TO authenticated USING (true);

-- ventas
DROP POLICY IF EXISTS "anon_select_ventas" ON ventas;
CREATE POLICY "auth_select_ventas" ON ventas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ventas" ON ventas;
CREATE POLICY "auth_insert_ventas" ON ventas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ventas" ON ventas;
CREATE POLICY "auth_update_ventas" ON ventas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ventas" ON ventas;
CREATE POLICY "auth_delete_ventas" ON ventas FOR DELETE TO authenticated USING (true);

-- detalles_venta
DROP POLICY IF EXISTS "anon_select_detalles_venta" ON detalles_venta;
CREATE POLICY "auth_select_detalles_venta" ON detalles_venta FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_detalles_venta" ON detalles_venta;
CREATE POLICY "auth_insert_detalles_venta" ON detalles_venta FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_detalles_venta" ON detalles_venta;
CREATE POLICY "auth_update_detalles_venta" ON detalles_venta FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_detalles_venta" ON detalles_venta;
CREATE POLICY "auth_delete_detalles_venta" ON detalles_venta FOR DELETE TO authenticated USING (true);

-- abonos
DROP POLICY IF EXISTS "anon_select_abonos" ON abonos;
CREATE POLICY "auth_select_abonos" ON abonos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_abonos" ON abonos;
CREATE POLICY "auth_insert_abonos" ON abonos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_abonos" ON abonos;
CREATE POLICY "auth_update_abonos" ON abonos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_abonos" ON abonos;
CREATE POLICY "auth_delete_abonos" ON abonos FOR DELETE TO authenticated USING (true);

-- caja_negocio
DROP POLICY IF EXISTS "anon_select_caja_negocio" ON caja_negocio;
CREATE POLICY "auth_select_caja_negocio" ON caja_negocio FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_caja_negocio" ON caja_negocio;
CREATE POLICY "auth_insert_caja_negocio" ON caja_negocio FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_caja_negocio" ON caja_negocio;
CREATE POLICY "auth_update_caja_negocio" ON caja_negocio FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_caja_negocio" ON caja_negocio;
CREATE POLICY "auth_delete_caja_negocio" ON caja_negocio FOR DELETE TO authenticated USING (true);
