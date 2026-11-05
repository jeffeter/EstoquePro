import { Icon } from './icons.jsx';
import { useTema } from '../lib/hooks.js';

export const BotaoTema = ({ className = 'icone' }) => {
  const [t, alternar] = useTema();
  return (
    <button
      type="button"
      className={className}
      onClick={alternar}
      aria-pressed={t === 'escuro'}
      aria-label="Alternar modo escuro"
      title={t === 'escuro' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
    >
      <Icon n={t === 'escuro' ? 'sol' : 'lua'} s={19} />
    </button>
  );
};
