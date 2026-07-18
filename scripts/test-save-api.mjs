const id = "cmqz6h4nh0007uz4861y8wn35";
const base = "http://localhost:3000";

async function timed(label, fn) {
  const start = Date.now();
  const result = await fn();
  console.log(`${label}: ${result} (${Date.now() - start}ms)`);
  return result;
}

await timed("GET", async () => {
  const res = await fetch(`${base}/api/zadania/${id}`, {
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) return `HTTP ${res.status}`;
  const task = await res.json();
  const put = await fetch(`${base}/api/zadania/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      klasaId: task.klasaId,
      dzialId: task.dzialId,
      tematId: task.tematId,
      typ: task.typ,
      poziom: task.poziom,
      punkty: task.punkty,
      czas: task.czas,
      warianty: task.warianty,
      tagi: task.tagi ?? [],
    }),
    signal: AbortSignal.timeout(120000),
  });
  return `PUT HTTP ${put.status}`;
});
