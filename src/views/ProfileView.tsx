import { BarChart } from "../components/BarChart";
import { Notice } from "../components/Notice";
import { RichText } from "../components/RichText";
import type { AppState, AppView } from "../types";

export function ProfileView({ state, setView }: { state: AppState; setView: (view: AppView) => void }) {
  const user = state.user;
  if (!user) return null;

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">Profiil</p>
        <h1>Tere, {user.name}</h1>
        <p>Siin on esmane ülevaade sinu huvidest, oskustest ja võimalikest suundadest. See ei ole lõplik hinnang, vaid abivahend valikute võrdlemiseks.</p>
      </div>

      <Notice>See profiil on abivahend, mitte lõplik hinnang sinu võimetele või tulevikule.</Notice>

      <div className="grid two">
        <div className="card">
          <h2>Huvide plokk</h2>
          <BarChart items={user.interestScores} />
          <p className="muted">Protsendid on indikatiivsed ja põhinevad sinu sisestatud või üles laaditud tulemuste tõlgendusel.</p>
        </div>
        <div className="card">
          <h2>Oskuste plokk</h2>
          <BarChart items={user.skillScores} />
        </div>
      </div>

      <div className="card">
        <h2>Valitud valdkonnad</h2>
        <div className="chipRow">
          {user.selectedDomains.map((domain) => (
            <span className="chip" key={domain}>
              {domain}
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>AI koostatud kokkuvõte</h2>
        {user.aiSummary ? <RichText text={user.aiSummary} className="profileSummaryText" /> : <p>Kokkuvõte tekib pärast valdkondade valikut.</p>}
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Sulle võivad huvi pakkuda ametisuunad</h2>
          <ul>
            {user.possibleJobDirections.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>Võimalikud edasiõppimise suunad</h2>
          <ul>
            {user.possibleEducationDirections.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="buttonRow">
        <button className="primary" onClick={() => setView("courses")}>
          Vaata kursuseid
        </button>
        <button className="secondary" onClick={() => setView("education")}>
          Vaata edasiõppimisvõimalusi
        </button>
        <button className="secondary" onClick={() => setView("jobs")}>
          Vaata ameteid
        </button>
      </div>
    </section>
  );
}
