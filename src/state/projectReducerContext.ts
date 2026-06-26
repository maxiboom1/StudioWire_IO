import { makeId, makeUniqueId, nowIso } from '../domain/id';

export interface ProjectReducerDependencies {
  nowIso: () => string;
  makeId: (prefix: string, value: string) => string;
  makeUniqueId: (prefix: string, value: string) => string;
}

export const defaultProjectReducerDependencies: ProjectReducerDependencies = {
  nowIso,
  makeId,
  makeUniqueId,
};
