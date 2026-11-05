export const dataBR = v => {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split('-').reverse().join('/');
  return new Date(v).toLocaleDateString('pt-BR');
};
