// HashiCorp Vault Integration
// Enterprise secrets management

import { encrypt, decrypt, generateKeyVersion } from './encryption';

interface VaultConfig {
  url: string;
  token: string;
  kvEngine?: string; // Default: 'secret'
  mountPath?: string; // Default: 'secret'
}

interface VaultSecret {
  data: Record<string, string>;
  metadata: {
    created_time: string;
    deletion_time?: string;
    destroyed?: boolean;
    version: number;
  };
}

class VaultClient {
  private config: VaultConfig;
  private kvEngine: string;
  private mountPath: string;

  constructor(config: VaultConfig) {
    this.config = config;
    this.kvEngine = config.kvEngine || 'kv';
    this.mountPath = config.mountPath || 'secret';
  }

  /**
   * Read a secret from Vault
   */
  async readSecret(path: string): Promise<VaultSecret | null> {
    try {
      const response = await fetch(`${this.config.url}/v1/${this.mountPath}/data/${path}`, {
        method: 'GET',
        headers: {
          'X-Vault-Token': this.config.token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Vault read failed: ${response.statusText}`);
      }

      const body = (await response.json()) as { data: VaultSecret };
      return body.data;
    } catch (error) {
      console.error('Vault read error:', error);
      throw new Error(`Vault read failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write a secret to Vault
   */
  async writeSecret(path: string, data: Record<string, string>): Promise<void> {
    try {
      const response = await fetch(`${this.config.url}/v1/${this.mountPath}/data/${path}`, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.config.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error(`Vault write failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Vault write error:', error);
      throw new Error(`Vault write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a secret from Vault
   */
  async deleteSecret(path: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.url}/v1/${this.mountPath}/data/${path}`, {
        method: 'DELETE',
        headers: {
          'X-Vault-Token': this.config.token,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Vault delete failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Vault delete error:', error);
      throw new Error(`Vault delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get database connection string from Vault
   */
  async getDatabaseSecret(entityId: string): Promise<string | null> {
    const secret = await this.readSecret(`database/${entityId}`);
    return secret?.data?.connection_string || null;
  }

  /**
   * Get API key from Vault
   */
  async getApiKey(service: string, entityId: string): Promise<string | null> {
    const secret = await this.readSecret(`api-keys/${entityId}/${service}`);
    return secret?.data?.api_key || null;
  }

  /**
   * Get encryption key from Vault
   */
  async getEncryptionKey(entityId: string, keyVersion?: string): Promise<string | null> {
    const path = keyVersion 
      ? `encryption-keys/${entityId}/${keyVersion}`
      : `encryption-keys/${entityId}/current`;
    
    const secret = await this.readSecret(path);
    return secret?.data?.key || null;
  }

  /**
   * Store encryption key in Vault
   */
  async storeEncryptionKey(entityId: string, key: string, keyVersion: string): Promise<void> {
    await this.writeSecret(`encryption-keys/${entityId}/${keyVersion}`, { key });
    
    // Also store as current if it's the latest
    await this.writeSecret(`encryption-keys/${entityId}/current`, { key, version: keyVersion });
  }

  /**
   * Rotate encryption key for an entity
   */
  async rotateEncryptionKey(entityId: string): Promise<string> {
    const { generateEncryptionKey } = await import('./encryption');
    const newKey = generateEncryptionKey();
    const newVersion = generateKeyVersion();
    
    await this.storeEncryptionKey(entityId, newKey, newVersion);
    
    return newVersion;
  }
}

// Singleton instance
let vaultClient: VaultClient | null = null;

/**
 * Initialize Vault client
 */
export function initVault(config: VaultConfig): VaultClient {
  if (!vaultClient) {
    vaultClient = new VaultClient(config);
  }
  return vaultClient;
}

/**
 * Get Vault client instance
 */
export function getVault(): VaultClient {
  if (!vaultClient) {
    throw new Error('Vault client not initialized. Call initVault first.');
  }
  return vaultClient;
}

/**
 * Encrypt field value and store in Vault if needed
 */
export async function encryptField(
  value: string,
  entityId: string,
  fieldName: string,
  storeInVault: boolean = true
): Promise<{ encrypted: string; keyVersion: string }> {
  const vault = getVault();
  
  // Get or create encryption key for entity
  let encryptionKey = await vault.getEncryptionKey(entityId);
  let keyVersion = 'v1';
  
  if (!encryptionKey) {
    const { generateEncryptionKey, generateKeyVersion } = await import('./encryption');
    encryptionKey = generateEncryptionKey();
    keyVersion = generateKeyVersion();
    
    if (storeInVault) {
      await vault.storeEncryptionKey(entityId, encryptionKey, keyVersion);
    }
  } else {
    // Get current key version
    const currentSecret = await vault.readSecret(`encryption-keys/${entityId}/current`);
    keyVersion = currentSecret?.data?.version || 'v1';
  }
  
  // Encrypt the value
  const { encrypt } = await import('./encryption');
  const result = encrypt(value, encryptionKey, keyVersion);
  
  return result;
}

/**
 * Decrypt field value using Vault
 */
export async function decryptField(
  encrypted: string,
  entityId: string,
  keyVersion: string
): Promise<string> {
  const vault = getVault();
  
  // Get the specific key version
  const encryptionKey = await vault.getEncryptionKey(entityId, keyVersion);
  
  if (!encryptionKey) {
    throw new Error(`Encryption key version ${keyVersion} not found for entity ${entityId}`);
  }
  
  // Decrypt the value
  const { decrypt } = await import('./encryption');
  const result = decrypt(encrypted, encryptionKey);
  
  if (!result.success) {
    throw new Error(`Decryption failed: ${result.error}`);
  }
  
  return result.decrypted;
}