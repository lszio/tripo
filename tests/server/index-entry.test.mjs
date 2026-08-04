import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("production server entry", () => {
  it("loads Prisma Client through a CommonJS-compatible default import", async () => {
    const entry = await readFile(resolve(process.cwd(), "server/index.mjs"), "utf8");

    expect(entry).toContain('import prismaClientPackage from "@prisma/client";');
    expect(entry).toContain("const { PrismaClient } = prismaClientPackage;");
  });
});
