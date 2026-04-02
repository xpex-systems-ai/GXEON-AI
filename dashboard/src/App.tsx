import { Dashboard } from './pages';
import ErrorBoundary from './components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
