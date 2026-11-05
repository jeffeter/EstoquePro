import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api.js';
import { Icon } from '../components/icons.jsx';
import { BarraFiltros, Sel } from '../components/Filtros.jsx';
import { Form } from '../components/Form.jsx';
import { Paginacao } from '../components/Paginacao.jsx';
import { Table } from '../components/Table.jsx';
import { clean } from '../lib/formatacao.js';
import { useDebounced, useFiltros, useLoad, usePagina } from '../lib/hooks.js';

export function QtdEditavel({ valor, podeEditar, onSalvar }) {
  const [ed, setEd] = useState(false);
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const campo = useRef(null);
  useEffect(() => {
    if (ed && !busy) campo.current?.focus();
  }, [ed, busy]); 
  const abrir = () => {
    setV(String(valor));
    setErro('');
    setEd(true);
  };
  const confirmar = async () => {
    if (!/^\d+$/.test(v.trim())) return setErro('Informe um número inteiro igual ou maior que 0');
    if (Number(v) === valor) return setEd(false);
    setBusy(true);
    setErro('');
    try {
      await onSalvar(Number(v));
      setEd(false);
    } catch (x) {
      setErro(x.message);
    } finally {
      setBusy(false);
    }
  };
  if (!ed)
    return podeEditar ? (
      <button type="button" className="qtd" title="Clique para editar a quantidade" onClick={abrir}>
        <b>{valor}</b> ✎
      </button>
    ) : (
      <b>{valor}</b>
    );
  return (
    <span
      className="qtd-ed"
      onKeyDown={e => {
        if (e.key === 'Escape') setEd(false);
      }}
    >
      <input
        ref={campo}
        type="number"
        min="0"
        step="1"
        aria-label="Nova quantidade"
        value={v}
        disabled={busy}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            confirmar();
          }
        }}
      />
      <button type="button" disabled={busy} title="Confirmar" onClick={confirmar}>
        ✔
      </button>
      <button type="button" className="sec" disabled={busy} title="Cancelar" onClick={() => setEd(false)}>
        ✕
      </button>
      {erro && <small className="erro">{erro}</small>}
    </span>
  );
}

export function Consumiveis({ pode, filiais }) {
  const { f, set, limpar, ativos } = useFiltros();
  const busca = useDebounced(f.busca ?? '');
  const qs = new URLSearchParams(clean({ ...f, busca })).toString();
  const [rows, load, erro] = useLoad('/consumiveis' + (qs ? '?' + qs : ''));
  const [opc, loadOpc] = useLoad('/filtros/opcoes');
  const criar = pode('consumiveis.criar'),
    editar = pode('consumiveis.editar'),
    mover = pode('consumiveis.movimentar'),
    excluirOk = pode('consumiveis.excluir');
  const [e2, setE2] = useState('');
  const [msg, setMsg] = useState('');
  const [ed, setEd] = useState(null);
  const pag = usePagina(rows, qs);
  const aviso = (ok = '', ruim = '') => {
    setMsg(ok);
    setE2(ruim);
  };
  const mov = async (id, tipo) => {
    aviso();
    try {
      await api(`/consumiveis/${id}/movimentar`, { method: 'POST', body: { tipo, quantidade: 1 } });
      load();
    } catch (x) {
      setE2(x.message);
    }
  };
  
  const ajustar = async (r, quantidade) => {
    const res = await api(`/consumiveis/${r.id}`, { method: 'PATCH', body: { quantidade } });
    aviso(
      res.ajuste
        ? `✔ Quantidade de "${r.nome}" ajustada de ${res.ajuste.de} para ${res.ajuste.para} (registrado no histórico).`
        : `Quantidade de "${r.nome}" já era ${quantidade}.`,
    );
    await load();
  };

  const excluir = async r => {
    aviso();
    const tem = r.movimentacoes > 0;
    const texto = tem
      ? `"${r.nome}" tem ${r.movimentacoes} movimentação(ões) no histórico e não pode ser excluído, para preservar a rastreabilidade.\n\nDeseja INATIVAR o cadastro? Ele sai da listagem e dos alertas, mas o histórico é mantido${r.quantidade ? ` (as ${r.quantidade} unidades em estoque deixam de ser contadas)` : ''}. Você poderá reativá-lo depois.`
      : `Excluir definitivamente "${r.nome}"?\n\nEssa ação não pode ser desfeita.`;
    if (!confirm(texto)) return;
    try {
      await api(`/consumiveis/${r.id}` + (tem ? '/inativar' : ''), { method: tem ? 'POST' : 'DELETE' });
      aviso(
        tem ? `✔ "${r.nome}" foi inativado (histórico preservado). Para vê-lo, use Situação → Inativos.` : `✔ "${r.nome}" foi excluído.`,
      );
      load();
      loadOpc();
    } catch (x) {
      setE2(x.message);
      load();
    }
  };
  const reativar = async r => {
    aviso();
    try {
      await api(`/consumiveis/${r.id}/reativar`, { method: 'POST' });
      aviso(`✔ "${r.nome}" foi reativado.`);
      load();
      loadOpc();
    } catch (x) {
      setE2(x.message);
    }
  };
  const campos = [
    { n: 'tipo', l: 'Tipo (VGA, DVI, DisplayPort…)', req: 1 },
    { n: 'nome', l: 'Nome', req: 1 },
    { n: 'quantidade', l: ed ? 'Quantidade (ajuste de estoque)' : 'Quantidade', t: 'number', req: 1 },
    { n: 'minimo', l: 'Estoque mínimo', t: 'number' },
    { n: 'filial_id', l: 'Filial', opts: filiais.map(f => ({ v: f.id, t: f.nome })) },
    ...(ed ? [{ n: 'motivo', l: 'Motivo do ajuste de quantidade (opcional)' }] : []),
  ];
  return (
    <>
      {msg && <p className="ok">{msg}</p>}
      {(erro || e2) && <p className="erro">{erro || e2}</p>}
      {(criar || ed) && (
        <div className="card">
          <h3>{ed ? `Editar consumível — ${ed.nome}` : 'Novo consumível'}</h3>
          <Form
            key={ed?.id ?? 'novo'}
            initial={ed}
            label={ed ? 'Atualizar' : 'Salvar'}
            onCancel={ed && (() => setEd(null))}
            fields={campos}
            onSubmit={async v => {
              if (ed) {
                const res = await api('/consumiveis/' + ed.id, { method: 'PATCH', body: v });
                aviso(
                  `✔ "${res.nome}" atualizado.` +
                    (res.ajuste ? ` Estoque ajustado de ${res.ajuste.de} para ${res.ajuste.para} (registrado no histórico).` : ''),
                );
                setEd(null);
              } else {
                await api('/consumiveis', { method: 'POST', body: v });
                aviso(`✔ "${v.nome}" cadastrado.`);
              }
              load();
              loadOpc();
            }}
          >
            {ed && (
              <small className="dica">
                Mudar a quantidade registra um <b>ajuste de estoque</b> no histórico; os demais campos não alteram o histórico.
              </small>
            )}
          </Form>
        </div>
      )}
      <div className="card">
        <BarraFiltros
          ativos={ativos}
          onLimpar={limpar}
          resumo={rows.length ? `${rows.length} ${rows.length === 1 ? 'item' : 'itens'}` : 'Nenhum item encontrado'}
        >
          <label>
            Buscar
            <input placeholder="Nome ou tipo" style={{ width: 200 }} value={f.busca ?? ''} onChange={e => set('busca', e.target.value)} />
          </label>
          <Sel l="Tipo" v={f.tipo} on={v => set('tipo', v)} opts={opc.consumiveis?.tipos ?? []} />
          <Sel l="Filial" v={f.filial_id} on={v => set('filial_id', v)} opts={filiais.map(x => ({ v: x.id, t: x.nome }))} />
          <Sel
            l="Situação"
            v={f.situacao}
            on={v => set('situacao', v)}
            vazio="Ativos"
            opts={[
              { v: 'inativos', t: 'Inativos' },
              { v: 'todos', t: 'Ativos e inativos' },
            ]}
          />
          <label className="chk">
            <input type="checkbox" checked={f.baixo === '1'} onChange={e => set('baixo', e.target.checked ? '1' : '')} />
            Somente estoque baixo
          </label>
        </BarraFiltros>
        <Table
          rowClass={r => (!r.ativo ? 'inativo' : r.quantidade <= r.minimo ? 'baixo' : '')}
          cols={[
            ['Tipo', r => r.tipo],
            [
              'Nome',
              r => (
                <>
                  {r.nome}
                  {!r.ativo && <small className="dica"> (inativo)</small>}
                </>
              ),
            ],
            ['Filial', r => r.filial],
            ['Qtd', r => <QtdEditavel valor={r.quantidade} podeEditar={editar && r.ativo} onSalvar={q => ajustar(r, q)} />],
            ['Mínimo', r => r.minimo],
            ['', r => r.ativo && r.quantidade <= r.minimo && <b className="erro">⚠ ESTOQUE BAIXO</b>],
          ]}
          rows={pag.itens}
          actions={
            (mover || editar || excluirOk) &&
            (r =>
              r.ativo ? (
                <div className="acoes">
                  {mover && (
                    <>
                      <button className="red" onClick={() => mov(r.id, 'saida')}>
                        − 1
                      </button>{' '}
                      <button className="sec" onClick={() => mov(r.id, 'entrada')}>
                        + 1
                      </button>
                    </>
                  )}
                  {editar && (
                    <button
                      className="sec"
                      onClick={() => {
                        aviso();
                        setEd(r);
                        window.scrollTo?.({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <Icon n="lapis" s={15} />
                      Editar
                    </button>
                  )}
                  {excluirOk && (
                    <button className="red" onClick={() => excluir(r)}>
                      <Icon n="lixeira" s={15} />
                      Excluir
                    </button>
                  )}
                </div>
              ) : (
                excluirOk && (
                  <div className="acoes">
                    <button className="sec" onClick={() => reativar(r)}>
                      <Icon n="desfazer" s={15} />
                      Reativar
                    </button>
                  </div>
                )
              ))
          }
        />
        <Paginacao pag={pag} nome="itens" />
      </div>
    </>
  );
}
