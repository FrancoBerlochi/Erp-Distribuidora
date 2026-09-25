-- ==============================================================================
-- ACTIVAR TIEMPO REAL (REALTIME) EN SUPABASE PARA LA TABLA ORDERS
-- Ejecuta este script en el "SQL Editor" de tu proyecto de Supabase
-- ==============================================================================

-- 1. Agregar la tabla orders a la publicación supabase_realtime
-- Esto permite que Supabase envíe eventos websocket cada vez que se inserta o modifica un pedido
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 2. Asegurar que PostgreSQL transmita el registro completo (todas las columnas) en los eventos
ALTER TABLE orders REPLICA IDENTITY FULL;

-- 3. Confirmar que la tabla orders ahora pertenece a la publicación
SELECT pubname, tablename 
FROM pg_publication_tables 
WHERE tablename = 'orders';
