import { exit } from 'node:process';
import { ILogger } from "./Interfaces/ILogger.js";
import { Redis } from 'ioredis';

export class RedisClientBase {

  /**
   * Redis client
   * @type { Redis }
   * @private
   */
  protected client: Redis;

  /**
   * Determines whether the Redis client was successfully connected.
   * @type { boolean }
   * @private
   */
  protected client_ready: boolean = false;

  /**
   * A logger class instance.
   * @type { ILogger }
   * @private
   */
  protected logger: ILogger;

  /**
   * Stores a logger class instance.
   * @param { ILogger } logger The logger class instance.
   * @constructor
   */
  constructor( logger: ILogger ) {
    this.logger = logger;
  }

  /**
   * Retrieves the class name of the passed object.
   *
   * @param { any } obj The object from which to derive its class name.
   * @private
   */
  private getClassName(obj: any): string {
    let
      funcNameRegex = /function (.{1,})\(/,
      results = (funcNameRegex).exec(obj.constructor.toString());

    return (results && results.length > 1) ? results[1] : "";
  }

  /**
   * Initializes the Redis client and connects to Redis instance.
   *
   * @param { string } url  Either a single redis hostname (if the second port parameter is set)
   *                        or a string containing URLs for a Redis cluster.
   * @param { string } port Redis port.
   */
  public async connect( url: string, port: string = null ): Promise<void> {
    if ( port ) {
      // create a Redis client
      // @ts-ignore
      this.client = new Redis({
        port: port,
        host: url,
      });
    } else{
      // create a Redis cluster
      let
        cluster: Array<string> = url.split(','),
        connection_object: { name: string, sentinels: Array<{ host: string, port: string }> } = { name: 'main', sentinels: [] };
      for ( let node_string of cluster ) {
        let node_string_parsed = node_string.split(':');
        connection_object.sentinels.push( { host: node_string_parsed[ 0 ], port: node_string_parsed[ 1 ] } );
      }

      // @ts-ignore
      this.client = new Redis( connection_object );
    }

    // detect classnames chain
    let
      classNames = [],
      obj = Object.getPrototypeOf( this ),
      className: string;

    while ( (className = this.getClassName( obj )) !== "Object" ) {
      classNames.push( className );
      obj = Object.getPrototypeOf( obj );
    }

    // add error handling for cases when we can't connect to a Redis server
    this.client.on( 'error', ( err: any ): void => {
      if ( !this.client_ready ) {
        console.log( this.logger.format( 'Exception while trying to connect to Redis (' + JSON.stringify( classNames ) + ') via ' + url + ':' + port + "\n" + JSON.stringify( err ) ) );
        exit( 1 );
      }
    });

    // on successful ready state, mark the client as ready
    this.client.on( 'ready', (): void => {
      this.client_ready = true;
      console.log( this.logger.format( 'Successfully connected to Redis (' + JSON.stringify( classNames ) + ') via ' + url + ( port ? ':' + port : '' ) ) );
    });
  }
}