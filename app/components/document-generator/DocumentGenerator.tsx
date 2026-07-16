"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import ResizablePanelLayout from "./ResizablePanelLayout";
import DocumentPanel from "./DocumentPanel";
import DocumentPreviewPanel from "./DocumentPreviewPanel";
import { PrintCellScaleProvider } from "./PrintCellScaleContext";
import TaskLibrary from "./TaskLibrary";

import {
  createDocumentAnswerAreaItem,
  createDocumentTaskItem,
  defaultDocumentDisplayOptions,
  isDocumentTaskItem,
  type DocumentAnswerAreaItem,
  type DocumentDisplayOptions,
  type DocumentItem,
  type DocumentType,
  type GeneratorDocument,
} from "@/app/lib/documentGenerator";
import {
  buildDocumentWritePayload,
  defaultDocumentMetadata,
  type DocumentProjectMetadata,
  type SavedDocumentRecord,
} from "@/app/lib/documentProject";
import { defaultDocumentType } from "@/app/lib/documentMetadata";
import SaveDocumentDialog, {
  type SaveDocumentFormValues,
} from "./SaveDocumentDialog";
import {
  patchSubtaskGridOffset,
  splitDocumentForSubtaskGrid,
  collectSubtaskLabels,
  normalizeSubtaskGridOffsets,
} from "@/app/lib/subtaskGridLayout";
import { resolveTaskContentForDocument } from "@/app/lib/documentTaskContent";
import {
  defaultPrintLayoutOptions,
  type PrintLayoutOptions,
} from "@/app/lib/printLayout";

export type GeneratorTask = {
  id: string;
  kod: string;
  klasaId: string;
  dzialId: string;
  tematId: string;
  typ: string;
  poziom: number;
  punkty: number;
  czas: number;
  zrodlo?: string | null;
  identyfikator?: string | null;
  tresc: unknown;
  odpowiedz?: unknown;
  rozwiazanie?: unknown;
  warianty?: unknown;
};

type Props = {
  tasks: GeneratorTask[];
  initialDocument?: GeneratorDocument;
  initialMetadata?: DocumentProjectMetadata;
  documentId?: string;
  documentKod?: string;
};

function serializeDocumentSnapshot(
  document: GeneratorDocument,
  metadata: DocumentProjectMetadata
): string {
  return JSON.stringify(buildDocumentWritePayload(document, metadata));
}

function createEmptyDocument(): GeneratorDocument {
  return {
    title: "",
    type: defaultDocumentType(),
    display: defaultDocumentDisplayOptions(),
    printLayout: defaultPrintLayoutOptions(),
    items: [],
  };
}

export default function DocumentGenerator({
  tasks,
  initialDocument,
  initialMetadata,
  documentId: initialDocumentId,
  documentKod: initialDocumentKod,
}: Props) {
  const router = useRouter();
  const emptyDocument = createEmptyDocument();
  const [document, setDocument] = useState<GeneratorDocument>(
    initialDocument ?? emptyDocument
  );
  const [metadata, setMetadata] = useState<DocumentProjectMetadata>(
    initialMetadata ?? defaultDocumentMetadata()
  );
  const [documentId, setDocumentId] = useState<string | undefined>(
    initialDocumentId
  );
  const [documentKod, setDocumentKod] = useState<string | undefined>(
    initialDocumentKod
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    serializeDocumentSnapshot(
      initialDocument ?? emptyDocument,
      initialMetadata ?? defaultDocumentMetadata()
    )
  );
  const [saving, setSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!initialDocument) {
      return;
    }

    setDocument(initialDocument);
    setMetadata(initialMetadata ?? defaultDocumentMetadata());
    setDocumentId(initialDocumentId);
    setDocumentKod(initialDocumentKod);
    setSavedSnapshot(
      serializeDocumentSnapshot(
        initialDocument,
        initialMetadata ?? defaultDocumentMetadata()
      )
    );
  }, [
    initialDocument,
    initialMetadata,
    initialDocumentId,
    initialDocumentKod,
  ]);

  const isDirty = useMemo(
    () => serializeDocumentSnapshot(document, metadata) !== savedSnapshot,
    [document, metadata, savedSnapshot]
  );

  const taskMap = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );

  const addedTaskIds = useMemo(
    () =>
      new Set(
        document.items
          .filter(isDocumentTaskItem)
          .map((item) => item.taskId)
      ),
    [document.items]
  );

  function addTask(
    taskId: string,
    variantIndex: number,
    selectedSubtasks?: string[]
  ) {
    if (addedTaskIds.has(taskId)) {
      return;
    }

    setDocument((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        createDocumentTaskItem(taskId, variantIndex, selectedSubtasks),
      ],
    }));
  }

  function addAnswerArea() {
    setDocument((prev) => ({
      ...prev,
      items: [...prev.items, createDocumentAnswerAreaItem()],
    }));
  }

  function removeItem(entryId: string) {
    setDocument((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.entryId !== entryId),
    }));
  }

  function moveItem(entryId: string, direction: -1 | 1) {
    setDocument((prev) => {
      const index = prev.items.findIndex(
        (item) => item.entryId === entryId
      );

      if (index === -1) {
        return prev;
      }

      return {
        ...prev,
        items: moveDocumentItems(prev.items, index, direction),
      };
    });
  }

  function setTitle(title: string) {
    setDocument((prev) => ({ ...prev, title }));
  }

  function setType(type: DocumentType) {
    setDocument((prev) => ({ ...prev, type }));
  }

  function updateAnswerAreaItem(
    entryId: string,
    patch: Partial<Pick<DocumentAnswerAreaItem, "areaType" | "heightCm" | "heightPx">>
  ) {
    setDocument((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.entryId === entryId && item.kind === "answer-area"
          ? { ...item, ...patch }
          : item
      ),
    }));
  }

  function setDisplay(patch: Partial<DocumentDisplayOptions>) {
    setDocument((prev) => ({
      ...prev,
      display: { ...prev.display, ...patch },
    }));
  }

  function setPrintLayout(patch: Partial<PrintLayoutOptions>) {
    setDocument((prev) => ({
      ...prev,
      printLayout: { ...prev.printLayout, ...patch },
    }));
  }

  function setVariantIndex(entryId: string, variantIndex: number) {
    setDocument((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.entryId === entryId && item.kind === "task"
          ? {
              ...item,
              variantIndex,
              selectedSubtasks: undefined,
              subtaskGridOffsets: undefined,
            }
          : item
      ),
    }));
  }

  function setSelectedSubtasks(entryId: string, selectedSubtasks?: string[]) {
    setDocument((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.entryId !== entryId || item.kind !== "task") {
          return item;
        }

        const task = taskMap.get(item.taskId);
        const content = task
          ? resolveTaskContentForDocument(task, item.variantIndex, {
              selectedSubtasks,
              renumberSelectedSubtasks: prev.display.renumberSelectedSubtasks,
            })
          : null;
        const split = splitDocumentForSubtaskGrid(content);
        const validLabels = split ? collectSubtaskLabels(split.subtasks) : [];

        return {
          ...item,
          selectedSubtasks,
          subtaskGridOffsets: normalizeSubtaskGridOffsets(
            item.subtaskGridOffsets,
            validLabels
          ),
        };
      }),
    }));
  }

  function setMetadataPatch(patch: Partial<DocumentProjectMetadata>) {
    setMetadata((prev) => ({ ...prev, ...patch }));
  }

  const saveDocument = useCallback(
    async (nextDocument: GeneratorDocument, nextMetadata: DocumentProjectMetadata) => {
      setSaving(true);
      setSaveMessage(null);

      try {
        const payload = buildDocumentWritePayload(nextDocument, nextMetadata);
        const response = await fetch(
          documentId ? `/api/dokumenty/${documentId}` : "/api/dokumenty",
          {
            method: documentId ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          setSaveMessage({
            type: "error",
            text: error?.error ?? "Nie udało się zapisać dokumentu.",
          });
          return false;
        }

        const record = (await response.json()) as SavedDocumentRecord;
        setDocumentId(record.id);
        setDocumentKod(record.kod);
        setMetadata({
          klasa: record.klasa,
          poziom: record.poziom,
          opis: record.opis ?? "",
        });
        setSavedSnapshot(
          serializeDocumentSnapshot(nextDocument, {
            klasa: record.klasa,
            poziom: record.poziom,
            opis: record.opis ?? "",
          })
        );
        setSaveMessage({
          type: "success",
          text: documentId
            ? "Zmiany zapisane."
            : `Dokument zapisany jako ${record.kod}.`,
        });

        if (!documentId) {
          router.replace(`/nauczyciel/generator/${record.id}`);
        }

        return true;
      } catch {
        setSaveMessage({
          type: "error",
          text: "Nie udało się zapisać dokumentu. Sprawdź połączenie z serwerem.",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [documentId, router]
  );

  function requestSave() {
    if (document.items.length === 0) {
      return;
    }

    if (!documentId) {
      setSaveDialogOpen(true);
      return;
    }

    void saveDocument(document, metadata);
  }

  async function confirmFirstSave(values: SaveDocumentFormValues) {
    const nextDocument: GeneratorDocument = {
      ...document,
      title: values.tytul,
      type: values.typ,
    };
    const nextMetadata: DocumentProjectMetadata = {
      klasa: values.klasa,
      poziom: values.poziom,
      opis: values.opis || undefined,
    };

    setDocument(nextDocument);
    setMetadata(nextMetadata);

    const ok = await saveDocument(nextDocument, nextMetadata);

    if (ok) {
      setSaveDialogOpen(false);
    }
  }

  function updateSubtaskGridOffset(
    entryId: string,
    label: string,
    offsetPx: number
  ) {
    setDocument((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.entryId !== entryId || item.kind !== "task") {
          return item;
        }

        const task = taskMap.get(item.taskId);
        const content = task
          ? resolveTaskContentForDocument(task, item.variantIndex, {
              selectedSubtasks: item.selectedSubtasks,
              renumberSelectedSubtasks: prev.display.renumberSelectedSubtasks,
            })
          : null;
        const split = splitDocumentForSubtaskGrid(content);
        const validLabels = split ? collectSubtaskLabels(split.subtasks) : [];

        return {
          ...item,
          subtaskGridOffsets: patchSubtaskGridOffset(
            item.subtaskGridOffsets,
            label,
            offsetPx,
            validLabels
          ),
        };
      }),
    }));
  }

  return (
    <PrintCellScaleProvider>
      <SaveDocumentDialog
        open={saveDialogOpen}
        initialTitle={document.title}
        saving={saving}
        onCancel={() => {
          if (!saving) {
            setSaveDialogOpen(false);
          }
        }}
        onConfirm={(values) => void confirmFirstSave(values)}
      />
      <ResizablePanelLayout
      library={
        <TaskLibrary
          tasks={tasks}
          onAdd={addTask}
          onAddAnswerArea={addAnswerArea}
          addedTaskIds={addedTaskIds}
        />
      }
      documentPanel={
        <DocumentPanel
          document={document}
          taskMap={taskMap}
          documentId={documentId}
          documentKod={documentKod}
          metadata={metadata}
          isDirty={isDirty}
          saving={saving}
          saveMessage={saveMessage}
          onSave={requestSave}
          onTitleChange={setTitle}
          onTypeChange={setType}
          onMetadataChange={setMetadataPatch}
          onRemove={removeItem}
          onMove={moveItem}
          onUpdateAnswerAreaItem={updateAnswerAreaItem}
          onSetVariantIndex={setVariantIndex}
          onSetSelectedSubtasks={setSelectedSubtasks}
          onDisplayChange={setDisplay}
          onPrintLayoutChange={setPrintLayout}
        />
      }
      preview={
        <DocumentPreviewPanel
          document={document}
          taskMap={taskMap}
          onSubtaskGridOffsetChange={updateSubtaskGridOffset}
        />
      }
    />
    </PrintCellScaleProvider>
  );
}

function moveDocumentItems(
  items: DocumentItem[],
  index: number,
  direction: -1 | 1
) {
  const target = index + direction;

  if (target < 0 || target >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
