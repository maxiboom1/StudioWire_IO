import type { ProjectReducerDependencies } from '../projectReducerContext';
import type { ProjectAction, ProjectState } from '../projectTypes';

export interface ProjectHandlerContext {
  dependencies: ProjectReducerDependencies;
}

export type ActionOf<Type extends ProjectAction['type']> = Extract<ProjectAction, { type: Type }>;

export type ProjectActionHandler<Type extends ProjectAction['type']> = (
  state: ProjectState,
  action: ActionOf<Type>,
  context: ProjectHandlerContext,
) => ProjectState;
