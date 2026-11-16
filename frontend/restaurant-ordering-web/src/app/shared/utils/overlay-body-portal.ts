/** Moves a host element to document.body so position:fixed overlays cover the viewport. */

/**
 * Returns a detach function. Called with no argument it puts the element back where it came from
 * (the host component is still alive, e.g. the overlay was closed). Called with `destroy = true`
 * it only discards the element and its placeholder: during view teardown Angular has already
 * removed the node, so "restoring" it would resurrect a dead, still-clickable ghost overlay.
 */
export function attachElementToBody(element: HTMLElement): (destroy?: boolean) => void {
  const parent = element.parentNode;
  if (!parent || parent === document.body) {
    return () => undefined;
  }

  const anchor = document.createComment('overlay-body-portal');
  parent.insertBefore(anchor, element);
  document.body.appendChild(element);

  return (destroy = false) => {
    if (destroy) {
      anchor.remove();
      element.remove();
      return;
    }

    if (anchor.parentNode) {
      anchor.parentNode.insertBefore(element, anchor);
      anchor.remove();
    } else if (element.parentNode === document.body) {
      element.remove();
    }
  };
}
