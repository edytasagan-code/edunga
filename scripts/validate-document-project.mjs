import {

  buildDocumentLibrarySummary,

  buildDocumentWritePayload,

  generatorDocumentFromRecord,

  parseDocumentItems,

  parseDocumentWriteBody,

  savedDocumentFromDb,

  serializeDisplayForStorage,

} from "../app/lib/documentProject.ts";

import {

  createDocumentAnswerAreaItem,

  createDocumentTaskItem,

  defaultDocumentDisplayOptions,

} from "../app/lib/documentGenerator.ts";

import { defaultDocumentMetadata } from "../app/lib/documentMetadata.ts";

import {

  defaultPrintLayoutOptions,

} from "../app/lib/printLayout.ts";



let failed = false;



function check(name, ok, detail = "") {

  const mark = ok ? "PASS" : "FAIL";

  if (!ok) failed = true;

  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);

}



const sampleDocument = {

  title: "Sprawdzian — Zbiory",

  type: "sprawdzian",

  display: {

    ...defaultDocumentDisplayOptions(),

    className: "3A",

    date: "2026-07-14",

    group: "runtime-only",

  },

  printLayout: {

    ...defaultPrintLayoutOptions(),

    grid: "2x2",

    duplex: true,

    splitAfterTask: 2,

  },

  items: [

    createDocumentTaskItem("task-1", 0, ["a", "b"]),

    createDocumentAnswerAreaItem(),

    createDocumentTaskItem("task-2", 1),

  ],

};



const metadata = {

  ...defaultDocumentMetadata(),

  klasa: "3-lo",

  poziom: "pp-pr",

  opis: "Test opis",

};



const payload = buildDocumentWritePayload(sampleDocument, metadata);

check("write payload title", payload.tytul === "Sprawdzian — Zbiory");

check("write payload type", payload.typ === "sprawdzian");

check("write payload class", payload.klasa === "3-lo");

check("write payload level", payload.poziom === "pp-pr");

check("write payload description", payload.opis === "Test opis");

check("write payload task count", payload.elementy.length === 3);

check(

  "display stored without group",

  !("group" in serializeDisplayForStorage(sampleDocument.display))

);



const parsedBody = parseDocumentWriteBody({

  tytul: payload.tytul,

  typ: payload.typ,

  klasa: payload.klasa,

  poziom: payload.poziom,

  opis: payload.opis,

  wyswietlanie: payload.wyswietlanie,

  ukladWydruku: payload.ukladWydruku,

  elementy: payload.elementy,

});

check("parse write body", parsedBody !== null);

check(

  "parse preserves subtasks",

  parsedBody?.elementy[0]?.kind === "task" &&

    parsedBody.elementy[0].selectedSubtasks?.join(",") === "a,b"

);



const dbRecord = {

  id: "doc-1",

  kod: "DOC-000001",

  tytul: payload.tytul,

  typ: payload.typ,

  klasa: payload.klasa,

  poziom: payload.poziom,

  opis: payload.opis,

  wyswietlanie: payload.wyswietlanie,

  ukladWydruku: payload.ukladWydruku,

  elementy: payload.elementy,

  zarchiwizowany: false,

  autor: "admin",

  createdAt: new Date("2026-07-14T08:00:00.000Z"),

  updatedAt: new Date("2026-07-14T09:00:00.000Z"),

};



const saved = savedDocumentFromDb(dbRecord);

check("saved from db", saved !== null);



if (saved) {

  const generatorDocument = generatorDocumentFromRecord(saved);

  check(

    "generator document roundtrip title",

    generatorDocument.title === sampleDocument.title

  );

  check(

    "generator document duplex",

    generatorDocument.printLayout.duplex === true

  );

  check(

    "generator document items",

    generatorDocument.items.length === sampleDocument.items.length

  );



  const summary = buildDocumentLibrarySummary(

    saved,

    new Map([

      ["task-1", { punkty: 3, czas: 5 }],

      ["task-2", { punkty: 4, czas: 7 }],

    ])

  );

  check("summary total points", summary.totalPoints === 7);

  check("summary estimated minutes", summary.estimatedMinutes === 12);

  check("summary class label", summary.klasaLabel === "3 LO");

  check("summary level label", summary.poziomLabel === "PP+PR");

  check("summary type label", summary.typLabel === "Sprawdzian");

}



const legacyRecord = savedDocumentFromDb({

  ...dbRecord,

  typ: "test",

  klasa: undefined,

  poziom: undefined,

});

check("legacy type migration", legacyRecord?.typ === "sprawdzian");



const parsedItems = parseDocumentItems([

  {

    kind: "task",

    entryId: "e1",

    taskId: "task-1",

    variantIndex: 0,

    subtaskGridOffsets: { a: 12.7, b: 0 },

  },

  {

    kind: "answer-area",

    entryId: "e2",

    areaType: "lines",

    heightCm: 4,

    heightPx: null,

  },

  { kind: "invalid" },

]);

check("parse items count", parsedItems.length === 2);

check(

  "parse subtask offsets",

  parsedItems[0].kind === "task" &&

    parsedItems[0].subtaskGridOffsets?.a === 13

);



if (failed) {

  process.exit(1);

}



console.log("All document project checks passed.");

