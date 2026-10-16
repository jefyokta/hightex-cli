import { existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { Platform } from "./platform";

export class Linux extends Platform {
    private readonly appPath = join(
        homedir(),
        "Applications",
        "HighTex.AppImage",
    );

    async install(): Promise<void> {
        const url = await this.getLatestAssetUrl();
        await this.download(url, this.appPath);
        chmodSync(this.appPath, 0o755);
    }

    async update(): Promise<void> {
        await this.install();
    }

    async uninstall(): Promise<void> {
        if (existsSync(this.appPath)) {
            const { unlinkSync } = await import("node:fs");
            unlinkSync(this.appPath);
        }
    }

    async open(): Promise<void> {
        const executable = await this.getExecutablePath();

        if (!executable) {
            throw new Error("HighTex is not installed.");
        }

        const process = Bun.spawn([executable], {
            stdin: "ignore",
            stdout: "ignore",
            stderr: "ignore",
        });

        process.unref();
    }

    async isInstalled(): Promise<boolean> {
        return existsSync(this.appPath);
    }

    async getInstalledVersion(): Promise<string | null> {
        const executable = await this.getExecutablePath();

        if (!executable) {
            return null;
        }

        const result = await $`${executable} version`.nothrow().quiet();

        return result.exitCode === 0
            ? result.stdout.toString().trim()
            : null;
    }

    async getLatestVersion(): Promise<string> {
        return this.fetchLatestRelease().then(
            (release) => release.tag_name.replace(/^v/, ""),
        );
    }

    async getExecutablePath(): Promise<string | null> {
        return existsSync(this.appPath) ? this.appPath : null;
    }

    private async getLatestAssetUrl(): Promise<string> {
        const release = await this.fetchLatestRelease();
        const asset = release.assets.find((item) =>
            item.name.endsWith(".AppImage"),
        );

        if (!asset) {
            throw new Error("No AppImage found in the latest release.");
        }

        return asset.browser_download_url;
    }

    private async fetchLatestRelease(): Promise<{
        tag_name: string;
        assets: {
            name: string;
            browser_download_url: string;
        }[];
    }> {
        const response = await fetch(
            "https://api.github.com/repos/jefyokta/hightex-desktop/releases/latest",
        );

        if (!response.ok) {
            throw new Error("Failed to fetch the latest HighTex release.");
        }

        return response.json();
    }

    private async download(url: string, destination: string): Promise<void> {
        const directory = join(homedir(), "Applications");
        await $`mkdir -p ${directory}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to download HighTex.");
        }

        await Bun.write(destination, response);
    }
}