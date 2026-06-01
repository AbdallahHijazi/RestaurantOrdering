import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session.service';

const STORAGE_KEY = 'restaurant-ordering.auth.session';

function createSessionStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let sessionStorageMock: Storage;
  let localStorageSetItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorageMock = createSessionStorageMock();
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    localStorageSetItemSpy = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => undefined);

    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('saves session in sessionStorage', () => {
    service.saveSession({
      accessToken: 'token-1',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      restaurantId: '11111111-1111-1111-1111-111111111111',
    });

    expect(sessionStorageMock.getItem(STORAGE_KEY)).toContain('token-1');
    expect(localStorageSetItemSpy).not.toHaveBeenCalled();
  });

  it('reads a valid session', () => {
    const expiresAtUtc = new Date(Date.now() + 60_000).toISOString();
    sessionStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: 'token-2',
        expiresAtUtc,
        restaurantId: null,
      }),
    );

    expect(service.readSession()).toEqual({
      accessToken: 'token-2',
      expiresAtUtc,
      restaurantId: null,
    });
  });

  it('clears session', () => {
    sessionStorageMock.setItem(STORAGE_KEY, '{"accessToken":"x"}');
    service.clearSession();
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects expired session', () => {
    sessionStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: 'token-expired',
        expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
        restaurantId: null,
      }),
    );

    expect(service.hasValidSession()).toBe(false);
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears corrupted payload', () => {
    sessionStorageMock.setItem(STORAGE_KEY, '{not-json');
    expect(service.readSession()).toBeNull();
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not use localStorage', () => {
    service.saveSession({
      accessToken: 'token-4',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      restaurantId: null,
    });

    expect(localStorageSetItemSpy).not.toHaveBeenCalled();
  });
});
