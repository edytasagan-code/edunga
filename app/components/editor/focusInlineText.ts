export function focusInlineTextNode(
  paragraphId: string,
  nodeId: string,
  offset: number,
  root?: ParentNode | null
): boolean {
  const scope = root ?? document;
  const element = scope.querySelector(
    `[data-paragraph-id="${paragraphId}"] [data-node-id="${nodeId}"][data-node-type="text"]`
  ) as HTMLElement | null;

  if (!element) {
    return false;
  }

  element.focus();

  const selection = window.getSelection();

  if (!selection) {
    return false;
  }

  let textChild = element.firstChild;

  if (!textChild || textChild.nodeType !== Node.TEXT_NODE) {
    textChild = document.createTextNode("");
    element.replaceChildren(textChild);
  }

  const range = document.createRange();
  const max = textChild.textContent?.length ?? 0;

  range.setStart(textChild, Math.min(offset, max));

  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}
