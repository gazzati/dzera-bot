import config from "@root/config";
import DiscordBase from "./discord.base";

class CommandController extends DiscordBase {

    //todo: make a generic return type
    public async executeCommand(command: string, text?: string){
        switch (command) {
            case "reset":
                return this.resetCommand()
            case "art":
                if (!text) return config.phrases.ERROR_MESSAGE
                return await this.generateArt(text)
        }
    }
    
    private resetCommand = (): string => {
        this.context = []

        return config.phrases.RESET_MESSAGE
    }

    private generateArt = async (text: string) => {
        const prompt = text.split(" ").slice(1).join(" ")
        const response = await this.openAIApi.createImage({prompt})

        return response.data.data[0].url
    }
}

export default CommandController