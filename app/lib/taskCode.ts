import type { PrismaClient } from "@prisma/client";

const TASK_CODE_PREFIX = "EDU";
const TASK_CODE_WIDTH = 6;

export function formatTaskCode(sequenceNumber: number): string {
  return `${TASK_CODE_PREFIX}-${String(sequenceNumber).padStart(
    TASK_CODE_WIDTH,
    "0"
  )}`;
}

export async function allocateTaskCode(
  prisma: PrismaClient
): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint | number }]
  >`SELECT nextval('zadanie_kod_seq') AS nextval`;

  const sequenceNumber = Number(result[0].nextval);

  return formatTaskCode(sequenceNumber);
}
