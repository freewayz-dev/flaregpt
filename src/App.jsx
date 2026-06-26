import { ErrorBoundary } from "react-error-boundary";

import BlueLightOverlay from "./components/common/BlueLightOverlay";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <>
      <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
        <BlueLightOverlay />
        <AppRoutes />
      </ErrorBoundary>
    </>
  );
}

export default App;

function GlobalErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-6 text-center max-w-md mx-auto my-20 border border-red-500/20 bg-red-500/5 rounded-2xl">
      <h2 className="text-sm font-bold text-red-500">Something went wrong</h2>
      <p className="text-xs text-slate-400 dark:text-zinc-500 font-mono mt-1">
        {error.message}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold"
      >
        Reload Application Component Context
      </button>
    </div>
  );
}
