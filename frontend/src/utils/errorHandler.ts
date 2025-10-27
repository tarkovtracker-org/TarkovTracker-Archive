import { ref } from 'vue';
import { logger } from './logger';

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
   * Handle async errors from promises
   */
  handleAsyncError(promise: Promise<unknown>, context?: string): Promise<unknown> {
    return promise.catch((error) => {
      this.handleError(error, context);
      throw error; // Re-throw to maintain error propagation
    });
  }

  /**
   * Get all logged errors
   */
  getErrors(): ErrorInfo[] {
    return this.errors.value;
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
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error);
    }
    return 'Unknown error occurred';
  }

  private getCurrentUserId(): string | undefined {
    // This would depend on your auth system
    // For now, return undefined since we don't want to couple this to specific auth
    return undefined;
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
    getErrors: () => errorHandler.getErrors(),
    getErrorsByContext: errorHandler.getErrorsByContext.bind(errorHandler),
    clearErrors: () => errorHandler.clearErrors(),
    clearErrorsByContext: errorHandler.clearErrorsByContext.bind(errorHandler),
    createErrorBoundary: errorHandler.createErrorBoundary.bind(errorHandler),
  };
}
