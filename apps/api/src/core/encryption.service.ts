import { Injectable } from '@nestjs/common';
import { loadEnv } from '@autobi/config';
import { decryptSecret, encryptSecret } from '@autobi/shared';

@Injectable()
export class EncryptionService {
  private key() {
    return loadEnv().ENCRYPTION_KEY;
  }

  encrypt(plaintext: string): string {
    return encryptSecret(plaintext, this.key());
  }

  decrypt(payload: string): string {
    return decryptSecret(payload, this.key());
  }
}
