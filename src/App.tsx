import { ProjectProvider } from './state/ProjectContext';
import { StudioWireShell } from './components/layout/StudioWireShell';

function App() {
  return (
    <ProjectProvider>
      <StudioWireShell />
    </ProjectProvider>
  );
}

export default App;
