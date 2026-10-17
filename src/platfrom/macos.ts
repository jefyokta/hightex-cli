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
            api.cancel("HighTex already installed")
            return;
        }

        await $`bash -c ${"curl -fsSL https://hightex.jefyokta.dev/macos/install.sh | bash"}`;

        const executablePath = await this.getExecutablePath();

        if (executablePath) {
            this.storage.set({ executablePath });
        }
    }

    async update(api: PromptApi): Promise<void> {
    if (!(await this.isInstalled())) {
        throw new ExecutableNotFound();
    }

    const spinner = api.spinner("HighTex Updater...");
    spinner.start();

    try {
        spinner.update("Checking for updates...");

        const installedVersion = await this.getInstalledVersion();
        const release = await this.fetchLatestRelease();
        const latestVersion = release.tag_name.replace(/^v/, "");

        if (installedVersion === latestVersion) {
            spinner.stop("HighTex is already up to date.");
            return;
        }

        spinner.update(`Updating HighTex ${installedVersion ?? "unknown"} → ${latestVersion}...`);

        const asset = release.assets.find(
            ({ name }) =>
                name.startsWith("HighTex") &&
                name.endsWith(".zip") &&
                /macos|darwin/i.test(name),
        );

        if (!asset) {
            throw new Error(
                `No macOS ZIP asset found in release ${release.tag_name}.`,
            );
        }

        spinner.update("Downloading update...");

        const response = await fetch(asset.browser_download_url);

        if (!response.ok) {
            throw new Error(
                `Failed to download HighTex: ${response.status}`,
            );
        }

        const tempPath = join(tmpdir(), `hightex-${crypto.randomUUID()}`);
        const archivePath = join(tempPath, "HighTex.zip");
        const extractPath = join(tempPath, "extracted");

        mkdirSync(extractPath, { recursive: true });

        try {
            await Bun.write(archivePath, response);

            spinner.update("Extracting update...");
            await $`ditto -x -k ${archivePath} ${extractPath}`;

            const extractedApp = this.findApp(extractPath);

            if (!extractedApp) {
                throw new Error("HighTex.app was not found in the ZIP archive.");
            }

            spinner.update("Replacing application...");

            await $`osascript -e ${'tell application "HighTex" to quit'}`
                .nothrow()
                .quiet();

            rmSync(this.appPath, { recursive: true, force: true });
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
            rmSync(tempPath, { recursive: true, force: true });
        }

        spinner.stop(`HighTex updated to ${latestVersion}.`);
    } catch (error) {
        spinner.stop("Failed to update HighTex.");
        throw error;
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
