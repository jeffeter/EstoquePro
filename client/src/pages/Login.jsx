import { api } from '../lib/api.js';
import { BotaoTema } from '../components/BotaoTema.jsx';
import { Form } from '../components/Form.jsx';
import { Marca } from '../components/Marca.jsx';

export function Login({ onLogin }) {
  return (
    <div className="login">
      <span className="tema-canto">
        <BotaoTema className="" />
      </span>
      <div className="card">
        <Marca />
        <Form
          label="Entrar"
          fields={[
            { n: 'email', l: 'E-mail', t: 'email', req: 1 },
            { n: 'senha', l: 'Senha', t: 'password', req: 1 },
          ]}
          onSubmit={async v => onLogin(await api('/login', { method: 'POST', body: v }))}
        />
      </div>
    </div>
  );
}
