import type { TestAnalysis } from "../types";
import { TestResultView } from "./TestResultView";

export function SkillsTestView({ onDone }: { onDone: (analysis: TestAnalysis) => void }) {
  return (
    <TestResultView
      title="4. samm: oskuste testi tulemus"
      description="Nüüd tee minukarjäär.ee oskuste test. Selle abil saab kaardistada üldoskused, tugevused ja arengukohad. Kui tulemus on käes, laadi see siia üles või kleebi tulemuse tekst."
      linkLabel="Ava oskuste test"
      linkUrl="https://minukarjaar.ee/et/testid/milline-on-sinu-oskuste-profiil"
      analyzeLabel="Analüüsi oskuste tulemus"
      skipLabel="Jäta oskuste test praegu vahele"
      kind="skills"
      onDone={onDone}
    />
  );
}
