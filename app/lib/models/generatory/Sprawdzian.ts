export interface Sprawdzian {

  klasaId: string;

  dzialId: string;

  tematy: string[];

  liczbaZadan: number;

  poziomy: number[];

  wersje: number;

  odpowiedzi: boolean;

  rozwiazania: boolean;

  punkty: number;

  czas: number;

}