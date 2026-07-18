import type { EditorDocument } from "@/app/components/editor/types";
import type { SourceMetadata } from "@/app/lib/sourceMetadata";
import { EMPTY_SOURCE_METADATA } from "@/app/lib/sourceMetadata";

export type ImportStep =
  | "upload"
  | "ocr"
  | "parse"
  | "preview"
  | "edit"
  | "saved";

export type ExtractionMethod = "pdf-text" | "ocr" | "vision";

export type VisionEnhancementStatus =
  | "none"
  | "pending"
  | "running"
  | "done"
  | "failed";

export type ExerciseLevel = "basic" | "extended";

export type ParsedExercise = {
  index: number;
  number: string | null;
  rawText: string;
  confidence: number;
  level: ExerciseLevel | null;
  levelDetected: boolean;
  mathReconstructed: boolean;
  mathReconstructionMethod: import("./mathReconstruction").MathReconstructionMethod | null;
  tresc: EditorDocument;
  rozwiazanie: EditorDocument;
  odpowiedz: EditorDocument;
  selected: boolean;
  saved: boolean;
  savedTaskId: string | null;
  savedKod: string | null;
  poziom: number | null;
  punkty: number | null;
  czas: number | null;
  /** Pazdro PP (profil podstawowy), e.g. 1.171 */
  identifikatorPp?: string | null;
  /** Pazdro PR (profil rozszerzony), e.g. 1.188 */
  identifikatorPr?: string | null;
  /** CKE / Matura internal source id, e.g. MAT2026-PP-001 */
  identifikatorZrodla?: string | null;
  /** Per-exercise overrides; unset fields inherit session metadata */
  metadataOverrides?: ImportExerciseMetadataOverrides | null;
  /** Suggested task type detected from import pipeline */
  suggestedTyp?: string | null;
};

export type ImportExerciseMetadataOverrides = Partial<
  Omit<ImportSessionMetadata, "sourceMetadata">
> & {
  sourceMetadata?: Partial<SourceMetadata>;
};

export type ImportSessionMetadata = {
  klasaId: string;
  dzialId: string;
  tematId: string;
  typ: string;
  zrodlo: string | null;
  identyfikatorPrefix: string | null;
  sourceMetadata: SourceMetadata;
};

export type ImportSession = {
  id: string;
  fileName: string;
  createdAt: string;
  step: ImportStep;
  extractionMethod: ExtractionMethod;
  pageCount: number;
  rawText: string;
  ocrWarnings: string[];
  parseWarnings: string[];
  aiUsed: boolean;
  metadata: ImportSessionMetadata;
  exercises: ParsedExercise[];
  visionEnhancementStatus?: VisionEnhancementStatus;
};

export type ImportProcessResult = {
  sessionId: string;
  fileName: string;
  extractionMethod: ExtractionMethod;
  pageCount: number;
  exerciseCount: number;
  aiUsed: boolean;
  visionEnhancementStatus?: VisionEnhancementStatus;
  warnings: string[];
};

export type ImportSaveExercisePayload = {
  klasaId: string;
  dzialId: string;
  tematId: string;
  typ: string;
  poziom: number;
  punkty: number;
  czas: number;
  zrodlo?: string | null;
  identyfikator?: string | null;
  identifikatorPp?: string | null;
  identifikatorPr?: string | null;
  rokEgzaminu?: number | null;
  sesjaEgzaminu?: string | null;
  poziomEgzaminu?: string | null;
  tagi?: string[];
  tresc: EditorDocument;
  rozwiazanie: EditorDocument;
  odpowiedz: EditorDocument;
};

export const DEFAULT_IMPORT_METADATA: ImportSessionMetadata = {
  klasaId: "",
  dzialId: "",
  tematId: "",
  typ: "",
  zrodlo: null,
  identyfikatorPrefix: null,
  sourceMetadata: { ...EMPTY_SOURCE_METADATA },
};

export const DEFAULT_EXERCISE_METADATA = {
  poziom: null,
  punkty: null,
  czas: null,
} as const;
