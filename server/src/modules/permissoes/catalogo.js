export const GRUPOS = ['Painel', 'Equipamentos', 'Consumíveis', 'Filiais', 'Relatórios', 'Administração'];
const P = (chave, grupo, rotulo, descricao, extra = {}) => ({ chave, grupo, rotulo, descricao, ...extra });
export const CATALOGO = [
  P('painel.ver', 'Painel', 'Ver o painel', 'Indicadores, gráficos e alertas de garantia e de estoque baixo.'),
  P(
    'equipamentos.ver',
    'Equipamentos',
    'Ver equipamentos',
    'Listar e pesquisar, ver histórico, imprimir termo e etiquetas e escanear QR code.',
  ),
  P('equipamentos.criar', 'Equipamentos', 'Cadastrar equipamentos', 'Registrar a entrada de novos equipamentos.', {
    requer: 'equipamentos.ver',
  }),
  P('equipamentos.editar', 'Equipamentos', 'Editar equipamentos', 'Alterar os dados de um equipamento já cadastrado.', {
    requer: 'equipamentos.ver',
  }),
  P(
    'equipamentos.saida',
    'Equipamentos',
    'Registrar saída e assinar termo',
    'Enviar equipamento para uma filial/setor e coletar a assinatura do termo.',
    { requer: 'equipamentos.ver' },
  ),
  P('equipamentos.manutencao', 'Equipamentos', 'Registrar manutenção', 'Abrir e concluir manutenções.', { requer: 'equipamentos.ver' }),
  P('equipamentos.status', 'Equipamentos', 'Alterar status', 'Mudar o status (disponível, em uso, reservado…).', {
    requer: 'equipamentos.ver',
  }),
  P('equipamentos.baixar', 'Equipamentos', 'Dar baixa', 'Dar baixa em equipamentos e gerar o laudo.', { requer: 'equipamentos.ver' }),
  P('consumiveis.ver', 'Consumíveis', 'Ver consumíveis', 'Listar e pesquisar consumíveis.'),
  P('consumiveis.criar', 'Consumíveis', 'Cadastrar consumíveis', 'Criar novos consumíveis.', { requer: 'consumiveis.ver' }),
  P('consumiveis.movimentar', 'Consumíveis', 'Dar entrada e saída', 'Aumentar ou diminuir unidades (botões + 1 e − 1).', {
    requer: 'consumiveis.ver',
  }),
  P('consumiveis.editar', 'Consumíveis', 'Editar e ajustar quantidade', 'Editar o cadastro e ajustar a quantidade do estoque.', {
    requer: 'consumiveis.ver',
  }),
  P('consumiveis.excluir', 'Consumíveis', 'Excluir e inativar', 'Excluir, inativar e reativar consumíveis.', { requer: 'consumiveis.ver' }),
  P('filiais.gerenciar', 'Filiais', 'Gerenciar filiais', 'Criar, editar e desativar filiais.'),
  P('relatorios.ver', 'Relatórios', 'Ver relatórios', 'Entradas e saídas, quantitativos e equipamentos baixados (com laudos).'),
  P('relatorios.exportar', 'Relatórios', 'Exportar dados', 'Baixar em Excel, CSV, PDF e XML.', { requer: 'relatorios.ver' }),
  P('usuarios.gerenciar', 'Administração', 'Gerenciar usuários', 'Criar usuários, trocar cargo, redefinir senha e desativar.', {
    exclusiva: true,
  }),
  P('cargos.gerenciar', 'Administração', 'Gerenciar cargos', 'Criar cargos e definir o que cada um pode fazer.', { exclusiva: true }),
  P('auditoria.ver', 'Administração', 'Ver auditoria', 'Consultar o registro de ações dos usuários.', { exclusiva: true }),
];
export const TODAS = CATALOGO.map(p => p.chave);
export const EXCLUSIVAS = CATALOGO.filter(p => p.exclusiva).map(p => p.chave); 
const REQUER = Object.fromEntries(CATALOGO.filter(p => p.requer).map(p => [p.chave, p.requer]));

export function normalizar(lista) {
  const s = new Set();
  for (const p of lista) {
    if (!TODAS.includes(p)) return { erro: `Permissão inexistente: ${p}` };
    if (EXCLUSIVAS.includes(p)) return { erro: `A permissão "${CATALOGO.find(x => x.chave === p).rotulo}" é exclusiva do Administrador` };
    s.add(p);
    if (REQUER[p]) s.add(REQUER[p]);
  }
  return { lista: TODAS.filter(p => s.has(p)) };
}
