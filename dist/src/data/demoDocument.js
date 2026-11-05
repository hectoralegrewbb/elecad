import { createEmptyState } from '../core/documentState.js';

// Escena de ejemplo: gabinete + disyuntor → contactor → variador, y alimentación de bobina que rodea al contactor.
export function buildDemoState(commands) {
  let state = { ...createEmptyState(), meta: { ...createEmptyState().meta, name: 'Ejemplo' } };

  const place = (defId, x, y) => {
    const component = commands.makeComponent(state, defId, x, y);
    state = commands.addComponent(state, component);
    return component;
  };
  const connect = (from, to, options = {}) => {
    state = commands.addWire(state, commands.makeWire({ from, to, ...options }));
  };
  const terminal = (component, terminalId) => ({ componentId: component.id, terminalId });

  place('layout.enclosure.600x800', 300, 400);
  const breaker = place('siemens.5sl6.3p.c16', 300, 130);
  const contactor = place('siemens.3rt2016.24vdc', 300, 300);
  const drive = place('siemens.g120c.fsa', 300, 520);
  const supply = place('generic.psu.24v5a', 120, 300);

  const powerPhases = [
    { phase: 'L1', color: 'marrón' },
    { phase: 'L2', color: 'negro' },
    { phase: 'L3', color: 'rojo' },
  ];
  ['2', '4', '6'].forEach((breakerTerminal, index) => {
    connect(terminal(breaker, breakerTerminal), terminal(contactor, ['1', '3', '5'][index]), { gauge: '2.5', ...powerPhases[index] });
  });
  ['2', '4', '6'].forEach((contactorTerminal, index) => {
    connect(terminal(contactor, contactorTerminal), terminal(drive, ['l1', 'l2', 'l3'][index]), { gauge: '2.5', ...powerPhases[index] });
  });
  connect(terminal(supply, 'plus'), terminal(contactor, 'a1'), { gauge: '1', phase: '24V', color: 'azul', label: 'C1' });

  return state;
}
