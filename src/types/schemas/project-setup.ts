import { z } from "zod";

const projectId = z.string().uuid();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const businessFields = {
  name: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(255),
  segment: optionalText(120),
  audience: optionalText(120),
  services: z.array(z.string().trim().min(1).max(80)).max(20),
};

export const createSetupDraftSchema = z.object(businessFields);

export const saveSetupBusinessSchema = z.object({
  projectId,
  ...businessFields,
});

export const getSetupSchema = z.object({ projectId });

export const saveSetupMarketSchema = z.object({
  projectId,
  locationCode: z.number().int().positive(),
  languageCode: z.string().min(2).max(10),
  locationName: optionalText(200).nullable(),
  devices: z.enum(["both", "desktop", "mobile"]),
});

const targetUrl = optionalText(2048)
  .nullable()
  .refine(
    (value) => value === null || value.startsWith("/") || URL.canParse(value),
    "Use um caminho como /servicos ou um endereço completo",
  );

export const addSetupKeywordsSchema = z.object({
  projectId,
  keywords: z.array(z.string().trim().min(1).max(200)).min(1).max(1000),
  group: optionalText(60).nullable(),
  targetUrl,
});

const SETUP_COMPETITOR_KINDS = ["commercial", "serp"] as const;
export const MAX_SETUP_COMPETITORS = 10;

export const saveSetupCompetitorsSchema = z.object({
  projectId,
  competitors: z
    .array(
      z.object({
        domain: z.string().trim().min(1).max(255),
        name: optionalText(120).nullable(),
        kind: z.enum(SETUP_COMPETITOR_KINDS),
      }),
    )
    .max(MAX_SETUP_COMPETITORS),
});

export const confirmSetupSchema = z.object({
  projectId,
  scheduleInterval: z.enum(["daily", "weekly", "monthly"]),
  devices: z.enum(["both", "desktop", "mobile"]),
});

export type SetupBusiness = Omit<
  z.infer<typeof saveSetupBusinessSchema>,
  "projectId"
>;
export type SetupMarket = Omit<
  z.infer<typeof saveSetupMarketSchema>,
  "projectId"
>;
export type SetupCompetitor = z.infer<
  typeof saveSetupCompetitorsSchema
>["competitors"][number];
