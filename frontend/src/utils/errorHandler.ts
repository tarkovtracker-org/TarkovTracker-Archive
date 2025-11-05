import { ref } from 'vue';
import { logger } from '@/utils/logger';

export interface ErrorInfo {
  id: string;
  message: string;
  details?: unknown;
  timestamp: Date;
  context?: string;
  userId?: string;
}

class ErrorHandler {
  private errors = ref<ErrorInfo[]>([]);
  private maxErrors = 50; // Keep only last 50 errors in memory
  private userIdProvider?: () => string | undefined;

  /**
   * Set user ID provider function
   * @param provider - Function that returns current user ID
   * @throws Error if provider is not a function
   */
  setUserIdProvider(provider: () => string | undefined): void {
    if (typeof provider !== 'function') {
      throw new Error('User ID provider must be a function');
    }
    this.userIdProvider = provider;
  }

  /**
   * Handle and log an error
   * @param error - Error object or message
   * @param context - Context where the error occurred
   * @param details - Additional error details
   */
  handleError(error: unknown, context?: string, details?: unknown): string {
    const errorId = this.generateErrorId();
    const errorMessage = this.extractErrorMessage(error);

    const errorInfo: ErrorInfo = {
      id: errorId,
      message: errorMessage,
      details,
      timestamp: new Date(),
      context,
      userId: this.getCurrentUserId(),
    };

    // Add to errors list
    this.errors.value.unshift(errorInfo);

    // Keep only the most recent errors
    if (this.errors.value.length > this.maxErrors) {
      this.errors.value = this.errors.value.slice(0, this.maxErrors);
    }

    // Log to console/logger
    this.logError(errorInfo);

    return errorId;
  }

  /**
   * Handle async errors from promises with proper type preservation.
   *
   * @template R - The resolved type of the promise
   * @param promise - The promise to wrap with error handling
   * @param context - Optional context string for error tracking
   * @returns A promise that resolves to the same type as the input promise
   *
   * @example
   * ```ts
   * const result = await errorHandler.handleAsyncError(
   *   fetchUserData(userId),
   *   'UserProfile'
   * );
   * // result is typed as the return type of fetchUserData
   * ```
   */
  handleAsyncError<R>(promise: Promise<R>, context?: string): Promise<R> {
    return promise.catch((error: unknown) => {
      this.handleError(error, context);
      throw error; // Re-throw to maintain error propagation
    });
  }

  /**
   * Get all logged errors
   */
  getErrors(): ErrorInfo[] {
    return [...this.errors.value];
  }

  /**
   * Get errors by context
   */
  getErrorsByContext(context: string): ErrorInfo[] {
    return this.errors.value.filter((error) => error.context === context);
  }

  /**
   * Clear all logged errors
   */
  clearErrors(): void {
    this.errors.value = [];
  }

  /**
   * Clear errors by context
   */
  clearErrorsByContext(context: string): void {
    this.errors.value = this.errors.value.filter((error) => error.context !== context);
  }

  /**
   * Create an error boundary wrapper for Vue components
   */
  createErrorBoundary(context: string, fallback?: () => void) {
    return (error: unknown) => {
      this.handleError(error, context);
      if (fallback) {
        fallback();
      }
    };
  }

  private generateErrorId(): string {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `err_${crypto.randomUUID()}`;
      }
    } catch {
      // Fallback if randomUUID fails
    }

    // Fallback using crypto.getRandomValues
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(4);
        crypto.getRandomValues(array);
        const randomHex = Array.from(array, (dec) => dec.toString(16)).join('');
        return `err_${randomHex}`;
      }
    } catch {
      // Fallback if getRandomValues fails
    }

    // Ultimate fallback
    return `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private extractErrorMessage(error: unknown): string {
    return this.safeStringifyError(error);
  }

  /**
   * Safely converts any error value to a string without throwing.
   * This avoids JSON.stringify which can throw on circular references.
   */
  private safeStringifyError(error: unknown): string {
    // Handle Error instances with their well-known properties
    if (error instanceof Error) {
      let result = `${error.name}: ${error.message}`;
      if (error.stack) {
        result += `\n${error.stack}`;
      }
      return result;
    }

    // Handle primitive string values directly
    if (typeof error === 'string') {
      return error;
    }

    // Handle null and undefined explicitly
    if (error === null) {
      return 'null';
    }
    if (error === undefined) {
      return 'undefined';
    }

    // For objects, create a safe representation without risking circular references
    if (typeof error === 'object') {
      try {
        // Get the object's type for context
        const typeInfo = Object.prototype.toString.call(error);

        // Get up to 10 enumerable properties to avoid verbosity
        // and prevent deep structure traversal
        const properties = Object.keys(error).slice(0, 10);
        const propsString = properties
          .map((key) => {
            try {
              return `${key}=${String((error as Record<string, unknown>)[key])}`;
            } catch {
              // If property conversion fails, just note the key exists
              return `${key}=<unable to convert>`;
            }
          })
          .join(', ');

        return `${typeInfo}${propsString ? ` {${propsString}}` : ''}`;
      } catch {
        // Ultimate fallback if anything above fails
        return `${Object.prototype.toString.call(error)}: ${String(error)}`;
      }
    }

    // Handle all other primitive types
    return String(error);
  }

  private getCurrentUserId(): string | undefined {
    return this.userIdProvider ? this.userIdProvider() : undefined;
  }

  private logError(errorInfo: ErrorInfo): void {
    const logMessage = `[${errorInfo.id}] ${errorInfo.message}`;

    if (errorInfo.context) {
      logger.error(`${logMessage} (Context: ${errorInfo.context})`, errorInfo.details);
    } else {
      logger.error(logMessage, errorInfo.details);
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Export composable for use in Vue components
export function useErrorHandler() {
  return {
    handleError: errorHandler.handleError.bind(errorHandler),
    handleAsyncError: errorHandler.handleAsyncError.bind(errorHandler),
    getErrors: errorHandler.getErrors.bind(errorHandler),
    getErrorsByContext: errorHandler.getErrorsByContext.bind(errorHandler),
    clearErrors: errorHandler.clearErrors.bind(errorHandler),
    clearErrorsByContext: errorHandler.clearErrorsByContext.bind(errorHandler),
    createErrorBoundary: errorHandler.createErrorBoundary.bind(errorHandler),
  };
}
