import { z } from "zod";

const configScope = {
  projectId: z.string().uuid(),
  configId: z.string().uuid(),
};
const groupName = z.string().trim().min(1).max(60);

export const listKeywordGroupsSchema = z.object(configScope);

export const createKeywordGroupSchema = z.object({
  ...configScope,
  name: groupName,
});

export const renameKeywordGroupSchema = z.object({
  ...configScope,
  groupId: z.string().uuid(),
  name: groupName,
});

export const deleteKeywordGroupSchema = z.object({
  ...configScope,
  groupId: z.string().uuid(),
});

export const setKeywordsGroupSchema = z.object({
  ...configScope,
  keywordIds: z.array(z.string().uuid()).min(1).max(2000),
  groupId: z.string().uuid().nullable(),
});

/** A site path ("/servicos/reparo") or a full URL; empty clears it. */
export const setKeywordsTargetUrlSchema = z.object({
  ...configScope,
  keywordIds: z.array(z.string().uuid()).min(1).max(2000),
  targetUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => value === "" || value.startsWith("/") || URL.canParse(value),
      "Use um caminho como /servicos ou um endereço completo",
    ),
});
