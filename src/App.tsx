import { ProjectProvider } from './state/ProjectContext';
import { CanvasInteractionProvider } from './state/CanvasInteractionContext';
import { StudioWireShell } from './components/layout/StudioWireShell';

function App() {
  return (
    <ProjectProvider>
      <CanvasInteractionProvider>
        <StudioWireShell />
      </CanvasInteractionProvider>
    </ProjectProvider>
  );
}

export default App;
