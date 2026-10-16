export class UnsupporetedPlatform extends Error{
    constructor(opt?:ErrorOptions){
        super(`Unsupported platform ${process.platform}`,opt)
    }
}