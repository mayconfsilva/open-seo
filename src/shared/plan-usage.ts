/**
 * dataSEO: the plan of an organization the platform owner assigned none. A
 * query ("consulta") is one keyword read on one device in one position check,
 * the unit the new-project simulation uses.
 */
export const DEFAULT_PLAN = { name: "Plano piloto", monthlyQueries: 2000 };

/** The platform owner's own organization: no quota (`monthlyQueries` null). */
export const UNLIMITED_PLAN = {
  name: "Plano da plataforma",
  monthlyQueries: null,
};

/** Months shown in the usage history, the current one included. */
export const PLAN_USAGE_HISTORY_MONTHS = 6;
