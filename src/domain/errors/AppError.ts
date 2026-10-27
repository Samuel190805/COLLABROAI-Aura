export type AppErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_FORMAT"
  | "SOURCE_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE"
  | "PROCESSING_FAILED"
  | "INTEGRITY_FAILED"
  | "CANCELLED"
  | "RATE_LIMITED"
  | "NOT_FOUND";

export interface AppErrorDetails {
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly retryable: boolean;
  public readonly details?: AppErrorDetails;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { retryable?: boolean; details?: AppErrorDetails; cause?: unknown }
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  static invalidInput(message: string, details?: AppErrorDetails): AppError {
    return new AppError("INVALID_INPUT", message, { retryable: false, details });
  }

  static unsupportedFormat(message: string, details?: AppErrorDetails): AppError {
    return new AppError("UNSUPPORTED_FORMAT", message, { retryable: false, details });
  }

  static sourceUnavailable(message: string, details?: AppErrorDetails, retryable = true): AppError {
    return new AppError("SOURCE_UNAVAILABLE", message, { retryable, details });
  }

  static serviceUnavailable(message: string, details?: AppErrorDetails, retryable = true): AppError {
    return new AppError("SERVICE_UNAVAILABLE", message, { retryable, details });
  }

  static processingFailed(message: string, details?: AppErrorDetails, retryable = true): AppError {
    return new AppError("PROCESSING_FAILED", message, { retryable, details });
  }

  static integrityFailed(message: string, details?: AppErrorDetails): AppError {
    return new AppError("INTEGRITY_FAILED", message, { retryable: true, details });
  }

  static cancelled(message = "Job was cancelled by user request", details?: AppErrorDetails): AppError {
    return new AppError("CANCELLED", message, { retryable: false, details });
  }

  static rateLimited(
    message = "Too many concurrent requests or jobs. Please wait for current jobs to complete.",
    details?: AppErrorDetails
  ): AppError {
    return new AppError("RATE_LIMITED", message, { retryable: true, details });
  }

  static notFound(message: string, details?: AppErrorDetails): AppError {
    return new AppError("NOT_FOUND", message, { retryable: false, details });
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

export function toAppError(err: unknown, fallbackMessage = "An unexpected error occurred"): AppError {
  if (err instanceof AppError) {
    return err;
  }
  const message = err instanceof Error ? err.message : fallbackMessage;
  return new AppError("PROCESSING_FAILED", message, { retryable: false, cause: err });
}
