ALTER TABLE consumiveis ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS movimentacoes_consumivel_idx ON movimentacoes(consumivel_id);
