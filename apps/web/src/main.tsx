import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router';
import { initTheme, useThemeStore } from '@/stores/theme';
import { TooltipProvider } from '@/components/ui/Tooltip';
import './styles/index.css';

initTheme();

function Root() {
  const theme = useThemeStore((s) => s.theme);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
