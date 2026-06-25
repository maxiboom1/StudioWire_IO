import { removeGeneratedArtifacts } from './release/clean-lib.mjs';

const removed = removeGeneratedArtifacts('.');

if (removed.length > 0) {
  console.log(`Generated artifacts removed:\n${removed.join('\n')}`);
} else {
  console.log('Generated artifacts removed.');
}
