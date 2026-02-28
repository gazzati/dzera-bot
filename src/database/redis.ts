import Redis from "ioredis"

import config from "@root/config"

import { log } from "@helpers/logger"

const redis = new Redis({ host: config.redisHost, port: config.redisPort, db: 1 })

redis.on("connect", () => {
  const target = `${config.redisHost}:${config.redisPort}`
  log(`Redis connection success: ${target}`)
})

redis.on("error", error => {
  const target = `${config.redisHost}:${config.redisPort}`
  console.error(`Redis connection error (${target})`, error)
})

export default redis
