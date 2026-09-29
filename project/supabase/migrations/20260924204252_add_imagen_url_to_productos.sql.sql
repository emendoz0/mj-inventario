/*
# Add imagen_url column to productos

## Changes
- Adds `imagen_url` column (text, nullable) to `productos` table.
- Stores a URL or path to the product image for the digital catalog.
- No security changes needed — existing RLS policies cover the new column.
*/

ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url text;
