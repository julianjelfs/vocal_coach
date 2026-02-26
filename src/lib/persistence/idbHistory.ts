// History store implementation — delegates to the shared DB in idbSettings.ts
// so both stores share the same connection and schema version.
export { IdbHistory } from './idbSettings';
