import { assinaturas, base, bloco, campo, curta, secao } from './comum.js';

export function laudoBaixa(res, b) {
  const d = base(res, `laudo-baixa-${b.patrimonio}`, 'LAUDO TÉCNICO DE BAIXA DE EQUIPAMENTO');
  secao(d, 'DADOS DO EQUIPAMENTO:');
  campo(d, 'Patrimônio', b.patrimonio);
  campo(d, 'Tipo', b.tipo);
  campo(d, 'Marca', b.marca || '-');
  if (b.observacao) campo(d, 'Especificações', b.observacao);
  campo(d, 'Filial', b.filial);
  campo(d, 'Data da baixa', curta(b.data_baixa));
  bloco(d, 'AVARIAS REGISTRADAS:', b.avarias || 'Nenhuma avaria registrada.');
  bloco(d, 'DEFEITO ENCONTRADO:', b.defeito_encontrado);
  bloco(d, 'TESTES REALIZADOS:', b.testes_realizados);
  bloco(d, 'MOTIVO DA BAIXA:', b.motivo);
  d.moveDown()
    .font('Helvetica')
    .text(`Responsável pela baixa: ${b.usuario || '-'}`, 50, d.y, {
      width: 495,
    });
  assinaturas(d, 'Técnico responsável', 'Gestor / aprovação');
  d.end();
}
