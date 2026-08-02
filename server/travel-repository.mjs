function parseJson(value, field, travelId) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid travel JSON for ${field} on ${travelId}`, { cause: error });
  }
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination ?? undefined,
    dates: row.dates ?? undefined,
    status: row.status,
    roadbook: parseJson(row.roadbookJson, "roadbook", row.id),
    editablePlan: row.editablePlanJson === null ? undefined : parseJson(row.editablePlanJson, "editablePlan", row.id),
    recordingPlanSnapshot: row.recordingPlanJson === null ? undefined : parseJson(row.recordingPlanJson, "recordingPlan", row.id),
    records: parseJson(row.recordsJson, "records", row.id)
  };
}

function toData(userId, travel) {
  return {
    id: travel.id,
    userId,
    title: travel.title,
    destination: travel.destination ?? null,
    dates: travel.dates ?? null,
    status: travel.status,
    roadbookJson: JSON.stringify(travel.roadbook),
    editablePlanJson: travel.editablePlan === undefined ? null : JSON.stringify(travel.editablePlan),
    recordingPlanJson: travel.recordingPlanSnapshot === undefined ? null : JSON.stringify(travel.recordingPlanSnapshot),
    recordsJson: JSON.stringify(travel.records)
  };
}

export function createTravelRepository(prisma) {
  return {
    async listForUser(userId) {
      const travels = await prisma.travel.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" }
      });
      return travels.map(fromRow);
    },

    async findForUser(userId, travelId) {
      const travel = await prisma.travel.findUnique({
        where: { id_userId: { id: travelId, userId } }
      });
      return travel === null ? null : fromRow(travel);
    },

    async replaceForUser(userId, travel) {
      const data = toData(userId, travel);
      const saved = await prisma.travel.upsert({
        where: { id_userId: { id: travel.id, userId } },
        create: data,
        update: data
      });
      return fromRow(saved);
    },

    async deleteForUser(userId, travelId) {
      try {
        await prisma.travel.delete({
          where: { id_userId: { id: travelId, userId } }
        });
        return true;
      } catch (error) {
        if (error.code === "P2025") return false;
        throw error;
      }
    },

    async importArchiveOnce(userId, archive) {
      return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");
        if (user.importedAt !== null) return { imported: false, archive };

        for (const travel of archive.travels) {
          await transaction.travel.create({ data: toData(userId, travel) });
        }
        await transaction.user.update({ where: { id: userId }, data: { importedAt: new Date() } });
        return { imported: true, archive };
      });
    }
  };
}
