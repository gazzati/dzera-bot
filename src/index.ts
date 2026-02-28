import "./aliases"

// import DiscordBot from "@bots/discord"
import { SpeechClient } from "@google-cloud/speech"
import OpenAI from "openai"

import TelegramBot from "@root/bots/telegram"
import config from "@root/config"
import { log } from "@root/helpers/logger"

import { setupFolder } from "@services/ffmpeg"

log(`Starting dzera-bot (NODE_ENV=${process.env.NODE_ENV || "development"})`)

export const speechClient = new SpeechClient({ keyFilename: "./google-credentials.json" })
setupFolder()

const openAI = new OpenAI({ apiKey: config.gptKey })

const deepSeek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: config.dsKey
});

new TelegramBot(openAI, deepSeek).process()
log("Telegram bot polling started")
// new DiscordBot(openAI).process()
