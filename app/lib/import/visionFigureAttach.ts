import { cropFigureFromPage } from "./pdfImageCrop";
import type { VisionExercise, VisionFigure } from "./visionExtract";

function exerciseHasVisionText(exercise: VisionExercise): boolean {
  const segments = [
    ...(exercise.bodyBlocks ?? []),
    exercise.context,
    exercise.instruction,
    exercise.question,
    ...(exercise.subtasks ?? []).flatMap((subtask) => [
      subtask.text,
      subtask.expression,
    ]),
    ...(exercise.choices ?? []).flatMap((choice) => [
      choice.text,
      choice.expression,
    ]),
    ...(exercise.statements ?? []).flatMap((statement) => [
      statement.text,
      statement.expression,
    ]),
  ];

  return segments.some((segment) => Boolean(segment?.trim()));
}

export async function attachFiguresToExercise(
  exercise: VisionExercise,
  pageBuffer: Buffer
): Promise<VisionExercise> {
  const figures = exercise.figures ?? [];

  if (figures.length === 0) {
    return exercise;
  }

  const enriched: VisionFigure[] = [];

  for (const figure of figures) {
    if (figure.src) {
      enriched.push(figure);
      continue;
    }

    const cropped = await cropFigureFromPage(pageBuffer, figure.bbox, {
      illustrationOnly: exerciseHasVisionText(exercise),
    });

    if (!cropped) {
      continue;
    }

    enriched.push({
      ...figure,
      src: cropped.src,
      width: cropped.width,
      height: cropped.height,
    });
  }

  return {
    ...exercise,
    figures: enriched,
  };
}

export async function attachFiguresFromPageResults(
  exercises: VisionExercise[],
  pageBuffers: Map<number, Buffer>
): Promise<VisionExercise[]> {
  const result: VisionExercise[] = [];

  for (const exercise of exercises) {
    const pageIndex = parsePageIndex(exercise.sectionReference);

    if (!pageIndex || !pageBuffers.has(pageIndex)) {
      result.push(exercise);
      continue;
    }

    result.push(
      await attachFiguresToExercise(exercise, pageBuffers.get(pageIndex)!)
    );
  }

  return result;
}

function parsePageIndex(sectionReference: string | undefined): number | null {
  if (!sectionReference) {
    return null;
  }

  const match = sectionReference.match(/(\d+)/);

  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1], 10);

  return Number.isFinite(value) ? value : null;
}

export async function attachFiguresForPageExercises(
  exercises: VisionExercise[],
  pageIndex: number,
  pageBuffer: Buffer
): Promise<VisionExercise[]> {
  const tagged = exercises.map((exercise) => ({
    ...exercise,
    sectionReference: exercise.sectionReference ?? `page:${pageIndex}`,
  }));

  const result: VisionExercise[] = [];

  for (const exercise of tagged) {
    result.push(await attachFiguresToExercise(exercise, pageBuffer));
  }

  return result;
}
