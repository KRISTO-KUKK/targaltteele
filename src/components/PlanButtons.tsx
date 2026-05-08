import type { PlanId } from "../types";

const planIds: PlanId[] = ["A", "B", "C"];

export function PlanButtons({ onAdd }: { onAdd: (planId: PlanId) => void }) {
  return (
    <div className="buttonRow">
      {planIds.map((planId) => (
        <button className="secondary" key={planId} onClick={() => onAdd(planId)}>
          Lisa plaani {planId}
        </button>
      ))}
    </div>
  );
}
