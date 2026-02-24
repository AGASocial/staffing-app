-- Notify PostgREST to reload schema after DDL changes (new tables/columns).
-- Run once manually if new tables already exist: NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION pgrst_watch() RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

DROP EVENT TRIGGER IF EXISTS pgrst_watch;
CREATE EVENT TRIGGER pgrst_watch
  ON ddl_command_end
  EXECUTE PROCEDURE pgrst_watch();
