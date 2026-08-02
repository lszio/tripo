import { PrismaClient } from "@prisma/client";

import { createApp } from "./app.mjs";

const app = createApp({ prisma: new PrismaClient(), distDir: new URL("../dist", import.meta.url) });

await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3000) });
