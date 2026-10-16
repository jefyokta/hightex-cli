import { UnsupporetedPlatform } from "../exception/unsupported-platform"
import { Linux } from "./linux"
import { MacOS } from "./macos"
import { Platform } from "./platform"
import { Windows } from "./windows"

export function getPlatfrom(){
    const map:Record<string,Platform> = {
        "linux":new Linux,
        "darwin": new MacOS,
        "win32":new Windows
    }
    const os = process.platform

   const platform = map[os] 
   if(!platform){
    throw new UnsupporetedPlatform
   }

   return platform


}

export const platform = getPlatfrom()