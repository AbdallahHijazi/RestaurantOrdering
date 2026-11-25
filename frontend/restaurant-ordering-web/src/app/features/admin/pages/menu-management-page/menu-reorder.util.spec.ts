import { describe, expect, it, vi } from 'vitest';
import {
  ReorderDragSession,
  moveId,
  sameIds,
  slotIndexAt,
  snapshotSlots,
  type SlotRect,
} from './menu-reorder.util';

function rect(element: Element, left: number, top: number, width: number, height: number): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }),
  });
}

function pointer(type: string, x: number, y: number, pointerId = 1): Event {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: x },
    clientY: { value: y },
  });
  return event;
}

describe('menu reorder helpers', () => {
  it('moveId re-inserts without mutating its input', () => {
    const ids = ['a', 'b', 'c'];
    expect(moveId(ids, 'c', 1)).toEqual(['a', 'c', 'b']);
    expect(moveId(ids, 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(moveId(ids, 'b', 99)).toEqual(['a', 'c', 'b']);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('sameIds compares order, not membership', () => {
    expect(sameIds(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameIds(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameIds(['a'], ['a', 'b'])).toBe(false);
  });

  it('slotIndexAt reports -1 in gutters and outside every slot', () => {
    const slots: SlotRect[] = [
      { id: 'a', x: 0, y: 0, w: 90, h: 90 },
      { id: 'b', x: 100, y: 0, w: 90, h: 90 },
    ];
    expect(slotIndexAt(slots, 45, 45)).toBe(0);
    expect(slotIndexAt(slots, 145, 45)).toBe(1);
    expect(slotIndexAt(slots, 95, 45)).toBe(-1);
    expect(slotIndexAt(slots, 500, 500)).toBe(-1);
  });

  it('snapshotSlots is relative to the container, so scrolling does not change it', () => {
    const container = document.createElement('div');
    const card = document.createElement('div');
    card.dataset['id'] = 'a';
    rect(container, 50, 200, 500, 500);
    rect(card, 70, 230, 90, 90);
    expect(snapshotSlots(container, [card], 'id')).toEqual([{ id: 'a', x: 20, y: 30, w: 90, h: 90 }]);
  });
});

describe('ReorderDragSession', () => {
  function setup() {
    const container = document.createElement('div');
    rect(container, 0, 0, 1000, 100);
    const elements = ['a', 'b', 'c'].map((id, index) => {
      const element = document.createElement('div');
      element.dataset['id'] = id;
      rect(element, index * 100, 0, 90, 90);
      container.appendChild(element);
      return element;
    });
    const calls = {
      preview: vi.fn<(order: string[]) => void>(),
      drop: vi.fn<(order: string[], changed: boolean) => void>(),
      cancel: vi.fn(),
    };
    const session = ReorderDragSession.begin({
      sourceId: 'c',
      pointerId: 1,
      container,
      elements,
      dataKey: 'id',
      startIds: ['a', 'b', 'c'],
      onPreview: calls.preview,
      onDrop: calls.drop,
      onCancel: calls.cancel,
    })!;
    return { session, calls };
  }

  it('previews once per slot change and never oscillates while hovering one slot', () => {
    const { calls } = setup();
    // Drag #3 over #2, then jitter inside it and across the gutter: exactly one preview.
    for (const x of [250, 150, 148, 152, 196, 150, 146, 195, 150]) {
      document.dispatchEvent(pointer('pointermove', x, 45));
    }
    expect(calls.preview).toHaveBeenCalledTimes(1);
    expect(calls.preview).toHaveBeenCalledWith(['a', 'c', 'b']);
    expect(calls.drop).not.toHaveBeenCalled();
  });

  it('commits once on pointerup and ignores later events', () => {
    const { calls } = setup();
    document.dispatchEvent(pointer('pointermove', 150, 45));
    document.dispatchEvent(pointer('pointerup', 150, 45));
    document.dispatchEvent(pointer('pointerup', 150, 45));
    document.dispatchEvent(pointer('pointermove', 50, 45));
    expect(calls.drop).toHaveBeenCalledTimes(1);
    expect(calls.drop).toHaveBeenCalledWith(['a', 'c', 'b'], true);
    expect(calls.preview).toHaveBeenCalledTimes(1);
  });

  it('reports an unchanged drop when the card ends where it started', () => {
    const { calls } = setup();
    document.dispatchEvent(pointer('pointermove', 150, 45));
    document.dispatchEvent(pointer('pointermove', 250, 45));
    document.dispatchEvent(pointer('pointerup', 250, 45));
    expect(calls.drop).toHaveBeenCalledWith(['a', 'b', 'c'], false);
  });

  it('cancels on Escape or pointercancel and ignores other pointers', () => {
    const first = setup();
    document.dispatchEvent(pointer('pointermove', 150, 45, 2));
    expect(first.calls.preview).not.toHaveBeenCalled();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(first.calls.cancel).toHaveBeenCalledTimes(1);
    expect(first.calls.drop).not.toHaveBeenCalled();

    const second = setup();
    document.dispatchEvent(pointer('pointercancel', 0, 0));
    expect(second.calls.cancel).toHaveBeenCalledTimes(1);
  });

  it('dispose detaches silently', () => {
    const { session, calls } = setup();
    session.dispose();
    document.dispatchEvent(pointer('pointermove', 150, 45));
    document.dispatchEvent(pointer('pointerup', 150, 45));
    expect(calls.preview).not.toHaveBeenCalled();
    expect(calls.drop).not.toHaveBeenCalled();
  });
});
