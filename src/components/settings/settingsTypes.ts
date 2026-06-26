export type SettingsTab = 'project' | 'connectors' | 'categories' | 'groups';

export interface ProjectInfoFormValue {
  name: string;
  customer: string;
  revision: string;
}

export interface NewCablePrefixFormValue {
  prefix: string;
  name: string;
}

export interface NewCategoryFormValue {
  name: string;
  defaultCablePrefix: string;
}
