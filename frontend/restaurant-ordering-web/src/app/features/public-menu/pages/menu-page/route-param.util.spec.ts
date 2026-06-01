import type { ActivatedRoute } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { readRouteParam } from './route-param.util';

function createRoute(slug: string | null): ActivatedRoute {
  const childSnapshot = { paramMap: convertToParamMap({}) };
  const parentSnapshot = { paramMap: convertToParamMap(slug ? { slug } : {}) };

  return {
    snapshot: childSnapshot,
    pathFromRoot: [
      { snapshot: { paramMap: convertToParamMap({}) } },
      { snapshot: parentSnapshot },
      { snapshot: childSnapshot },
    ],
  } as ActivatedRoute;
}

describe('readRouteParam', () => {
  it('reads param from parent snapshot when missing from child', () => {
    const route = createRoute('demo');
    expect(readRouteParam(route, 'slug')).toBe('demo');
  });

  it('returns empty string when missing from route tree', () => {
    const route = createRoute(null);
    expect(readRouteParam(route, 'slug')).toBe('');
  });
});

