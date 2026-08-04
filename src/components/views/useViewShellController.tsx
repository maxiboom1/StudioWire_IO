import { useState } from 'react';
import { buildDeleteViewConfirmation } from '../../domain/prompts';
import { useProject } from '../../state/ProjectContext';
import { useConfirmation } from '../common/ConfirmationDialog';
import { ViewModal } from './ViewModal';

type ViewModalState = null | { mode: 'add' | 'rename'; viewId?: string };

export function useViewShellController({
  onSelectView,
  runWithUnsavedGuard,
}: {
  onSelectView: (viewId: string) => void;
  runWithUnsavedGuard: (action: () => void) => Promise<void>;
}) {
  const { project, deleteView } = useProject();
  const confirm = useConfirmation();
  const [modal, setModal] = useState<ViewModalState>(null);

  function openAddView() {
    void runWithUnsavedGuard(() => setModal({ mode: 'add' }));
  }

  function openRenameView(viewId: string) {
    void runWithUnsavedGuard(() => setModal({ mode: 'rename', viewId }));
  }

  function requestDeleteView(viewId: string) {
    const view = project.views.find((candidate) => candidate.id === viewId);
    if (!view) {
      return;
    }

    void runWithUnsavedGuard(() => {
      void confirm(buildDeleteViewConfirmation(view)).then((confirmed) => {
        if (confirmed) {
          deleteView(view.id);
        }
      });
    });
  }

  const modalElement = modal ? (
    <ViewModal
      mode={modal.mode}
      view={modal.mode === 'rename' ? project.views.find((view) => view.id === modal.viewId) : undefined}
      onClose={() => setModal(null)}
      onSubmitted={(id) => {
        setModal(null);
        onSelectView(id);
      }}
    />
  ) : null;

  return { openAddView, openRenameView, requestDeleteView, modalElement };
}
