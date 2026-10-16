import { platform } from "../platfrom";

export class ExecutableNotFound extends Error {
   
    constructor(public callback?:()=>any,opt?:ErrorOptions){
        super(`hightex executable not found at ${platform.getExecutablePath()}`,opt)
    }
}