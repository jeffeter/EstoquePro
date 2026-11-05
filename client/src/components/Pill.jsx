import { ST } from '../lib/constantes.js';

export const Pill = ({ s }) => (
  <span className={'pill st-' + s}>
    <i />
    {ST[s] ?? s}
  </span>
);
