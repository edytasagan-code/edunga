import {
  buildClipboardPayload,
  EDUNGA_CLIPBOARD_MIME,
  extractEditorClipboardFragment,
  extractFullDocumentFromDom,
  parseClipboardDocument,
  serializeDocumentForClipboard,
} from "./documentClipboard";
import { resolveFocusedEditorSurface } from "./selection";
import type { DocumentPoint } from "./selectionModel";
import type { EditorDocument } from "./types";

export type DocumentSelection = {
  anchor: DocumentPoint;
  focus: DocumentPoint;
  isFullDocument: boolean;
};

export type EditorSessionController = {
  getDocument: () => EditorDocument;
  getSelection: () => DocumentSelection | null;
  setSelection: (
    anchor: DocumentPoint,
    focus: DocumentPoint,
    isFullDocument?: boolean
  ) => void;
  selectAll: () => void;
  clearSelection: () => void;
  copy: () => EditorDocument | null;
  cut: () => EditorDocument | null;
  paste: (fragment: EditorDocument) => void;
  finalizeClipboardOperation?: () => void;
};

type EditorSessionGlobalState = {
  controllers: WeakMap<HTMLElement, EditorSessionController>;
  controllersBySessionId: Map<string, EditorSessionController>;
  surfacesBySessionId: Map<string, HTMLElement>;
  surfaceSessionIds: WeakMap<HTMLElement, string>;
  registeredSurfaces: Set<HTMLElement>;
  lastSessionSurface: HTMLElement | null;
  lastActiveSurface: HTMLElement | null;
  surfaceWithSelection: HTMLElement | null;
  armedFullDocumentSessionIds: Set<string>;
  handlersInstalled: boolean;
  handlersVersion: number;
  lastCopiedFragment: EditorDocument | null;
  suppressNextPasteEvent: boolean;
};

const EDITOR_SESSION_STATE_KEY = "__edungaEditorSessionState";
const EDITOR_SESSION_HANDLERS_VERSION = 2;

function editorSessionState(): EditorSessionGlobalState {
  const globalRef = globalThis as typeof globalThis & {
    [EDITOR_SESSION_STATE_KEY]?: EditorSessionGlobalState;
  };

  if (!globalRef[EDITOR_SESSION_STATE_KEY]) {
    globalRef[EDITOR_SESSION_STATE_KEY] = {
      controllers: new WeakMap(),
      controllersBySessionId: new Map(),
      surfacesBySessionId: new Map(),
      surfaceSessionIds: new WeakMap(),
      registeredSurfaces: new Set(),
      lastSessionSurface: null,
      lastActiveSurface: null,
      surfaceWithSelection: null,
      armedFullDocumentSessionIds: new Set(),
      handlersInstalled: false,
      handlersVersion: 0,
      lastCopiedFragment: null,
      suppressNextPasteEvent: false,
    };
  }

  return globalRef[EDITOR_SESSION_STATE_KEY];
}

const IN_TAB_CLIPBOARD_KEY = "edunga-editor-in-tab-clipboard";

function persistCopiedFragment(fragment: EditorDocument): void {
  editorSessionState().lastCopiedFragment = structuredClone(fragment);

  try {
    sessionStorage.setItem(
      IN_TAB_CLIPBOARD_KEY,
      serializeDocumentForClipboard(fragment)
    );
  } catch {
    // sessionStorage may be unavailable
  }
}

function recallCopiedFragment(): EditorDocument | null {
  if (editorSessionState().lastCopiedFragment) {
    return structuredClone(editorSessionState().lastCopiedFragment);
  }

  try {
    const stored = sessionStorage.getItem(IN_TAB_CLIPBOARD_KEY);
    const parsed = stored
      ? parseClipboardDocument(stored)
      : null;

    if (parsed) {
      editorSessionState().lastCopiedFragment = structuredClone(parsed);
      return structuredClone(parsed);
    }
  } catch {
    // ignore storage failures
  }

  return null;
}

export function markEditorSurfaceActive(
  surface: HTMLElement
): void {
  if (surface.isConnected) {
    editorSessionState().lastActiveSurface = surface;
    editorSessionState().lastSessionSurface = surface;
  }
}

export function isFullDocumentClipboardArmed(
  sessionId: string
): boolean {
  return editorSessionState().armedFullDocumentSessionIds.has(sessionId);
}

export function armFullDocumentClipboard(
  sessionId: string,
  surface?: HTMLElement
): void {
  editorSessionState().armedFullDocumentSessionIds.add(sessionId);

  if (surface?.isConnected) {
    markEditorSurfaceActive(surface);
    markEditorSurfaceSelection(surface, true);
  }
}

export function disarmFullDocumentClipboard(
  sessionId: string
): void {
  editorSessionState().armedFullDocumentSessionIds.delete(sessionId);
}

export function markEditorSurfaceSelection(
  surface: HTMLElement,
  hasSelection: boolean
): void {
  if (!surface.isConnected) {
    return;
  }

  if (hasSelection) {
    editorSessionState().surfaceWithSelection = surface;
    markEditorSurfaceActive(surface);
    return;
  }

  if (editorSessionState().surfaceWithSelection === surface) {
    editorSessionState().surfaceWithSelection = null;
  }
}

export function registerEditorSessionController(
  surface: HTMLElement,
  sessionId: string,
  controller: EditorSessionController
): void {
  editorSessionState().controllers.set(surface, controller);
  editorSessionState().controllersBySessionId.set(sessionId, controller);
  editorSessionState().surfacesBySessionId.set(sessionId, surface);
  editorSessionState().surfaceSessionIds.set(surface, sessionId);
  editorSessionState().registeredSurfaces.add(surface);
  markEditorSurfaceActive(surface);
}

export function unregisterEditorSessionController(
  surface: HTMLElement,
  sessionId: string
): void {
  editorSessionState().controllers.delete(surface);
  editorSessionState().controllersBySessionId.delete(sessionId);
  editorSessionState().surfacesBySessionId.delete(sessionId);
  editorSessionState().surfaceSessionIds.delete(surface);
  editorSessionState().registeredSurfaces.delete(surface);

  if (editorSessionState().lastSessionSurface === surface) {
    editorSessionState().lastSessionSurface = null;
  }

  if (editorSessionState().surfaceWithSelection === surface) {
    editorSessionState().surfaceWithSelection = null;
  }
}

function hasActiveSessionSelection(
  selection: DocumentSelection | null
): boolean {
  if (!selection) {
    return false;
  }

  if (selection.isFullDocument) {
    return true;
  }

  const { anchor, focus } = selection;

  return !(
    anchor.paragraphId === focus.paragraphId &&
    anchor.nodeId === focus.nodeId &&
    anchor.kind === focus.kind &&
    anchor.offset === focus.offset
  );
}

function resolveControllerWithSelection(): EditorSessionController | null {
  for (const surface of editorSessionState().registeredSurfaces) {
    if (!surface.isConnected) {
      continue;
    }

    const controller = editorSessionState().controllers.get(surface);

    if (!controller) {
      continue;
    }

    if (hasActiveSessionSelection(controller.getSelection())) {
      return controller;
    }
  }

  return null;
}

export function getEditorSessionController(
  surface: HTMLElement
): EditorSessionController | null {
  return editorSessionState().controllers.get(surface) ?? null;
}

function resolveSurfaceWithSelectAllAttribute(): HTMLElement | null {
  for (const surface of editorSessionState().registeredSurfaces) {
    if (
      surface.isConnected &&
      surface.getAttribute("data-select-all") === "true"
    ) {
      return surface;
    }
  }

  return null;
}

function resolveActiveController(): EditorSessionController | null {
  for (const sessionId of editorSessionState().armedFullDocumentSessionIds) {
    const armedController =
      editorSessionState().controllersBySessionId.get(sessionId);

    if (armedController) {
      return armedController;
    }
  }

  const withSelection = resolveControllerWithSelection();

  if (withSelection) {
    return withSelection;
  }

  const selectAllSurface = resolveSurfaceWithSelectAllAttribute();

  if (selectAllSurface) {
    const controller = editorSessionState().controllers.get(selectAllSurface);

    if (controller) {
      return controller;
    }
  }

  const candidates = [
    editorSessionState().surfaceWithSelection?.isConnected
      ? editorSessionState().surfaceWithSelection
      : null,
    resolveFocusedEditorSurface(),
    editorSessionState().lastActiveSurface?.isConnected ? editorSessionState().lastActiveSurface : null,
    editorSessionState().lastSessionSurface?.isConnected ? editorSessionState().lastSessionSurface : null,
  ];

  for (const surface of candidates) {
    if (!surface) {
      continue;
    }

    const controller = editorSessionState().controllers.get(surface);

    if (controller) {
      return controller;
    }
  }

  return null;
}

function writeFragmentToClipboardEvent(
  event: ClipboardEvent,
  fragment: EditorDocument
): void {
  if (!event.clipboardData) {
    return;
  }

  const payload = buildClipboardPayload(fragment);

  event.clipboardData.setData(
    EDUNGA_CLIPBOARD_MIME,
    payload.json
  );
  event.clipboardData.setData(
    "text/plain",
    payload.plain
  );
  event.preventDefault();
}

function dispatchCopyEvent(fragment: EditorDocument): void {
  const handler = (event: ClipboardEvent) => {
    writeFragmentToClipboardEvent(event, fragment);
  };

  window.document.addEventListener(
    "copy",
    handler,
    { capture: true, once: true }
  );

  try {
    window.document.execCommand("copy");
  } catch {
    // in-tab paste still works via editorSessionState().lastCopiedFragment
  }
}

async function readFragmentFromSystemClipboard(): Promise<EditorDocument | null> {
  if (!navigator.clipboard?.read) {
    return recallCopiedFragment();
  }

  try {
    const items = await navigator.clipboard.read();

    for (const item of items) {
      if (item.types.includes(EDUNGA_CLIPBOARD_MIME)) {
        const blob = await item.getType(
          EDUNGA_CLIPBOARD_MIME
        );
        const json = await blob.text();
        const parsed = parseClipboardDocument(json);

        if (parsed) {
          return parsed;
        }
      }
    }
  } catch {
    // Fall through to in-memory buffer
  }

  return editorSessionState().lastCopiedFragment
    ? structuredClone(editorSessionState().lastCopiedFragment)
    : recallCopiedFragment();
}

function resolveClipboardController(): EditorSessionController | null {
  const focused = resolveFocusedEditorSurface();

  if (focused) {
    const controller = editorSessionState().controllers.get(focused);

    if (controller) {
      return controller;
    }
  }

  const selectAllSurface = resolveSurfaceWithSelectAllAttribute();

  if (selectAllSurface) {
    const controller = editorSessionState().controllers.get(selectAllSurface);

    if (controller) {
      return controller;
    }
  }

  for (const sessionId of editorSessionState().armedFullDocumentSessionIds) {
    const armedController =
      editorSessionState().controllersBySessionId.get(sessionId);

    if (armedController) {
      return armedController;
    }
  }

  return resolveActiveController();
}

function resolveControllerForSurface(
  surface: HTMLElement
): EditorSessionController | null {
  const direct = editorSessionState().controllers.get(surface);

  if (direct) {
    return direct;
  }

  const sessionId = editorSessionState().surfaceSessionIds.get(surface);

  if (sessionId) {
    return editorSessionState().controllersBySessionId.get(sessionId) ?? null;
  }

  for (const [armedSessionId, registeredSurface] of editorSessionState().surfacesBySessionId) {
    if (registeredSurface === surface) {
      return editorSessionState().controllersBySessionId.get(armedSessionId) ?? null;
    }
  }

  for (const armedSessionId of editorSessionState().armedFullDocumentSessionIds) {
    const registeredSurface =
      editorSessionState().surfacesBySessionId.get(armedSessionId);

    if (registeredSurface === surface) {
      return editorSessionState().controllersBySessionId.get(armedSessionId) ?? null;
    }
  }

  return null;
}

function copyFromSurface(
  surface: HTMLElement
): {
  controller: EditorSessionController;
  fragment: EditorDocument;
} | null {
  let controller = resolveControllerForSurface(surface);

  if (
    !controller &&
    surface.getAttribute("data-select-all") === "true"
  ) {
    for (const sessionId of editorSessionState().armedFullDocumentSessionIds) {
      controller =
        editorSessionState().controllersBySessionId.get(sessionId) ?? null;

      if (controller) {
        break;
      }
    }
  }

  if (!controller) {
    for (const registeredSurface of editorSessionState().registeredSurfaces) {
      if (
        registeredSurface.getAttribute("data-select-all") ===
        "true"
      ) {
        controller =
          editorSessionState().controllers.get(registeredSurface) ?? null;

        if (controller) {
          break;
        }
      }
    }
  }

  if (!controller) {
    return null;
  }

  const sessionSelection = controller.getSelection();
  const treatAsFullDocument =
    surface.getAttribute("data-select-all") === "true" ||
    sessionSelection?.isFullDocument === true ||
    [...editorSessionState().armedFullDocumentSessionIds].some((sessionId) => {
      const registeredSurface =
        editorSessionState().surfacesBySessionId.get(sessionId);

      return registeredSurface === surface;
    });

  const fragment = extractEditorClipboardFragment(
    controller.getDocument(),
    surface,
    sessionSelection,
    { treatAsFullDocument }
  );

  if (!fragment) {
    return null;
  }

  return { controller, fragment };
}

function runCopy(controller: EditorSessionController): boolean {
  let activeController = controller;
  let fragment = activeController.copy();

  if (!fragment) {
    const surface =
      resolveSurfaceWithSelectAllAttribute() ??
      resolveFocusedEditorSurface();

    if (surface) {
      const fromSurface = copyFromSurface(surface);

      if (fromSurface) {
        activeController = fromSurface.controller;
        fragment = fromSurface.fragment;
      } else if (
        surface.getAttribute("data-select-all") === "true"
      ) {
        fragment = extractFullDocumentFromDom(
          surface,
          controller.getDocument().version
        );
      }
    }
  }

  if (!fragment) {
    return false;
  }

  persistCopiedFragment(fragment);
  activeController.finalizeClipboardOperation?.();
  dispatchCopyEvent(fragment);
  return true;
}

function runCut(controller: EditorSessionController): boolean {
  const fragment = controller.cut();

  if (!fragment) {
    return false;
  }

  persistCopiedFragment(fragment);
  dispatchCopyEvent(fragment);
  return true;
}

async function runPaste(
  controller: EditorSessionController
): Promise<boolean> {
  const fragment = await readFragmentFromSystemClipboard();

  if (!fragment) {
    return false;
  }

  controller.paste(fragment);
  return true;
}

function runPasteFromKeyboard(
  controller: EditorSessionController
): boolean {
  const fragment = recallCopiedFragment();

  if (!fragment) {
    return false;
  }

  controller.paste(fragment);
  return true;
}

export function ensureEditorSessionHandlers(): void {
  if (typeof window === "undefined") {
    return;
  }

  const state = editorSessionState();

  if (
    state.handlersInstalled &&
    state.handlersVersion === EDITOR_SESSION_HANDLERS_VERSION
  ) {
    return;
  }

  state.handlersInstalled = true;
  state.handlersVersion = EDITOR_SESSION_HANDLERS_VERSION;

  window.addEventListener(
    "copy",
    (event) => {
      const existing = recallCopiedFragment();

      if (existing) {
        writeFragmentToClipboardEvent(event, existing);
        return;
      }

      const controller = resolveClipboardController();

      if (!controller) {
        return;
      }

      let activeController = controller;
      let fragment = activeController.copy();

      if (!fragment) {
        const surface =
          resolveSurfaceWithSelectAllAttribute() ??
          resolveFocusedEditorSurface();

        if (surface) {
          const fromSurface = copyFromSurface(surface);

          if (fromSurface) {
            activeController = fromSurface.controller;
            fragment = fromSurface.fragment;
          }
        }
      }

      if (!fragment) {
        return;
      }

      persistCopiedFragment(fragment);
      activeController.finalizeClipboardOperation?.();
      writeFragmentToClipboardEvent(event, fragment);
    },
    true
  );

  window.addEventListener(
    "cut",
    (event) => {
      const controller = resolveClipboardController();

      if (!controller) {
        return;
      }

      const fragment = controller.cut();

      if (!fragment) {
        return;
      }

      persistCopiedFragment(fragment);
      controller.finalizeClipboardOperation?.();

      if (event.clipboardData) {
        writeFragmentToClipboardEvent(event, fragment);
      }
    },
    true
  );

  window.addEventListener(
    "paste",
    (event) => {
      if (editorSessionState().suppressNextPasteEvent) {
        event.preventDefault();
        return;
      }

      const controller = resolveClipboardController();

      if (!controller) {
        return;
      }

      const fromEvent = event.clipboardData
        ? parseClipboardDocument(
            event.clipboardData.getData(EDUNGA_CLIPBOARD_MIME)
          )
        : null;
      const fragment =
        fromEvent ??
        (editorSessionState().lastCopiedFragment
          ? structuredClone(editorSessionState().lastCopiedFragment)
          : null);

      if (!fragment) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      controller.paste(fragment);
    },
    true
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      const controller = resolveClipboardController();

      if (!controller) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "c") {
        if (!runCopy(controller)) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (key === "x") {
        if (!runCut(controller)) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (key === "v") {
        event.preventDefault();
        event.stopImmediatePropagation();
        editorSessionState().suppressNextPasteEvent = true;

        if (runPasteFromKeyboard(controller)) {
          requestAnimationFrame(() => {
            editorSessionState().suppressNextPasteEvent = false;
          });
          return;
        }

        void runPaste(controller).finally(() => {
          requestAnimationFrame(() => {
            editorSessionState().suppressNextPasteEvent = false;
          });
        });
      }
    },
    true
  );
}

export function handleEditorSelectAllShortcut(): boolean {
  const controller = resolveActiveController();

  if (!controller) {
    return false;
  }

  controller.selectAll();
  return true;
}
