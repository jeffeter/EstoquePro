DO $$
DECLARE dup text;
BEGIN
  SELECT string_agg(grupo, E'\n') INTO dup FROM (
    SELECT upper(btrim(patrimonio)) || ' → ' || string_agg(patrimonio, ', ') AS grupo
    FROM equipamentos GROUP BY upper(btrim(patrimonio)) HAVING count(*) > 1) t;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION E'Existem patrimônios duplicados (ignorando maiúsculas/espaços). Corrija antes de rodar esta migração:\n%', dup;
  END IF;
  CREATE UNIQUE INDEX IF NOT EXISTS equipamentos_patrimonio_ci_uk ON equipamentos (upper(btrim(patrimonio)));
END $$;
