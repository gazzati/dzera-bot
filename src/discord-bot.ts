import DiscordBot, { GatewayIntentBits } from "discord.js"
import config from "./config";

export const startDiscordBot = () => {
    const discordBot = new DiscordBot.Client({intents: 
        [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    })

    try {
        discordBot.once("ready", ()=> {
            console.log("Discord bot is ready");
        })

        discordBot.on("messageCreate", (message) => {
            if (message.author.username != discordBot.user?.username && message.author.discriminator != discordBot.user?.discriminator) {
                const {content} = message

                message.reply(content)
            }
        });

        discordBot.login(config.discordToken)
    } catch (error: any) {
        console.log(error.message);
    }
}