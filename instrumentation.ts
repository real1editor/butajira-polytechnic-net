import type { Instrumentation } from "next";
import { logError } from "@/lib/logger";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  logError("Unhandled request error", error, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
