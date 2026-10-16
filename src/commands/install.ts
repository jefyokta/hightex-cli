import { defineCommand } from "@bunli/core";
import { platform } from "../platfrom";

const installCommand =defineCommand({
    name:"install" as const,
    description:"install Hightex desktop",
    async handler(props){
        await platform.install()
    }

}) 

export  default installCommand 