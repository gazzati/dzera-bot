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
      log(`${userLog}\n\x1b[32mACTION: ${text}`)
      bot.sendMessage(chat.id, `Привет, я Дзера, твой ассистент 🌸 \nПостараюсь ответить на любой вопрос ❤️`)
      return
    case "/contacts":
      log(`${userLog}\n\x1b[32mACTION: ${text}`)
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

    log(`${userLog}\n${textLog}\n${responseLog}`)

    bot.sendMessage(chat.id, result)
  } catch (e) {
    console.error(e)
    bot.sendMessage(chat.id, "Sorry, something wrong 🥹")
  }
})

const padZeros = (value: string | number, chars = 2): string => {
  if (value.toString().length < chars) {
    const zeros = chars - value.toString().length
    const str = new Array(zeros).fill(0)
    return `${str.join("")}${value}`
  }

  return value.toString()
}

const log = (message: string) => {
  const today = new Date()
  const date = `${padZeros(today.getDate())}.${padZeros(today.getMonth() + 1)}.${padZeros(today.getFullYear())}`
  const time = `${padZeros(today.getHours())}:${padZeros(today.getMinutes())}}`

  // eslint-disable-next-line no-console
  console.log(`\x1b[36m[${date} ${time}]\n${message}`)
  // eslint-disable-next-line no-console
  console.log("")
}