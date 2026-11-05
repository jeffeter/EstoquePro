CREATE TABLE filiais (id SERIAL PRIMARY KEY, nome TEXT NOT NULL UNIQUE, cidade TEXT, ativo BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE cargos (
  id SERIAL PRIMARY KEY, chave TEXT NOT NULL UNIQUE, nome TEXT NOT NULL, descricao TEXT,
  permissoes TEXT[] NOT NULL DEFAULT '{}', sistema BOOLEAN NOT NULL DEFAULT false, criado_em TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX cargos_nome_ci_uk ON cargos (lower(btrim(nome)));

INSERT INTO cargos(chave, nome, descricao, sistema, permissoes) VALUES
 ('admin', 'Administrador', 'Acesso total ao sistema, inclusive usuários e cargos.', true, ARRAY['painel.ver','equipamentos.ver','equipamentos.criar','equipamentos.editar','equipamentos.saida','equipamentos.manutencao','equipamentos.status','equipamentos.baixar','consumiveis.ver','consumiveis.criar','consumiveis.movimentar','consumiveis.editar','consumiveis.excluir','filiais.gerenciar','relatorios.ver','relatorios.exportar','usuarios.gerenciar','cargos.gerenciar','auditoria.ver']),
 ('gestor', 'Gestor', 'Gerencia estoque, filiais e exclusões; não administra usuários.', true, ARRAY['painel.ver','equipamentos.ver','equipamentos.criar','equipamentos.editar','equipamentos.saida','equipamentos.manutencao','equipamentos.status','equipamentos.baixar','consumiveis.ver','consumiveis.criar','consumiveis.movimentar','consumiveis.editar','consumiveis.excluir','filiais.gerenciar','relatorios.ver','relatorios.exportar']),
 ('tecnico', 'Técnico', 'Opera o dia a dia: cadastra, movimenta, faz manutenção e dá baixa.', true, ARRAY['painel.ver','equipamentos.ver','equipamentos.criar','equipamentos.editar','equipamentos.saida','equipamentos.manutencao','equipamentos.status','equipamentos.baixar','consumiveis.ver','consumiveis.criar','consumiveis.movimentar','consumiveis.editar','relatorios.ver','relatorios.exportar']),
 ('consulta', 'Consulta', 'Somente visualiza e exporta.', true, ARRAY['painel.ver','equipamentos.ver','consumiveis.ver','relatorios.ver','relatorios.exportar'])
ON CONFLICT (chave) DO NOTHING;
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY, nome TEXT NOT NULL, email TEXT NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL REFERENCES cargos(chave) ON UPDATE CASCADE, 
  filial_id INT REFERENCES filiais(id), ativo BOOLEAN NOT NULL DEFAULT true, criado_em TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE equipamentos (
  id SERIAL PRIMARY KEY, patrimonio TEXT NOT NULL UNIQUE, tipo TEXT NOT NULL, marca TEXT, observacao TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando_teste' CHECK (status IN
    ('disponivel','em_uso','manutencao','garantia','reservado','aguardando_baixa','aguardando_teste','baixado')),
  avarias TEXT, filial_atual_id INT REFERENCES filiais(id),
  data_compra DATE, fornecedor TEXT, garantia_ate DATE, criado_em TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE consumiveis (
  id SERIAL PRIMARY KEY, tipo TEXT NOT NULL, nome TEXT NOT NULL, quantidade INT NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  minimo INT NOT NULL DEFAULT 0, filial_id INT REFERENCES filiais(id), ativo BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE movimentacoes (
  id SERIAL PRIMARY KEY, equipamento_id INT REFERENCES equipamentos(id), consumivel_id INT REFERENCES consumiveis(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','baixa')), data TIMESTAMPTZ NOT NULL DEFAULT now(),
  filial_origem_id INT REFERENCES filiais(id), filial_destino_id INT REFERENCES filiais(id),
  setor TEXT, chamado TEXT, quantidade INT, observacao TEXT, usuario_id INT REFERENCES usuarios(id),
  CHECK (equipamento_id IS NOT NULL OR consumivel_id IS NOT NULL));
CREATE TABLE manutencoes (
  id SERIAL PRIMARY KEY, equipamento_id INT NOT NULL REFERENCES equipamentos(id), data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE, descricao TEXT NOT NULL, tecnico TEXT, usuario_id INT REFERENCES usuarios(id));
CREATE TABLE baixas (
  id SERIAL PRIMARY KEY, equipamento_id INT NOT NULL UNIQUE REFERENCES equipamentos(id), data_baixa DATE NOT NULL,
  motivo TEXT NOT NULL, defeito_encontrado TEXT, testes_realizados TEXT, usuario_id INT REFERENCES usuarios(id));
CREATE TABLE auditoria (
  id BIGSERIAL PRIMARY KEY, usuario_id INT, acao TEXT NOT NULL, detalhe TEXT, ip TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX ON equipamentos(status); CREATE INDEX ON equipamentos(garantia_ate);
CREATE INDEX movimentacoes_consumivel_idx ON movimentacoes(consumivel_id);
CREATE UNIQUE INDEX equipamentos_patrimonio_ci_uk ON equipamentos (upper(btrim(patrimonio))); 
CREATE INDEX ON movimentacoes(equipamento_id); CREATE INDEX ON movimentacoes(data);
CREATE TABLE termos (
  id SERIAL PRIMARY KEY, equipamento_id INT NOT NULL REFERENCES equipamentos(id), movimentacao_id INT REFERENCES movimentacoes(id),
  colaborador_nome TEXT NOT NULL, colaborador_telefone TEXT, colaborador_email TEXT, colaborador_cargo TEXT,
  dados JSONB NOT NULL, assinatura BYTEA NOT NULL, codigo TEXT NOT NULL,
  assinado_em TIMESTAMPTZ NOT NULL DEFAULT now(), usuario_id INT REFERENCES usuarios(id), ip TEXT);
CREATE INDEX ON termos(equipamento_id);