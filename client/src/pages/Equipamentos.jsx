import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Icon, iconeTipo } from '../components/icons.jsx';
import { Sel } from '../components/Filtros.jsx';
import { Form } from '../components/Form.jsx';
import { Menu } from '../components/Menu.jsx';
import { Modal } from '../components/Modal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { Paginacao } from '../components/Paginacao.jsx';
import { Pill } from '../components/Pill.jsx';
import { SignaturePad } from '../components/SignaturePad.jsx';
import { Table } from '../components/Table.jsx';
import { OPT_AVARIAS, OPT_GARANTIA, ST, STOPTS } from '../lib/constantes.js';
import { clean, fd, infoLista } from '../lib/formatacao.js';
import { useFiltros, useLoad, usePagina } from '../lib/hooks.js';

export const ChipEq = ({ r }) => (
  <>
    <b>{r.patrimonio}</b>
    <span>
      {r.tipo}
      {r.marca ? ' ' + r.marca : ''}
    </span>
    {r.filial && <span>{r.filial}</span>}
    <Pill s={r.status} />
  </>
);

export const TIT_AC = {
  saida: 'Registrar saída',
  manut: 'Manutenção',
  editar: 'Editar equipamento',
  status: 'Alterar status',
  assinar: 'Assinar termo de responsabilidade',
  baixa: 'Dar baixa',
};

export const ICO_AC = { saida: 'saida', manut: 'chave', editar: 'lapis', status: 'atualizar', assinar: 'assinar', baixa: 'lixeira' };

export function AssinarTermo({ eq, onDone }) {
  const [sig, setSig] = useState(null);
  return (
    <Form
      label="Assinar e gerar termo"
      fields={[
        { n: 'colaborador_nome', l: 'Nome do colaborador', req: 1 },
        { n: 'colaborador_telefone', l: 'Telefone' },
        { n: 'colaborador_email', l: 'E-mail', t: 'email' },
        { n: 'colaborador_cargo', l: 'Cargo' },
      ]}
      onSubmit={async v => {
        if (!sig) throw new Error('Peça ao colaborador para assinar no quadro');
        const t = await api(`/equipamentos/${eq.id}/termos`, { method: 'POST', body: { ...v, assinatura: sig } });
        window.open(`/api/termos/${t.id}/pdf`, '_blank');
        onDone();
      }}
    >
      <div style={{ width: '100%' }}>
        <small>Assinatura do colaborador (mouse, dedo ou caneta)</small>
        <SignaturePad onChange={setSig} />
      </div>
    </Form>
  );
}

export function Equipamentos({ pode, filiais, foco }) {
  const { f, set, limpar } = useFiltros({ busca: foco?.codigo ?? '' });
  const [busca, setBusca] = useState(foco?.codigo ?? '');
  const digitada = f.busca ?? '';
  useEffect(() => {
    const t = setTimeout(() => setBusca(digitada), 300);
    return () => clearTimeout(t);
  }, [digitada]);
  const qs = new URLSearchParams(clean({ ...f, busca })).toString();
  const [rows, load, erro] = useLoad('/equipamentos' + (qs ? '?' + qs : ''));
  const [opc, loadOpc] = useLoad('/filtros/opcoes');
  const [sug, loadSug] = useLoad(pode('equipamentos.criar') ? '/equipamentos/proximo-patrimonio' : '');
  const [salvo, setSalvo] = useState(null);
  const [ac, setAc] = useState(null);
  const [hist, setHist] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [modelo, setModelo] = useState('folha');
  const togg = id =>
    setSel(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const etiq = ids => {
    if (!ids.length) return alert('Nenhum equipamento para imprimir');
    window.open(`/api/etiquetas?ids=${ids.slice(0, 500).join(',')}&modelo=${modelo}`, '_blank');
  };
  const criar = pode('equipamentos.criar'),
    editar = pode('equipamentos.editar'),
    saida = pode('equipamentos.saida'),
    manut = pode('equipamentos.manutencao'),
    stat = pode('equipamentos.status'),
    baixar = pode('equipamentos.baixar');
  const selecionaveis = rows.filter(r => r.status !== 'baixado'),
    todosSel = selecionaveis.length > 0 && selecionaveis.every(r => sel.has(r.id));
  const pag = usePagina(rows, qs);
  const fo = filiais.map(f => ({ v: f.id, t: f.nome }));
  const fim = async fn => {
    await fn();
    setAc(null);
    load();
    loadOpc();
  };
  useEffect(() => {
    if (foco)
      api('/patrimonio/' + encodeURIComponent(foco.codigo))
        .then(d => setHist({ eq: d.equipamento, movimentacoes: d.movimentacoes, manutencoes: d.manutencoes, termos: d.termos }))
        .catch(() => {});
  }, [foco?.n]);
  useEffect(() => {
    setSel(p => {
      const ids = new Set(rows.map(r => r.id)),
        n = new Set([...p].filter(i => ids.has(i)));
      return n.size === p.size ? p : n;
    });
  }, [rows]); 
  return (
    <>
      <PageHeader
        icone={criar ? 'mais' : 'cubo'}
        titulo={criar ? 'Novo equipamento (entrada)' : 'Equipamentos'}
        sub={criar ? 'Cadastre um novo equipamento no sistema' : 'Consulte os equipamentos cadastrados'}
        dica={criar ? 'Preencha os campos abaixo para registrar um novo equipamento.' : null}
      />
      {criar && (
        <div className="card">
          <h3 className="card-titulo">
            <Icon n="cubo" />
            Dados do Equipamento
          </h3>
          {salvo && (
            <p className="ok">
              ✔ Equipamento registrado com o patrimônio <b>{salvo.patrimonio}</b>
              {salvo.ajustado && ' — o número sugerido já tinha sido usado por outro cadastro, então foi atribuído o próximo livre.'}
            </p>
          )}
          <Form
            className="form-eq"
            icone="salvar"
            label="Salvar Equipamento"
            padrao={sug.patrimonio ? { patrimonio: sug.patrimonio } : undefined}
            fields={[
              { n: 'patrimonio', l: 'Patrimônio', req: 1, auto: true },
              { n: 'tipo', l: 'Tipo (Notebook, Monitor…)', req: 1 },
              { n: 'marca', l: 'Marca (opcional)' },
              { n: 'data_entrada', l: 'Data de entrada', t: 'date' },
              { n: 'filial_origem_id', l: 'Filial que enviou', opts: fo },
              { n: 'filial_atual_id', l: 'Filial atual', opts: fo, req: 1 },
              { n: 'status', l: 'Status', opts: STOPTS },
              { n: 'avarias', l: 'Avarias', ph: 'Ex.: Tela riscada…' },
              { n: 'data_compra', l: 'Data da compra', t: 'date' },
              { n: 'fornecedor', l: 'Fornecedor', ph: 'Ex.: Dell, HP…' },
              { n: 'garantia_ate', l: 'Fim da garantia', t: 'date' },
              {
                n: 'observacao',
                l: 'Observação / especificações (CPU, RAM, disco, modelo…)',
                area: 1,
                cls: 'obs',
                ph: 'Digite as observações…',
              },
            ]}
            onSubmit={async v => {
              setSalvo(null);
              const r = await api('/equipamentos', { method: 'POST', body: { ...v, sugerido: v.patrimonio === sug.patrimonio } });
              setSalvo({ patrimonio: r.patrimonio, ajustado: r.patrimonio !== v.patrimonio });
              load();
              loadOpc();
              await loadSug();
            }}
          />
        </div>
      )}
      <div className="card">
        {erro && <p className="erro">{erro}</p>}
        <div className="filtros-bar">
          <h3 className="card-titulo">
            <Icon n="filtro" />
            Filtros e Busca
          </h3>
          <div className="busca">
            <Icon n="busca" />
            <input
              aria-label="Buscar"
              placeholder="Buscar por patrimônio, marca, modelo…"
              value={f.busca ?? ''}
              onChange={e => set('busca', e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') setBusca(digitada);
              }}
            />
          </div>
          <Sel l="Tipo" v={f.tipo} on={v => set('tipo', v)} opts={opc.equipamentos?.tipos ?? []} />
          <Sel l="Marca" v={f.marca} on={v => set('marca', v)} vazio="Todas" opts={opc.equipamentos?.marcas ?? []} />
          <Sel l="Status" v={f.status} on={v => set('status', v)} opts={Object.entries(ST).map(([v, t]) => ({ v, t }))} />
          <Sel l="Filial" v={f.filial_id} on={v => set('filial_id', v)} vazio="Todas" opts={fo} />
          <Sel l="Garantia" v={f.garantia} on={v => set('garantia', v)} vazio="Todas" opts={OPT_GARANTIA} />
          <Sel l="Avarias" v={f.avarias} on={v => set('avarias', v)} vazio="Todas" opts={OPT_AVARIAS} />
          <div className="acoes">
            <button
              type="button"
              className="branco"
              onClick={() => {
                limpar();
                setBusca('');
              }}
            >
              <Icon n="atualizar" s={16} />
              Limpar
            </button>
            <button type="button" onClick={() => setBusca(digitada)}>
              <Icon n="filtro" s={16} />
              Aplicar
            </button>
          </div>
        </div>
        <div className="infobar">
          <Icon n="info" />
          {infoLista(rows, 'equipamento', 'equipamentos')}
        </div>
      </div>
      <div className="card">
        <div className="cartao-topo">
          <h3 className="card-titulo">
            <Icon n="lista" />
            Equipamentos
          </h3>
          <span className="sp" />
          <div className="barra-sel">
            {sel.size > 0 && (
              <>
                <span className="dica">{sel.size} selecionado(s)</span>
                <button type="button" className="branco" onClick={() => setSel(new Set())}>
                  Limpar seleção
                </button>
              </>
            )}
            <select aria-label="Modelo de etiqueta" value={modelo} onChange={e => setModelo(e.target.value)}>
              <option value="folha">Etiqueta: folha A4 (3×7 — 63,5×38,1 mm)</option>
              <option value="termica">Etiqueta: térmica 60×40 mm</option>
            </select>
            <button type="button" className="sec" onClick={() => etiq(sel.size ? [...sel] : selecionaveis.map(r => r.id))}>
              <Icon n="etiqueta" s={16} />
              Imprimir etiquetas ({sel.size || selecionaveis.length})
            </button>
            <Menu rotulo="Exportar" icone="baixar" classe="branco" titulo="Exporta a lista com os filtros atuais">
              {[
                ['xlsx', 'Excel (.xlsx)'],
                ['csv', 'CSV'],
                ['pdf', 'PDF'],
                ['xml', 'XML'],
              ].map(([fm, t]) => (
                <a key={fm} role="menuitem" href={`/api/relatorios/exportar/equipamentos?formato=${fm}${qs ? '&' + qs : ''}`}>
                  <Icon n="baixar" s={16} />
                  {t}
                </a>
              ))}
            </Menu>
          </div>
        </div>
        <Table
          cols={[
            [
              <input
                type="checkbox"
                aria-label="Selecionar todos"
                checked={todosSel}
                onChange={() => setSel(todosSel ? new Set() : new Set(selecionaveis.map(r => r.id)))}
              />,
              r => <input type="checkbox" aria-label={'Selecionar ' + r.patrimonio} checked={sel.has(r.id)} onChange={() => togg(r.id)} />,
            ],
            ['Patrimônio', r => <b>{r.patrimonio}</b>],
            [
              'Tipo',
              r => (
                <span className="tipo-cel">
                  <Icon n={iconeTipo(r.tipo)} s={20} />
                  {r.tipo}
                </span>
              ),
            ],
            ['Marca', r => r.marca],
            [
              'Observação',
              r => (
                <span className="obs-cel" title={r.observacao}>
                  {r.observacao}
                </span>
              ),
            ],
            ['Filial', r => r.filial],
            ['Status', r => <Pill s={r.status} />],
            ['Avarias', r => (r.avarias ? <span className="erro">Sim</span> : '-')],
            ['Garantia até', r => fd(r.garantia_ate)],
          ]}
          rows={pag.itens}
          actions={r => (
            <div className="acoes">
              <button className="sec" onClick={async () => setHist({ eq: r, ...(await api(`/equipamentos/${r.id}/historico`)) })}>
                <Icon n="relogio" s={16} />
                Histórico
              </button>
              {editar && r.status !== 'baixado' && (
                <button className="sec" onClick={() => setAc({ t: 'editar', r })}>
                  <Icon n="lapis" s={16} />
                  Editar
                </button>
              )}
              <Menu rotulo="Mais" classe="sec" titulo="Mais ações">
                <button role="menuitem" onClick={() => window.open(`/api/equipamentos/${r.id}/termo`, '_blank')}>
                  <Icon n="impressao" s={16} />
                  Imprimir termo
                </button>
                {saida && (
                  <button role="menuitem" onClick={() => setAc({ t: 'assinar', r })}>
                    <Icon n="assinar" s={16} />
                    Assinar termo
                  </button>
                )}
                <button role="menuitem" onClick={() => etiq([r.id])}>
                  <Icon n="etiqueta" s={16} />
                  Imprimir etiqueta
                </button>
                {r.status !== 'baixado' && (
                  <>
                    {saida && (
                      <button role="menuitem" onClick={() => setAc({ t: 'saida', r })}>
                        <Icon n="saida" s={16} />
                        Registrar saída
                      </button>
                    )}
                    {manut && (
                      <button role="menuitem" onClick={() => setAc({ t: 'manut', r })}>
                        <Icon n="chave" s={16} />
                        Manutenção
                      </button>
                    )}
                    {stat && (
                      <button role="menuitem" onClick={() => setAc({ t: 'status', r })}>
                        <Icon n="atualizar" s={16} />
                        Alterar status
                      </button>
                    )}
                    {baixar && (
                      <button role="menuitem" className="perigo" onClick={() => setAc({ t: 'baixa', r })}>
                        <Icon n="lixeira" s={16} />
                        Dar baixa
                      </button>
                    )}
                  </>
                )}
              </Menu>
            </div>
          )}
        />
        <Paginacao pag={pag} nome="registros" />
      </div>
      {ac && (
        <Modal titulo={TIT_AC[ac.t]} icone={ICO_AC[ac.t]} perigo={ac.t === 'baixa'} sub={<ChipEq r={ac.r} />} onClose={() => setAc(null)}>
          {ac.t === 'saida' && (
            <Form
              label="Registrar saída e coletar assinatura"
              onCancel={() => setAc(null)}
              fields={[
                { n: 'filial_destino_id', l: 'Filial destino', opts: fo, req: 1 },
                { n: 'setor', l: 'Setor', req: 1 },
                { n: 'chamado', l: 'Nº do chamado', req: 1 },
                { n: 'observacao', l: 'Observação' },
              ]}
              onSubmit={async v => {
                await api(`/equipamentos/${ac.r.id}/saida`, { method: 'POST', body: v });
                load();
                setAc({ t: 'assinar', r: { ...ac.r, status: 'em_uso' }, aviso: true });
              }}
            />
          )}
          {ac.t === 'manut' && (
            <>
              <Form
                label="Abrir manutenção"
                onCancel={() => setAc(null)}
                fields={[
                  { n: 'descricao', l: 'Descrição', req: 1 },
                  { n: 'tecnico', l: 'Técnico' },
                ]}
                onSubmit={v => fim(() => api(`/equipamentos/${ac.r.id}/manutencoes`, { method: 'POST', body: v }))}
              />
              {ac.r.status === 'manutencao' && (
                <button
                  style={{ marginTop: 14 }}
                  onClick={() => fim(() => api(`/equipamentos/${ac.r.id}/manutencoes/concluir`, { method: 'POST' }))}
                >
                  <Icon n="ok" s={16} />
                  Concluir manutenção
                </button>
              )}
            </>
          )}
          {ac.t === 'editar' && (
            <Form
              label="Salvar alterações"
              icone="salvar"
              initial={ac.r}
              onCancel={() => setAc(null)}
              fields={[
                { n: 'tipo', l: 'Tipo', req: 1 },
                { n: 'marca', l: 'Marca' },
                { n: 'avarias', l: 'Avarias' },
                { n: 'data_compra', l: 'Data da compra', t: 'date' },
                { n: 'fornecedor', l: 'Fornecedor' },
                { n: 'garantia_ate', l: 'Fim da garantia', t: 'date' },
                { n: 'observacao', l: 'Observação / especificações', area: 1 },
              ]}
              onSubmit={v => fim(() => api(`/equipamentos/${ac.r.id}`, { method: 'PATCH', body: v }))}
            />
          )}
          {ac.t === 'status' && (
            <Form
              label="Alterar"
              onCancel={() => setAc(null)}
              fields={[
                { n: 'status', l: 'Novo status', req: 1, opts: STOPTS },
                { n: 'avarias', l: 'Avarias' },
              ]}
              onSubmit={v => fim(() => api(`/equipamentos/${ac.r.id}/status`, { method: 'PATCH', body: v }))}
            />
          )}
          {ac.t === 'assinar' && (
            <>
              {ac.aviso && (
                <p className="ok">
                  ✅ Saída registrada. Colete a assinatura do colaborador abaixo, ou{' '}
                  <button
                    className="sec"
                    onClick={() => {
                      window.open(`/api/equipamentos/${ac.r.id}/termo`, '_blank');
                      setAc(null);
                    }}
                  >
                    imprimir o termo sem assinatura
                  </button>
                </p>
              )}
              <AssinarTermo eq={ac.r} onDone={() => setAc(null)} />
            </>
          )}
          {ac.t === 'baixa' && (
            <Form
              label="Confirmar baixa e gerar laudo"
              icone="lixeira"
              onCancel={() => setAc(null)}
              fields={[
                { n: 'data_baixa', l: 'Data da baixa', t: 'date', req: 1 },
                { n: 'motivo', l: 'Motivo da baixa', area: 1, req: 1 },
                { n: 'defeito_encontrado', l: 'Defeito encontrado', area: 1, req: 1 },
                { n: 'testes_realizados', l: 'Testes realizados', area: 1, req: 1 },
              ]}
              onSubmit={async v => {
                const b = await api(`/equipamentos/${ac.r.id}/baixa`, { method: 'POST', body: v });
                window.open(`/api/baixas/${b.id}/laudo`, '_blank');
                setAc(null);
                load();
              }}
            />
          )}
        </Modal>
      )}
      {hist && (
        <Modal
          largo
          fecharNoFundo
          titulo="Histórico do equipamento"
          icone="relogio"
          sub={<ChipEq r={hist.eq} />}
          onClose={() => setHist(null)}
        >
          <p>
            Garantia até <b>{fd(hist.eq.garantia_ate)}</b>
            {hist.eq.avarias ? (
              <>
                {' '}
                — <span className="erro">Avarias: {hist.eq.avarias}</span>
              </>
            ) : (
              ''
            )}
            {hist.eq.observacao ? (
              <>
                <br />
                <small className="dica">{hist.eq.observacao}</small>
              </>
            ) : (
              ''
            )}
          </p>
          <h4>Movimentações</h4>
          <Table
            cols={[
              ['Data', r => fd(r.data)],
              ['Tipo', r => r.tipo],
              ['De', r => r.origem],
              ['Para', r => r.destino],
              ['Setor', r => r.setor],
              ['Chamado', r => r.chamado],
              ['Por', r => r.usuario],
            ]}
            rows={hist.movimentacoes}
            vazio="Nenhuma movimentação registrada."
          />
          <h4>Manutenções</h4>
          <Table
            cols={[
              ['Início', r => fd(r.data_inicio)],
              ['Fim', r => fd(r.data_fim)],
              ['Descrição', r => r.descricao],
              ['Técnico', r => r.tecnico],
            ]}
            rows={hist.manutencoes}
            vazio="Nenhuma manutenção registrada."
          />
          <h4>Termos assinados</h4>
          <Table
            cols={[
              ['Colaborador', r => r.colaborador_nome],
              ['Assinado em', r => new Date(r.assinado_em).toLocaleString('pt-BR')],
            ]}
            rows={hist.termos || []}
            vazio="Nenhum termo assinado."
            actions={r => (
              <button className="sec" onClick={() => window.open(`/api/termos/${r.id}/pdf`, '_blank')}>
                <Icon n="impressao" s={15} />
                PDF
              </button>
            )}
          />
        </Modal>
      )}
    </>
  );
}
