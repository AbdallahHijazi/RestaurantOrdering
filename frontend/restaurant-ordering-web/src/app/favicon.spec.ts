// @ts-nocheck
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Application favicon', () => {
  it('links the local restaurant favicon asset from index.html', () => {
    const indexHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
    expect(indexHtml).toContain('restaurant-favicon.svg');
    expect(indexHtml).toContain('type="image/svg+xml"');
  });

  it('ships the local restaurant favicon asset', () => {
    const favicon = readFileSync(resolve(__dirname, '../../public/restaurant-favicon.svg'), 'utf8');
    expect(favicon).toContain('<svg');
  });
});
