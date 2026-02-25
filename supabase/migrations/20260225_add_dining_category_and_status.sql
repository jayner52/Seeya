ALTER TABLE public.trip_bits
  DROP CONSTRAINT IF EXISTS trip_bits_category_check,
  ADD CONSTRAINT trip_bits_category_check
    CHECK (category IN ('flight','stay','car','activity','transport','money',
                        'dining','reservation','document','photos','other')),
  DROP CONSTRAINT IF EXISTS trip_bits_status_check,
  ADD CONSTRAINT trip_bits_status_check
    CHECK (status IN ('confirmed','pending','cancelled','idea','completed'));
