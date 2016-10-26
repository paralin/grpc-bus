import {
  IGBServiceInfo,
} from '../proto';

// Generates a unique string identifier for service connection info.
export function buildServiceInfoIdentifier(info: IGBServiceInfo): string {
  // Return endpoint for now.
  return info.endpoint;
}
