import {
  filterVariantFieldBySubtasks,
  type SubtaskSelectionOptions,
} from "./subtaskSelection";
import {
  normalizeVariants,
  type ZadanieVariantSource,
} from "@/app/lib/variants";

export function resolveTaskFieldForDocument(
  task: ZadanieVariantSource,
  variantIndex: number,
  field: "tresc" | "odpowiedz" | "rozwiazanie",
  options: SubtaskSelectionOptions = {}
): unknown {
  const variants = normalizeVariants(task);
  const variant = variants[variantIndex] ?? variants[0];
  const raw = variant?.[field];

  return filterVariantFieldBySubtasks(raw, field, options);
}

export function resolveTaskContentForDocument(
  task: ZadanieVariantSource,
  variantIndex: number,
  options: SubtaskSelectionOptions = {}
): unknown {
  return resolveTaskFieldForDocument(task, variantIndex, "tresc", options);
}
