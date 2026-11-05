// Autoguardado local-first: se programa tras cada cambio confirmado (no durante gestos transitorios)
// y se escribe con debounce, así no hay guardados vacíos ni ráfagas durante ediciones rápidas.
export class AutosaveService {
  constructor(store, { save, delayMs = 1500, onStatus = () => {} }) {
    this.store = store;
    this.save = save;
    this.delayMs = delayMs;
    this.onStatus = onStatus;
    this.timer = null;
  }

  start() {
    this.store.subscribe(({ reason }) => {
      if (reason === 'transient') return;
      this.schedule();
    });
  }

  schedule() {
    clearTimeout(this.timer);
    this.onStatus('pending');
    this.timer = setTimeout(() => this.flush(), this.delayMs);
  }

  async flush() {
    clearTimeout(this.timer);
    try {
      await this.save(this.store.state);
      this.onStatus('saved');
    } catch (error) {
      console.error('Autoguardado falló', error);
      this.onStatus('error');
    }
  }
}
