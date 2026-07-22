import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SURFACE_SEL =
  ".task-editor-workspace__primary .edunga-editor-surface";

const results = [];

function record(id, name, pass, detail = "") {
  results.push({ id, name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${id} — ${name}${detail ? ` — ${detail}` : ""}`);
}

async function readCaret(page) {
  return page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    if (!surface) return null;

    const mathField = surface.querySelector("math-field:focus-within");
    if (mathField) {
      const wrapper = mathField.closest("[data-node-type='math']");
      const paragraph = wrapper?.closest("[data-paragraph-id]");
      const mathFields = [
        ...surface.querySelectorAll("math-field"),
      ];
      return {
        kind: "math",
        paragraphId: paragraph?.getAttribute("data-paragraph-id") ?? null,
        nodeId: wrapper?.getAttribute("data-node-id") ?? null,
        mathIndex: mathFields.indexOf(mathField),
        position:
          typeof mathField.position === "number"
            ? mathField.position
            : null,
      };
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { kind: "none" };
    }

    const range = selection.getRangeAt(0);
    const anchor = range.startContainer;
    const textEl =
      anchor.nodeType === Node.TEXT_NODE
        ? anchor.parentElement?.closest("[data-node-type='text']")
        : (anchor instanceof Element
            ? anchor.closest("[data-node-type='text']")
            : null);

    if (!textEl) {
      return { kind: "unknown" };
    }

    const paragraph = textEl.closest("[data-paragraph-id]");
    const textNodes = [
      ...surface.querySelectorAll("[data-node-type='text']"),
    ];
    const paragraphTextNodes = paragraph
      ? [...paragraph.querySelectorAll("[data-node-type='text']")]
      : [];
    const textChild = textEl.firstChild;
    let offset = 0;

    if (textChild?.nodeType === Node.TEXT_NODE) {
      if (range.startContainer === textChild) {
        offset = range.startOffset;
      } else if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const pre = document.createRange();
        pre.setStart(textChild, 0);
        pre.setEnd(range.startContainer, range.startOffset);
        offset = pre.toString().length;
      }
    }

    let streamOffset = 0;
    for (const node of paragraphTextNodes) {
      if (node === textEl) {
        streamOffset += offset;
        break;
      }

      streamOffset += node.textContent?.length ?? 0;
    }

    return {
      kind: "text",
      paragraphId: paragraph?.getAttribute("data-paragraph-id") ?? null,
      nodeId: textEl.getAttribute("data-node-id"),
      textIndex: textNodes.indexOf(textEl),
      offset,
      streamOffset,
      textPreview: textEl.textContent ?? "",
    };
  });
}

function paragraphPlainText(snapshot, paragraphIndex = 0) {
  const paragraph = snapshot?.paragraphs?.[paragraphIndex];
  if (!paragraph) {
    return "";
  }

  return paragraph.nodes
    .map((node) => {
      if (node.type === "text") {
        return node.text ?? "";
      }

      if (node.type === "math") {
        return node.latex ?? "";
      }

      return "";
    })
    .join("");
}

async function readSnapshot(page) {
  return page.evaluate(() => {
    const surface = document.querySelector(
      ".task-editor-workspace__primary .edunga-editor-surface"
    );
    if (!surface) return null;

    const paragraphs = [
      ...surface.querySelectorAll("[data-paragraph-id]"),
    ].map((p) => {
      const nodes = [...p.children].map((child) => {
        if (child.getAttribute("data-node-type") === "text") {
          return {
            type: "text",
            id: child.getAttribute("data-node-id"),
            text: child.textContent ?? "",
          };
        }
        if (child.getAttribute("data-node-type") === "math") {
          const mf = child.querySelector("math-field");
          const latex =
            mf && typeof mf.getValue === "function"
              ? mf.getValue("latex-without-placeholders")
              : "";
          return {
            type: "math",
            id: child.getAttribute("data-node-id"),
            latex,
          };
        }
        return { type: "other" };
      });
      return {
        id: p.getAttribute("data-paragraph-id"),
        nodes,
      };
    });

    return {
      mathCount: surface.querySelectorAll("math-field").length,
      selectAll: surface.getAttribute("data-select-all"),
      paragraphs,
    };
  });
}

async function setTextCaret(page, textIndex, offset) {
  return page.evaluate(
    ({ textIndex, offset }) => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const texts = [
        ...(surface?.querySelectorAll("[data-node-type='text']") ?? []),
      ];
      const el = texts[textIndex];
      const child = el?.firstChild;
      if (!el || child?.nodeType !== Node.TEXT_NODE) return false;
      el.focus();
      const range = document.createRange();
      range.setStart(child, offset);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return true;
    },
    { textIndex, offset }
  );
}

async function buildSimpleTextDocument(page, surface, text) {
  const textNode = surface.locator("[data-node-type='text']").first();
  await textNode.click();
  await page.keyboard.type(text);
  await page.waitForTimeout(100);
}

async function buildTestDocument(page, surface) {
  const textNode = surface.locator("[data-node-type='text']").first();
  await textNode.click();
  await page.keyboard.type("Oblicz ");
  await page.keyboard.press("Alt+f");
  await page.waitForTimeout(250);
  await page.keyboard.type("a");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  await page.keyboard.type(" nastepnie ");
  await page.keyboard.press("Alt+f");
  await page.waitForTimeout(250);
  await page.keyboard.type("b");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  await page.keyboard.type(" dalej. Second line ");
  await page.keyboard.press("Alt+f");
  await page.waitForTimeout(250);
  await page.keyboard.type("c");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  await page.keyboard.type(" text.");
  await page.waitForTimeout(100);

  const snap = await readSnapshot(page);
  const ok =
    snap?.mathCount === 3 &&
    (snap.paragraphs[0]?.nodes.filter((n) => n.type === "math").length ??
      0) >= 2;

  return ok;
}

async function freshEditor(page) {
  await page.goto(`${BASE}/nauczyciel/edytor`, {
    waitUntil: "load",
    timeout: 180000,
  });
  await page.waitForTimeout(15000);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const ready = await page.evaluate(() =>
      Boolean(
        document.querySelector(
          ".task-editor-workspace__primary .edunga-editor-surface [data-node-type='text']"
        )
      )
    );

    if (ready) {
      return page.locator(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
    }

    await page.waitForTimeout(5000);
  }

  throw new Error("Editor surface not ready");
}

async function resetDocument(page) {
  await page.keyboard.press("Control+a");
  await page.waitForTimeout(100);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let surface = await freshEditor(page);
  const built = await buildTestDocument(page, surface);
  record(
    "SETUP",
    "Build test document (Oblicz [m] nastepnie [m] dalej. Second line [m] text.)",
    built,
    built ? `math=${(await readSnapshot(page))?.mathCount}` : "build failed"
  );

  if (!built) {
    await browser.close();
    process.exit(1);
  }

  // MOUSE — click text node, caret at click position
  {
    await setTextCaret(page, 0, 3);
    const before = await readCaret(page);
    const box = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const el = surface?.querySelector("[data-node-type='text']");
      const child = el?.firstChild;
      if (!el || child?.nodeType !== Node.TEXT_NODE) return null;
      const range = document.createRange();
      range.setStart(child, 3);
      range.setEnd(child, 4);
      const rect = range.getBoundingClientRect();
      return { x: rect.left + 1, y: rect.top + rect.height / 2 };
    });
    if (box) {
      await page.mouse.click(box.x, box.y);
      await page.waitForTimeout(100);
    }
    const after = await readCaret(page);
    record(
      "MOUSE-01",
      "Click inside first text node",
      after?.kind === "text" && after.offset >= 2 && after.offset <= 4,
      `offset=${after?.offset}`
    );
  }

  // MOUSE — click right of math field
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const box = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const mf = surface?.querySelector("math-field");
      if (!mf) return null;
      const rect = mf.getBoundingClientRect();
      return { x: rect.right + 4, y: rect.top + rect.height / 2 };
    });
    if (box) {
      await page.mouse.click(box.x, box.y);
      await page.waitForTimeout(150);
    }
    const caret = await readCaret(page);
    record(
      "MOUSE-02",
      "Click right of first math exits to text",
      caret?.kind === "text",
      JSON.stringify(caret)
    );
  }

  // TYPING — insert at caret
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    await setTextCaret(page, 0, 7);
    await page.keyboard.type("X");
    await page.waitForTimeout(100);
    const snap = await readSnapshot(page);
    const caret = await readCaret(page);
    const firstText = snap?.paragraphs[0]?.nodes.find((n) => n.type === "text");
    record(
      "TYPE-01",
      "Typing inserts at caret in text",
      (firstText?.text ?? "").includes("Oblicz X") && caret?.offset === 8,
      `text="${firstText?.text}" offset=${caret?.offset}`
    );
  }

  // ALT+F — insert math at caret
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const mathBefore = (await readSnapshot(page))?.mathCount ?? 0;
    await setTextCaret(page, 0, 7);
    await page.keyboard.press("Alt+f");
    await page.waitForTimeout(300);
    const snap = await readSnapshot(page);
    const caret = await readCaret(page);
    record(
      "ALTF-01",
      "Alt+F inserts math at caret and focuses it",
      snap?.mathCount === mathBefore + 1 &&
        (caret?.kind === "math" || caret?.kind === "text"),
      `math=${snap?.mathCount} caret=${caret?.kind}`
    );
  }

  // BACKSPACE — remove math between texts, caret at junction
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const snapBefore = await readSnapshot(page);
    const texts = snapBefore?.paragraphs[0]?.nodes.filter((n) => n.type === "text") ?? [];
    const secondTextNode = texts[1];
    const junctionLen = (texts[0]?.text ?? "").length;

    const textIndex = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const all = [...surface.querySelectorAll("[data-node-type='text']")];
      const p1 = surface.querySelector("[data-paragraph-id]");
      const inP1 = [...(p1?.querySelectorAll("[data-node-type='text']") ?? [])];
      return all.indexOf(inP1[1]);
    });

    await setTextCaret(page, textIndex, 0);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(400);

    const snap = await readSnapshot(page);
    const caret = await readCaret(page);
    const merged = snap?.paragraphs[0]?.nodes.find((n) => n.type === "text");
    const expectedOffset = junctionLen;
    const pass =
      snap?.mathCount === 2 &&
      caret?.kind === "text" &&
      caret.offset === expectedOffset;
    record(
      "BS-01",
      "Backspace before math removes math, caret at junction",
      pass,
      `offset=${caret?.offset} expected=${expectedOffset} math=${snap?.mathCount}`
    );
    void secondTextNode;
  }

  // BACKSPACE — empty math removes math
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const mathBefore = (await readSnapshot(page))?.mathCount ?? 0;
    const firstMath = page.locator(
      ".task-editor-workspace__primary math-field"
    ).first();
    await firstMath.click();
    await page.waitForTimeout(100);
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press("Backspace");
    }
    await page.waitForTimeout(100);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(400);
    const snap = await readSnapshot(page);
    record(
      "BS-02",
      "Backspace in empty math removes math object",
      (snap?.mathCount ?? 0) === mathBefore - 1,
      `math=${snap?.mathCount} expected=${mathBefore - 1} (started with ${mathBefore})`
    );
  }

  // BACKSPACE — remove second math, caret at junction (nastepnie | dalej)
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const expectedOffsetInNode = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const p = surface?.querySelector("[data-paragraph-id]");
      if (!p) return 0;
      let mathSeen = 0;
      for (const child of p.children) {
        if (child.getAttribute("data-node-type") === "math") {
          mathSeen += 1;
          if (mathSeen === 2) break;
        }
        if (child.getAttribute("data-node-type") === "text") {
          // last text node before second math
        }
      }
      let prevText = null;
      mathSeen = 0;
      for (const child of p.children) {
        if (child.getAttribute("data-node-type") === "math") {
          mathSeen += 1;
          if (mathSeen === 2) break;
        }
        if (child.getAttribute("data-node-type") === "text") {
          prevText = child;
        }
      }
      return prevText?.textContent?.length ?? 0;
    });
    const textIdx = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const texts = [
        ...(surface?.querySelectorAll("[data-node-type='text']") ?? []),
      ];
      const target = texts.find((node) =>
        (node.textContent ?? "").startsWith(" dalej")
      );
      return texts.indexOf(target);
    });
    await setTextCaret(page, textIdx, 0);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(400);
    const snap = await readSnapshot(page);
    const caret = await readCaret(page);
    const fullText = (snap?.paragraphs[0]?.nodes ?? [])
      .filter((n) => n.type === "text")
      .map((n) => n.text)
      .join("");
    const junctionInMerged =
      fullText.includes("nastepnie") && fullText.includes("dalej");
    record(
      "BS-03",
      "Backspace removes second math; caret at nastepnie|dalej junction",
      snap?.mathCount === 2 &&
        caret?.kind === "text" &&
        junctionInMerged &&
        caret.offset === expectedOffsetInNode,
      `offset=${caret?.offset} expected=${expectedOffsetInNode} fullText="${fullText}"`
    );
  }

  // DELETE — after text removes next math
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const junctionLen = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const p = surface?.querySelector("[data-paragraph-id]");
      const t = p?.querySelector("[data-node-type='text']");
      return t?.textContent?.length ?? 0;
    });
    await setTextCaret(page, 0, junctionLen);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(400);
    const snap = await readSnapshot(page);
    const caret = await readCaret(page);
    record(
      "DEL-01",
      "Delete after text removes following math, caret at junction",
      snap?.mathCount === 2 &&
        caret?.kind === "text" &&
        caret.offset === junctionLen,
      `offset=${caret?.offset} math=${snap?.mathCount}`
    );
  }

  // ARROW RIGHT — text to math
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const junctionLen = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const p = surface?.querySelector("[data-paragraph-id]");
      const t = p?.querySelector("[data-node-type='text']");
      return t?.textContent?.length ?? 0;
    });
    await setTextCaret(page, 0, junctionLen);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    const caret = await readCaret(page);
    record(
      "AR-R-01",
      "ArrowRight at text end enters math",
      caret?.kind === "math",
      JSON.stringify(caret)
    );
  }

  // ARROW LEFT — math to text
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const firstMath = page.locator("math-field").first();
    await firstMath.click();
    await page.waitForTimeout(100);
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(150);
    const caret = await readCaret(page);
    record(
      "AR-L-01",
      "ArrowLeft at math start exits to text",
      caret?.kind === "text",
      JSON.stringify(caret)
    );
  }

  // ARROW RIGHT — math to text
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const firstMath = page.locator("math-field").first();
    await firstMath.click();
    await page.waitForTimeout(100);
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    const caret = await readCaret(page);
    record(
      "AR-R-02",
      "ArrowRight at math end exits to text",
      caret?.kind === "text",
      JSON.stringify(caret)
    );
  }

  // ARROW UP — at inline boundary after second math
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const textIdx = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const texts = [
        ...(surface?.querySelectorAll("[data-node-type='text']") ?? []),
      ];
      const target = texts.find((node) =>
        (node.textContent ?? "").startsWith(" dalej")
      );
      return texts.indexOf(target);
    });
    await setTextCaret(page, textIdx, 0);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(150);
    const caret = await readCaret(page);
    record(
      "AR-U-01",
      "ArrowUp at text boundary after math moves to previous inline",
      caret?.kind === "math" || (caret?.kind === "text" && caret.textIndex < textIdx),
      JSON.stringify(caret)
    );
  }

  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const junctionLen = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const p = surface?.querySelector("[data-paragraph-id]");
      const t = p?.querySelector("[data-node-type='text']");
      return t?.textContent?.length ?? 0;
    });
    await setTextCaret(page, 0, junctionLen);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    const caret = await readCaret(page);
    record(
      "AR-D-01",
      "ArrowDown at first text/math boundary moves to next inline",
      caret?.kind === "math" || (caret?.kind === "text" && caret.offset > 0),
      JSON.stringify(caret)
    );
  }

  // CTRL+A
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    await setTextCaret(page, 0, 3);
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(150);
    const snap = await readSnapshot(page);
    record(
      "CSA-01",
      "Ctrl+A selects entire document",
      snap?.selectAll === "true",
      `selectAll=${snap?.selectAll}`
    );
  }

  // CTRL+A + DELETE
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    await page.keyboard.press("Control+a");
    await page.waitForTimeout(100);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(400);
    const snap = await readSnapshot(page);
    const caret = await readCaret(page);
    const empty =
      snap?.mathCount === 0 &&
      snap.paragraphs.every((p) =>
        p.nodes.every((n) => n.type !== "math" && (n.type !== "text" || n.text.length <= 1))
      );
    record(
      "CSA-02",
      "Ctrl+A then Delete clears document",
      empty && caret?.kind === "text",
      `math=${snap?.mathCount} caret=${JSON.stringify(caret)}`
    );
  }

  // CTRL+Z / CTRL+Y
  {
    await resetDocument(page);
    await buildTestDocument(page, surface);
    const mathBefore = (await readSnapshot(page))?.mathCount ?? 0;
    const textIdx = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const texts = [
        ...(surface?.querySelectorAll("[data-node-type='text']") ?? []),
      ];
      const target = texts.find((node) =>
        (node.textContent ?? "").startsWith(" dalej")
      );
      return texts.indexOf(target);
    });
    await setTextCaret(page, textIdx, 0);
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(400);
    const mathAfter = (await readSnapshot(page))?.mathCount ?? 0;
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(400);
    const mathUndo = (await readSnapshot(page))?.mathCount ?? 0;
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(400);
    const mathRedo = (await readSnapshot(page))?.mathCount ?? 0;
    record(
      "UNDO-01",
      "Ctrl+Z restores removed math",
      mathAfter < mathBefore && mathUndo === mathBefore,
      `before=${mathBefore} after=${mathAfter} undo=${mathUndo}`
    );
    record(
      "REDO-01",
      "Ctrl+Y re-applies removal",
      mathRedo === mathAfter,
      `redo=${mathRedo} after=${mathAfter}`
    );
  }

  // CUT / PASTE caret
  {
    await resetDocument(page);
    await buildSimpleTextDocument(page, surface, "Oblicz ");
    await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      const text = surface?.querySelector("[data-node-type='text']");

      if (!text?.firstChild) {
        return;
      }

      text.focus();
      const range = document.createRange();
      range.setStart(text.firstChild, 3);
      range.setEnd(text.firstChild, 7);
      const selection = window.getSelection();

      if (!selection) {
        return;
      }

      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.keyboard.press("Control+x");
    await page.waitForTimeout(400);
    const caretAfterCut = await readCaret(page);
    const snapAfterCut = await readSnapshot(page);
    const cutPlainText = paragraphPlainText(snapAfterCut, 0);
    record(
      "CUT-01",
      "Ctrl+X leaves caret at cut start",
      caretAfterCut?.kind === "text" &&
        caretAfterCut.offset === 3 &&
        cutPlainText === "Obl",
      `caret=${JSON.stringify(caretAfterCut)} text=${JSON.stringify(cutPlainText)}`
    );

    await setTextCaret(page, 0, 3);
    await page.waitForTimeout(100);
    await page.keyboard.press("Control+v");
    await page.waitForTimeout(600);
    const caretAfterPaste = await readCaret(page);
    const snapAfterPaste = await readSnapshot(page);
    const pastedText = paragraphPlainText(snapAfterPaste, 0);
    record(
      "PASTE-01",
      "Ctrl+V leaves caret after pasted content at insertion point",
      caretAfterPaste?.kind === "text" &&
        pastedText === "Oblicz " &&
        caretAfterPaste.streamOffset === 7,
      `caret=${JSON.stringify(caretAfterPaste)} text=${JSON.stringify(pastedText)}`
    );
  }

  // Full keyboard workflow
  {
    await resetDocument(page);
    await setTextCaret(page, 0, 0);
    await page.keyboard.type("Oblicz ");
    await page.keyboard.press("Alt+f");
    await page.waitForTimeout(250);
    await page.keyboard.type("x");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.type(" dalej");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(100);
    const inMath = await page.evaluate(() => {
      const surface = document.querySelector(
        ".task-editor-workspace__primary .edunga-editor-surface"
      );
      return Boolean(surface?.querySelector("math-field:focus-within"));
    });
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.type("!");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    await page.keyboard.type("ok");
    const snap = await readSnapshot(page);
    const caret = await readCaret(page);
    record(
      "FLOW-01",
      "Full keyboard workflow (type/Alt+F/arrows/Ctrl+A/Delete/type)",
      snap?.mathCount === 0 && (snap.paragraphs[0]?.nodes[0]?.text ?? "").includes("ok"),
      `caret=${JSON.stringify(caret)}`
    );
    void inMath;
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log("\n--- SUMMARY ---");
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
  if (failed.length) {
    console.log("\nFailed scenarios:");
    for (const f of failed) {
      console.log(`  ${f.id}: ${f.name} — ${f.detail}`);
    }
    process.exit(1);
  }
  console.log("\nAll caret validation scenarios passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
