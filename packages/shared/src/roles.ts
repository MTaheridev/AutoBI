export const WorkspaceRoles = ['Owner', 'Admin', 'Member', 'Viewer'] as const;
export type WorkspaceRole = (typeof WorkspaceRoles)[number];

const ROLE_RANK: Record<WorkspaceRole, number> = {
  Viewer: 1,
  Member: 2,
  Admin: 3,
  Owner: 4,
};

export function hasMinRole(role: WorkspaceRole, required: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
