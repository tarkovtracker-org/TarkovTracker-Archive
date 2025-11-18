import { logger as firebaseLoggerV2 } from 'firebase-functions/v2';

const consoleLogger = {
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: (console.debug || console.log).bind(console),
  log: console.log.bind(console),
};

type LoggerLike = typeof consoleLogger;

const createDefaultLogger = (): LoggerLike => (firebaseLoggerV2 as LoggerLike) || consoleLogger;

let activeLogger: LoggerLike = createDefaultLogger();

export const logger = {} as LoggerLike;
const loggerMethods: (keyof LoggerLike)[] = ['log', 'info', 'warn', 'error', 'debug'];
loggerMethods.forEach((method) => {
  logger[method] = (...args: Parameters<LoggerLike[typeof method]>) => {
    activeLogger[method](...args);
  };
});

export const setLogger = (override?: LoggerLike | null): void => {
  activeLogger = override ?? createDefaultLogger();
};

export const resetLogger = (): void => {
  setLogger();
};
