import { TestBed } from '@angular/core/testing';
import { ApplicationRoles } from './application-roles';
import { AuthSessionService } from './auth-session.service';
import { createTestAccessToken, createTestSession } from './test-jwt.util';

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
    const session = createTestSession(ApplicationRoles.RestaurantManager);
    service.saveSession(session);

    expect(sessionStorageMock.getItem(STORAGE_KEY)).toContain('accessToken');
    expect(localStorageSetItemSpy).not.toHaveBeenCalled();
  });

  it('reads a valid session with role from jwt', () => {
    const session = createTestSession(ApplicationRoles.KitchenManager);
    sessionStorageMock.setItem(STORAGE_KEY, JSON.stringify(session));

    expect(service.readSession()?.role).toBe(ApplicationRoles.KitchenManager);
  });

  it('clears session', () => {
    sessionStorageMock.setItem(STORAGE_KEY, '{"accessToken":"x"}');
    service.clearSession();
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects expired session', () => {
    const expired = {
      ...createTestSession(ApplicationRoles.RestaurantOwner),
      expiresAtUtc: new Date(Date.now() - 1_000).toISOString(),
    };
    sessionStorageMock.setItem(STORAGE_KEY, JSON.stringify(expired));

    expect(service.hasValidSession()).toBe(false);
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears corrupted payload', () => {
    sessionStorageMock.setItem(STORAGE_KEY, '{not-json');
    expect(service.readSession()).toBeNull();
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears malformed jwt without throwing', () => {
    sessionStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: 'invalid-token',
        expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
        userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        restaurantId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        role: ApplicationRoles.RestaurantOwner,
      }),
    );

    expect(service.readSession()).toBeNull();
    expect(sessionStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it('rejects restaurant role without restaurant id in token', () => {
    const token = createTestAccessToken({
      role: ApplicationRoles.RestaurantOwner,
      restaurantId: null,
    });

    sessionStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: token,
        expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
        userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        restaurantId: null,
        role: ApplicationRoles.RestaurantOwner,
      }),
    );

    expect(service.readSession()).toBeNull();
  });

  it('does not use localStorage', () => {
    service.saveSession(createTestSession(ApplicationRoles.RestaurantOwner));
    expect(localStorageSetItemSpy).not.toHaveBeenCalled();
  });
});
