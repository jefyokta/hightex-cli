import { existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { Platform } from "./platform";

export class Windows extends Platform {
    private readonly installPath = join(
        process.env.LOCALAPPDATA ?? "",
        "Programs",
        "HighTex",
    );

    private readonly executablePath = join(
        this.installPath,
        "HighTex.exe",
    );

    async install(): Promise<void> {
        const installer = await this.downloadInstaller();
        await $`${installer} /S`;
    }

    async update(): Promise<void> {
        await this.install();
    }

    async uninstall(): Promise<void> {
        const uninstaller = join(this.installPath, "Uninstall HighTex.exe");

        if (existsSync(uninstaller)) {
            await $`${uninstaller} /S`;
        } else {
            throw new Error("HighTex uninstaller not found.");
        }
    }

    async open(): Promise<void> {
        const executable = await this.getExecutablePath();

        if (!executable) {
            throw new Error("HighTex is not installed.");
        }

        const child = Bun.spawn([executable], {
            stdin: "ignore",
            stdout: "ignore",
            stderr: "ignore",
        });

        child.unref();
    }

    async isInstalled(): Promise<boolean> {
        return existsSync(this.executablePath);
    }

    async getInstalledVersion(): Promise<string | null> {
        if (!(await this.isInstalled())) {
            return null;
        }

        const result = await $`powershell -NoProfile -Command "(Get-Item '${this.executablePath}').VersionInfo.ProductVersion"`.nothrow().quiet();

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

    private async downloadInstaller(): Promise<string> {
        const release = await this.fetchLatestRelease();
        const asset = release.assets.find((item) =>
            item.name.endsWith(".exe"),
        );

        if (!asset) {
            throw new Error("No Windows installer found in the latest release.");
        }

        const destination = join(
            process.env.TEMP ?? ".",
            asset.name,
        );

        const response = await fetch(asset.browser_download_url);

        if (!response.ok) {
            throw new Error("Failed to download the HighTex installer.");
        }

        await Bun.write(destination, response);
        return destination;
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
}