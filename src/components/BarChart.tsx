import type { ScoreItem } from "../types";

export function BarChart({ items }: { items: ScoreItem[] }) {
  if (!items.length) return <p className="muted">Tulemusi pole veel lisatud.</p>;
  return (
    <div className="barList">
      {items.map((item) => (
        <div className="barRow" key={item.key}>
          <div>
            <span>{item.label}</span>
            <strong>{item.score}%</strong>
          </div>
          <div className="bar">
            <span style={{ width: `${item.score}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
