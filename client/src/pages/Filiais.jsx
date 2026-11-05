import { useState } from 'react';
import { api } from '../lib/api.js';
import { Form } from '../components/Form.jsx';
import { Table } from '../components/Table.jsx';

export function Filiais({ pode, reload, filiais }) {
  const [ed, setEd] = useState(null);
  const gestao = pode('filiais.gerenciar');
  return (
    <>
      {gestao && (
        <div className="card">
          <h3>{ed ? `Editar filial — ${ed.nome}` : 'Nova filial'}</h3>
          <Form
            key={ed?.id ?? 'novo'}
            initial={ed}
            label={ed ? 'Atualizar' : 'Salvar'}
            onCancel={ed && (() => setEd(null))}
            fields={[
              { n: 'nome', l: 'Nome', req: 1 },
              { n: 'cidade', l: 'Cidade' },
            ]}
            onSubmit={async v => {
              await api(ed ? '/filiais/' + ed.id : '/filiais', { method: ed ? 'PATCH' : 'POST', body: v });
              setEd(null);
              reload();
            }}
          />
        </div>
      )}
      <div className="card">
        <Table
          cols={[
            ['Filial', r => r.nome],
            ['Cidade', r => r.cidade],
          ]}
          rows={filiais}
          actions={
            gestao &&
            (r => (
              <>
                <button className="sec" onClick={() => setEd(r)}>
                  Editar
                </button>{' '}
                <button
                  className="red"
                  onClick={async () => {
                    if (confirm(`Desativar a filial ${r.nome}?`)) {
                      await api('/filiais/' + r.id, { method: 'PATCH', body: { ativo: false } });
                      reload();
                    }
                  }}
                >
                  Desativar
                </button>
              </>
            ))
          }
        />
      </div>
    </>
  );
}
