export function createToaster(root) {
  return function showToast(message, { kind = 'info', durationMs = 3200 } = {}) {
    const toast = document.createElement('div');
    toast.className = `toast ${kind}`;
    toast.textContent = message;
    root.append(toast);
    setTimeout(() => toast.remove(), durationMs);
  };
}
