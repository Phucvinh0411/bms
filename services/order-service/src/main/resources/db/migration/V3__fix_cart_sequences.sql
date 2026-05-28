-- Fix cart sequence values after manual inserts

DO $$
BEGIN
  IF to_regclass('public.carts_id_seq') IS NULL THEN
    CREATE SEQUENCE public.carts_id_seq OWNED BY public.carts.id;
  END IF;

  IF to_regclass('public.cart_items_id_seq') IS NULL THEN
    CREATE SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;
  END IF;

  ALTER TABLE public.carts ALTER COLUMN id SET DEFAULT nextval('public.carts_id_seq');
  ALTER TABLE public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq');

  IF to_regclass('public.carts_id_seq') IS NOT NULL THEN
    PERFORM setval(
      'public.carts_id_seq',
      COALESCE((SELECT MAX(id) FROM carts), 0) + 1,
      false
    );
  END IF;

  IF to_regclass('public.cart_items_id_seq') IS NOT NULL THEN
    PERFORM setval(
      'public.cart_items_id_seq',
      COALESCE((SELECT MAX(id) FROM cart_items), 0) + 1,
      false
    );
  END IF;
END $$;
