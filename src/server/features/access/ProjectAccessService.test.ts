import { beforeEach, expect, it, vi } from "vitest";
import { ProjectAccessService } from "./ProjectAccessService";

const mocks = vi.hoisted(() => ({
  hasAccess: vi.fn(),
  listProjectIdsForUser: vi.fn(),
  listProjects: vi.fn(),
}));

vi.mock("@/server/features/access/ProjectAccessRepository", () => ({
  ProjectAccessRepository: mocks,
}));
vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: { listProjects: mocks.listProjects },
}));

beforeEach(() => {
  mocks.hasAccess.mockResolvedValue(false);
  mocks.listProjectIdsForUser.mockResolvedValue(["granted"]);
  mocks.listProjects.mockResolvedValue([{ id: "granted" }, { id: "other" }]);
});

const client = { userId: "u1", organizationId: "org", role: "client" };

it("refuses a client a project that was not granted to them", async () => {
  await expect(
    ProjectAccessService.requirePortalProject(client, "other"),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("lets agency staff open any project without a grant", async () => {
  await expect(
    ProjectAccessService.requirePortalProject(
      { userId: "u2", role: "admin" },
      "other",
    ),
  ).resolves.toBeUndefined();
  expect(mocks.hasAccess).not.toHaveBeenCalled();
});

it("lists only granted projects for a client and all for staff", async () => {
  await expect(
    ProjectAccessService.listPortalProjectIds(client),
  ).resolves.toEqual(["granted"]);
  await expect(
    ProjectAccessService.listPortalProjectIds({ ...client, role: "owner" }),
  ).resolves.toEqual(["granted", "other"]);
});

it("refuses to grant a project from another organization", async () => {
  await expect(
    ProjectAccessService.requireOrganizationProjects("org", [
      "granted",
      "foreign",
    ]),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
