import {
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type { Platform } from "../platfrom/platform";

export class Storage {
    constructor(private readonly platform: Platform) {}

    get(): StorageData {
        if (!existsSync(this.platform.storagePath)) {
            return {};
        }

        try {
            return JSON.parse(
                readFileSync(this.platform.storagePath, "utf8"),
            );
        } catch {
            return {};
        }
    }

    set(data: Partial<StorageData>): void {
        const current = this.get();

        mkdirSync(dirname(this.platform.storagePath), {
            recursive: true,
        });

        writeFileSync(
            this.platform.storagePath,
            JSON.stringify({ ...current, ...data }, null, 2),
            "utf8",
        );
    }

    clear(): void {
        mkdirSync(dirname(this.platform.storagePath), {
            recursive: true,
        });

        writeFileSync(this.platform.storagePath, "{}", "utf8");
    }
}