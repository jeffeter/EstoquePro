CREATE TABLE IF NOT EXISTS cargos (
  id SERIAL PRIMARY KEY, chave TEXT NOT NULL UNIQUE, nome TEXT NOT NULL, descricao TEXT,
  permissoes TEXT[] NOT NULL DEFAULT '{}', sistema BOOLEAN NOT NULL DEFAULT false, criado_em TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS cargos_nome_ci_uk ON cargos (lower(btrim(nome)));

INSERT INTO cargos(chave, nome, descricao, sistema, permissoes) VALUES
 ('admin', 'Administrador', 'Acesso total ao sistema, inclusive usuários e cargos.', true, ARRAY['painel.ver','equipamentos.ver','equipamentos.criar','equipamentos.editar','equipamentos.saida','equipamentos.manutencao','equipamentos.status','equipamentos.baixar','consumiveis.ver','consumiveis.criar','consumiveis.movimentar','consumiveis.editar','consumiveis.excluir','filiais.gerenciar','relatorios.ver','relatorios.exportar','usuarios.gerenciar','cargos.gerenciar','auditoria.ver']),
 ('gestor', 'Gestor', 'Gerencia estoque, filiais e exclusões; não administra usuários.', true, ARRAY['painel.ver','equipamentos.ver','equipamentos.criar','equipamentos.editar','equipamentos.saida','equipamentos.manutencao','equipamentos.status','equipamentos.baixar','consumiveis.ver','consumiveis.criar','consumiveis.movimentar','consumiveis.editar','consumiveis.excluir','filiais.gerenciar','relatorios.ver','relatorios.exportar']),
 ('tecnico', 'Técnico', 'Opera o dia a dia: cadastra, movimenta, faz manutenção e dá baixa.', true, ARRAY['painel.ver','equipamentos.ver','equipamentos.criar','equipamentos.editar','equipamentos.saida','equipamentos.manutencao','equipamentos.status','equipamentos.baixar','consumiveis.ver','consumiveis.criar','consumiveis.movimentar','consumiveis.editar','relatorios.ver','relatorios.exportar']),
 ('consulta', 'Consulta', 'Somente visualiza e exporta.', true, ARRAY['painel.ver','equipamentos.ver','consumiveis.ver','relatorios.ver','relatorios.exportar'])
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_perfil_fk') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_fk FOREIGN KEY (perfil) REFERENCES cargos(chave) ON UPDATE CASCADE;
  END IF;
END $$;
