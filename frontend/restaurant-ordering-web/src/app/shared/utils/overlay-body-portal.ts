/** Moves a host element to document.body so position:fixed overlays cover the viewport. */

export function attachElementToBody(element: HTMLElement): () => void {
  const parent = element.parentNode;
  if (!parent || parent === document.body) {
    return () => undefined;
  }

  const anchor = document.createComment('overlay-body-portal');
  parent.insertBefore(anchor, element);
  document.body.appendChild(element);

  return () => {
    if (anchor.parentNode) {
      anchor.parentNode.insertBefore(element, anchor);
      anchor.remove();
    }
  };
}
