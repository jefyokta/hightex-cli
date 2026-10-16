import {
    existsSync,
    mkdirSync,
    readdirSync,
    rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { Platform } from "./platform";
import { ExecutableNotFound } from "../exception/executble-not-found";
import { PromptApi } from "@bunli/core";

interface GitHubRelease {
    tag_name: string;
    assets: {
        name: string;
        browser_download_url: string;
    }[];
}

export class MacOS extends Platform {
    private readonly appPath = "/Applications/HighTex.app";

    public get executablePath(): string {
        const { executablePath } = this.storage.get();

        return executablePath || join(
            this.appPath,
            "Contents",
            "MacOS",
            "HighTex",
        );
    }

    async install(api:PromptApi): Promise<void> {
        if (await this.isInstalled()) {
            return;
        }

        await $`bash -c ${"curl -fsSL https://hightex.jefyokta.dev/macos/install.sh | bash"}`;

        const executablePath = await this.getExecutablePath();

        if (executablePath) {
            this.storage.set({ executablePath });
        }
    }

    async update(): Promise<void> {
        if (!(await this.isInstalled())) {
            throw new ExecutableNotFound();
        }

        const release = await this.fetchLatestRelease();

        const asset = release.assets.find(
            ({ name }) =>
                name.endsWith(".zip") &&
                /macos|darwin/i.test(name),
        );

        if (!asset) {
            throw new Error(
                `No macOS ZIP asset found in release ${release.tag_name}.`,
            );
        }

        const response = await fetch(asset.browser_download_url);

        if (!response.ok) {
            throw new Error(
                `Failed to download HighTex: ${response.status}`,
            );
        }

        const tempPath = join(
            tmpdir(),
            `hightex-${crypto.randomUUID()}`,
        );
        const archivePath = join(tempPath, "HighTex.zip");
        const extractPath = join(tempPath, "extracted");

        mkdirSync(extractPath, { recursive: true });

        try {
            await Bun.write(archivePath, response);
            await $`ditto -x -k ${archivePath} ${extractPath}`;

            const extractedApp = this.findApp(extractPath);

            if (!extractedApp) {
                throw new Error(
                    "HighTex.app was not found in the ZIP archive.",
                );
            }

            await $`osascript -e ${'tell application "HighTex" to quit'}`
                .nothrow()
                .quiet();

            rmSync(this.appPath, {
                recursive: true,
                force: true,
            });

            await $`ditto ${extractedApp} ${this.appPath}`;

            this.storage.set({
                executablePath: join(
                    this.appPath,
                    "Contents",
                    "MacOS",
                    "HighTex",
                ),
            });
        } finally {
            rmSync(tempPath, {
                recursive: true,
                force: true,
            });
        }
    }

    async uninstall(): Promise<void> {
        if (!existsSync(this.appPath)) {
            return;
        }

        await $`osascript -e ${'tell application "HighTex" to quit'}`
            .nothrow()
            .quiet();

        rmSync(this.appPath, {
            recursive: true,
            force: true,
        });

        this.storage.set({ executablePath: "" });
    }

    async open(): Promise<void> {
        if (!(await this.isInstalled())) {
            throw new ExecutableNotFound();
        }

        await $`open -a ${this.appPath}`;
    }

    async isInstalled(): Promise<boolean> {
        return existsSync(this.appPath);
    }

    async getInstalledVersion(): Promise<string | null> {
        if (!(await this.isInstalled())) {
            return null;
        }

        const result = await $`/usr/libexec/PlistBuddy
            -c "Print :CFBundleShortVersionString"
            ${join(this.appPath, "Contents", "Info.plist")}`
            .nothrow()
            .quiet();

        return result.exitCode === 0
            ? result.stdout.toString().trim()
            : null;
    }

    async getLatestVersion(): Promise<string> {
        const release = await this.fetchLatestRelease();

        return release.tag_name.replace(/^v/, "");
    }

    async getExecutablePath(): Promise<string | null> {
        return existsSync(this.executablePath)
            ? this.executablePath
            : null;
    }

    private findApp(directory: string): string | null {
        for (const entry of readdirSync(directory, {
            withFileTypes: true,
        })) {
            const path = join(directory, entry.name);

            if (
                entry.isDirectory() &&
                entry.name === "HighTex.app"
            ) {
                return path;
            }

            if (entry.isDirectory()) {
                const found = this.findApp(path);

                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    private async fetchLatestRelease(): Promise<GitHubRelease> {
        const response = await fetch(
            "https://api.github.com/repos/jefyokta/hightex-desktop/releases/latest",
            {
                headers: {
                    Accept: "application/vnd.github+json",
                },
            },
        );

        if (!response.ok) {
            throw new Error(
                `Failed to fetch the latest HighTex release: ${response.status}`,
            );
        }

        return (await response.json()) as GitHubRelease;
    }
}
