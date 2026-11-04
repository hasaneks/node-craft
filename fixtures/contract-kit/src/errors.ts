import type { Translate } from './i18n.ts';

/** Stable machine codes and their HTTP status. Codes never change with the language. */
const STATUS = {
  VALIDATION_ERROR: 400,
  INVALID_CURSOR: 400,
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  IDEMPOTENCY_IN_PROGRESS: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof STATUS;

export interface FieldError {
  /** Path of the field in the request, e.g. `email` or `items.0.quantity`. */
  field: string;
  /** Stable code; the message key is `validation.<code>`. */
  code: string;
}

export class AppError extends Error {
  static readonly codes = Object.keys(STATUS) as ErrorCode[];
  readonly code: ErrorCode;
  readonly details: FieldError[] | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(code: ErrorCode, options: { details?: FieldError[]; retryAfterSeconds?: number; cause?: unknown } = {}) {
    super(code, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: (FieldError & { message: string })[] };
  locale: string;
  requestId: string;
}

/**
 * The one place that turns any thrown value into the wire format. Unknown errors become INTERNAL_ERROR with a
 * generic message; their text (SQL, hosts, provider messages) never reaches the client. Log them with the request id.
 */
export function toErrorResponse(
  error: unknown,
  context: { t: Translate; locale: string; requestId: string },
): { status: number; headers: Record<string, string>; body: ErrorBody } {
  const appError = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', { cause: error });
  const { t, locale, requestId } = context;
  const generic = () => t('errors.INTERNAL_ERROR', locale) ?? 'Something went wrong. Please try again.';
  const message = (key: string) => t(key, locale) ?? generic();

  const body: ErrorBody = {
    error: { code: appError.code, message: message(`errors.${appError.code}`) },
    locale,
    requestId,
  };
  if (appError.details?.length) {
    body.error.details = appError.details.map((d) => ({ ...d, message: message(`validation.${d.code}`) }));
  }
  const headers: Record<string, string> = {};
  if (appError.retryAfterSeconds !== undefined) headers['retry-after'] = String(appError.retryAfterSeconds);
  return { status: STATUS[appError.code], headers, body };
}
