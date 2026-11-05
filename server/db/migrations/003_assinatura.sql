CREATE TABLE IF NOT EXISTS termos (
  id SERIAL PRIMARY KEY, equipamento_id INT NOT NULL REFERENCES equipamentos(id), movimentacao_id INT REFERENCES movimentacoes(id),
  colaborador_nome TEXT NOT NULL, colaborador_telefone TEXT, colaborador_email TEXT, colaborador_cargo TEXT,
  dados JSONB NOT NULL, assinatura BYTEA NOT NULL, codigo TEXT NOT NULL,
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT now(), usuario_id INT REFERENCES usuarios(id), ip TEXT);
CREATE INDEX IF NOT EXISTS termos_equipamento_idx ON termos(equipamento_id);
