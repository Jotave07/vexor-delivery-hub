CREATE OR REPLACE FUNCTION public.prevent_multiple_stores_per_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.stores
    WHERE owner_user_id = NEW.owner_user_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'owner_user_id already has a store registered';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_multiple_stores_per_owner ON public.stores;

CREATE TRIGGER trg_prevent_multiple_stores_per_owner
  BEFORE INSERT OR UPDATE OF owner_user_id ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_multiple_stores_per_owner();
