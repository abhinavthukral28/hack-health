import { AppProvider } from './state/AppContext';
import { EmrShell } from './components/EmrShell';

export default function App() {
  return (
    <AppProvider>
      <EmrShell />
    </AppProvider>
  );
}
