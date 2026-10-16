
    interface StorageData {
        executablePath?: string;
    }
    
    interface GitHubRelease {
        tag_name: string;
        assets: {
            name: string;
            browser_download_url: string;
        }[];
    }
    

