import type { PrismaClient } from "@prisma/client";

const DOCUMENT_CODE_PREFIX = "DOC";
const DOCUMENT_CODE_WIDTH = 6;

export function formatDocumentCode(sequenceNumber: number): string {
  return `${DOCUMENT_CODE_PREFIX}-${String(sequenceNumber).padStart(
    DOCUMENT_CODE_WIDTH,
    "0"
  )}`;
}

export async function allocateDocumentCode(
  prisma: PrismaClient
): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint | number }]
  >`SELECT nextval('dokument_kod_seq') AS nextval`;

  const sequenceNumber = Number(result[0].nextval);

  return formatDocumentCode(sequenceNumber);
}
