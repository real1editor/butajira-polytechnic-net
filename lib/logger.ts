type LogValue = string | number | boolean | null | undefined;

function normaliseError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

export function logError(
  message: string,
  error: unknown,
  context: Record<string, LogValue> = {}
) {
  console.error(
    JSON.stringify({
      level: "error",
      message,
      ...context,
      error: normaliseError(error),
      timestamp: new Date().toISOString(),
    })
  );
}

export function logInfo(
  message: string,
  context: Record<string, LogValue> = {}
) {
  console.info(
    JSON.stringify({
      level: "info",
      message,
      ...context,
      timestamp: new Date().toISOString(),
    })
  );
}
