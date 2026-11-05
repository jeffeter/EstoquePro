ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS observacao TEXT;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipamentos' AND column_name='nome') THEN
    EXECUTE 'UPDATE equipamentos SET observacao = nome WHERE observacao IS NULL'; 
    EXECUTE 'ALTER TABLE equipamentos DROP COLUMN nome';
  END IF;
END $$;
ALTER TABLE baixas ADD COLUMN IF NOT EXISTS defeito_encontrado TEXT;
ALTER TABLE baixas ADD COLUMN IF NOT EXISTS testes_realizados TEXT;
