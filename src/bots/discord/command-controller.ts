import config from "@root/config";
import DiscordBase from "./discord.base";

class CommandController extends DiscordBase {

    //todo: make a generic return type
    public async executeCommand(command: string, prompt?: string){
        switch (command) {
            case "reset":
                return this.resetCommand()
            case "art":
                if (!prompt) return config.phrases.ERROR_MESSAGE
                return await this.generateArt(prompt)
        }
    }
    
    private resetCommand = (): string => {
        this.context = []

        return config.phrases.RESET_MESSAGE
    }

    private generateArt = async (prompt: string) => {
        const response = await this.openAIApi.createImage({prompt})

        return response.data.data[0].url
    }
}

export default CommandController