import { describe, expect, it } from "vitest";

import { createTravelRepository } from "../../server/travel-repository.mjs";

const ownerTravel = {
  id: "travel-owner",
  title: "杭州周末",
  destination: "杭州",
  dates: "2026-10-01 至 2026-10-03",
  status: "draft",
  roadbook: { version: 1, days: [] },
  editablePlan: { days: [] },
  recordingPlanSnapshot: undefined,
  records: []
};

const otherTravel = {
  ...ownerTravel,
  id: "travel-other",
  title: "上海周末"
};

const localArchive = { version: 1, travels: [ownerTravel] };

function fakePrismaWithTravels(travels) {
  const users = new Map([
    ["user-owner", { id: "user-owner", email: "owner@example.com", importedAt: null }],
    ["user-other", { id: "user-other", email: "other@example.com", importedAt: null }]
  ]);
  const storedTravels = travels.map((travel, index) => ({
    ...serializeTravel(travel),
    userId: index === 0 ? "user-owner" : "user-other"
  }));

  return createFakePrisma(users, storedTravels);
}

function fakePrismaWithoutImportMarker() {
  return createFakePrisma(
    new Map([["user-owner", { id: "user-owner", email: "owner@example.com", importedAt: null }]]),
    []
  );
}

function createFakePrisma(users, travels) {
  const client = {
    user: {
      findUnique: async ({ where: { id } }) => users.get(id) ?? null,
      update: async ({ where: { id }, data }) => {
        const user = users.get(id);
        if (!user) throw new Error("User not found");
        const updated = { ...user, ...data };
        users.set(id, updated);
        return updated;
      }
    },
    travel: {
      findMany: async ({ where }) => travels.filter((travel) => travel.userId === where.userId),
      findUnique: async ({ where: { id_userId: where } }) =>
        travels.find((travel) => travel.id === where.id && travel.userId === where.userId) ?? null,
      upsert: async ({ where: { id_userId: where }, create, update }) => {
        const index = travels.findIndex((travel) => travel.id === where.id && travel.userId === where.userId);
        if (index === -1) {
          travels.push(create);
          return create;
        }
        const saved = { ...travels[index], ...update };
        travels[index] = saved;
        return saved;
      },
      delete: async ({ where: { id_userId: where } }) => {
        const index = travels.findIndex((travel) => travel.id === where.id && travel.userId === where.userId);
        if (index === -1) throw new Error("Travel not found");
        return travels.splice(index, 1)[0];
      },
      create: async ({ data }) => {
        travels.push(data);
        return data;
      }
    }
  };

  return { ...client, $transaction: async (operation) => operation(client) };
}

function serializeTravel(travel) {
  return {
    id: travel.id,
    title: travel.title,
    destination: travel.destination,
    dates: travel.dates,
    status: travel.status,
    roadbookJson: JSON.stringify(travel.roadbook),
    editablePlanJson: travel.editablePlan === null ? null : JSON.stringify(travel.editablePlan),
    recordingPlanJson: travel.recordingPlanSnapshot === undefined ? null : JSON.stringify(travel.recordingPlanSnapshot),
    recordsJson: JSON.stringify(travel.records)
  };
}

describe("travel repository", () => {
  it("returns only travels belonging to the requested user", async () => {
    const repository = createTravelRepository(fakePrismaWithTravels([ownerTravel, otherTravel]));

    await expect(repository.listForUser("user-owner")).resolves.toEqual([ownerTravel]);
  });

  it("does not import the same local archive twice", async () => {
    const repository = createTravelRepository(fakePrismaWithoutImportMarker());

    await expect(repository.importArchiveOnce("user-owner", localArchive)).resolves.toMatchObject({
      imported: true,
      archive: localArchive
    });
    await expect(repository.importArchiveOnce("user-owner", localArchive)).resolves.toMatchObject({
      imported: false,
      archive: localArchive
    });
  });

  it("does not return another user's travel by id", async () => {
    const repository = createTravelRepository(fakePrismaWithTravels([ownerTravel, otherTravel]));

    await expect(repository.findForUser("user-owner", "travel-other")).resolves.toBeNull();
  });

  it("replaces only the requested user's travel", async () => {
    const repository = createTravelRepository(fakePrismaWithTravels([ownerTravel, otherTravel]));
    const replacement = {
      ...ownerTravel,
      title: "杭州三日游",
      dates: "2026-10-02 至 2026-10-04",
      roadbook: { version: 1, days: [{ id: "day-1" }] }
    };

    await expect(repository.replaceForUser("user-owner", replacement)).resolves.toEqual(replacement);
    await expect(repository.findForUser("user-other", "travel-other")).resolves.toEqual(otherTravel);
  });

  it("preserves dates when importing a local archive", async () => {
    const repository = createTravelRepository(fakePrismaWithoutImportMarker());

    await repository.importArchiveOnce("user-owner", localArchive);

    await expect(repository.listForUser("user-owner")).resolves.toEqual([ownerTravel]);
  });

  it("deletes only the requested user's travel", async () => {
    const repository = createTravelRepository(fakePrismaWithTravels([ownerTravel, otherTravel]));

    await expect(repository.deleteForUser("user-owner", "travel-owner")).resolves.toBe(true);
    await expect(repository.findForUser("user-other", "travel-other")).resolves.toEqual(otherTravel);
  });

  it("rejects malformed persisted travel JSON", async () => {
    const prisma = fakePrismaWithTravels([ownerTravel]);
    prisma.travel.findMany = async () => [{ ...serializeTravel(ownerTravel), userId: "user-owner", recordsJson: "{" }];
    const repository = createTravelRepository(prisma);

    await expect(repository.listForUser("user-owner")).rejects.toThrow("Invalid travel JSON");
  });
});
