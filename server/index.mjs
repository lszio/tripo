import prismaClientPackage from "@prisma/client";

import { createApp } from "./app.mjs";

const { PrismaClient } = prismaClientPackage;

const app = createApp({
  prisma: new PrismaClient(),
  distDir: new URL("../dist", import.meta.url),
  devEmail: process.env.NODE_ENV === "development" ? process.env.DEV_AUTH_EMAIL : undefined
});

await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3000) });
