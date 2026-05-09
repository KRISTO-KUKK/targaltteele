import { useState } from "react";
import { Notice } from "../components/Notice";
import { domains } from "../data/demoData";

export function DomainSelectionView({ selected, onDone }: { selected: string[]; onDone: (domains: string[]) => void }) {
  const [localSelected, setLocalSelected] = useState(selected);
  const [error, setError] = useState("");

  function toggle(domain: string) {
    setError("");
    if (localSelected.includes(domain)) {
      setLocalSelected(localSelected.filter((item) => item !== domain));
      return;
    }
    if (localSelected.length >= 5) {
      setError("Vali kuni 5 valdkonda, et soovitused ei läheks liiga laiali.");
      return;
    }
    setLocalSelected([...localSelected, domain]);
  }

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">1. samm</p>
        <h1>Vali kuni 5 valdkonda, mida soovid edasi uurida</h1>
        <p>Vali vähemalt üks valdkond. Saad hiljem plaane täpsustada kursuste, õpiteede ja ametitega.</p>
      </div>
      {error && <Notice tone="warn">{error}</Notice>}
      <div className="domainGrid">
        {domains.map((domain) => (
          <button className={`selectCard ${localSelected.includes(domain) ? "selected" : ""}`} key={domain} onClick={() => toggle(domain)}>
            {domain}
          </button>
        ))}
      </div>
      <button className="primary" disabled={localSelected.length < 1} onClick={() => onDone(localSelected)}>
        Koosta profiil
      </button>
    </section>
  );
}
