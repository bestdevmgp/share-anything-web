import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from 'context/ThemeContext';

export const Toaster = () => {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="top-center"
      expand={false}
      visibleToasts={3}
      toastOptions={{
        className:
          'bg-card text-foreground rounded-3xl border-border',
        style: {
          boxShadow:
            '0 4px 20px -2px rgba(0, 0, 0, 0.12), 0 2px 8px -2px rgba(0, 0, 0, 0.08)',
        },
      }}
    />
  );
};
