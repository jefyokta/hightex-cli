import { defineCommand } from "@bunli/core";
import { platform } from "../platfrom";

 const createCommand = defineCommand({
    name:"create",
    description:"create hightex document project",
    handler(props){
      return  platform.create(props.prompt)
    }
 })

 export default createCommand