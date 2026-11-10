import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projects } from "./app.schema";
import { invitation, organization, user } from "./better-auth-schema";

// Timestamps are stored as *text* (same column shape as the SQLite schema); see
// the note in pg/app.schema.ts. `isoNow` matches `new Date().toISOString()` so
// DB-defaulted and app-written values sort together lexicographically.
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

// ============================================================================
// Project memory: the shared AI context every surface (SAM, MCP, settings UI)
// reads and writes. Prose lives in the sections table; list-shaped knowledge is
// normalized so it stays joinable instead of buried in markdown.
// ============================================================================

// One row per (project, section). `key` is either a typed key
// ("business_overview", "current_goal", "positioning", "writing_preferences")
// or "custom:<slug>" for an agent-created section, in which case `title` holds
// its display name.
export const projectContextSections = pgTable(
  "project_context_sections",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title"),
    content: text("content").notNull(),
    updatedAt: text("updated_at").notNull().default(isoNow),
    updatedBy: text("updated_by", { enum: ["user", "sam", "mcp"] }).notNull(),
  },
  // The composite PK is project-leading, so it also serves the "load every
  // section for this project" read.
  (table) => [primaryKey({ columns: [table.projectId, table.key] })],
);

export const projectCompetitors = pgTable(
  "project_competitors",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Normalized bare host (lowercase, no protocol/www), so agents adding the
    // same competitor from different surfaces upsert onto one row.
    domain: text("domain").notNull(),
    name: text("name"),
    notes: text("notes"),
    // dataSEO: "commercial" (competes for the same customers) or "serp"
    // (shows up in the searches without being a direct competitor).
    kind: text("kind", { enum: ["commercial", "serp"] }),
    updatedAt: text("updated_at").notNull().default(isoNow),
    updatedBy: text("updated_by", { enum: ["user", "sam", "mcp"] }).notNull(),
  },
  (table) => [
    uniqueIndex("project_competitors_project_domain_idx").on(
      table.projectId,
      table.domain,
    ),
  ],
);

// dataSEO: the main services of the business ("Instalação", "Manutenção"),
// entered in the new-project wizard and used to suggest keywords.
export const projectServices = pgTable(
  "project_services",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("project_services_project_name_idx").on(
      table.projectId,
      table.name,
    ),
  ],
);

// A curated shortlist of pages that matter, NOT a page inventory — the
// inventory lives in audit_pages and GSC.
export const projectKeyPages = pgTable(
  "project_key_pages",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    role: text("role", { enum: ["hub", "spoke", "money", "other"] }).notNull(),
    topic: text("topic"),
    notes: text("notes"),
    updatedAt: text("updated_at").notNull().default(isoNow),
    updatedBy: text("updated_by", { enum: ["user", "sam", "mcp"] }).notNull(),
  },
  (table) => [
    uniqueIndex("project_key_pages_project_url_idx").on(
      table.projectId,
      table.url,
    ),
  ],
);

// What research has already been bought and what it concluded, so SAM and
// Claude Code stop re-buying the same paid research. Pruned to 90 days on
// append; the date is server-stamped, never supplied by the caller.
export const projectResearchLog = pgTable(
  "project_research_log",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    entryDate: text("entry_date").notNull(),
    summary: text("summary").notNull(),
    createdBy: text("created_by", { enum: ["user", "sam", "mcp"] }).notNull(),
    // entry_date is a day stamp, so recency needs its own column — same-day
    // entries would otherwise tie-break on a random uuid.
    createdAt: text("created_at").notNull().default(isoNow),
  },
  (table) => [
    index("project_research_log_project_date_idx").on(
      table.projectId,
      table.entryDate,
    ),
  ],
);

// dataSEO: which projects a member with the "client" role can read. Agency
// staff (owner, admin, member) see every project of the organization and have
// no rows here.
export const projectAccess = pgTable(
  "project_access",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(isoNow),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("project_access_user_idx").on(table.userId),
  ],
);

// dataSEO: the projects a pending client invitation will grant on acceptance.
export const invitationProjects = pgTable(
  "invitation_projects",
  {
    invitationId: text("invitation_id")
      .notNull()
      .references(() => invitation.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.invitationId, table.projectId] })],
);

// dataSEO: plans the platform owner offers, each with a monthly quota of
// queries (one keyword on one device in one rank check).
export const platformPlans = pgTable("platform_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  monthlyQueries: integer("monthly_queries").notNull(),
  createdAt: text("created_at").notNull().default(isoNow),
});

// dataSEO: the platform owner's settings for one organization. No row means
// the default plan and not suspended.
export const organizationPlatformSettings = pgTable(
  "organization_platform_settings",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => platformPlans.id, {
      onDelete: "set null",
    }),
    suspendedAt: text("suspended_at"),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
);

// dataSEO: a single-use link that creates a partner agency's account and
// organization. Only the token's hash is stored.
export const partnerInvitations = pgTable(
  "partner_invitations",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    agencyName: text("agency_name").notNull(),
    email: text("email").notNull(),
    planId: text("plan_id").references(() => platformPlans.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull().default(isoNow),
    expiresAt: text("expires_at").notNull(),
    acceptedAt: text("accepted_at"),
    revokedAt: text("revoked_at"),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
  },
  (table) => [uniqueIndex("partner_invitations_token_idx").on(table.tokenHash)],
);
