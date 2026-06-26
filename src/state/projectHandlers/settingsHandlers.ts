import { stampProject } from '../projectStamping';
import type { ProjectState } from '../projectTypes';
import type { ActionOf, ProjectHandlerContext } from './shared';

export function handleUpdateProjectInfo(
  state: ProjectState,
  action: ActionOf<'UPDATE_PROJECT_INFO'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        project: {
          ...state.project.project,
          ...action.payload,
        },
      },
      'Project settings updated',
      context.dependencies,
    ),
    statusMessage: 'Project settings updated',
    importError: null,
  };
}

export function handleAddCategory(
  state: ProjectState,
  action: ActionOf<'ADD_CATEGORY'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          categories: [...state.project.settings.categories, action.payload],
        },
      },
      `Category added: ${action.payload.name}`,
      context.dependencies,
    ),
    statusMessage: 'Category added',
    importError: null,
  };
}

export function handleUpdateCategory(
  state: ProjectState,
  action: ActionOf<'UPDATE_CATEGORY'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          categories: state.project.settings.categories.map((category) =>
            category.id === action.payload.id ? { ...category, ...action.payload.updates } : category,
          ),
        },
      },
      `Category updated: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Category updated',
    importError: null,
  };
}

export function handleAddCategoryConnectorAssignment(
  state: ProjectState,
  action: ActionOf<'ADD_CATEGORY_CONNECTOR_ASSIGNMENT'>,
  context: ProjectHandlerContext,
): ProjectState {
  const alreadyAssigned = state.project.settings.categoryConnectorAssignments.some(
    (assignment) =>
      assignment.categoryId === action.payload.categoryId &&
      assignment.connectorTypeId === action.payload.connectorTypeId,
  );

  if (alreadyAssigned) {
    return {
      ...state,
      statusMessage: 'Connector already assigned to category',
      importError: null,
    };
  }

  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          categoryConnectorAssignments: [
            ...state.project.settings.categoryConnectorAssignments,
            action.payload,
          ],
        },
      },
      `Connector assigned to category: ${action.payload.connectorTypeId}`,
      context.dependencies,
    ),
    statusMessage: 'Connector assigned to category',
    importError: null,
  };
}

export function handleRemoveCategoryConnectorAssignment(
  state: ProjectState,
  action: ActionOf<'REMOVE_CATEGORY_CONNECTOR_ASSIGNMENT'>,
  context: ProjectHandlerContext,
): ProjectState {
  const groupsInCategory = new Set(
    state.project.settings.connectorCompatibilityGroups
      .filter((group) => group.categoryId === action.payload.categoryId)
      .map((group) => group.id),
  );

  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          categoryConnectorAssignments: state.project.settings.categoryConnectorAssignments.filter(
            (assignment) =>
              assignment.categoryId !== action.payload.categoryId ||
              assignment.connectorTypeId !== action.payload.connectorTypeId,
          ),
          connectorCompatibilityGroupMembers:
            state.project.settings.connectorCompatibilityGroupMembers.filter(
              (member) =>
                member.connectorTypeId !== action.payload.connectorTypeId ||
                !groupsInCategory.has(member.groupId),
            ),
        },
      },
      `Connector removed from category: ${action.payload.connectorTypeId}`,
      context.dependencies,
    ),
    statusMessage: 'Connector removed from category',
    importError: null,
  };
}

export function handleAddConnectorGroup(
  state: ProjectState,
  action: ActionOf<'ADD_CONNECTOR_GROUP'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          connectorCompatibilityGroups: [
            ...state.project.settings.connectorCompatibilityGroups,
            action.payload,
          ],
        },
      },
      `Connector group added: ${action.payload.name}`,
      context.dependencies,
    ),
    statusMessage: 'Connector group added',
    importError: null,
  };
}

export function handleUpdateConnectorGroup(
  state: ProjectState,
  action: ActionOf<'UPDATE_CONNECTOR_GROUP'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          connectorCompatibilityGroups: state.project.settings.connectorCompatibilityGroups.map((group) =>
            group.id === action.payload.id ? { ...group, ...action.payload.updates } : group,
          ),
        },
      },
      `Connector group updated: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Connector group updated',
    importError: null,
  };
}

export function handleAddConnectorGroupMember(
  state: ProjectState,
  action: ActionOf<'ADD_CONNECTOR_GROUP_MEMBER'>,
  context: ProjectHandlerContext,
): ProjectState {
  const alreadyMember = state.project.settings.connectorCompatibilityGroupMembers.some(
    (member) =>
      member.groupId === action.payload.groupId && member.connectorTypeId === action.payload.connectorTypeId,
  );

  if (alreadyMember) {
    return {
      ...state,
      statusMessage: 'Connector already belongs to group',
      importError: null,
    };
  }

  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          connectorCompatibilityGroupMembers: [
            ...state.project.settings.connectorCompatibilityGroupMembers,
            action.payload,
          ],
        },
      },
      `Connector added to group: ${action.payload.connectorTypeId}`,
      context.dependencies,
    ),
    statusMessage: 'Connector added to group',
    importError: null,
  };
}

export function handleRemoveConnectorGroupMember(
  state: ProjectState,
  action: ActionOf<'REMOVE_CONNECTOR_GROUP_MEMBER'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          connectorCompatibilityGroupMembers:
            state.project.settings.connectorCompatibilityGroupMembers.filter(
              (member) =>
                member.groupId !== action.payload.groupId ||
                member.connectorTypeId !== action.payload.connectorTypeId,
            ),
        },
      },
      `Connector removed from group: ${action.payload.connectorTypeId}`,
      context.dependencies,
    ),
    statusMessage: 'Connector removed from group',
    importError: null,
  };
}

export function handleAddConnectorType(
  state: ProjectState,
  action: ActionOf<'ADD_CONNECTOR_TYPE'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          connectorTypes: [...state.project.settings.connectorTypes, action.payload],
        },
      },
      `Connector type added: ${action.payload.name}`,
      context.dependencies,
    ),
    statusMessage: 'Connector type added',
    importError: null,
  };
}

export function handleUpdateConnectorType(
  state: ProjectState,
  action: ActionOf<'UPDATE_CONNECTOR_TYPE'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          connectorTypes: state.project.settings.connectorTypes.map((connectorType) =>
            connectorType.id === action.payload.id
              ? { ...connectorType, ...action.payload.updates }
              : connectorType,
          ),
        },
      },
      `Connector type updated: ${action.payload.id}`,
      context.dependencies,
    ),
    statusMessage: 'Connector type updated',
    importError: null,
  };
}

export function handleAddCablePrefix(
  state: ProjectState,
  action: ActionOf<'ADD_CABLE_PREFIX'>,
  context: ProjectHandlerContext,
): ProjectState {
  return {
    project: stampProject(
      {
        ...state.project,
        settings: {
          ...state.project.settings,
          cablePrefixes: [...state.project.settings.cablePrefixes, action.payload],
        },
        numberingLedgers: state.project.numberingLedgers.some(
          (ledger) => ledger.prefix === action.payload.prefix,
        )
          ? state.project.numberingLedgers
          : [
              ...state.project.numberingLedgers,
              { prefix: action.payload.prefix, nextSuggested: 1, ranges: [] },
            ],
      },
      `Cable prefix added: ${action.payload.prefix}`,
      context.dependencies,
    ),
    statusMessage: 'Cable prefix added',
    importError: null,
  };
}
