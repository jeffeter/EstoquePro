import { L, assinaturas, base, campo, dataHora, extenso, secao } from './comum.js';

export function termoResponsabilidade(res, t) {
  const c = t.colaborador || {};
  const d = base(
    res,
    `termo-${t.patrimonio}${t.assinado_em ? '-assinado' : ''}`,
    'TERMO DE RESPONSABILIDADE PELA GUARDA E USO DE EQUIPAMENTO',
  );
  secao(d, 'DADOS DO COLABORADOR:');
  d.font('Helvetica')
    .text(`Nome: ${c.nome || L(62)}`, 50, d.y, { width: 495 })
    .moveDown(0.5);
  d.text(`Telefone: ${c.telefone || '(____)________-________'}   E-mail: ${c.email || L(30)}`).moveDown(0.5);
  d.text(`Cargo: ${c.cargo || L(22)}   Loja: ${t.loja || L(26)}`);
  secao(d, 'DADOS DO EQUIPAMENTO:');
  campo(d, 'Patrimônio', t.patrimonio);
  campo(d, 'Tipo', t.tipo);
  campo(d, 'Marca', t.marca || '-');
  if (t.observacao) campo(d, 'Especificações', t.observacao);
  campo(d, 'Avarias', t.avarias ? `SIM — ${t.avarias}` : 'Não (equipamento sem avarias registradas)');
  if (t.setor) campo(d, 'Setor', t.setor);
  if (t.chamado) campo(d, 'Nº do chamado', t.chamado);
  secao(d, 'RESPONSABILIDADE:');
  d.font('Helvetica')
    .text(
      'Recebi da SIMPLIFIQUE COMÉRCIO DE MATERIAL DE CONSTRUÇÃO LTDA, a título de empréstimo, para meu uso exclusivo, o equipamento especificado neste termo, comprometendo-me a mantê-los em perfeito estado de conservação, ficando ciente de que:',
      50,
      d.y,
      { width: 495, align: 'justify' },
    )
    .moveDown(0.5);
  [
    'a) Sou responsável pelo zelo do patrimônio, estando sujeito às normas determinadas pelo setor do patrimônio;',
    'b) Se o equipamento for danificado ou inutilizado por emprego inadequado, mau uso, negligência ou extravio, a empresa me fornecerá novo equipamento e cobrará o valor de um equipamento da mesma marca ou equivalente ao da praça;',
    'c) Em caso de dano, inutilização ou extravio do equipamento deverei comunicar imediatamente ao setor competente;',
    'd) devolver o equipamento completo e em perfeito estado de conservação, considerando-se o seu tempo do uso, ao final dos serviços prestados ou na rescisão do contrato de trabalho;',
  ].forEach(x => d.text(x, 60, d.y, { width: 485, align: 'justify' }).moveDown(0.4));
  assinaturas(d, c.nome ? `Recebedor — ${c.nome}` : 'Recebedor', 'Responsável pelo setor', t.assinatura);
  const ent = extenso(t.data || t.assinado_em);
  d.font('Helvetica')
    .fontSize(10.5)
    .text(ent ? `Entregue no dia ${ent}.` : `Entregue no dia ${L(7)} de ${L(20)} de 20${L(6)}.`, 50, d.y, { width: 495 })
    .moveDown(0.5);
  d.text(`Devolvido no dia ${L(7)} de ${L(20)} de 20${L(6)}.`);
  if (t.assinado_em) {
    const cod =
      String(t.codigo || '')
        .slice(0, 16)
        .toUpperCase()
        .match(/.{4}/g)
        ?.join('-') ?? '';
    d.moveDown(1)
      .fontSize(8)
      .fillColor('#444')
      .text(
        `Documento assinado eletronicamente por ${c.nome} em ${dataHora(t.assinado_em)}${t.ip ? ` (IP ${t.ip})` : ''}. Código de verificação: ${cod}`,
        50,
        d.y,
        { width: 495 },
      )
      .fillColor('#000');
  }
  d.end();
}
