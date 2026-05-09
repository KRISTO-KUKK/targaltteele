import type { TestAnalysis } from "../types";
import { TestResultView } from "./TestResultView";

export function InterestTestView({ onDone }: { onDone: (analysis: TestAnalysis) => void }) {
  return (
    <TestResultView
      title="3. samm: huvide testi tulemus"
      description="Tee kõigepealt minukarjäär.ee huvide test. Kui tulemus on käes, salvesta see pildina/PDF-ina või kopeeri tulemuse tekst. Seejärel tule tagasi siia ja laadi tulemus üles või kleebi tekstiväljale."
      linkLabel="Ava huvide test"
      linkUrl="https://minukarjaar.ee/et/testid/milline-on-sinu-huvide-profiil"
      analyzeLabel="Analüüsi huvide tulemus"
      skipLabel="Jäta huvide test praegu vahele"
      kind="interests"
      onDone={onDone}
    />
  );
}
