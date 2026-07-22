/** Shared task fields for list, editor, and generators. */
export type TaskPublic = {
  id: string;
  kod: string;
  klasaId: string;
  dzialId: string;
  tematId: string;
  typ: string;
  poziom: number;
  punkty: number;
  czas: number;
  tresc: unknown;
  odpowiedz: unknown;
  rozwiazanie: unknown;
  warianty?: unknown;
};

export { formatTaskCode } from "./taskCode";
