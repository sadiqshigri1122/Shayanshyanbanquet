const PRINT_ROOT_ID = 'print-root-overlay';

/** Print only the element with the given id — clones it to a body-level overlay for reliable output. */
export function printDocument(areaId = 'print-area') {
  const source = document.getElementById(areaId);

  const cleanup = () => {
    document.getElementById(PRINT_ROOT_ID)?.remove();
    document.body.classList.remove('printing-document');
    delete document.body.dataset.printArea;
  };

  if (!source) {
    window.print();
    return;
  }

  cleanup();

  const overlay = document.createElement('div');
  overlay.id = PRINT_ROOT_ID;
  overlay.className = 'print-root-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.classList.add('print-root-content');
  overlay.appendChild(clone);

  document.body.appendChild(overlay);
  document.body.classList.add('printing-document');
  document.body.dataset.printArea = areaId;

  window.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.print());
  });
}
