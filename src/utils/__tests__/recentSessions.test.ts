import { pushSession, listSessions, removeSession, clearSessions, RecentSession } from '../recentSessions';

beforeEach(() => {
  localStorage.clear();
});

const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString();
const isoNow = () => new Date().toISOString();

const mkSession = (overrides: Partial<RecentSession> = {}): RecentSession => ({
  code: '000000',
  fileNames: ['a.pdf'],
  totalSize: 1024,
  expiresAt: isoIn(60_000),
  createdAt: isoNow(),
  ...overrides,
});

describe('recentSessions', () => {
  it('returns empty array when nothing stored', () => {
    expect(listSessions()).toEqual([]);
  });

  it('pushes and lists a session', () => {
    const s = mkSession();
    pushSession(s);
    expect(listSessions()).toEqual([s]);
  });

  it('keeps newest at the front (LRU)', () => {
    const a = mkSession({ code: '000001' });
    const b = mkSession({ code: '000002' });
    pushSession(a);
    pushSession(b);
    const list = listSessions();
    expect(list[0].code).toBe('000002');
    expect(list[1].code).toBe('000001');
  });

  it('caps at 10 entries', () => {
    for (let i = 0; i < 12; i++) {
      pushSession(mkSession({ code: String(i).padStart(6, '0') }));
    }
    expect(listSessions()).toHaveLength(10);
    expect(listSessions()[0].code).toBe('000011');
  });

  it('filters out expired entries on list', () => {
    pushSession(mkSession({ code: '999999', expiresAt: isoIn(-1000) }));
    expect(listSessions()).toEqual([]);
  });

  it('replaces an existing entry with the same code', () => {
    pushSession(mkSession({ code: '777777', totalSize: 100 }));
    pushSession(mkSession({ code: '777777', totalSize: 500 }));
    const list = listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].totalSize).toBe(500);
  });

  it('recovers from corrupt JSON', () => {
    localStorage.setItem('recentSessions', '<<not json>>');
    expect(listSessions()).toEqual([]);
  });

  it('recovers from non-array JSON', () => {
    localStorage.setItem('recentSessions', '{"foo": "bar"}');
    expect(listSessions()).toEqual([]);
  });

  it('clearSessions removes the key', () => {
    pushSession(mkSession());
    clearSessions();
    expect(listSessions()).toEqual([]);
  });

  test('removeSession removes only the matching code', () => {
    clearSessions();
    const base = { fileNames: ['a'], totalSize: 1, expiresAt: new Date(Date.now() + 3600_000).toISOString(), createdAt: new Date().toISOString() };
    pushSession({ ...base, code: '111111' });
    pushSession({ ...base, code: '222222' });
    removeSession('111111');
    expect(listSessions().map((s) => s.code)).toEqual(['222222']);
  });
});
