import { Zadanie } from "../models/Zadanie";

export const zadania: Zadanie[] = [
  {
    id: "zad-0001",

    klasaId: "1",

    dzialId: "wyrazenia-algebraiczne",

    tematId: "potegi",

    tytul: "Potęgi - zadanie 1",

    typ: "otwarte",

    poziom: 1,

    punkty: 1,

    czas: 2,

    tresc: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Oblicz: 2³ · 2⁵"
            }
          ]
        }
      ]
    },

    odpowiedz: {
      wynik: "2⁸ = 256"
    },

    rozwiazanie: {
      kroki: [
        "2³ · 2⁵ = 2⁸",
        "2⁸ = 256"
      ]
    },

    tagi: [
      "potęgi",
      "działania"
    ],

    aktywne: true,

    autor: "Edyta",

    createdAt: new Date().toISOString(),

    updatedAt: new Date().toISOString(),
  }
];