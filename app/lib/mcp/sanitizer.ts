type SchemaDef = {
  fields?: Record<string, { expose?: boolean; alias?: string }>;
};

export function sanitizeBySchema<T extends Record<string, any>>(
  row: T,
  schema?: SchemaDef,
): Record<string, any> {
  if (!schema?.fields) return row;
  const out: Record<string, any> = {};
  for (const [key, cfg] of Object.entries(schema.fields)) {
    if (!cfg || cfg.expose === false) continue;
    const alias = cfg.alias || key;
    if (key in row) out[alias] = row[key];
  }
  return out;
}

export function sanitizeArray<T extends Record<string, any>>(
  rows: T[],
  schema?: SchemaDef,
): Record<string, any>[] {
  return rows.map((r) => sanitizeBySchema(r, schema));
}
