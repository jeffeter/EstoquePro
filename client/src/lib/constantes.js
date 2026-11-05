export const ST = {
  disponivel: 'Disponível',
  em_uso: 'Em uso',
  manutencao: 'Manutenção',
  garantia: 'Garantia',
  reservado: 'Reservado',
  aguardando_baixa: 'Aguardando baixa',
  aguardando_teste: 'Aguardando teste',
  baixado: 'Baixado',
};

export const STOPTS = Object.entries(ST)
  .filter(([k]) => k !== 'baixado')
  .map(([v, t]) => ({ v, t }));

export const MARCA = 'Estoque';

export const OPT_GARANTIA = [
  { v: 'vigente', t: 'Vigente' },
  { v: 'a_vencer', t: 'Vence em 15 dias' },
  { v: 'vencida', t: 'Vencida' },
  { v: 'sem', t: 'Sem garantia' },
];

export const OPT_AVARIAS = [
  { v: 'sim', t: 'Com avarias' },
  { v: 'nao', t: 'Sem avarias' },
];
