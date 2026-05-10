import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ProjectRoot } from '../src/domain/types';

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npm run summary -- <project-file.json>');
  process.exit(1);
}

const project = JSON.parse(readFileSync(resolve(filePath), 'utf8')) as ProjectRoot;
const plannedCables = project.cables.filter((cable) => cable.status === 'planned');

console.log(`Project: ${project.project.name}`);
console.log(`Locations: ${project.locations.length}`);
console.log(`Racks: ${project.racks.length}`);
console.log(`Devices: ${project.devices.length}`);
console.log(`Port groups: ${project.portGroups.length}`);
console.log(`Ports: ${project.ports.length}`);
console.log(`Planned cables: ${plannedCables.length}`);
console.log('Cable prefixes:');

for (const prefix of project.settings.cablePrefixes) {
  const ledger = project.numberingLedgers.find((item) => item.prefix === prefix.prefix);

  console.log(`- ${prefix.prefix}: nextSuggested ${ledger?.nextSuggested ?? 1}`);
}
