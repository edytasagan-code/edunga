/** Curriculum-independent topic taxonomy (seed + reference).
 * Source: Zadania wybor pol_Edunga.xlsx — col A = Temat główny.
 * Podtematy tylko dla Ciągi (col B under that topic).
 */

export type TopicSeed = {
  id: string;
  nazwa: string;
  kolejnosc: number;
  subtopics: Array<{
    id: string;
    nazwa: string;
    kolejnosc: number;
  }>;
};

export const CURRICULUM_TOPICS: TopicSeed[] = [
  {
    id: "ciagi",
    nazwa: "Ciągi",
    kolejnosc: 10,
    subtopics: [
      { id: "ciagi-arytmetyczny", nazwa: "Arytmetyczny", kolejnosc: 1 },
      { id: "ciagi-geometryczny", nazwa: "Geometryczny", kolejnosc: 2 },
      {
        id: "ciagi-arytmetyczny-i-geometryczny",
        nazwa: "Arytmetyczny i geometryczny",
        kolejnosc: 3,
      },
      { id: "ciagi-dowolny", nazwa: "Dowolny", kolejnosc: 4 },
      { id: "ciagi-granice", nazwa: "Granice ciągów", kolejnosc: 5 },
      { id: "ciagi-rekurencyjny", nazwa: "Rekurencyjny", kolejnosc: 6 },
      {
        id: "ciagi-szereg-geometryczny",
        nazwa: "Szereg geometryczny",
        kolejnosc: 7,
      },
    ],
  },
  {
    id: "funkcje",
    nazwa: "Funkcje",
    kolejnosc: 20,
    subtopics: [],
  },
  {
    id: "funkcja-trygonometryczna",
    nazwa: "Funkcja trygonometryczna",
    kolejnosc: 30,
    subtopics: [],
  },
  {
    id: "wielomiany",
    nazwa: "Wielomiany",
    kolejnosc: 40,
    subtopics: [],
  },
  {
    id: "funkcje-wykresy",
    nazwa: "Funkcje - wykresy",
    kolejnosc: 50,
    subtopics: [],
  },
  {
    id: "geometria",
    nazwa: "Geometria",
    kolejnosc: 60,
    subtopics: [],
  },
  {
    id: "kombinatoryka",
    nazwa: "Kombinatoryka",
    kolejnosc: 70,
    subtopics: [],
  },
  {
    id: "liczby",
    nazwa: "Liczby",
    kolejnosc: 80,
    subtopics: [],
  },
  {
    id: "nierownosci",
    nazwa: "Nierówności",
    kolejnosc: 90,
    subtopics: [],
  },
  {
    id: "prawdopodobienstwo",
    nazwa: "Prawdopodobieństwo",
    kolejnosc: 100,
    subtopics: [],
  },
  {
    id: "rownania",
    nazwa: "Równania",
    kolejnosc: 110,
    subtopics: [],
  },
  {
    id: "statystyka",
    nazwa: "Statystyka",
    kolejnosc: 120,
    subtopics: [],
  },
  {
    id: "zadania-maturalne",
    nazwa: "Zadania maturalne",
    kolejnosc: 130,
    subtopics: [],
  },
  {
    id: "zadania-testowe",
    nazwa: "Zadania testowe",
    kolejnosc: 140,
    subtopics: [],
  },
  {
    id: "zadania-z-trescia",
    nazwa: "Zadania z treścią",
    kolejnosc: 150,
    subtopics: [],
  },
];
