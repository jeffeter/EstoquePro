import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3001';
const ADMIN = { email: process.env.ADMIN_EMAIL, senha: process.env.ADMIN_PASSWORD };
const SNAP = process.env.SNAPSHOT_FILE; 
const linhas = [];

class Sessao {
  cookie = '';
  async call(rotulo, metodo, caminho, corpo) {
    const r = await fetch(BASE + '/api' + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(this.cookie && { Cookie: this.cookie }) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      redirect: 'manual',
    });
    const sc = r.headers.getSetCookie?.()[0];
    if (sc) this.cookie = sc.split(';')[0];
    const tipo = (r.headers.get('content-type') ?? '').split(';')[0];
    const buf = Buffer.from(await r.arrayBuffer());
    let json = null;
    if (tipo === 'application/json') json = JSON.parse(buf.toString('utf8'));
    linhas.push(`${rotulo} → ${r.status} ${tipo}`);
    return { status: r.status, tipo, json, buf, headers: r.headers };
  }
}

function pngBase64() {
  const w = 60,
    h = 30,
    raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let i = 0; i < w * 3; i++) raw[y * (w * 3 + 1) + 1 + i] = (i * 7 + y * 13) & 255;
  const chunk = (tipo, dados) => {
    const t = Buffer.from(tipo),
      len = Buffer.alloc(4),
      crc = Buffer.alloc(4);
    len.writeUInt32BE(dados.length);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, dados])) >>> 0);
    return Buffer.concat([len, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return 'data:image/png;base64,' + png.toString('base64');
}

const sufixo = Date.now().toString(36);
const admin = new Sessao(),
  tecnico = new Sessao(),
  consulta = new Sessao(),
  anonimo = new Sessao();
const ctx = {};

test('autenticação', async () => {
  assert.ok(ADMIN.email && ADMIN.senha, 'Defina ADMIN_EMAIL e ADMIN_PASSWORD');
  assert.equal((await anonimo.call('anon /me', 'GET', '/me')).status, 401);
  assert.equal((await anonimo.call('anon /equipamentos', 'GET', '/equipamentos')).status, 401);
  assert.equal((await anonimo.call('login inválido', 'POST', '/login', { email: ADMIN.email, senha: 'errada-errada' })).status, 401);
  assert.equal((await anonimo.call('login corpo inválido', 'POST', '/login', { email: 'x' })).status, 400);
  const ok = await admin.call('login admin', 'POST', '/login', ADMIN);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.perfil, 'admin');
  assert.ok(admin.cookie.startsWith('token='));
  assert.equal((await admin.call('/me', 'GET', '/me')).status, 200);
});

test('filiais, usuários e cargos', async () => {
  const f = await admin.call('filial criar', 'POST', '/filiais', { nome: 'Loja ' + sufixo, cidade: 'Fortaleza' });
  assert.equal(f.status, 201);
  ctx.filial = f.json.id;
  assert.equal((await admin.call('filial duplicada', 'POST', '/filiais', { nome: 'Loja ' + sufixo })).status, 409);
  assert.equal((await admin.call('filial editar', 'PATCH', `/filiais/${ctx.filial}`, { cidade: 'Eusébio' })).status, 200);
  assert.equal((await admin.call('filial inexistente', 'PATCH', '/filiais/999999', { cidade: 'x' })).status, 404);
  const fl = await admin.call('filiais listar', 'GET', '/filiais');
  assert.ok(fl.json.some(x => x.id === ctx.filial));

  const senha = 'senha-de-teste-123';
  for (const [perfil, s] of [
    ['tecnico', tecnico],
    ['consulta', consulta],
  ]) {
    const u = await admin.call(`usuário criar ${perfil}`, 'POST', '/usuarios', {
      nome: `Teste ${perfil}`,
      email: `${perfil}.${sufixo}@teste.local`,
      senha,
      perfil,
      filial_id: ctx.filial,
    });
    assert.equal(u.status, 201);
    assert.equal((await s.call(`login ${perfil}`, 'POST', '/login', { email: `${perfil}.${sufixo}@teste.local`, senha })).status, 200);
    ctx['u_' + perfil] = u.json.id;
  }
  assert.equal(
    (
      await admin.call('usuário senha curta', 'POST', '/usuarios', {
        nome: 'Fulano',
        email: `curta.${sufixo}@teste.local`,
        senha: '123',
        perfil: 'consulta',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin.call('usuário cargo inexistente', 'POST', '/usuarios', {
        nome: 'Fulano',
        email: `c.${sufixo}@teste.local`,
        senha,
        perfil: 'nao-existe',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await admin.call('usuário e-mail duplicado', 'POST', '/usuarios', {
        nome: 'Fulano',
        email: `tecnico.${sufixo}@teste.local`,
        senha,
        perfil: 'consulta',
      })
    ).status,
    409,
  );
  assert.equal((await admin.call('usuários listar', 'GET', '/usuarios')).status, 200);
  const eu = (await admin.call('/me (id)', 'GET', '/me')).json.id;
  assert.equal((await admin.call('admin altera o próprio cargo', 'PATCH', `/usuarios/${eu}`, { perfil: 'consulta' })).status, 400);
  assert.equal((await admin.call('usuário inexistente', 'PATCH', '/usuarios/999999', { nome: 'Zé' })).status, 404);
  assert.equal((await tecnico.call('técnico lista usuários', 'GET', '/usuarios')).status, 403);
  assert.equal((await tecnico.call('técnico lista cargos', 'GET', '/cargos')).status, 403);

  const cg = await admin.call('cargos listar', 'GET', '/cargos');
  assert.equal(cg.status, 200);
  assert.ok(cg.json.catalogo.length > 10);
  const admId = cg.json.cargos.find(c => c.chave === 'admin').id;
  assert.equal((await admin.call('cargo admin imutável', 'PATCH', `/cargos/${admId}`, { permissoes: ['painel.ver'] })).status, 409);
  assert.equal((await admin.call('cargo admin não exclui', 'DELETE', `/cargos/${admId}`)).status, 409);
  assert.equal(
    (await admin.call('cargo permissão exclusiva', 'POST', '/cargos', { nome: 'X' + sufixo, permissoes: ['usuarios.gerenciar'] })).status,
    400,
  );
  assert.equal(
    (await admin.call('cargo permissão inexistente', 'POST', '/cargos', { nome: 'Y' + sufixo, permissoes: ['voar.alto'] })).status,
    400,
  );
  const novo = await admin.call('cargo criar', 'POST', '/cargos', {
    nome: 'Estagiário ' + sufixo,
    descricao: 'teste',
    permissoes: ['equipamentos.editar'],
  });
  assert.equal(novo.status, 201);
  assert.ok(novo.json.permissoes.includes('equipamentos.ver'), 'dependência "ver" deve ser incluída');
  assert.equal((await admin.call('cargo editar', 'PATCH', `/cargos/${novo.json.id}`, { descricao: 'novo texto' })).status, 200);
  assert.equal((await admin.call('cargo excluir', 'DELETE', `/cargos/${novo.json.id}`)).status, 200);
  assert.equal((await admin.call('cargo inexistente', 'DELETE', '/cargos/999999')).status, 404);
});

test('equipamentos: patrimônio, ciclo de vida e permissões', async () => {
  const sug = await tecnico.call('próximo patrimônio (vazio)', 'GET', '/equipamentos/proximo-patrimonio');
  assert.equal(sug.status, 200);
  assert.equal(sug.json.patrimonio, 'PAT-000001');
  const base = {
    tipo: 'Notebook',
    marca: 'Dell',
    filial_atual_id: ctx.filial,
    garantia_ate: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10),
  };
  const a = await tecnico.call('equip criar (auto)', 'POST', '/equipamentos', base);
  assert.equal(a.status, 201);
  assert.equal(a.json.patrimonio, 'PAT-000001');
  ctx.eq = a.json.id;
  const b = await tecnico.call('equip criar (sugerido)', 'POST', '/equipamentos', { ...base, patrimonio: 'PAT-000002', sugerido: true });
  assert.equal(b.json.patrimonio, 'PAT-000002');
  const c = await tecnico.call('equip criar (manual fora da sequência)', 'POST', '/equipamentos', { ...base, patrimonio: 'PAT-000050' });
  assert.equal(c.status, 201);
  ctx.eq3 = c.json.id;
  assert.equal(
    (await tecnico.call('equip duplicado (caixa)', 'POST', '/equipamentos', { ...base, patrimonio: 'pat-000050 ' })).status,
    409,
  );
  assert.equal((await tecnico.call('próximo após maior', 'GET', '/equipamentos/proximo-patrimonio')).json.patrimonio, 'PAT-000051');
  assert.equal((await tecnico.call('equip data inválida', 'POST', '/equipamentos', { ...base, data_compra: '2026-13-45' })).status, 400);
  assert.equal((await consulta.call('consulta não cria', 'POST', '/equipamentos', base)).status, 403);
  assert.equal((await consulta.call('consulta lista', 'GET', '/equipamentos')).status, 200);

  const lista = await admin.call('equip listar', 'GET', '/equipamentos?busca=PAT-0000&tipo=notebook');
  assert.equal(lista.status, 200);
  assert.ok(lista.json.length >= 3);
  assert.equal((await admin.call('equip filtro status inválido', 'GET', '/equipamentos?status=xxx')).status, 400);
  assert.equal((await admin.call('equip busca com curinga', 'GET', '/equipamentos?busca=%25')).json.length, 0);
  assert.equal((await admin.call('filtros/opcoes', 'GET', '/filtros/opcoes')).status, 200);

  assert.equal((await tecnico.call('equip editar', 'PATCH', `/equipamentos/${ctx.eq}`, { observacao: 'i7, 16GB' })).status, 200);
  assert.equal((await tecnico.call('equip status', 'PATCH', `/equipamentos/${ctx.eq}/status`, { status: 'disponivel' })).status, 200);
  assert.equal((await tecnico.call('equip status inválido', 'PATCH', `/equipamentos/${ctx.eq}/status`, { status: 'baixado' })).status, 400);
  assert.equal((await tecnico.call('saída sem dados', 'POST', `/equipamentos/${ctx.eq}/saida`, {})).status, 400);
  const s = await tecnico.call('saída', 'POST', `/equipamentos/${ctx.eq}/saida`, {
    filial_destino_id: ctx.filial,
    setor: 'TI',
    chamado: 'CH-1',
  });
  assert.equal(s.status, 201);

  const t = await tecnico.call('termo assinar', 'POST', `/equipamentos/${ctx.eq}/termos`, {
    colaborador_nome: 'Maria Souza',
    colaborador_email: 'maria@x.com',
    assinatura: pngBase64(),
  });
  assert.equal(t.status, 201);
  ctx.termo = t.json.id;
  assert.equal(
    (
      await tecnico.call('termo assinatura inválida', 'POST', `/equipamentos/${ctx.eq}/termos`, {
        colaborador_nome: 'Maria Souza',
        assinatura: 'data:image/png;base64,AAAA',
      })
    ).status,
    400,
  );
  for (const [rot, url] of [
    ['termo PDF assinado', `/termos/${ctx.termo}/pdf`],
    ['termo PDF em branco', `/equipamentos/${ctx.eq}/termo`],
    ['etiquetas folha', `/etiquetas?ids=${ctx.eq},${ctx.eq3}`],
    ['etiquetas térmica', `/etiquetas?ids=${ctx.eq}&modelo=termica`],
  ]) {
    const r = await tecnico.call(rot, 'GET', url);
    assert.equal(r.status, 200);
    assert.equal(r.tipo, 'application/pdf');
    assert.equal(r.buf.subarray(0, 4).toString(), '%PDF');
  }
  assert.equal((await tecnico.call('etiquetas ids inválidos', 'GET', '/etiquetas?ids=abc')).status, 400);
  assert.equal((await tecnico.call('termo inexistente', 'GET', '/termos/999999/pdf')).status, 404);

  const h = await tecnico.call('histórico', 'GET', `/equipamentos/${ctx.eq}/historico`);
  assert.equal(h.status, 200);
  assert.ok(h.json.movimentacoes.length >= 2);
  assert.equal(h.json.termos.length, 1);
  const p = await tecnico.call('consulta por patrimônio (QR)', 'GET', '/patrimonio/pat-000001');
  assert.equal(p.status, 200);
  assert.equal(p.json.equipamento.patrimonio, 'PAT-000001');
  assert.equal((await tecnico.call('patrimônio inexistente', 'GET', '/patrimonio/NAO-EXISTE')).status, 404);

  assert.equal(
    (await tecnico.call('manutenção abrir', 'POST', `/equipamentos/${ctx.eq}/manutencoes`, { descricao: 'Troca de SSD' })).status,
    201,
  );
  assert.equal(
    (
      await tecnico.call('saída em manutenção', 'POST', `/equipamentos/${ctx.eq}/saida`, {
        filial_destino_id: ctx.filial,
        setor: 'TI',
        chamado: 'CH-2',
      })
    ).status,
    409,
  );
  assert.equal((await tecnico.call('manutenção concluir', 'POST', `/equipamentos/${ctx.eq}/manutencoes/concluir`, {})).status, 200);
  assert.equal(
    (await tecnico.call('manutenção em inexistente', 'POST', '/equipamentos/999999/manutencoes', { descricao: 'abc' })).status,
    404,
  );

  assert.equal((await consulta.call('consulta não dá baixa', 'POST', `/equipamentos/${ctx.eq3}/baixa`, {})).status, 403);
  assert.equal((await tecnico.call('baixa inválida', 'POST', `/equipamentos/${ctx.eq3}/baixa`, { data_baixa: '2026-01-01' })).status, 400);
  const bx = await tecnico.call('baixa', 'POST', `/equipamentos/${ctx.eq3}/baixa`, {
    data_baixa: '2026-11-01',
    motivo: 'Placa queimada',
    defeito_encontrado: 'Não liga',
    testes_realizados: 'Fonte e RAM',
  });
  assert.equal(bx.status, 201);
  assert.equal(
    (
      await tecnico.call('baixa repetida', 'POST', `/equipamentos/${ctx.eq3}/baixa`, {
        data_baixa: '2026-11-01',
        motivo: 'Placa queimada',
        defeito_encontrado: 'Não liga',
        testes_realizados: 'Fonte e RAM',
      })
    ).status,
    409,
  );
  assert.equal((await tecnico.call('editar baixado', 'PATCH', `/equipamentos/${ctx.eq3}`, { tipo: 'X' })).status, 404);
  const laudo = await admin.call('laudo PDF', 'GET', `/baixas/${bx.json.id}/laudo`);
  assert.equal(laudo.status, 200);
  assert.equal(laudo.buf.subarray(0, 4).toString(), '%PDF');
  assert.equal((await admin.call('baixas listar', 'GET', '/baixas?busca=placa&de=2026-01-01')).json.length, 1);
  assert.equal((await admin.call('laudo inexistente', 'GET', '/baixas/999999/laudo')).status, 404);
  assert.equal((await admin.call('garantias/alertas', 'GET', '/garantias/alertas')).status, 200);
});

test('consumíveis', async () => {
  const c = await tecnico.call('consumível criar', 'POST', '/consumiveis', {
    tipo: 'Cabo',
    nome: 'HDMI 2m',
    quantidade: 5,
    minimo: 2,
    filial_id: ctx.filial,
  });
  assert.equal(c.status, 201);
  ctx.con = c.json.id;
  const m = await tecnico.call('consumível saída', 'POST', `/consumiveis/${ctx.con}/movimentar`, { tipo: 'saida', quantidade: 2 });
  assert.equal(m.json.quantidade, 3);
  assert.equal(
    (await tecnico.call('consumível saída excessiva', 'POST', `/consumiveis/${ctx.con}/movimentar`, { tipo: 'saida', quantidade: 99 }))
      .status,
    409,
  );
  const ed = await tecnico.call('consumível ajustar qtd', 'PATCH', `/consumiveis/${ctx.con}`, { quantidade: '10', motivo: 'inventário' });
  assert.equal(ed.status, 200);
  assert.deepEqual(ed.json.ajuste, { de: 3, para: 10 });
  assert.equal((await tecnico.call('consumível qtd negativa', 'PATCH', `/consumiveis/${ctx.con}`, { quantidade: '-1' })).status, 400);
  assert.equal((await tecnico.call('consumível qtd decimal', 'PATCH', `/consumiveis/${ctx.con}`, { quantidade: '1.5' })).status, 400);
  assert.equal((await tecnico.call('técnico não exclui', 'DELETE', `/consumiveis/${ctx.con}`)).status, 403);
  assert.equal((await admin.call('exclusão com histórico', 'DELETE', `/consumiveis/${ctx.con}`)).status, 409);
  assert.equal((await admin.call('consumível inativar', 'POST', `/consumiveis/${ctx.con}/inativar`)).status, 200);
  assert.equal((await admin.call('consumível inativar de novo', 'POST', `/consumiveis/${ctx.con}/inativar`)).status, 409);
  assert.equal(
    (await tecnico.call('movimentar inativo', 'POST', `/consumiveis/${ctx.con}/movimentar`, { tipo: 'entrada', quantidade: 1 })).status,
    409,
  );
  assert.equal((await admin.call('listar inativos', 'GET', '/consumiveis?situacao=inativos')).json.length, 1);
  assert.equal((await admin.call('consumível reativar', 'POST', `/consumiveis/${ctx.con}/reativar`)).status, 200);
  const novo = await admin.call('consumível sem histórico', 'POST', '/consumiveis', { tipo: 'Cabo', nome: 'VGA', quantidade: 0 });
  assert.equal((await admin.call('exclusão sem histórico', 'DELETE', `/consumiveis/${novo.json.id}`)).status, 200);
  assert.equal((await admin.call('consumível filtro baixo', 'GET', '/consumiveis?baixo=1')).status, 200);
});

test('painel, relatórios, exportação e auditoria', async () => {
  const d = await consulta.call('dashboard', 'GET', '/dashboard');
  assert.equal(d.status, 200);
  assert.ok(d.json.kpis.ativos >= 2);
  assert.equal((await admin.call('relatório movimentações', 'GET', '/relatorios/movimentacoes?tipo=saida')).status, 200);
  assert.equal((await admin.call('relatório quantitativo', 'GET', '/relatorios/quantitativo')).status, 200);
  const tipos = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    xml: 'application/xml',
    pdf: 'application/pdf',
  };
  for (const conjunto of ['movimentacoes', 'equipamentos', 'consumiveis', 'baixas'])
    for (const [fmt, tipo] of Object.entries(tipos)) {
      const r = await consulta.call(`exportar ${conjunto} ${fmt}`, 'GET', `/relatorios/exportar/${conjunto}?formato=${fmt}`);
      assert.equal(r.status, 200);
      assert.equal(r.tipo, tipo);
    }
  assert.equal((await admin.call('exportar inexistente', 'GET', '/relatorios/exportar/segredos')).status, 404);
  assert.equal((await admin.call('exportar formato inválido', 'GET', '/relatorios/exportar/equipamentos?formato=exe')).status, 400);
  assert.equal((await tecnico.call('técnico sem auditoria', 'GET', '/auditoria')).status, 403);
  const au = await admin.call('auditoria', 'GET', '/auditoria');
  assert.equal(au.status, 200);
  assert.ok(au.json.some(x => x.acao === 'equipamento.criar') && au.json.some(x => x.acao === 'login.falha'));
});

test('segurança: cookie, injeção, logout e usuário desativado', async () => {
  const r = await fetch(BASE + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  });
  const ck = r.headers.getSetCookie()[0];
  assert.match(ck, /HttpOnly/i);
  assert.match(ck, /SameSite=Strict/i);
  assert.equal((await admin.call('SQL injection na busca', 'GET', "/equipamentos?busca=' OR 1=1 --")).json.length, 0);
  assert.equal((await admin.call('SQL injection no patrimônio', 'GET', "/patrimonio/' OR '1'='1")).status, 404);
  assert.equal((await admin.call('id não numérico', 'GET', '/equipamentos/abc/historico')).status >= 400, true);
  assert.equal((await admin.call('usuário desativar', 'PATCH', `/usuarios/${ctx.u_tecnico}`, { ativo: false })).status, 200);
  assert.equal((await tecnico.call('token de usuário desativado', 'GET', '/me')).status, 401);
  assert.equal((await admin.call('logout', 'POST', '/logout')).status, 200);
});

test.after(() => {
  if (SNAP) fs.writeFileSync(SNAP, linhas.join('\n') + '\n');
});
