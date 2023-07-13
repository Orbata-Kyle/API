import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

export interface FirebaseUser {
  iss: string;
  aud: string;
  auth_time: number;
  user_id: string;
  sub: string;
  iat: number;
  exp: number;
  email: string;
  email_verified: boolean;
  firebase: {
    identities: {
      email: string[];
    };
    sign_in_provider: string;
  };
}

@Injectable()
export class FirebaseService {
  private readonly projectId: string;
  private readonly keyCache: Map<string, string> = new Map();

  constructor(private config: ConfigService) {
    this.projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
  }

  /**
   * Gets the signing public key from firebase and caches it in memory
   */
  private getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    const cachedKey = this.keyCache.get(header.kid);

    if (cachedKey) {
      callback(null, cachedKey);
      return;
    }

    axios
      .get(
        'https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      )
      .then((response) => {
        const { data } = response;
        for (const [kid, key] of Object.entries(data)) {
          if (kid && typeof key === 'string') {
            this.keyCache.set(kid, key);
          }
        }

        const key = this.keyCache.get(header.kid);
        if (!key) {
          callback(new Error('Invalid kid'));
        } else {
          callback(null, key);
        }
      })
      .catch((error) => {
        callback(error);
      });
  }

  /**
   * Verifies a firebase JWT for a request
   * @param token The raw string token to verify
   */
  async verifyToken(token: string): Promise<FirebaseUser> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => this.getKey(header, callback),
        {
          audience: this.projectId,
          issuer: `https://securetoken.google.com/${this.projectId}`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded as FirebaseUser);
          }
        },
      );
    });
  }
}
