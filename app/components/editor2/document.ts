import { DocumentModel } from "./types";

export function createDocument(): DocumentModel {
  return {
    paragraphs: [
      {
        id: crypto.randomUUID(),
        nodes: [
          {
            id: crypto.randomUUID(),
            type: "text",
            text: "",
          },
        ],
      },
    ],
  };
}