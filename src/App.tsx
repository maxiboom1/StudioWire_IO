import { ProjectProvider } from './state/ProjectContext';
import { StudioWireShell } from './components/layout/StudioWireShell';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';

function App() {
  return (
    <AppErrorBoundary>
      <ProjectProvider>
        <StudioWireShell />
      </ProjectProvider>
    </AppErrorBoundary>
  );
}

export default App;
