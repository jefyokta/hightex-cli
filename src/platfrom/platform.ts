import { homedir } from "node:os";
import path from "node:path";
import { Storage } from "../lib/storage";
import { PromptApi } from "@bunli/core";

export abstract class Platform {
    public get storagePath(){
        return path.join(homedir(),'.hightex','hightex-cli-storage.json')
    }

    protected storage:Storage

    constructor(){
        this.storage = new Storage(this)

    }
    abstract install(api?:PromptApi): Promise<void>;

    abstract update(): Promise<void>;

    abstract uninstall(): Promise<void>;

    abstract open(): Promise<void>;

    abstract isInstalled(): Promise<boolean>;

    abstract getInstalledVersion(): Promise<string | null>;

    abstract getLatestVersion(): Promise<string>;

    abstract getExecutablePath(): Promise<string | null>;
}