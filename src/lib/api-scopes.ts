export const SCOPE_MCP_READ = "mcp.read";
export const SCOPE_V1_READ = "v1.read";
export const SCOPE_V1_TASKS_WRITE = "v1.tasks.write";
export const SCOPE_V1_NOTES_WRITE = "v1.notes.write";

export const TOKEN_MODE_SCOPES = {
  mcp_read: [SCOPE_MCP_READ],
  v1_read: [SCOPE_MCP_READ, SCOPE_V1_READ],
  v1_read_write: [SCOPE_MCP_READ, SCOPE_V1_READ, SCOPE_V1_TASKS_WRITE, SCOPE_V1_NOTES_WRITE],
} as const;

export type TokenCreateMode = keyof typeof TOKEN_MODE_SCOPES;

export function normalizeTokenScopes(scopes: string[]): string[] {
  if (!scopes.length) return [SCOPE_MCP_READ];
  return scopes;
}

export function tokenHasScope(scopes: string[], scope: string): boolean {
  return normalizeTokenScopes(scopes).includes(scope);
}

export function parseTokenCreateMode(raw: unknown): TokenCreateMode {
  if (raw === "v1_read_write") return "v1_read_write";
  if (raw === "v1_read") return "v1_read";
  return "mcp_read";
}
