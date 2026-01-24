-- Add order_index column to trip_resources for drag-and-drop reordering
ALTER TABLE public.trip_resources 
ADD COLUMN order_index integer DEFAULT 0;

-- Set initial order_index based on created_at (newest last, so lower index = earlier)
UPDATE public.trip_resources
SET order_index = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY created_at ASC) as row_num
  FROM public.trip_resources
) as subquery
WHERE public.trip_resources.id = subquery.id;