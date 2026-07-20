export { ENCRYPTED_FIELDS, getFieldConfig, getFieldsForTable } from "./config";
export type { EncryptedFieldConfig, SecurityLevel } from "./config";
export {
  encryptRecord,
  decryptRecord,
  decryptRecords,
  rotateEncryptionKey,
  currentKeyVersion,
} from "./service";
