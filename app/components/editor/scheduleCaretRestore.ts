import type { CaretRestoreTarget } from "./resolveCaretAfterMathRemoval";
import { applyCaretRestoreTarget } from "./resolveCaretAfterMathRemoval";

export function scheduleCaretRestore(
  target: CaretRestoreTarget,
  root: HTMLElement,
  onComplete?: () => void
): void {
  let remaining = 4;

  const attemptRestore = () => {
    applyCaretRestoreTarget(target, root);

    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    remaining -= 1;
    requestAnimationFrame(attemptRestore);
  };

  applyCaretRestoreTarget(target, root);
  requestAnimationFrame(attemptRestore);
}
