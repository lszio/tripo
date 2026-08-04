import { UnauthorizedError } from "./errors.mjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function resolveCurrentUser(request, prisma, { devEmail } = {}) {
  const header = request.headers["remote-email"];
  const email = typeof header === "string" ? header.trim() : devEmail?.trim() ?? "";

  if (!EMAIL_PATTERN.test(email)) {
    throw new UnauthorizedError();
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  });

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null
  };
}
