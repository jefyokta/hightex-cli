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

    abstract update(api?:PromptApi): Promise<void>;

    abstract uninstall(): Promise<void>;

    abstract open(): Promise<void>;

    abstract isInstalled(): Promise<boolean>;

    abstract getInstalledVersion(): Promise<string | null>;

    abstract getLatestVersion(): Promise<string>;

    abstract getExecutablePath(): Promise<string | null>;


    async create(props:PromptApi){
        const path = process.cwd();
        const title = await props.text("Project Title?",{
            placeholder:"Rancang Bangun Sistem Informasi ABC"
        })
        console.log(title)

        const categories = (await fetch("https://hightex.jefyokta.dev/api/categories").then(r=>r.json())).data;
        if(!Array.isArray(categories) || categories.length === 0){
            throw new Error("Categories not found!");
        }
        const category = await props.select("Document Category?",{
            options:categories.map(c=>({label:`${c.name} (${c.variant})`,value:c}))
        })
    }
    async compile(props:PromptApi){}
}