/**
 * Simulates TaskForm POST payload (warianty format).
 */
const BASE = "http://localhost:3000";

function emptyDoc(seed) {
  return {
    version: 1,
    paragraphs: [
      {
        id: `p-${seed}`,
        children: [{ id: `t-${seed}`, type: "text", text: "Test save" }],
      },
    ],
  };
}

const payload = {
  klasaId: "1lo",
  dzialId: "zbiory-liczbowe",
  tematId: "zbior-dzialania",
  typ: "otwarte",
  poziom: 3,
  punkty: 1,
  czas: 5,
  warianty: [
    {
      tresc: emptyDoc("tresc"),
      rozwiazanie: emptyDoc("rozwiazanie"),
      odpowiedz: emptyDoc("odpowiedz"),
    },
  ],
  tagi: [],
};

const t0 = Date.now();
const res = await fetch(`${BASE}/api/zadania`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
console.log("POST status", res.status, "ms", Date.now() - t0);
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("error", body);
  process.exit(1);
}
console.log("created", body.id, body.kod);

const putRes = await fetch(`${BASE}/api/zadania/${body.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ...payload,
    warianty: [
      {
        ...payload.warianty[0],
        tresc: {
          ...emptyDoc("tresc"),
          paragraphs: [
            {
              id: "p-tresc",
              children: [
                { id: "t-tresc", type: "text", text: "Test save EDITED" },
              ],
            },
          ],
        },
      },
    ],
  }),
});
console.log("PUT status", putRes.status);
if (!putRes.ok) {
  console.error(await putRes.text());
  process.exit(1);
}
console.log("OK full API save flow");
