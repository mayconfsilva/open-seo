import { and, asc, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { runBatch } from "@/db/runBatch";
import { projectCompetitors, projectServices, projects } from "@/db/schema";
import type { SetupCompetitor } from "@/types/schemas/project-setup";

async function setBusiness(
  projectId: string,
  values: {
    segment: string | null;
    audience: string | null;
    draftSince?: string | null;
  },
) {
  await db.update(projects).set(values).where(eq(projects.id, projectId));
}

async function listServices(projectId: string) {
  const rows = await db
    .select({ name: projectServices.name })
    .from(projectServices)
    .where(eq(projectServices.projectId, projectId))
    .orderBy(asc(projectServices.position));
  return rows.map((row) => row.name);
}

/** Replace the project's services with `names`, in that order. */
async function replaceServices(projectId: string, names: string[]) {
  await runBatch((tx) => [
    tx.delete(projectServices).where(eq(projectServices.projectId, projectId)),
    ...names.map((name, position) =>
      tx
        .insert(projectServices)
        .values({ id: crypto.randomUUID(), projectId, name, position }),
    ),
  ]);
}

async function listCompetitors(projectId: string) {
  return db
    .select({
      domain: projectCompetitors.domain,
      name: projectCompetitors.name,
      kind: projectCompetitors.kind,
    })
    .from(projectCompetitors)
    .where(eq(projectCompetitors.projectId, projectId))
    .orderBy(asc(projectCompetitors.domain));
}

/**
 * Make the project's competitors exactly `competitors` (domains already
 * normalized). Notes written elsewhere for a kept domain are left alone.
 */
async function replaceCompetitors(
  projectId: string,
  competitors: SetupCompetitor[],
) {
  const domains = competitors.map((competitor) => competitor.domain);
  await runBatch((tx) => [
    tx
      .delete(projectCompetitors)
      .where(
        and(
          eq(projectCompetitors.projectId, projectId),
          domains.length > 0
            ? notInArray(projectCompetitors.domain, domains)
            : undefined,
        ),
      ),
    ...competitors.map((competitor) =>
      tx
        .insert(projectCompetitors)
        .values({
          id: crypto.randomUUID(),
          projectId,
          domain: competitor.domain,
          name: competitor.name,
          kind: competitor.kind,
          updatedBy: "user",
        })
        .onConflictDoUpdate({
          target: [projectCompetitors.projectId, projectCompetitors.domain],
          set: { name: competitor.name, kind: competitor.kind },
        }),
    ),
  ]);
}

export const ProjectSetupRepository = {
  setBusiness,
  listServices,
  replaceServices,
  listCompetitors,
  replaceCompetitors,
};
