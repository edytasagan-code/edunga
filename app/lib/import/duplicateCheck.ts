import { parseEditorDocument } from "@/app/components/editor/parseEditorDocument";

import type { EditorDocument } from "@/app/components/editor/types";

import { prisma } from "@/app/lib/prisma";

import {

  normalizeTaskIdentifier,

  normalizeTaskSource,

} from "@/app/lib/taskSource";



import type { ImportSessionMetadata, ParsedExercise } from "./types";

import { normalizeParsedExercisePazdroIdentifiers } from "./pazdroIdentifier";
import { resolveExerciseScope } from "./exerciseMetadata";
import { resolveExerciseIdentyfikator } from "./saveExercise";



export type DuplicateStatus = "new" | "exact" | "content";



export type DuplicateMatch = {

  id: string;

  kod: string;

  zrodlo: string | null;

  identyfikator: string | null;

  identifikatorPp: string | null;

  identifikatorPr: string | null;

};



export type ExerciseDuplicateResult = {

  index: number;

  status: DuplicateStatus;

  identyfikator: string | null;

  identifikatorPp: string | null;

  identifikatorPr: string | null;

  existing: DuplicateMatch | null;

};



export type DuplicateDecision = "skip" | "replace" | "save";



export function normalizeDocumentSignature(document: EditorDocument): string {

  const parts: string[] = [];



  for (const paragraph of document.paragraphs) {

    for (const node of paragraph.children) {

      if (node.type === "text") {

        const text = node.text.trim();



        if (text) {

          parts.push(text);

        }

      } else if (node.type === "math") {

        const latex = node.latex.trim();



        if (latex) {

          parts.push(`math:${latex}`);

        }

      }

    }

  }



  return parts.join("|");

}



function toDuplicateMatch(task: {

  id: string;

  kod: string;

  zrodlo: string | null;

  identyfikator: string | null;

  identifikatorPp?: string | null;

  identifikatorPr?: string | null;

}): DuplicateMatch {

  return {

    id: task.id,

    kod: task.kod,

    zrodlo: task.zrodlo,

    identyfikator: task.identyfikator,

    identifikatorPp: task.identifikatorPp ?? null,

    identifikatorPr: task.identifikatorPr ?? null,

  };

}



async function findExactIdentifierMatch(
  zrodlo: string,
  identyfikator: string
) {
  return prisma.zadanie.findFirst({
    where: {
      zrodlo,
      OR: [
        { identyfikator },
        { identifikatorPp: identyfikator },
        { identifikatorPr: identyfikator },
      ],
    },

    select: {

      id: true,

      kod: true,

      zrodlo: true,

      identyfikator: true,

      identifikatorPp: true,

      identifikatorPr: true,

    },

  });

}



export async function checkExerciseDuplicate(
  sessionMetadata: ImportSessionMetadata,
  exercise: Pick<
    ParsedExercise,
    | "index"
    | "number"
    | "tresc"
    | "identifikatorPp"
    | "identifikatorPr"
    | "metadataOverrides"
  >,
  siblings?: ParsedExercise[]
): Promise<Omit<ExerciseDuplicateResult, "index">> {
  const metadata = resolveExerciseScope(sessionMetadata, exercise);
  const zrodlo = normalizeTaskSource(metadata.zrodlo) || null;
  const identyfikator =
    normalizeTaskIdentifier(
      resolveExerciseIdentyfikator(metadata, exercise, siblings)
    ) || null;

  const normalizedIds =
    metadata.zrodlo === "pazdro" && siblings
      ? normalizeParsedExercisePazdroIdentifiers(
          exercise as ParsedExercise,
          siblings
        )
      : (exercise as ParsedExercise);

  const identifikatorPp =
    normalizeTaskIdentifier(normalizedIds.identifikatorPp) || null;
  const identifikatorPr =
    normalizeTaskIdentifier(normalizedIds.identifikatorPr) || null;

  const tresc = parseEditorDocument(exercise.tresc);

  const contentSignature = tresc ? normalizeDocumentSignature(tresc) : "";



  if (zrodlo) {

    const identifiers = [
      identyfikator,
      identifikatorPp,
      identifikatorPr,
    ].filter((value): value is string => Boolean(value));



    for (const identifier of identifiers) {

      const exact = await findExactIdentifierMatch(zrodlo, identifier);



      if (exact) {

        return {

          status: "exact",

          identyfikator,

          identifikatorPp,

          identifikatorPr,

          existing: toDuplicateMatch(exact),

        };

      }

    }

  }



  if (contentSignature) {

    const candidates = await prisma.zadanie.findMany({

      where: zrodlo ? { zrodlo } : undefined,

      select: {

        id: true,

        kod: true,

        zrodlo: true,

        identyfikator: true,

        identifikatorPp: true,

        identifikatorPr: true,

        tresc: true,

      },

      orderBy: { createdAt: "desc" },

      take: 500,

    });



    for (const candidate of candidates) {

      const candidateDocument = parseEditorDocument(candidate.tresc);



      if (!candidateDocument) {

        continue;

      }



      if (

        normalizeDocumentSignature(candidateDocument) === contentSignature

      ) {

        return {

          status: "content",

          identyfikator,

          identifikatorPp,

          identifikatorPr,

          existing: toDuplicateMatch(candidate),

        };

      }

    }

  }



  return {

    status: "new",

    identyfikator,

    identifikatorPp,

    identifikatorPr,

    existing: null,

  };

}



export async function checkSessionDuplicates(

  metadata: ImportSessionMetadata,

  exercises: ParsedExercise[]

): Promise<ExerciseDuplicateResult[]> {

  const results: ExerciseDuplicateResult[] = [];



  for (const exercise of exercises) {

    const result = await checkExerciseDuplicate(metadata, exercise, exercises);



    results.push({

      index: exercise.index,

      ...result,

    });

  }



  return results;

}

