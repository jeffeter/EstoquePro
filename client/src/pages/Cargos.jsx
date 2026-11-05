import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Icon } from '../components/icons.jsx';
import { Table } from '../components/Table.jsx';
import { useLoad } from '../lib/hooks.js';

export function Cargos({ irUsuarios }) {
  const [dados, load, erro] = useLoad('/cargos');
  const cargos = dados.cargos ?? [],
    catalogo = dados.catalogo ?? [],
    grupos = dados.grupos ?? [];
  const [sel, setSel] = useState(null); 
  const [rasc, setRasc] = useState(null); 
  const [msg, setMsg] = useState('');
  const [e2, setE2] = useState('');
  const [busy, setBusy] = useState(false);
  const atual = sel === 'novo' ? null : cargos.find(c => c.id === sel);
  const bloqueado = atual?.chave === 'admin';
  const requer = Object.fromEntries(catalogo.filter(p => p.requer).map(p => [p.chave, p.requer]));
  useEffect(() => {
    if (sel === null && cargos.length) setSel(cargos[0].id);
  }, [cargos.length]);
  useEffect(() => {
    if (sel === 'novo') setRasc({ nome: '', descricao: '', permissoes: new Set(), copiar: '' });
    else if (atual) setRasc({ nome: atual.nome, descricao: atual.descricao ?? '', permissoes: new Set(atual.permissoes), copiar: '' });
  }, [sel, atual?.id, JSON.stringify(atual && [atual.nome, atual.descricao, atual.permissoes])]);
  const escolher = id => {
    setSel(id);
    setMsg('');
    setE2('');
  };
  const marcar = (chave, on) =>
    setRasc(r => {
      const x = new Set(r.permissoes);
      if (on) {
        x.add(chave);
        if (requer[chave]) x.add(requer[chave]);
      } else {
        x.delete(chave);
        catalogo.filter(p => p.requer === chave).forEach(p => x.delete(p.chave));
      }
      return { ...r, permissoes: x };
    });
  const marcarGrupo = (g, on) =>
    setRasc(r => {
      const x = new Set(r.permissoes);
      catalogo.filter(p => p.grupo === g && !p.exclusiva).forEach(p => (on ? x.add(p.chave) : x.delete(p.chave)));
      return { ...r, permissoes: x };
    });
  const copiarDe = id => {
    const c = cargos.find(k => String(k.id) === id);
    setRasc(r => ({
      ...r,
      copiar: id,
      permissoes: new Set(c ? c.permissoes.filter(p => !catalogo.find(q => q.chave === p)?.exclusiva) : []),
    }));
  };
  const mudou =
    sel === 'novo' ||
    (atual &&
      rasc &&
      (rasc.nome !== atual.nome ||
        (rasc.descricao || '') !== (atual.descricao || '') ||
        [...rasc.permissoes].sort().join() !== [...atual.permissoes].sort().join()));
  const salvar = async () => {
    setBusy(true);
    setE2('');
    setMsg('');
    const corpo = { nome: rasc.nome, descricao: rasc.descricao, permissoes: [...rasc.permissoes] };
    try {
      if (sel === 'novo') {
        const c = await api('/cargos', { method: 'POST', body: corpo });
        setMsg(`✔ Cargo "${c.nome}" criado.`);
        await load();
        setSel(c.id);
      } else {
        const c = await api('/cargos/' + sel, { method: 'PATCH', body: corpo });
        setMsg(`✔ Cargo "${c.nome}" atualizado. As permissões já valem para quem tem este cargo.`);
        await load();
      }
    } catch (x) {
      setE2(x.message);
    } finally {
      setBusy(false);
    }
  };
  const excluir = async () => {
    if (!confirm(`Excluir o cargo "${atual.nome}"?\n\nEssa ação não pode ser desfeita.`)) return;
    setE2('');
    setMsg('');
    try {
      await api('/cargos/' + atual.id, { method: 'DELETE' });
      setMsg(`✔ Cargo "${atual.nome}" excluído.`);
      setSel(null);
      await load();
    } catch (x) {
      setE2(x.message);
    }
  };
  return (
    <div className="cargos-grid">
      <div className="card cargos-lista">
        <div className="cartao-topo">
          <h3 className="card-titulo">
            <Icon n="escudo" />
            Cargos
          </h3>
          <span className="sp" />
          <button type="button" onClick={() => escolher('novo')}>
            <Icon n="mais" s={16} />
            Novo cargo
          </button>
        </div>
        {cargos.map(c => (
          <button type="button" key={c.id} className={'cargo-item' + (sel === c.id ? ' on' : '')} onClick={() => escolher(c.id)}>
            <span>
              <b>{c.nome}</b>
              {c.sistema && <em className="tag">Sistema</em>}
              {c.descricao && <small>{c.descricao}</small>}
            </span>
            <span className="cargo-qtd" title="Usuários com este cargo">
              <Icon n="usuarios" s={15} />
              {c.total_usuarios}
            </span>
          </button>
        ))}
      </div>
      <div>
        {rasc && (
          <>
            <div className="card">
              <h3 className="card-titulo">
                <Icon n="escudo" />
                {sel === 'novo' ? 'Novo cargo' : atual?.nome}
                {atual?.sistema && <em className="tag">Sistema</em>}
              </h3>
              {msg && <p className="ok">{msg}</p>}
              {(e2 || erro) && <p className="erro">{e2 || erro}</p>}
              {bloqueado && (
                <p className="aviso">
                  <Icon n="cadeado" s={16} />O Administrador sempre tem acesso total ao sistema e não pode ser alterado nem excluído.
                </p>
              )}
              <div className="cargo-campos">
                <label>
                  <span className="rotulo">
                    Nome<span className="req">*</span>
                  </span>
                  <input
                    value={rasc.nome}
                    disabled={bloqueado}
                    maxLength={40}
                    placeholder="Ex.: Estoquista"
                    onChange={e => setRasc(r => ({ ...r, nome: e.target.value }))}
                  />
                </label>
                <label>
                  <span className="rotulo">Descrição</span>
                  <input
                    value={rasc.descricao}
                    disabled={bloqueado}
                    maxLength={200}
                    placeholder="Para que serve este cargo (opcional)"
                    onChange={e => setRasc(r => ({ ...r, descricao: e.target.value }))}
                  />
                </label>
                {sel === 'novo' && (
                  <label>
                    <span className="rotulo">Copiar permissões de</span>
                    <select value={rasc.copiar} onChange={e => copiarDe(e.target.value)}>
                      <option value="">Começar sem permissões</option>
                      {cargos.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {grupos.map(g => {
                const itens = catalogo.filter(p => p.grupo === g),
                  livres = itens.filter(p => !p.exclusiva),
                  todos = livres.length > 0 && livres.every(p => rasc.permissoes.has(p.chave));
                return (
                  <fieldset className="perm-grupo" key={g}>
                    <div className="perm-topo">
                      <b>{g}</b>
                      {livres.length > 1 && !bloqueado && (
                        <label className="chk">
                          <input type="checkbox" checked={todos} onChange={e => marcarGrupo(g, e.target.checked)} />
                          Marcar tudo
                        </label>
                      )}
                    </div>
                    {itens.map(p => {
                      const bloq = bloqueado || p.exclusiva,
                        marcado = bloqueado || rasc.permissoes.has(p.chave);
                      return (
                        <label className="perm" key={p.chave}>
                          <input type="checkbox" checked={marcado} disabled={bloq} onChange={e => marcar(p.chave, e.target.checked)} />
                          <span>
                            <b>{p.rotulo}</b>
                            {p.exclusiva && (
                              <em className="tag cad">
                                <Icon n="cadeado" s={12} />
                                Só Administrador
                              </em>
                            )}
                            <small>{p.descricao}</small>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                );
              })}
              {!bloqueado && (
                <div className="acoes-form">
                  <button type="button" disabled={busy || !mudou} onClick={salvar}>
                    <Icon n="salvar" s={16} />
                    {sel === 'novo' ? 'Criar cargo' : 'Salvar alterações'}
                  </button>
                  {sel === 'novo' ? (
                    <button type="button" className="sec" onClick={() => escolher(cargos[0]?.id ?? null)}>
                      Cancelar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sec"
                      disabled={!mudou}
                      onClick={() =>
                        setRasc({ nome: atual.nome, descricao: atual.descricao ?? '', permissoes: new Set(atual.permissoes), copiar: '' })
                      }
                    >
                      Descartar alterações
                    </button>
                  )}
                </div>
              )}
            </div>
            {atual && (
              <div className="card">
                <div className="cartao-topo">
                  <h3 className="card-titulo">
                    <Icon n="usuarios" />
                    Quem tem este cargo ({atual.total_usuarios})
                  </h3>
                  <span className="sp" />
                  <button type="button" className="branco" onClick={irUsuarios}>
                    <Icon n="lapis" s={16} />
                    Gerenciar usuários
                  </button>
                </div>
                {atual.usuarios.length ? (
                  <Table
                    cols={[
                      ['Nome', r => r.nome],
                      ['E-mail', r => r.email],
                      ['Filial', r => r.filial],
                      [
                        'Situação',
                        r => (
                          <span className={'pill ' + (r.ativo ? 'st-em_uso' : 'st-baixado')}>
                            <i />
                            {r.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        ),
                      ],
                    ]}
                    rows={atual.usuarios}
                  />
                ) : (
                  <p className="dica">Nenhum usuário tem este cargo.</p>
                )}
                {!atual.sistema && (
                  <div className="perigo-zona">
                    <button type="button" className="red" disabled={atual.total_usuarios > 0} onClick={excluir}>
                      <Icon n="lixeira" s={16} />
                      Excluir cargo
                    </button>
                    <small className="dica">
                      {atual.total_usuarios > 0
                        ? 'Para excluir, primeiro troque o cargo dos usuários acima (aba Usuários).'
                        : 'Este cargo não tem usuários e pode ser excluído.'}
                    </small>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
