import type { HandleErrorOptions } from "../types.js";
import { ERROR_PREVIEW_LENGTH_CHARS } from "../constants.js";
import { logger } from "./logger.js";

export const handleError = (
  error: unknown,
  options: HandleErrorOptions = { shouldExit: true },
): void => {
  const message =
    error instanceof Error
      ? error.message.slice(0, ERROR_PREVIEW_LENGTH_CHARS)
      : String(error).slice(0, ERROR_PREVIEW_LENGTH_CHARS);

  logger.error(`Error: ${message}`);

  if (options.shouldExit) {
    process.exit(1);
  }
};
