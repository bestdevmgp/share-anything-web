import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from '../AuthContext';
import { ToastProvider, toast } from '../ToastContext';
import ToastContainer from '../../components/Toast';

jest.mock('../../services/api', () => ({
  authAPI: {
    getCurrentUser: () => ({ id: 'u1', email: 'test@example.com' }),
    getMe: () => Promise.resolve(undefined),
    logout: jest.fn(),
  },
}));

jest.mock('../../i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'ko' }),
}));

const renderApp = () =>
  render(
    <ToastProvider>
      <AuthProvider>
        <ToastContainer />
      </AuthProvider>
    </ToastProvider>
  );

const dispatchForcedLogout = (reason?: string) => {
  act(() => {
    window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }));
  });
};

test('a forced logout with an unrelated reason still lets error toasts through', async () => {
  renderApp();
  await act(async () => {});

  dispatchForcedLogout('other');
  act(() => {
    toast.error('boom-control');
  });

  expect(screen.getByText('boom-control')).toBeInTheDocument();
});

test('an expired-session forced logout suppresses the trailing fetch error toast', async () => {
  renderApp();
  await act(async () => {});

  dispatchForcedLogout('expired');
  act(() => {
    toast.error('boom-expired');
  });

  expect(screen.queryByText('boom-expired')).not.toBeInTheDocument();
});
