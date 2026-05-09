import { demoUser } from "../data/demoData";

export function LoginView({ start }: { start: () => void }) {
  return (
    <section className="hero">
      <div className="heroCopy">
        <p className="eyebrow">Quiet guidance. Visible next step.</p>
        <h1>Leia järgmine samm oma õpi- ja karjäärirajal.</h1>
        <p className="lead">Teele seob huvid, oskused ja eesmärgid arusaadavaks valikute kaardiks. Mitte rohkem müra, vaid selgem põhjus, miks üks suund sobib.</p>
        <button className="primary" onClick={start}>
          Loo minu kaart
        </button>
      </div>
      <aside className="heroObject">
        <div className="productMap">
          <article className="mapCard">
            <p className="eyebrow">järgmine samm</p>
            <h2>Vali kaks sobivat kursust.</h2>
            <p className="muted">Fookus püsib ühel otsusel korraga.</p>
          </article>
          <article className="mapCard">
            <p className="eyebrow">sobivus</p>
            <strong className="fitNumber">82%</strong>
            <p className="muted">IT + disain</p>
            <div className="chipRow">
              <span className="chip">huvi tehnoloogia vastu</span>
              <span className="chip">loov probleemilahendus</span>
            </div>
          </article>
          <article className="mapCard">
            <p className="eyebrow">demo kasutaja</p>
            <h2>{demoUser.name}</h2>
            <p className="muted">
              {demoUser.grade} · {demoUser.school}
            </p>
          </article>
        </div>
      </aside>
    </section>
  );
}
