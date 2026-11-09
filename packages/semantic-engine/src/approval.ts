import type { SemanticStatus, StatusedItem } from './types.js';

export function preferApproved<T extends StatusedItem>(items: T[]): T[] {
  const approved = items.filter((i) => i.status === 'Approved');
  if (approved.length) return approved;
  return items.filter((i) => i.status === 'Proposed');
}

export function isTrustedDefinition(status: SemanticStatus): boolean {
  return status === 'Approved';
}

export function canTransition(from: SemanticStatus, to: SemanticStatus): boolean {
  if (from === to) return true;
  if (to === 'Proposed') return from === 'Rejected';
  if (to === 'Approved' || to === 'Rejected') return from === 'Proposed' || from === 'Approved' || from === 'Rejected';
  return false;
}
