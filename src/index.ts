import "./aliases"

import TelegramBot from "node-telegram-bot-api"
import { Configuration, OpenAIApi, ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"

const openAIApi = new OpenAIApi(new Configuration({ apiKey: config.gptKey }))
const bot = new TelegramBot(config.telegramToken, { polling: true })

bot.on("message", async msg => {
  const { from, chat, text } = msg
  if (!from || !text) return

  const userLog = `\x1b[37mUSER: ${from.username}(${from.first_name || ""}${from.last_name ? ` ${from.last_name}` : ""})`

  switch(text) {
    case "/start":
      log(`\n${userLog}\n\x1b[32mACTION: ${text}\n`)
      bot.sendMessage(chat.id, `Привет, я Дзера, твой ассистент 🌸 \nПостараюсь ответить на любой вопрос ❤️`)
      return
    case "/contacts":
      log(`\n${userLog}\n\x1b[32mACTION: ${text}\n`)
      bot.sendMessage(chat.id, "Если что то не работает, я не при чем 🤪 \nПиши @gazzati")
      return
  }

  try {
    bot.sendChatAction(chat.id, "typing")

    const payload = { role: ChatCompletionRequestMessageRoleEnum.User, content: text }
    const response = await openAIApi.createChatCompletion({ model: config.gptModel, messages: [payload] })
    const result = response.data.choices[0].message?.content as string

    const textLog = `\x1b[31mTEXT: ${text}`
    const responseLog = `\x1b[33mRESPONSE: ${result}`

    log(`${userLog}\n${textLog}\n${responseLog}\n`)

    bot.sendMessage(chat.id, result)
  } catch (e) {
    console.error(e)
    bot.sendMessage(chat.id, "Sorry, something wrong 🥹")
  }
})

const log = (message: string) => {
  // eslint-disable-next-line no-console
  console.log(message)
}