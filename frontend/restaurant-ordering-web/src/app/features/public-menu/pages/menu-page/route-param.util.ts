import type { ActivatedRoute } from '@angular/router';

export function readRouteParam(route: ActivatedRoute, key: string): string {
  for (let idx = route.pathFromRoot.length - 1; idx >= 0; idx -= 1) {
    const param = route.pathFromRoot[idx]?.snapshot?.paramMap?.get(key);
    if (param) {
      return param;
    }
  }

  return '';
}

