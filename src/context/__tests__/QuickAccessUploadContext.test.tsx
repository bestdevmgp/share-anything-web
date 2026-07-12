import { render, screen, act } from '@testing-library/react';
import {
  QuickAccessUploadProvider,
  useQuickAccessUpload,
} from '../QuickAccessUploadContext';

jest.mock('../../services/api', () => ({
  quickAccessAPI: { initUpload: jest.fn() },
  fileAPI: {},
  workerAPI: {},
}));

jest.mock('../ToastContext', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    action: jest.fn(),
  },
}));

jest.mock('../../i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'ko' }),
}));

jest.mock('../../utils/format', () => ({
  getDeviceInfo: () => ({}),
  getImageDimensions: () => Promise.resolve(null),
  formatTimeRemaining: () => '',
}));

const { quickAccessAPI } = jest.requireMock('../../services/api');

let ctx: ReturnType<typeof useQuickAccessUpload>;
const Consumer = () => {
  ctx = useQuickAccessUpload();
  return (
    <div>
      {ctx.uploadingFiles.map((f) => (
        <span key={f.id} data-testid="uploading-name">
          {f.fileName}
        </span>
      ))}
    </div>
  );
};

const renderProvider = () =>
  render(
    <QuickAccessUploadProvider>
      <Consumer />
    </QuickAccessUploadProvider>
  );

const makeFile = (name: string) => new File(['x'], name, { type: 'text/plain' });

const uploadingNames = () =>
  screen.queryAllByTestId('uploading-name').map((el) => el.textContent);

afterEach(() => {
  jest.clearAllMocks();
});

test('files added mid-flight appear above the already in-progress files', async () => {
  quickAccessAPI.initUpload.mockReturnValue(new Promise(() => {}));
  renderProvider();

  await act(async () => {
    ctx.handleUpload([makeFile('first.txt')]);
  });
  await act(async () => {
    ctx.handleUpload([makeFile('second.txt')]);
  });

  expect(uploadingNames()).toEqual(['second.txt', 'first.txt']);
});

test('a failing upload batch does not clear a concurrent in-flight batch', async () => {
  let rejectFirst: (reason?: unknown) => void = () => {};
  const firstInit = new Promise((_, reject) => {
    rejectFirst = reject;
  });
  quickAccessAPI.initUpload
    .mockReturnValueOnce(firstInit)
    .mockReturnValueOnce(new Promise(() => {}));
  renderProvider();

  await act(async () => {
    ctx.handleUpload([makeFile('first.txt')]);
  });
  await act(async () => {
    ctx.handleUpload([makeFile('second.txt')]);
  });

  await act(async () => {
    rejectFirst(new Error('boom'));
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(uploadingNames()).toEqual(['second.txt']);
});
