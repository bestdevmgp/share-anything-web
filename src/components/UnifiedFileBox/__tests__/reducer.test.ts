import { reducer, initialState, State } from '../useUnifiedFileBoxState';
import { RecentSession } from '../../../utils/recentSessions';

const mkResult = (overrides: Partial<RecentSession> = {}): RecentSession => ({
  code: '123456',
  fileNames: ['a.pdf'],
  totalSize: 1024,
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

const file = (name: string) => new File([''], name);

describe('UnifiedFileBox reducer', () => {
  it('starts in idleUpload, mode=upload', () => {
    expect(initialState.state).toBe('idleUpload');
    expect(initialState.mode).toBe('upload');
    expect(initialState.files).toEqual([]);
    expect(initialState.lastResult).toBeNull();
    expect(initialState.uploadFailures).toEqual([]);
  });

  it('dropNormal in upload mode → uploading', () => {
    const s = reducer(initialState, { type: 'dropNormal', files: [file('a.pdf')] });
    expect(s.state).toBe('uploading');
    expect(s.files).toHaveLength(1);
    expect(s.lastResult).toBeNull();
    expect(s.uploadFailures).toEqual([]);
  });

  it('dropSecure in upload mode → p2pCreating', () => {
    const s = reducer(initialState, { type: 'dropSecure', files: [file('a.pdf')] });
    expect(s.state).toBe('p2pCreating');
    expect(s.files).toHaveLength(1);
    expect(s.p2pShareCode).toBeNull();
    expect(s.p2pExpiresAt).toBeNull();
  });

  it('dropNormal in download mode is a no-op', () => {
    const before: State = { ...initialState, mode: 'download', state: 'idleDownload' };
    const after = reducer(before, { type: 'dropNormal', files: [file('a.pdf')] });
    expect(after).toEqual(before);
  });

  it('dropSecure in download mode is a no-op', () => {
    const before: State = { ...initialState, mode: 'download', state: 'idleDownload' };
    const after = reducer(before, { type: 'dropSecure', files: [file('a.pdf')] });
    expect(after).toEqual(before);
  });

  it('cancelUpload → idleUpload, clears files', () => {
    const before: State = { ...initialState, state: 'uploading', files: [file('a.pdf')] };
    const after = reducer(before, { type: 'cancelUpload' });
    expect(after.state).toBe('idleUpload');
    expect(after.files).toEqual([]);
  });

  it('completeAll → success with result', () => {
    const before: State = { ...initialState, state: 'uploading', uploadFailures: ['old.pdf'] };
    const result = mkResult();
    const after = reducer(before, { type: 'completeAll', result });
    expect(after.state).toBe('success');
    expect(after.lastResult).toEqual(result);
    expect(after.uploadFailures).toEqual([]);
  });

  it('completePartial → success + failures recorded', () => {
    const before: State = { ...initialState, state: 'uploading' };
    const result = mkResult();
    const after = reducer(before, { type: 'completePartial', result, failedNames: ['x.zip', 'y.bin'] });
    expect(after.state).toBe('success');
    expect(after.lastResult).toEqual(result);
    expect(after.uploadFailures).toEqual(['x.zip', 'y.bin']);
  });

  it('failAll → idleUpload, files cleared', () => {
    const before: State = { ...initialState, state: 'uploading', files: [file('a.pdf')] };
    const after = reducer(before, { type: 'failAll' });
    expect(after.state).toBe('idleUpload');
    expect(after.files).toEqual([]);
  });

  it('close → idleUpload, files cleared (used as confirm from success view)', () => {
    const before: State = { ...initialState, state: 'success', lastResult: mkResult() };
    const after = reducer(before, { type: 'close' });
    expect(after.state).toBe('idleUpload');
    expect(after.files).toEqual([]);
    expect(after.lastResult).toBeNull();
    expect(after.uploadFailures).toEqual([]);
  });

  it('close then switching tabs away and back does not restore the success view', () => {
    const success: State = { ...initialState, state: 'success', lastResult: mkResult() };
    const closed = reducer(success, { type: 'close' });
    const toDownload = reducer(closed, { type: 'switchMode', mode: 'download' });
    const backToUpload = reducer(toDownload, { type: 'switchMode', mode: 'upload' });
    expect(backToUpload.state).toBe('idleUpload');
  });

  it('dropNormal in success state → uploading (replaces)', () => {
    const before: State = { ...initialState, state: 'success', lastResult: mkResult() };
    const after = reducer(before, { type: 'dropNormal', files: [file('b.txt')] });
    expect(after.state).toBe('uploading');
    expect(after.files).toHaveLength(1);
    expect(after.lastResult).toBeNull();
  });

  it('dropSecure in success state → p2pCreating (replaces)', () => {
    const before: State = { ...initialState, state: 'success', lastResult: mkResult() };
    const after = reducer(before, { type: 'dropSecure', files: [file('b.txt')] });
    expect(after.state).toBe('p2pCreating');
    expect(after.files).toHaveLength(1);
    expect(after.lastResult).toBeNull();
  });

  it('switchMode is ignored while uploading', () => {
    const before: State = { ...initialState, state: 'uploading' };
    const after = reducer(before, { type: 'switchMode', mode: 'download' });
    expect(after).toEqual(before);
  });

  it('switchMode is ignored while p2p active', () => {
    const before: State = { ...initialState, state: 'p2pWaiting' };
    const after = reducer(before, { type: 'switchMode', mode: 'download' });
    expect(after).toEqual(before);
  });

  it('switchMode to download → idleDownload', () => {
    const after = reducer(initialState, { type: 'switchMode', mode: 'download' });
    expect(after.mode).toBe('download');
    expect(after.state).toBe('idleDownload');
  });

  it('switchMode download → upload restores to success when there was a lastResult', () => {
    const before: State = { ...initialState, mode: 'download', state: 'idleDownload', lastResult: mkResult() };
    const after = reducer(before, { type: 'switchMode', mode: 'upload' });
    expect(after.mode).toBe('upload');
    expect(after.state).toBe('success');
  });

  it('switchMode download → upload restores to idleUpload when no lastResult', () => {
    const before: State = { ...initialState, mode: 'download', state: 'idleDownload' };
    const after = reducer(before, { type: 'switchMode', mode: 'upload' });
    expect(after.mode).toBe('upload');
    expect(after.state).toBe('idleUpload');
  });

  it('p2pSessionCreated p2pCreating → p2pWaiting', () => {
    const before: State = { ...initialState, state: 'p2pCreating' };
    const after = reducer(before, { type: 'p2pSessionCreated', shareCode: '111222', expiresAt: 'iso' });
    expect(after.state).toBe('p2pWaiting');
    expect(after.p2pShareCode).toBe('111222');
  });

  it('p2pStatusChange completed → p2pCompleted', () => {
    const before: State = { ...initialState, state: 'p2pTransferring' };
    const after = reducer(before, { type: 'p2pStatusChange', status: 'completed' });
    expect(after.state).toBe('p2pCompleted');
  });

  it('p2pStatusChange connected p2pWaiting → p2pConnected', () => {
    const before: State = { ...initialState, state: 'p2pWaiting' };
    const after = reducer(before, { type: 'p2pStatusChange', status: 'connected' });
    expect(after.state).toBe('p2pConnected');
  });

  it('p2pStatusChange transferring p2pConnected → p2pTransferring', () => {
    const before: State = { ...initialState, state: 'p2pConnected' };
    const after = reducer(before, { type: 'p2pStatusChange', status: 'transferring' });
    expect(after.state).toBe('p2pTransferring');
  });

  it('p2pStatusChange connected does not regress from p2pTransferring', () => {
    const before: State = { ...initialState, state: 'p2pTransferring' };
    const after = reducer(before, { type: 'p2pStatusChange', status: 'connected' });
    expect(after.state).toBe('p2pTransferring');
  });

  it('p2pNewTransfer → idleUpload', () => {
    const before: State = { ...initialState, state: 'p2pCompleted', p2pShareCode: 'xxx' };
    const after = reducer(before, { type: 'p2pNewTransfer' });
    expect(after.state).toBe('idleUpload');
    expect(after.p2pShareCode).toBeNull();
  });
});
