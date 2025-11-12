type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};
const fallbackLevel: LogLevel = !import.meta.env.DEV ? 'warn' : 'debug';
function isLogLevel(value: string): value is LogLevel {
  return value in LEVEL_WEIGHT;
}
function resolveLogLevel(): LogLevel {
  const rawLevel = import.meta.env.VITE_LOG_LEVEL;
  const configuredLevel = typeof rawLevel === 'string' ? rawLevel.toLowerCase() : undefined;
  if (configuredLevel && isLogLevel(configuredLevel)) {
    return configuredLevel;
  }
  // In test environments or when DEV is undefined, default to debug for testing
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return 'debug';
  }
  return fallbackLevel;
}
const activeLevel: LogLevel = resolveLogLevel();
function shouldLog(level: LogLevel) {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[activeLevel];
}
type LogMethod = (...args: unknown[]) => void;
const consoleMethodByLevel: Record<LogLevel, keyof Console> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};
function createLogMethod(level: LogLevel, scope?: string): LogMethod {
  const consoleMethod = consoleMethodByLevel[level];
  return (...args: unknown[]) => {
    if (!shouldLog(level)) {
      return;
    }
    const prefix = scope ? [`[${scope}]`] : [];
    const consoleFn = console[consoleMethod] as (...args: unknown[]) => void;
    const method =
      typeof consoleFn === 'function' ? consoleFn.bind(console) : console.log.bind(console);
    method(...prefix, ...args);
  };
}
export const logger = {
  debug: createLogMethod('debug'),
  info: createLogMethod('info'),
  warn: createLogMethod('warn'),
  error: createLogMethod('error'),
};
export const createLogger = (scope: string) => ({
  debug: createLogMethod('debug', scope),
  info: createLogMethod('info', scope),
  warn: createLogMethod('warn', scope),
  error: createLogMethod('error', scope),
});
