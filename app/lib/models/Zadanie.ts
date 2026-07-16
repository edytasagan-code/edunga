export type Poziom = 1 | 2 | 3 | 4 | 5;

export type TypZadania =
  | "otwarte"
  | "wybor-wielokrotny"
  | "zamkniete"
  | "prawda-falsz"
  | "uzupelnij"
  | "dobierz"
  | "test";

export interface Zadanie {
  id: string;

  klasaId: string;

  dzialId: string;

  tematId: string;

  tytul: string;

  typ: TypZadania;

  poziom: Poziom;

  punkty: number;

  czas: number;

  tresc: unknown;

  odpowiedz: unknown;

  rozwiazanie: unknown;

  tagi: string[];

  aktywne: boolean;

  autor: string;

  createdAt: string;

  updatedAt: string;
}