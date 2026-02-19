import { highlighter } from "./highlighter.js";

interface LoggerCaptureState {
  isEnabled: boolean;
  lines: string[];
}

const captureState: LoggerCaptureState = {
  isEnabled: false,
  lines: [],
};

const stripAnsi = (text: string): string =>
  text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");

const capture = (text: string): void => {
  if (captureState.isEnabled) {
    captureState.lines.push(stripAnsi(text));
  }
};

export const logger = {
  log: (message: string = "") => {
    capture(message);
    console.log(message);
  },
  error: (message: string) => {
    const text = highlighter.error(message);
    capture(message);
    console.error(text);
  },
  warn: (message: string) => {
    const text = highlighter.warn(message);
    capture(message);
    console.warn(text);
  },
  success: (message: string) => {
    const text = highlighter.success(message);
    capture(message);
    console.log(text);
  },
  info: (message: string) => {
    const text = highlighter.info(message);
    capture(message);
    console.log(text);
  },
  dim: (message: string) => {
    const text = highlighter.dim(message);
    capture(message);
    console.log(text);
  },
  break: () => {
    capture("");
    console.log();
  },
};

export const startLoggerCapture = (): void => {
  captureState.isEnabled = true;
  captureState.lines = [];
};

export const stopLoggerCapture = (): string => {
  captureState.isEnabled = false;
  const output = captureState.lines.join("\n");
  captureState.lines = [];
  return output;
};
