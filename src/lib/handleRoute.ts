import { NextResponse } from "next/server";
import { AppError, AppErrorCode } from "@/domain/errors/AppError";

const ERROR_STATUS_MAP: Record<AppErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSUPPORTED_FORMAT: 415,
  SOURCE_UNAVAILABLE: 502,
  SERVICE_UNAVAILABLE: 503,
  PROCESSING_FAILED: 500,
  INTEGRITY_FAILED: 422,
  CANCELLED: 499,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
};

export async function handleRoute<T = any>(
  handler: () => Promise<NextResponse<T> | Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (err: unknown) {
    if (err instanceof AppError) {
      const status = ERROR_STATUS_MAP[err.code] || 500;
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            retryable: err.retryable,
            details: err.details,
          },
        },
        { status }
      );
    }

    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[RouteHandler Error]:", err);
    return NextResponse.json(
      {
        error: {
          code: "PROCESSING_FAILED",
          message,
          retryable: false,
        },
      },
      { status: 500 }
    );
  }
}
