type ExecFailure = {
  message: string;
  stdout?: string;
  stderr?: string;
  code?: number | null;
  signal?: NodeJS.Signals | null;
};

type WorkerErrorPayload = {
  error?: string;
  name?: string;
  stack?: string;
};

export class VisionWorkerError extends Error {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly workerError: WorkerErrorPayload | null;

  constructor(details: {
    message: string;
    exitCode?: number | null;
    signal?: NodeJS.Signals | null;
    stdout?: string;
    stderr?: string;
    workerError?: WorkerErrorPayload | null;
  }) {
    super(details.message);
    this.name = "VisionWorkerError";
    this.exitCode = details.exitCode ?? null;
    this.signal = details.signal ?? null;
    this.stdout = details.stdout ?? "";
    this.stderr = details.stderr ?? "";
    this.workerError = details.workerError ?? null;
  }
}

function parseWorkerErrorPayload(stderr: string): WorkerErrorPayload | null {
  const lines = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];

    if (!line.startsWith("{")) {
      continue;
    }

    try {
      const payload = JSON.parse(line) as WorkerErrorPayload;

      if (payload.error || payload.stack) {
        return payload;
      }
    } catch {
      // ignore non-JSON stderr lines
    }
  }

  return null;
}

function summarizeStderr(stderr: string): string {
  const withoutWarnings = stderr
    .split(/\r?\n/)
    .filter((line) => !line.includes("Warning: UnknownErrorException"))
    .filter((line) => !line.includes("Warning: Indexing all PDF objects"))
    .join("\n")
    .trim();

  return withoutWarnings || stderr.trim();
}

export function formatVisionWorkerFailure(failure: ExecFailure): VisionWorkerError {
  const stdout = failure.stdout?.trim() ?? "";
  const stderr = summarizeStderr(failure.stderr?.trim() ?? "");
  const workerError = parseWorkerErrorPayload(stderr);

  const primaryMessage =
    workerError?.error ??
    workerError?.name ??
    stderr.split("\n").find((line) => line.startsWith("Error")) ??
    failure.message;

  const parts = [
    `Vision worker failed (exit ${failure.code ?? "?"}).`,
    primaryMessage,
  ];

  if (workerError?.stack) {
    parts.push(workerError.stack);
  } else if (stderr) {
    parts.push(stderr);
  }

  if (stdout && !stdout.startsWith("{")) {
    parts.push(`stdout: ${stdout}`);
  }

  return new VisionWorkerError({
    message: parts.join("\n\n"),
    exitCode: failure.code ?? null,
    signal: failure.signal ?? null,
    stdout,
    stderr,
    workerError,
  });
}
