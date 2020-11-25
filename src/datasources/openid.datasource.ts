import { APPLICATION_CONFIG } from '../application-config';
import { Client, Issuer, UserinfoResponse } from 'openid-client';
import { LifeCycleObserver, lifeCycleObserver } from '@loopback/core';
import { AuthenticationError, logger } from '../utils';

@lifeCycleObserver('datasource')
export class OpenIDDataSource implements LifeCycleObserver {

  private _client: Client;

  get client(): Promise<Client> {
    if (this._client == null) {
      return this.createClient();
    }
    return new Promise<Client>((resolve) => {
      resolve(this._client);
    });
  }

  constructor() {
  }

  /**
   * Create client for the OpenID connect provider
   */
  async start(): Promise<void> {
    if (process.env.NODE_ENV === 'dev') {
      return;
    }

    logger.info('Initialising openid provider');
    this._client = await this.createClient();
  }

  private async createClient(): Promise<Client> {
    const idpUrl = APPLICATION_CONFIG().idp.url;
    const clientId = APPLICATION_CONFIG().idp.clientId;

    try {
      const issuer = await Issuer.discover(idpUrl);
      const client = new issuer.Client({
        client_id: clientId
      });

      return client;
    } catch (error) {
      logger.error(`Could not create client for OpenID Connect provider at ${idpUrl} : ${error.message}`);

      process.exit();
    }
  }

  async authenticate(token: string): Promise<UserinfoResponse> {
    try {
      const client = await this.client;
      const userInfo = await client.userinfo(token);
      return userInfo;
    
    } catch (error) {
      throw new AuthenticationError(`Authentication error: ${error.message}`);
    }
  }
}