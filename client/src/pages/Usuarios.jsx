import { useState } from 'react';
import { api } from '../lib/api.js';
import { BarraFiltros, Sel } from '../components/Filtros.jsx';
import { Form } from '../components/Form.jsx';
import { Table } from '../components/Table.jsx';
import { useFiltros, useLoad } from '../lib/hooks.js';

export function Usuarios({ filiais }) {
  const [rows, load] = useLoad('/usuarios');
  const [ed, setEd] = useState(null);
  const [cargos] = useLoad('/cargos/opcoes');
  const P = cargos.map(c => ({ v: c.chave, t: c.nome }));
  const { f, set, limpar, ativos } = useFiltros();
  const b = (f.busca ?? '').trim().toLowerCase();
  const vis = rows.filter(
    u =>
      (!b || u.nome.toLowerCase().includes(b) || u.email.toLowerCase().includes(b)) &&
      (!f.perfil || u.perfil === f.perfil) &&
      (!f.filial_id || String(u.filial_id) === f.filial_id) &&
      (!f.ativo || String(u.ativo) === f.ativo),
  );
  return (
    <>
      <div className="card">
        <h3>{ed ? `Editar usuário — ${ed.nome}` : 'Novo usuário'}</h3>
        <Form
          key={ed?.id ?? 'novo'}
          initial={ed}
          label={ed ? 'Atualizar' : 'Salvar'}
          onCancel={ed && (() => setEd(null))}
          fields={[
            { n: 'nome', l: 'Nome', req: 1 },
            { n: 'email', l: 'E-mail', t: 'email', req: 1 },
            { n: 'senha', l: ed ? 'Nova senha (deixe vazio para manter)' : 'Senha (mín. 10)', t: 'password', req: !ed },
            { n: 'perfil', l: 'Cargo', opts: P, req: 1 },
            { n: 'filial_id', l: 'Filial', opts: filiais.map(f => ({ v: f.id, t: f.nome })) },
          ]}
          onSubmit={async v => {
            await api(ed ? '/usuarios/' + ed.id : '/usuarios', {
              method: ed ? 'PATCH' : 'POST',
              body: ed && v.filial_id ? { ...v, filial_id: Number(v.filial_id) } : v,
            });
            setEd(null);
            load();
          }}
        />
      </div>
      <div className="card">
        <BarraFiltros
          ativos={ativos}
          onLimpar={limpar}
          resumo={vis.length === rows.length ? `${rows.length} usuário(s)` : `${vis.length} de ${rows.length} usuário(s)`}
        >
          <label>
            Buscar
            <input placeholder="Nome ou e-mail" style={{ width: 220 }} value={f.busca ?? ''} onChange={e => set('busca', e.target.value)} />
          </label>
          <Sel l="Cargo" v={f.perfil} on={v => set('perfil', v)} opts={P} />
          <Sel l="Filial" v={f.filial_id} on={v => set('filial_id', v)} opts={filiais.map(x => ({ v: x.id, t: x.nome }))} />
          <Sel
            l="Situação"
            v={f.ativo}
            on={v => set('ativo', v)}
            opts={[
              { v: 'true', t: 'Ativos' },
              { v: 'false', t: 'Inativos' },
            ]}
          />
        </BarraFiltros>
        <Table
          cols={[
            ['Nome', r => r.nome],
            ['E-mail', r => r.email],
            ['Cargo', r => r.cargo],
            ['Filial', r => filiais.find(f => f.id === r.filial_id)?.nome],
            ['Ativo', r => (r.ativo ? 'Sim' : 'Não')],
          ]}
          rows={vis}
          actions={r => (
            <>
              <button className="sec" onClick={() => setEd(r)}>
                Editar
              </button>{' '}
              <button
                className="sec"
                onClick={async () => {
                  try {
                    await api('/usuarios/' + r.id, { method: 'PATCH', body: { ativo: !r.ativo } });
                    load();
                  } catch (e) {
                    alert(e.message);
                  }
                }}
              >
                {r.ativo ? 'Desativar' : 'Ativar'}
              </button>
            </>
          )}
        />
      </div>
    </>
  );
}
