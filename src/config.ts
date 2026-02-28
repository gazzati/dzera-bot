import dotenv from "dotenv"
import Joi from "joi"

import { Model, ModelName } from "@root/interfaces/models"
import { TelegramCommand } from "@root/interfaces/telegram"

import type { DalleSize } from "@interfaces/openai"

dotenv.config({ quiet: true })

const envVarsSchema = Joi.object({
  GPT_KEY: Joi.string().description("OpenAI API key"),
  DS_KEY: Joi.string().description("DeepSeek API key"),

  DEFAULT_MODEL: Joi.string().description("Default model"),

  TELEGRAM_TOKEN: Joi.string().description("Telegram token"),
  SYSTEM_TELEGRAM_TOKEN: Joi.string().description("System telegram token"),
  SYSTEM_TELEGRAM_CHAT_ID: Joi.string().description("System telegram chat id"),

  DISCORD_TOKEN: Joi.string().default(3000).description("Discord token"),
  DISCORD_PREFIX: Joi.string().default("!").description("Discord command prefix"),

  PSQL_HOST: Joi.string().default("localhost").description("Database Host"),
  PSQL_DATABASE: Joi.string().default("database").description("Database Name"),
  PSQL_USER: Joi.string().default("root").description("Database User"),
  PSQL_PASSWORD: Joi.string().allow("").default("root").description("Database Password"),

  REDIS_HOST: Joi.string().default("localhost").description("Redis host"),
  REDIS_PORT: Joi.number().default(6379).description("Redis port")
})

const { error, value: envVars } = envVarsSchema.validate(process.env, {
  allowUnknown: true
})
if (error) throw new Error(`Config validation error: ${error.message}`)

export default {
  gptKey: envVars.GPT_KEY,
  dsKey: envVars.DS_KEY,

  defaultModel: envVars.DEFAULT_MODEL,

  dalleModel: envVars.DALLE_MODEL,
  dalleSize: "256x256" as DalleSize,

  telegramToken: envVars.TELEGRAM_TOKEN,
  systemTelegramToken: envVars.SYSTEM_TELEGRAM_TOKEN,
  systemTelegramChatId: Number(envVars.SYSTEM_TELEGRAM_CHAT_ID),

  discordToken: envVars.DISCORD_TOKEN,
  discordPrefix: envVars.DISCORD_PREFIX,

  psqlHost: envVars.PSQL_HOST,
  psqlDatabase: envVars.PSQL_DATABASE,
  psqlUsername: envVars.PSQL_USER,
  psqlPassword: envVars.PSQL_PASSWORD,

  redisHost: envVars.REDIS_HOST,
  redisPort: Number(envVars.REDIS_PORT),

  filesPath: "files",
  audioFormat: "wav",

  phrases: {
    INIT_MESSAGE: "Теперь тебя зовут Дзера. Отвечай в женском роде.",

    START_MESSAGE: `Привет, я Дзера, твой ассистент 🌸 \nПостараюсь ответить на любой вопрос ❤️ \nКстати, я научилась понимать голосовые сообщения и работать с изображениями ✨`,
    CHOOSE_MODEL_MESSAGE: "Выберите нейросеть из предложенных ниже 😊",
    CHANGED_MODEL: "Модель активированна",
    RESET_MESSAGE: "Контекст очищен. Я забыла все о чем мы сейчас говорили 🧘‍♀️",
    HELP_MESSAGE: "Если что то не работает, я не при чем 🤪 \nПиши @gazzati",

    LIMIT_MESSAGE: "Ты израсходовал весь лимит, дай мне отдохнуть 😒",
    ERROR_MESSAGE: "Прости, что то пошло не так, я исправлюсь 🥹",
    UNAVAILABLE_MODEL: "Данная модель тебе не доступна ⛔️",
    USER_BLOCKED: "Извините, ваш аккаунт заблокирован",
    LONG_AUDIO_DURATION: "Голосовое сообщение должно быть не больше 10 секунд 😏"
  },

  inlineKeyboard: {
    models: [
      [{ text: `👍 ${ModelName.Gpt4oMini}`, callback_data: `${TelegramCommand.Model}:${Model.Gpt4oMini}` }],
      [{ text: `🔥 ${ModelName.Gpt5Mini}`, callback_data: `${TelegramCommand.Model}:${Model.Gpt5Mini}` }],
      [{ text: `🔒 ${ModelName.Gpt5}`, callback_data: `${TelegramCommand.Model}:${Model.Gpt5}` }],
      [{ text: `⭐️ ${ModelName.DeepSeek}`, callback_data: `${TelegramCommand.Model}:${Model.DeepSeek}` }]
    ]
  }
}
