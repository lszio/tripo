export class UnauthorizedError extends Error {
  constructor() {
    super("需要先登录");
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("旅行不存在");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function isPrismaUnavailableError(error) {
  return typeof error?.code === "string" && /^P10(?:0\d|1[0-7])$/.test(error.code);
}

export function sendApiError(error, _request, reply) {
  if (error instanceof UnauthorizedError) {
    return reply.code(401).send({ error: "UNAUTHENTICATED", message: "需要先登录" });
  }

  if (error instanceof NotFoundError) {
    return reply.code(404).send({ error: "NOT_FOUND", message: "旅行不存在" });
  }

  if (error instanceof ValidationError || error?.statusCode === 400) {
    return reply.code(400).send({ error: "INVALID_REQUEST", message: error instanceof ValidationError ? error.message : "请求格式无效" });
  }

  if (isPrismaUnavailableError(error)) {
    return reply.code(503).send({ error: "DATABASE_UNAVAILABLE", message: "数据服务暂不可用，请稍后重试" });
  }

  return reply.send(error);
}
