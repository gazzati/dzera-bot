import dotenv from "dotenv"
import Joi from "joi"

dotenv.config()

const envVarsSchema = Joi.object({
    GPT_KEY: Joi.number().description("OpenAI API key"),
    GPT_MODEL: Joi.number().description("OpenAI model"),
    TELEGRAM_TOKEN: Joi.number().default(3000).description("Telegram token")
})

const { error, value: envVars } = envVarsSchema.validate(process.env)
if (error) new Error(`Config validation error: ${error.message}`)

export default {
  gptKey: envVars.GPT_KEY,
  gptModel: envVars.GPT_MODEL,
  telegramToken: envVars.TELEGRAM_TOKEN
}
