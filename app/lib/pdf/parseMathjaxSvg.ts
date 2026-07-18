export function parseMathjaxSvg(svg: string): {
  viewBox: string;
  paths: string[];
} {
  const viewBox =
    /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 0 0";

  const paths: string[] = [];
  const pathRegex = /\sd="([^"]+)"/g;
  let match = pathRegex.exec(svg);

  while (match) {
    if (match[1]) {
      paths.push(match[1]);
    }

    match = pathRegex.exec(svg);
  }

  return { viewBox, paths };
}
