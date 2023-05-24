import config from "@root/config";
import DiscordBase from "@root/helpers/discord.base";

class CommandController extends DiscordBase {

    //todo: make a generic return type
    public executeCommand(command: string){
        switch (command) {
            case "reset":
                return this.resetCommand()
        }
    }
    
    private resetCommand = (): string => {
        this.context = []

        return config.phrases.RESET_MESSAGE
    }
}

export default CommandController