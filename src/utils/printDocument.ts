/** Print only the element with `print-area` — hides all other UI (sidebar, modals, etc.). */
export function printDocument(areaId = 'print-area') {
  document.body.classList.add('printing-document');
  document.body.dataset.printArea = areaId;

  const cleanup = () => {
    document.body.classList.remove('printing-document');
    delete document.body.dataset.printArea;
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  requestAnimationFrame(() => window.print());
}
