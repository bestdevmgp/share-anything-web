import { useReducer } from 'react';
import { RecentSession } from '../../utils/recentSessions';

export type Mode = 'upload' | 'download';
export type BoxState =
  | 'idleUpload'
  | 'idleDownload'
  | 'downloadActive'
  | 'uploading'
  | 'success'
  | 'p2pCreating'
  | 'p2pWaiting'
  | 'p2pConnected'
  | 'p2pTransferring'
  | 'p2pCompleted';

export interface State {
  mode: Mode;
  state: BoxState;
  files: File[];
  lastResult: RecentSession | null;
  uploadFailures: string[];
  p2pShareCode: string | null;
  p2pExpiresAt: string | null;
  downloadCode: string | null;
}

export type Action =
  | { type: 'dropNormal'; files: File[] }
  | { type: 'dropSecure'; files: File[] }
  | { type: 'cancelUpload' }
  | { type: 'completeAll'; result: RecentSession }
  | { type: 'completePartial'; result: RecentSession; failedNames: string[] }
  | { type: 'failAll' }
  | { type: 'close' }
  | { type: 'switchMode'; mode: Mode }
  | { type: 'p2pSessionCreated'; shareCode: string; expiresAt: string }
  | { type: 'p2pStatusChange'; status: 'waiting' | 'connected' | 'transferring' | 'waiting_for_next' | 'completed' }
  | { type: 'p2pFailed' }
  | { type: 'p2pCancel' }
  | { type: 'p2pNewTransfer' }
  | { type: 'p2pRemoveFile'; fileName: string }
  | { type: 'enterDownload'; code: string }
  | { type: 'closeDownload' };

export const initialState: State = {
  mode: 'upload',
  state: 'idleUpload',
  files: [],
  lastResult: null,
  uploadFailures: [],
  p2pShareCode: null,
  p2pExpiresAt: null,
  downloadCode: null,
};

const isUploadActive = (s: BoxState): boolean =>
  s === 'uploading' ||
  s === 'p2pCreating' ||
  s === 'p2pWaiting' ||
  s === 'p2pConnected' ||
  s === 'p2pTransferring';

export const reducer = (s: State, a: Action): State => {
  switch (a.type) {
    case 'dropNormal':
      if (s.mode !== 'upload') return s;
      return {
        ...s,
        state: 'uploading',
        files: a.files,
        lastResult: null,
        uploadFailures: [],
      };
    case 'dropSecure':
      if (s.mode !== 'upload') return s;
      return {
        ...s,
        state: 'p2pCreating',
        files: a.files,
        lastResult: null,
        uploadFailures: [],
        p2pShareCode: null,
        p2pExpiresAt: null,
      };
    case 'cancelUpload':
      return { ...s, state: 'idleUpload', files: [] };
    case 'completeAll':
      return { ...s, state: 'success', lastResult: a.result, uploadFailures: [] };
    case 'completePartial':
      return { ...s, state: 'success', lastResult: a.result, uploadFailures: a.failedNames };
    case 'failAll':
      return { ...s, state: 'idleUpload', files: [], uploadFailures: [] };
    case 'close':
      return { ...s, state: 'idleUpload', files: [] };
    case 'switchMode':
      if (isUploadActive(s.state)) return s;
      if (a.mode === 'download') {
        return { ...s, mode: 'download', state: 'idleDownload', downloadCode: null };
      }
      return {
        ...s,
        mode: 'upload',
        state: s.lastResult ? 'success' : 'idleUpload',
        downloadCode: null,
      };
    case 'enterDownload':
      if (s.mode !== 'download') return s;
      return { ...s, state: 'downloadActive', downloadCode: a.code };
    case 'closeDownload':
      return { ...s, state: 'idleDownload', downloadCode: null };
    case 'p2pRemoveFile':
      return { ...s, files: s.files.filter((f) => f.name !== a.fileName) };
    case 'p2pSessionCreated':
      if (s.state !== 'p2pCreating') return s;
      return {
        ...s,
        state: 'p2pWaiting',
        p2pShareCode: a.shareCode,
        p2pExpiresAt: a.expiresAt,
      };
    case 'p2pStatusChange':
      if (a.status === 'completed') {
        return { ...s, state: 'p2pCompleted' };
      }
      if (a.status === 'transferring') {
        if (
          s.state === 'p2pWaiting' ||
          s.state === 'p2pConnected' ||
          s.state === 'p2pTransferring'
        ) {
          return { ...s, state: 'p2pTransferring' };
        }
        return s;
      }
      if (a.status === 'connected') {
        if (s.state === 'p2pWaiting' || s.state === 'p2pConnected') {
          return { ...s, state: 'p2pConnected' };
        }
        return s;
      }
      if (a.status === 'waiting') {
        if (s.state === 'p2pConnected' || s.state === 'p2pTransferring') {
          return { ...s, state: 'p2pWaiting' };
        }
        return s;
      }
      return s;
    case 'p2pFailed':
      return {
        ...s,
        state: 'idleUpload',
        files: [],
        p2pShareCode: null,
        p2pExpiresAt: null,
      };
    case 'p2pCancel':
      return {
        ...s,
        state: 'idleUpload',
        files: [],
        p2pShareCode: null,
        p2pExpiresAt: null,
      };
    case 'p2pNewTransfer':
      return {
        ...s,
        state: 'idleUpload',
        files: [],
        p2pShareCode: null,
        p2pExpiresAt: null,
      };
  }
};

export const useUnifiedFileBoxState = () => useReducer(reducer, initialState);
