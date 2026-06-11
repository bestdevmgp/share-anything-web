import { groupUploads, mergeShares, MergedShare } from '../shareMerge';
import { UploadHistoryItem } from '../../types';
import { RecentSession } from '../recentSessions';

const item = (over: Partial<UploadHistoryItem>): UploadHistoryItem => ({
  id: 'i', share_code: '000000', file_name: 'f', file_size: 10, file_type: '',
  has_password: false, expires_at: '2026-01-02T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
  download_url: '', qr_code: '', download_count: 0, ...over,
});

test('groupUploads groups by share_code with summed size', () => {
  const groups = groupUploads([
    item({ id: 'a', share_code: 'AAA111', file_size: 5 }),
    item({ id: 'b', share_code: 'AAA111', file_size: 7 }),
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].totalSize).toBe(12);
});

test('mergeShares dedups by code (server wins) and sorts newest first', () => {
  const local: RecentSession[] = [
    { code: 'AAA111', fileNames: ['x'], totalSize: 1, expiresAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'LOCAL1', fileNames: ['y'], totalSize: 2, expiresAt: '2026-01-05T00:00:00Z', createdAt: '2026-01-04T00:00:00Z' },
  ];
  const serverGroups = groupUploads([ item({ share_code: 'AAA111', created_at: '2026-01-01T00:00:00Z' }) ]);
  const merged: MergedShare[] = mergeShares(local, serverGroups);
  expect(merged.map((m) => m.code)).toEqual(['LOCAL1', 'AAA111']);
  expect(merged.find((m) => m.code === 'AAA111')!.source).toBe('both');
  expect(merged.find((m) => m.code === 'LOCAL1')!.source).toBe('local');
});

test('localOnlyGroups skips codes already on server', () => {
  const { localOnlyGroups } = require('../shareMerge');
  const local: RecentSession[] = [
    { code: 'AAA111', fileNames: ['x'], totalSize: 1, expiresAt: '2026-01-02T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
    { code: 'LOCAL1', fileNames: ['y', 'z'], totalSize: 4, expiresAt: '2026-01-05T00:00:00Z', createdAt: '2026-01-04T00:00:00Z' },
  ];
  const groups = localOnlyGroups(local, new Set(['AAA111']));
  expect(groups.map((g: any) => g.shareCode)).toEqual(['LOCAL1']);
  expect(groups[0].files).toHaveLength(2);
  expect(groups[0].totalSize).toBe(4);
});
