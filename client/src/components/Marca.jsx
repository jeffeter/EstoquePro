import { Icon } from './icons.jsx';
import { MARCA } from '../lib/constantes.js';

export const Marca = () => (
  <div className="marca">
    <Icon n="cubo" s={36} />
    <b>
      {MARCA}
      <span>Pro</span>
    </b>
  </div>
);
