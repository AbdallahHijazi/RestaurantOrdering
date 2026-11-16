/**
 * Pure helpers for the drag-to-reorder interaction on the menu management page.
 *
 * Why this exists: the previous implementation re-ordered the live list on every pointer move and
 * hit-tested with `elementFromPoint`. Each swap moved the card that was under the pointer, so the next
 * move hit the *other* card and swapped back (oscillation). The helpers below remove that feedback
 * loop: hit-testing runs against a geometry snapshot taken once when the drag starts, so the answer
 * for "which slot is the pointer over" never depends on how cards were displaced meanwhile.
 */

export interface SlotRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Slot rectangles relative to the container (invariant under scrolling of the page). */
export function snapshotSlots(
  container: HTMLElement,
  elements: Iterable<HTMLElement>,
  dataKey: string,
): SlotRect[] {
  const origin = container.getBoundingClientRect();
  const slots: SlotRect[] = [];
  for (const element of elements) {
    const id = element.dataset[dataKey];
    if (!id) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    slots.push({ id, x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height });
  }
  return slots;
}

/** Index of the slot containing the point, or -1 while the pointer is in a gutter / outside. */
export function slotIndexAt(slots: readonly SlotRect[], x: number, y: number): number {
  return slots.findIndex(
    (slot) => x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h,
  );
}

/** `ids` with `id` removed and re-inserted at `toIndex` (clamped). Pure: never mutates the input. */
export function moveId(ids: readonly string[], id: string, toIndex: number): string[] {
  const without = ids.filter((entry) => entry !== id);
  const index = Math.max(0, Math.min(toIndex, without.length));
  without.splice(index, 0, id);
  return without;
}

export function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

/** Reads a duration custom property (e.g. `--restaurant-motion-normal: 240ms`) in milliseconds. */
export function motionTokenMs(name: string, fallback: number): number {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value)) {
    return fallback;
  }
  return raw.endsWith('ms') ? value : raw.endsWith('s') ? value * 1000 : fallback;
}

export function motionTokenString(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const FLIP_ANIMATION_ID = 'menu-reorder-flip';

/**
 * Records where every element *visually* is right now (including any in-flight FLIP transform, so an
 * interrupted animation continues from where it is instead of jumping), then cancels those animations.
 */
export function captureRects(elements: Iterable<HTMLElement>, dataKey: string): Map<string, DOMRect> {
  const list = Array.from(elements);
  const rects = new Map<string, DOMRect>();
  for (const element of list) {
    const id = element.dataset[dataKey];
    if (id) {
      rects.set(id, element.getBoundingClientRect());
    }
  }
  for (const element of list) {
    cancelFlip(element);
  }
  return rects;
}

function cancelFlip(element: HTMLElement): void {
  if (typeof element.getAnimations !== 'function') {
    return;
  }
  element
    .getAnimations()
    .filter((animation) => animation.id === FLIP_ANIMATION_ID)
    .forEach((animation) => animation.cancel());
}

/**
 * FLIP: after the DOM/layout changed, slide each element from its previous visual position to its new
 * one using transform only (compositor friendly). Skipped entirely under `prefers-reduced-motion`.
 */
export function playFlip(
  elements: Iterable<HTMLElement>,
  dataKey: string,
  previous: Map<string, DOMRect>,
  options: { duration: number; easing: string },
): void {
  if (
    typeof window === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  for (const element of elements) {
    const id = element.dataset[dataKey];
    const before = id ? previous.get(id) : undefined;
    if (!before || typeof element.animate !== 'function') {
      continue;
    }
    const after = element.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      continue;
    }
    element.animate(
      [{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
      // `backwards` (not `both`): nothing lingers after the slide, so no stale transform or stacking context.
      { id: FLIP_ANIMATION_ID, duration: options.duration, easing: options.easing, fill: 'backwards' },
    );
  }
}

/** Nearest ancestor that actually scrolls vertically, falling back to the document scroller. */
export function findScrollParent(element: HTMLElement | null): HTMLElement {
  let node = element?.parentElement ?? null;
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

export interface ReorderDragConfig {
  sourceId: string;
  pointerId: number;
  /** Element the slot geometry is measured against (the grid / chip strip). */
  container: HTMLElement;
  /** Draggable elements, in their current list order. */
  elements: HTMLElement[];
  dataKey: string;
  startIds: string[];
  /** Every pointer move of the active pointer (drag ghost, auto-scroll). */
  onMove?: (event: PointerEvent) => void;
  /** The previewed order changed (never fires for the same slot twice). */
  onPreview: (order: string[]) => void;
  /** Pointer released. `changed` is false when the card was dropped back where it started. */
  onDrop: (order: string[], changed: boolean) => void;
  /** Escape / pointercancel. */
  onCancel: () => void;
}

/**
 * One in-flight drag. Owns the document-level pointer listeners and the geometry snapshot. It reports
 * order *previews* and a single final drop; it never mutates the list itself.
 */
export class ReorderDragSession {
  private order: string[];
  private targetIndex: number;
  private active = true;

  private readonly handleMove = (event: PointerEvent) => this.onMove(event);
  private readonly handleUp = (event: PointerEvent) => {
    if (event.pointerId === this.config.pointerId) {
      this.finish();
    }
  };
  private readonly handleCancel = (event: PointerEvent) => {
    if (event.pointerId === this.config.pointerId) {
      this.cancel();
    }
  };
  private readonly handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.cancel();
    }
  };

  private constructor(
    private readonly config: ReorderDragConfig,
    private readonly slots: SlotRect[],
    startIndex: number,
  ) {
    this.order = [...config.startIds];
    this.targetIndex = startIndex;
    document.addEventListener('pointermove', this.handleMove);
    document.addEventListener('pointerup', this.handleUp);
    document.addEventListener('pointercancel', this.handleCancel);
    document.addEventListener('keydown', this.handleKey);
  }

  /** Null when the geometry cannot be trusted (e.g. the list changed shape). */
  static begin(config: ReorderDragConfig): ReorderDragSession | null {
    const slots = snapshotSlots(config.container, config.elements, config.dataKey);
    const startIndex = config.startIds.indexOf(config.sourceId);
    if (startIndex < 0 || slots.length !== config.startIds.length) {
      return null;
    }
    return new ReorderDragSession(config, slots, startIndex);
  }

  /** Stops listening without reporting anything (used when the owner tears the drag down itself). */
  dispose(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    document.removeEventListener('pointermove', this.handleMove);
    document.removeEventListener('pointerup', this.handleUp);
    document.removeEventListener('pointercancel', this.handleCancel);
    document.removeEventListener('keydown', this.handleKey);
  }

  private onMove(event: PointerEvent): void {
    if (!this.active || event.pointerId !== this.config.pointerId) {
      return;
    }
    this.config.onMove?.(event);

    const origin = this.config.container.getBoundingClientRect();
    const index = slotIndexAt(this.slots, event.clientX - origin.left, event.clientY - origin.top);
    // -1: pointer is in a gutter. Same slot: nothing to do. Either way the preview stays put.
    if (index < 0 || index === this.targetIndex) {
      return;
    }
    this.targetIndex = index;
    this.order = moveId(this.config.startIds, this.config.sourceId, index);
    this.config.onPreview(this.order);
  }

  private finish(): void {
    if (!this.active) {
      return;
    }
    this.dispose();
    this.config.onDrop(this.order, !sameIds(this.order, this.config.startIds));
  }

  private cancel(): void {
    if (!this.active) {
      return;
    }
    this.dispose();
    this.config.onCancel();
  }
}
