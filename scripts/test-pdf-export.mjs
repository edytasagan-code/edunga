const list = await fetch("http://localhost:3000/api/zadania").then((r) =>
  r.json()
);

if (!list.length) {
  console.error("No tasks");
  process.exit(1);
}

const res = await fetch("http://localhost:3000/api/generator/pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Test sprawdzian",
    school: "LO Test",
    className: "1 LO",
    date: "6.07.2026",
    items: [{ taskId: list[0].id, variantIndex: 0 }],
  }),
});

const text = await res.text();
console.log("status", res.status, res.headers.get("content-type"));
console.log(text.slice(0, 500));
if (res.ok) {
  console.log("bytes", text.length);
}
