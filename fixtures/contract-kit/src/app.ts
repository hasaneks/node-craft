import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyError, type FastifyRequest } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import type pg from 'pg';
import { AppError, toErrorResponse, type FieldError } from './errors.ts';
import { createTranslator } from './i18n.ts';
import { catalogs } from './catalogs.ts';
import { resolveLocale } from './locale.ts';
import { placeOrder, getOrder, listOrders, type Actor } from './orders.ts';

export interface AppOptions {
  pool: pg.Pool;
  cursorSecret: string;
  supportedLocales: string[];
  fallbackLocale: string;
  /** Verifies the Authorization header and returns the backend identity (e.g. Firebase verifyIdToken + users lookup). */
  authenticate: (authorization: string | undefined) => Promise<Actor | undefined>;
  logger?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor | undefined;
    locale: string;
  }
}

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

const Order = Type.Object({
  id: Type.String({ format: 'uuid' }),
  productSku: Type.String(),
  quantity: Type.Integer(),
  contactEmail: Type.String(),
  status: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
});

const OrderInput = Type.Object(
  {
    productSku: Type.String({ minLength: 1, maxLength: 64 }),
    quantity: Type.Integer({ minimum: 1, maximum: 100 }),
    contactEmail: Type.String({ format: 'email', maxLength: 254 }),
  },
  { additionalProperties: false },
);

/** Ajv error → stable field error. The message comes from the catalog later, in the resolved locale. */
function fieldError(error: NonNullable<FastifyError['validation']>[number]): FieldError {
  const params = error.params as Record<string, string>;
  const path = error.instancePath.replace(/^\//, '').replaceAll('/', '.');
  switch (error.keyword) {
    case 'required':
      return { field: [path, params.missingProperty].filter(Boolean).join('.'), code: 'REQUIRED' };
    case 'additionalProperties':
      return { field: [path, params.additionalProperty].filter(Boolean).join('.'), code: 'UNKNOWN_FIELD' };
    case 'format':
      return { field: path, code: params.format === 'email' ? 'INVALID_EMAIL' : 'INVALID_VALUE' };
    case 'maxLength':
      return { field: path, code: 'TOO_LONG' };
    case 'minimum':
    case 'maximum':
      return { field: path, code: 'OUT_OF_RANGE' };
    default:
      return { field: path, code: 'INVALID_VALUE' };
  }
}

/** buildApp creates the app without listening, so tests use inject() and server.ts owns the port. */
export async function buildApp(options: AppOptions) {
  const t = createTranslator(catalogs, options.fallbackLocale);
  const app = Fastify({
    logger: options.logger ?? false,
    // Accept a client request id only in a safe shape; otherwise make one.
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      return typeof header === 'string' && REQUEST_ID.test(header) ? header : randomUUID();
    },
    // allErrors reports every field at once; it is safe here because every schema bounds its strings and numbers.
    ajv: { customOptions: { allErrors: true, removeAdditional: false, coerceTypes: 'array' } },
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.decorateRequest('actor', undefined);
  app.decorateRequest('locale', options.fallbackLocale);

  const header = (request: FastifyRequest, name: string) => {
    const value = request.headers[name];
    return typeof value === 'string' ? value : undefined;
  };

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    request.actor = await options.authenticate(request.headers.authorization);
    let profile: string | undefined;
    if (request.actor) {
      const { rows } = await options.pool.query('SELECT preferred_locale FROM users WHERE id = $1', [
        request.actor.userId,
      ]);
      profile = rows[0]?.preferred_locale;
    }
    request.locale = resolveLocale({
      header: header(request, 'x-app-locale'),
      profile,
      acceptLanguage: header(request, 'accept-language'),
      supported: options.supportedLocales,
      fallback: options.fallbackLocale,
    }).locale;
    reply.header('content-language', request.locale);
    reply.header('vary', 'Accept-Language, X-App-Locale');
    if (!request.actor) throw new AppError('AUTH_REQUIRED');
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    let mapped: unknown = error;
    if (error.validation) {
      const details = error.validation.map(fieldError).sort((a, b) => a.field.localeCompare(b.field));
      mapped = new AppError('VALIDATION_ERROR', { details });
    } else if (!(error instanceof AppError)) {
      request.log.error({ err: error }, 'unhandled error');
    }
    const { status, headers, body } = toErrorResponse(mapped, { t, locale: request.locale, requestId: request.id });
    return reply.code(status).headers(headers).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const { status, body } = toErrorResponse(new AppError('RESOURCE_NOT_FOUND'), {
      t,
      locale: request.locale,
      requestId: request.id,
    });
    return reply.code(status).send(body);
  });

  app.post(
    '/api/v1/orders',
    {
      schema: {
        body: OrderInput,
        headers: Type.Object({ 'idempotency-key': Type.Optional(Type.String({ minLength: 8, maxLength: 255 })) }),
        response: { 201: Type.Object({ data: Order }) },
      },
    },
    async (request, reply) => {
      const result = await placeOrder(options.pool, request.actor!, request.body, request.headers['idempotency-key']);
      if (result.replayed) reply.header('idempotency-replayed', 'true');
      return reply.code(201).send(result.body);
    },
  );

  app.get(
    '/api/v1/orders/:orderId',
    {
      schema: {
        params: Type.Object({ orderId: Type.String({ format: 'uuid' }) }),
        response: { 200: Type.Object({ data: Order }) },
      },
    },
    async (request) => ({ data: await getOrder(options.pool, request.actor!, request.params.orderId) }),
  );

  app.get(
    '/api/v1/orders',
    {
      schema: {
        querystring: Type.Object({
          limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
          cursor: Type.Optional(Type.String({ maxLength: 512 })),
        }),
        response: {
          200: Type.Object({
            data: Type.Array(Order),
            meta: Type.Object({
              nextCursor: Type.Union([Type.String(), Type.Null()]),
              hasMore: Type.Boolean(),
              limit: Type.Integer(),
            }),
          }),
        },
      },
    },
    async (request) => listOrders(options.pool, request.actor!, request.query, options.cursorSecret),
  );

  await app.ready();
  return app;
}
