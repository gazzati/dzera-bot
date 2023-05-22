import dotenv from "dotenv"
import Joi from "joi"

dotenv.config()

const envVarsSchema = Joi.object({
  GPT_KEY: Joi.string().description("OpenAI API key"),
  GPT_MODEL: Joi.string().description("OpenAI model"),

  TELEGRAM_TOKEN: Joi.string().description("Telegram token"),
  SYSTEM_TELEGRAM_TOKEN: Joi.string().description("System telegram token"),
  SYSTEM_TELEGRAM_CHAT_ID: Joi.string().description("System telegram chat id"),

  DISCORD_TOKEN: Joi.string().default(3000).description("Discord token"),
  DISCORD_PREFIX: Joi.string().default("!").description("Discord command prefix"),

  PSQL_HOST: Joi.string().default("localhost").description("Database Host"),
  PSQL_DATABASE: Joi.string().default("database").description("Database Name"),
  PSQL_USER: Joi.string().default("root").description("Database User"),
  PSQL_PASSWORD: Joi.string().allow("").default("root").description("Database Password")
})

const { error, value: envVars } = envVarsSchema.validate(process.env)
if (error) new Error(`Config validation error: ${error.message}`)

export default {
  gptKey: envVars.GPT_KEY,
  gptModel: envVars.GPT_MODEL,
  telegramToken: envVars.TELEGRAM_TOKEN,
  systemTelegramToken: envVars.SYSTEM_TELEGRAM_TOKEN,
  systemTelegramChatId: Number(envVars.SYSTEM_TELEGRAM_CHAT_ID),

  discordToken: envVars.DISCORD_TOKEN,
  discordPrefix: envVars.DISCORD_PREFIX,

  psqlHost: envVars.PSQL_HOST,
  psqlDatabase: envVars.PSQL_DATABASE,
  psqlUsername: envVars.PSQL_USER,
  psqlPassword: envVars.PSQL_PASSWORD
}
