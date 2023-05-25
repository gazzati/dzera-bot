import { GatewayIntentBits } from "discord.js"
import { OpenAIApi } from "openai"

abstract class DiscordBase {
  protected context: Array<string> = []
  protected INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  protected openAIApi: OpenAIApi

}

export default DiscordBase