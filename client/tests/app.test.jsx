import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from '../src/App.jsx';

const TODAS = [
  'painel.ver',
  'equipamentos.ver',
  'equipamentos.criar',
  'equipamentos.editar',
  'equipamentos.status',
  'equipamentos.saida',
  'equipamentos.manutencao',
  'equipamentos.baixar',
  'consumiveis.ver',
  'consumiveis.criar',
  'consumiveis.editar',
  'consumiveis.movimentar',
  'consumiveis.excluir',
  'relatorios.ver',
  'relatorios.exportar',
  'usuarios.gerenciar',
  'cargos.gerenciar',
  'filiais.gerenciar',
  'auditoria.ver',
];
const admin = { id: 1, nome: 'Admin', perfil: 'admin', cargo: 'Administrador', permissoes: TODAS };

const RESPOSTAS = {
  '/api/dashboard': {
    kpis: {
      ativos: 0,
      disponivel: 0,
      em_uso: 0,
      manutencao: 0,
      aguardando: 0,
      garantia_15d: 0,
      garantia_vencida: 0,
      baixados_mes: 0,
      consumiveis_baixos: 0,
    },
    status: [],
    tipos: [],
    filiais: [],
    mov14: [],
    alertas: [],
    consumiveis_baixos: [],
  },
  '/api/cargos': { catalogo: [], grupos: [], cargos: [] },
  '/api/relatorios/quantitativo': { equipamentos: [], consumiveis: [] },
  '/api/filtros/opcoes': { equipamentos: { tipos: [], marcas: [] }, consumiveis: { tipos: [] } },
};

function simularApi(usuario) {
  globalThis.fetch = vi.fn(async url => {
    const caminho = String(url).split('?')[0];
    if (caminho === '/api/me')
      return usuario
        ? new Response(JSON.stringify(usuario), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : new Response(JSON.stringify({ erro: 'Não autenticado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(RESPOSTAS[caminho] ?? []), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
}

describe('EstoquePro (frontend)', () => {
  beforeEach(() => cleanup());

  it('mostra o login quando não há sessão', async () => {
    simularApi(null);
    render(<App />);
    expect(await screen.findByRole('button', { name: /entrar/i })).toBeTruthy();
  });

  it('abre todas as abas do administrador sem erro', async () => {
    simularApi(admin);
    const erros = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    for (const aba of ['Painel', 'Equipamentos', 'Consumíveis', 'Escanear', 'Filiais', 'Relatórios', 'Usuários', 'Cargos']) {
      const botao = await screen.findByRole('button', { name: new RegExp(`^${aba}$`) });
      fireEvent.click(botao);
      await waitFor(() => expect(botao.className).toContain('on'));
    }
    expect(erros.mock.calls.filter(c => /Error|Cannot|undefined/.test(String(c[0])))).toEqual([]);
  });
});
