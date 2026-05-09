import type { AppState, AppView } from "../types";
import type { ReactNode } from "react";
import teeleLogo from "../assets/teele-logo.svg";

const navItems: { view: AppView; label: string }[] = [
  { view: "profile", label: "Profiil" },
  { view: "recommendations", label: "Soovitused" },
  { view: "courses", label: "Kursused" },
  { view: "education", label: "Edasiõppimine" },
  { view: "jobs", label: "Ametid" },
  { view: "plans", label: "Plaanid" },
];

export function Layout({
  state,
  setView,
  reset,
  children,
}: {
  state: AppState;
  setView: (view: AppView) => void;
  reset: () => void;
  children: ReactNode;
}) {
  const showNav = Boolean(state.user && !["login", "interest-test", "skills-test", "free-text", "domains", "ai-review"].includes(state.currentView));
  return (
    <main className="appShell">
      <header className="topbar">
        <button className="brandButton" onClick={() => setView(state.user ? "profile" : "login")}>
          <img src={teeleLogo} alt="Teele" />
        </button>
        {showNav && (
          <nav aria-label="Peamine navigeerimine">
            {navItems.map((item) => (
              <button className={state.currentView === item.view ? "active" : ""} key={item.view} onClick={() => setView(item.view)}>
                {item.label}
              </button>
            ))}
          </nav>
        )}
        {state.user && (
          <div className="userBar">
            <span>
              {state.user.name} · {state.user.grade}
            </span>
            <button className="ghost danger" onClick={reset}>
              Lähtesta profiil
            </button>
          </div>
        )}
      </header>
      {children}
    </main>
  );
}
