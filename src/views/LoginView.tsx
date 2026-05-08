import { demoUser } from "../data/demoData";

export function LoginView({ start }: { start: () => void }) {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Õpitee ja karjäärivalikute prototüüp gümnaasiumiõpilasele</p>
        <h1>Targalt teele</h1>
        <p className="lead">Too minukarjäär.ee testi tulemused siia, vaata profiili ning võrdle kursuseid, õpiteid, ameteid ja plaane A, B ja C.</p>
        <button className="primary" onClick={start}>
          Alusta demo-kasutajana
        </button>
      </div>
      <aside className="card">
        <h2>Demo kasutaja</h2>
        <dl className="facts">
          <div>
            <dt>Nimi</dt>
            <dd>{demoUser.name}</dd>
          </div>
          <div>
            <dt>Klass</dt>
            <dd>{demoUser.grade}</dd>
          </div>
          <div>
            <dt>Kool</dt>
            <dd>{demoUser.school}</dd>
          </div>
        </dl>
        <p className="muted">Demo seis salvestub ainult sinu brauseri localStorage'isse.</p>
      </aside>
    </section>
  );
}
