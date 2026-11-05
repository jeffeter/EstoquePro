export const Table = ({ cols, rows, actions, rowClass, vazio }) => (
  <div className="tabela">
    <table>
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={i}>{c[0]}</th>
          ))}
          {actions && <th>Ações</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id ?? i} className={rowClass?.(r)}>
            {cols.map((c, j) => (
              <td key={j}>{c[1](r)}</td>
            ))}
            {actions && <td>{actions(r)}</td>}
          </tr>
        ))}
        {vazio && !rows.length && (
          <tr>
            <td className="vazio" colSpan={cols.length + (actions ? 1 : 0)}>
              {vazio}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
