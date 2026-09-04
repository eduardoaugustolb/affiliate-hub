import { createBunRedisClient, RedisConnection } from 'bullmq'
import { RedisClient } from 'bun'
import { env } from '../../../env'

export function configureBullMq() {
  RedisConnection.clientFactory = () => createBunRedisClient(new RedisClient(env.REDIS_URL))
}
