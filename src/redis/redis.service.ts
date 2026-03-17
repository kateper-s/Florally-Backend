import { Injectable } from "@nestjs/common";
import { createClient } from "@redis/client";

@Injectable()
export class RedisService {
  private client;

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: 6379,
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
      throw new Error('Failed to connect to Redis');
    });

    this.client.connect();
  }

  async set(key: string, value: any, ttl?: number) {
    if (ttl) {
      await this.client.set(key, JSON.stringify(value), { EX: ttl });
    } else {
      await this.client.set(key, JSON.stringify(value));
    }
  }

  async get(key: string) {
    const value = await this.client.get(key);
    return value;
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
