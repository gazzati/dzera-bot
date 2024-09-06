import config from "@root/config"
import redis from '@root/database/redis';

export const saveTokens = async (userId: number, tokens: number): Promise<void> => {
    const key = String(userId)

    const userTokens = await redis.get(key)
    if(!userTokens) {
        redis.setex(key, 60 * 60 * 24, tokens)
        return
    }

    redis.incrby(key, tokens)
}

export const checkTokensLimit = async (userId: number): Promise<boolean> => {
    const key = String(userId)

    const userTokens = await redis.get(key)
    if(!userTokens) return false

    return Number(userTokens) > config.maxTokensPerDay
}
