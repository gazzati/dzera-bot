import "./aliases"

// import DiscordBot from "@bots/discord"
import { SpeechClient } from "@google-cloud/speech"
import OpenAI from "openai"

import TelegramBot from "@root/bots/telegram"
import config from "@root/config"

import { setupFolder } from "@services/ffmpeg"

export const speechClient = new SpeechClient({ keyFilename: "./google-credentials.json" })
setupFolder()

const openAI = new OpenAI({ apiKey: config.gptKey })

const deepSeek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: config.dsKey
});

new TelegramBot(openAI, deepSeek).process()
// new DiscordBot(openAI).process()
