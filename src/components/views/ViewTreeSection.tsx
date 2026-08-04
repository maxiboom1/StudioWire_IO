import { PanelsTopLeft, Plus } from 'lucide-react';
import { isSelected, type SelectedObjectType, type SelectionState } from '../common/selection';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar';
import { ActionContextMenu } from '../layout/LeftTreeBranches';
import type { ViewTreeItemModel } from '../layout/leftTreeModel';

export function ViewTreeSection({
  views,
  selection,
  onAddView,
  onDeleteView,
  onRenameView,
  onSelectObject,
}: {
  views: ViewTreeItemModel[];
  selection: SelectionState;
  onAddView: () => void;
  onDeleteView: (viewId: string) => void;
  onRenameView: (viewId: string) => void;
  onSelectObject: (selectedObjectType: SelectedObjectType, selectedObjectId: string) => void;
}) {
  const addAction = [{ label: 'Add View', onSelect: onAddView }];

  return (
    <SidebarGroup className="view-tree-section">
      <ActionContextMenu actions={addAction}>
        <div className="view-tree-heading cursor-context-menu">
          <SidebarGroupLabel>Views</SidebarGroupLabel>
          <button aria-label="Add View" className="view-tree-add" type="button" onClick={onAddView}>
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </ActionContextMenu>
      <SidebarGroupContent className="view-tree-content">
        <SidebarMenu className="view-tree-list">
          {views.length === 0 ? (
            <SidebarMenuItem>
              <button className="view-tree-empty" type="button" onClick={onAddView}>
                <span>No Views yet</span>
                <small>Add an A3 or A4 canvas.</small>
              </button>
            </SidebarMenuItem>
          ) : (
            views.map(({ view, label, meta }) => (
              <SidebarMenuItem key={view.id}>
                <ActionContextMenu
                  actions={[
                    { label: 'Rename View', onSelect: () => onRenameView(view.id) },
                    { label: 'Delete View', onSelect: () => onDeleteView(view.id) },
                  ]}
                >
                  <SidebarMenuButton
                    className="view-tree-item"
                    isActive={isSelected(selection, 'view', view.id)}
                    onClick={() => onSelectObject('view', view.id)}
                  >
                    <PanelsTopLeft aria-hidden="true" className="h-4 w-4 text-studio-muted" />
                    <span className="view-tree-item-copy">
                      <span>{label}</span>
                      <small>{meta}</small>
                    </span>
                  </SidebarMenuButton>
                </ActionContextMenu>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
