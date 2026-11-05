import { Catalog } from '../core/catalog.js';
import { commandDefinitions } from './catalogCommand.js';
import { controlDefinitions } from './catalogControl.js';
import { coolingDefinitions } from './catalogCooling.js';
import { driveAndFieldDefinitions } from './catalogDrivesAndField.js';
import { layoutDefinitions } from './catalogLayout.js';
import { powerDefinitions } from './catalogPower.js';
import { protectionDefinitions } from './catalogProtection.js';
import { networkDefinitions } from './catalogNetwork.js';
import { relayDefinitions } from './catalogRelays.js';
import { sensorDefinitions } from './catalogSensors.js';

// Para agregar componentes: sumar entradas en el archivo de su categoría (ver catalogHelpers.js).
export const defaultDefinitions = [
  ...layoutDefinitions,
  ...protectionDefinitions,
  ...powerDefinitions,
  ...relayDefinitions,
  ...coolingDefinitions,
  ...controlDefinitions,
  ...driveAndFieldDefinitions,
  ...sensorDefinitions,
  ...commandDefinitions,
  ...networkDefinitions,
];

export const createDefaultCatalog = () => new Catalog(defaultDefinitions);
