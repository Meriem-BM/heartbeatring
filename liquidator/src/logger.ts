export interface Logger {
  error(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}

const PREFIX = "[liquidator]";

export const consoleLogger: Logger = {
  error: (message) => {
    console.error(`${PREFIX} ${message}`);
  },
  info: (message) => {
    console.log(`${PREFIX} ${message}`);
  },
  warn: (message) => {
    console.warn(`${PREFIX} ${message}`);
  },
};

export const silentLogger: Logger = {
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};
