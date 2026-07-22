"use client";

import dynamic from "next/dynamic";

import TrueFalseTableReadOnly from "../editor/nodes/TrueFalseTableReadOnly";
import MatchingTableReadOnly from "../editor/nodes/MatchingTableReadOnly";
import TableReadOnly from "../editor/nodes/TableReadOnly";
import ReadOnlyInk from "../editor/nodes/ReadOnlyInk";
import { EditorDocumentRenderer } from "@/app/lib/document-renderer";

import { EditorDocument } from "../editor/types";

const ReadOnlyMath = dynamic(() => import("./ReadOnlyMath"), {
  ssr: false,
});

type Props = {
  document: EditorDocument;
};

export default function DocumentViewerContent({
  document,
}: Props) {
  return (
    <EditorDocumentRenderer
      document={document}
      renderText={(node) => (
        <span
          key={node.id}
          data-node-type="text"
          className="whitespace-pre-wrap"
        >
          {node.text}
        </span>
      )}
      renderMath={(node) => (
        <ReadOnlyMath key={node.id} latex={node.latex} />
      )}
      renderImage={(node) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={node.id}
          src={node.src}
          alt={node.alt || "Ilustracja"}
          width={node.width}
          height={node.height}
          className={`my-2 max-w-full h-auto ${
            node.align === "center"
              ? "mx-auto block"
              : node.align === "right"
                ? "ml-auto block"
                : ""
          }`}
          data-node-type="image"
        />
      )}
      renderInk={(node) => (
        <ReadOnlyInk
          key={node.id}
          node={node}
          className="my-2 max-w-full h-auto w-full"
        />
      )}
      renderParagraph={({ paragraph, children }) => {
        const tableNode = paragraph.children.find(
          (node) =>
            node.type === "true-false-table" ||
            node.type === "matching-table" ||
            node.type === "table"
        );

        if (tableNode?.type === "matching-table") {
          return (
            <div key={paragraph.id} className="document-viewer-paragraph">
              <MatchingTableReadOnly
                node={tableNode}
                renderText={(node) => (
                  <span
                    key={node.id}
                    data-node-type="text"
                    className="whitespace-pre-wrap"
                  >
                    {node.text}
                  </span>
                )}
                renderMath={(node) => (
                  <ReadOnlyMath key={node.id} latex={node.latex} />
                )}
              />
            </div>
          );
        }

        if (tableNode?.type === "true-false-table") {
          return (
            <div key={paragraph.id} className="document-viewer-paragraph">
              <TrueFalseTableReadOnly
                node={tableNode}
                renderText={(node) => (
                  <span
                    key={node.id}
                    data-node-type="text"
                    className="whitespace-pre-wrap"
                  >
                    {node.text}
                  </span>
                )}
                renderMath={(node) => (
                  <ReadOnlyMath key={node.id} latex={node.latex} />
                )}
              />
            </div>
          );
        }

        if (tableNode?.type === "table") {
          return (
            <div key={paragraph.id} className="document-viewer-paragraph">
              <TableReadOnly node={tableNode} />
            </div>
          );
        }

        return (
          <div key={paragraph.id} className="document-viewer-paragraph">
            {children}
          </div>
        );
      }}
    />
  );
}
