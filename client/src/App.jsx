import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import { Icon } from './components/icons.jsx';
import { BotaoTema } from './components/BotaoTema.jsx';
import { Marca } from './components/Marca.jsx';
import { PageHeader } from './components/PageHeader.jsx';
import { useLoad } from './lib/hooks.js';
import { Cargos } from './pages/Cargos.jsx';
import { Consumiveis } from './pages/Consumiveis.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Equipamentos } from './pages/Equipamentos.jsx';
import { Filiais } from './pages/Filiais.jsx';
import { Login } from './pages/Login.jsx';
import { Relatorios } from './pages/Relatorios.jsx';
import { Scanner } from './pages/Scanner.jsx';
import { Usuarios } from './pages/Usuarios.jsx';

const TELAS = {
  dash: ['painel', 'Painel', 'Visão geral do estoque de TI'],
  scan: ['scan', 'Escanear etiqueta', 'Aponte a câmera para o QR code do patrimônio'],
  con: ['plug', 'Consumíveis', 'Controle o estoque de cabos e acessórios'],
  fil: ['predio', 'Filiais', 'Gerencie as filiais da empresa'],
  rel: ['grafico', 'Relatórios', 'Movimentações, quantitativos e exportações'],
  usr: ['usuarios', 'Usuários', 'Gerencie os acessos ao sistema'],
  car: ['escudo', 'Cargos', 'Defina o que cada cargo pode fazer e veja quem o possui'],
};

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState('dash');
  const [foco, setFoco] = useState(null);
  const [filiais, reloadF] = useLoad('/filiais', [user?.id]);
  const [dash] = useLoad(user?.permissoes?.includes('painel.ver') ? '/dashboard' : '', [user?.id, tab]);
  useEffect(() => {
    api('/me')
      .then(setUser)
      .catch(() => setUser(null));
  }, []);
  if (user === undefined) return null;
  if (!user) return <Login onLogin={setUser} />;
  const pode = c => user.permissoes.includes(c);
  const tabs = [
    pode('painel.ver') && ['dash', 'Painel', 'painel'],
    pode('equipamentos.ver') && ['eq', 'Equipamentos', 'cubo'],
    pode('consumiveis.ver') && ['con', 'Consumíveis', 'plug'],
    pode('equipamentos.ver') && ['scan', 'Escanear', 'scan'],
    ['fil', 'Filiais', 'predio'],
    pode('relatorios.ver') && ['rel', 'Relatórios', 'grafico'],
    pode('usuarios.gerenciar') && ['usr', 'Usuários', 'usuarios'],
    pode('cargos.gerenciar') && ['car', 'Cargos', 'escudo'],
  ].filter(Boolean);
  const ativa = tabs.some(t => t[0] === tab) ? tab : tabs[0][0];
  const k = dash.kpis,
    alertas = k ? k.garantia_15d + k.garantia_vencida + k.consumiveis_baixos : 0;
  return (
    <div className="app">
      <aside className="side">
        <Marca />
        <nav>
          {tabs.map(([id, t, ic]) => (
            <button
              key={id}
              className={ativa === id ? 'on' : ''}
              onClick={() => {
                setTab(id);
                setFoco(null);
              }}
            >
              <Icon n={ic} />
              {t}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <span className="avatar">
            <Icon n="usuario" />
          </span>
          <div>
            <b>{user.nome}</b>
            <small>({user.cargo})</small>
          </div>
        </div>
        <button
          className="sair"
          onClick={async () => {
            await api('/logout', { method: 'POST' });
            setUser(null);
          }}
        >
          <Icon n="sair" />
          Sair
        </button>
      </aside>
      <div className="conteudo">
        <header className="topo">
          <span className="sp" />
          {pode('painel.ver') && (
            <button
              className="icone"
              onClick={() => setTab('dash')}
              aria-label={alertas ? `${alertas} alertas` : 'Sem alertas'}
              title={alertas ? `${alertas} alerta(s): garantias e estoque baixo — abrir o Painel` : 'Sem alertas'}
            >
              <Icon n="sino" s={19} />
              {alertas > 0 && <i className="badge">{alertas > 99 ? '99+' : alertas}</i>}
            </button>
          )}
          <BotaoTema />
          <button
            className="icone so-mobile"
            title="Sair"
            aria-label="Sair"
            onClick={async () => {
              await api('/logout', { method: 'POST' });
              setUser(null);
            }}
          >
            <Icon n="sair" s={19} />
          </button>
          <div className="boasvindas">
            <span className="avatar">
              <Icon n="usuario" />
            </span>
            <span className="tx">Bem-vindo, {user.nome}!</span>
          </div>
        </header>
        <main>
          {ativa !== 'eq' && TELAS[ativa] && <PageHeader icone={TELAS[ativa][0]} titulo={TELAS[ativa][1]} sub={TELAS[ativa][2]} />}
          {ativa === 'dash' && <Dashboard />}
          {ativa === 'scan' && (
            <Scanner
              onFound={c => {
                setFoco({ codigo: c, n: Date.now() });
                setTab('eq');
              }}
            />
          )}
          {ativa === 'eq' && <Equipamentos pode={pode} filiais={filiais} foco={foco} />}
          {ativa === 'con' && <Consumiveis pode={pode} filiais={filiais} />}
          {ativa === 'fil' && <Filiais pode={pode} filiais={filiais} reload={reloadF} />}
          {ativa === 'rel' && <Relatorios filiais={filiais} pode={pode} />}
          {ativa === 'usr' && <Usuarios filiais={filiais} />}
          {ativa === 'car' && <Cargos irUsuarios={() => setTab('usr')} />}
        </main>
      </div>
    </div>
  );
}
