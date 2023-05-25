import { GatewayIntentBits } from "discord.js"

abstract class DiscordBase {
  protected context: Array<string> = []
  protected INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]

}

export default DiscordBase