import Redis from "ioredis"

import config from "@root/config"

import { log } from "@helpers/logger"

const redis = new Redis({ host: config.redisHost, db: 1 })

redis.on("connect", () => {
  log("Redis connection success")
})

export default redis
