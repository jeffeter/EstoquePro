import { Icon } from './icons.jsx';

export const PageHeader = ({ icone, titulo, sub, dica }) => (
  <div className="pagina-topo">
    <span className="pg-icone">
      <Icon n={icone} s={26} />
    </span>
    <div>
      <h1>{titulo}</h1>
      <p>{sub}</p>
    </div>
    {dica && (
      <div className="pg-dica">
        <Icon n="lampada" s={20} />
        <span>{dica}</span>
      </div>
    )}
  </div>
);
