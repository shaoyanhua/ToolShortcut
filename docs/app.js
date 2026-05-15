const CONFIG = {
    owner: "shaoyanhua",
    repo: "ToolShortcut",
    path: "",
    ignoredNames: new Set(["README.md", ".gitignore", ".gitattributes"]),
};

const FALLBACK_FILES = [
    {
        name: "Clash.Verge_2.4.7_x64-setup.exe",
        path: "Clash.Verge_2.4.7_x64-setup.exe",
        size: 38671464,
    },
    {
        name: "Codex Installer.exe",
        path: "Codex Installer.exe",
        size: 1289748,
    },
    {
        name: "代理50g.7z",
        path: "代理50g.7z",
        size: 0,
    },
];

const repoNameElement = document.querySelector("#repoName");
const fileCountElement = document.querySelector("#fileCount");
const totalSizeElement = document.querySelector("#totalSize");
const statusPillElement = document.querySelector("#statusPill");
const panelNoteElement = document.querySelector("#panelNote");
const repoLinkElement = document.querySelector("#repoLink");
const fileGridElement = document.querySelector("#fileGrid");
const fileCardTemplate = document.querySelector("#fileCardTemplate");

function resolveRepoContext() {
    const host = window.location.hostname;
    const pathName = window.location.pathname.split("/").filter(Boolean);
    const inferredOwner = host.endsWith("github.io") ? host.split(".")[0] : CONFIG.owner;
    const inferredRepo = pathName.length > 0 ? pathName[0] : CONFIG.repo;

    return {
        owner: inferredOwner || CONFIG.owner,
        repo: inferredRepo || CONFIG.repo,
        path: CONFIG.path,
    };
}

function encodePath(path) {
    return path
        .split("/")
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}

function formatBytes(size) {
    if (size === 0) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / 1024 ** exponent;
    const digits = value >= 100 || exponent === 0 ? 0 : value >= 10 ? 1 : 2;

    return `${value.toFixed(digits)} ${units[exponent]}`;
}

function getExtensionLabel(fileName) {
    const segments = fileName.split(".");
    if (segments.length === 1) {
        return "FILE";
    }

    return segments.at(-1).toUpperCase();
}

function setStatus(text) {
    statusPillElement.textContent = text;
}

function createEmptyState(message) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = message;
    return emptyState;
}

function renderFiles(files, note) {
    fileGridElement.innerHTML = "";
    panelNoteElement.textContent = note;

    if (files.length === 0) {
        fileGridElement.appendChild(createEmptyState("当前目录没有可展示的文件。你可以先把安装包或压缩包推到仓库根目录。"));
        fileCountElement.textContent = "0";
        totalSizeElement.textContent = "0 B";
        return;
    }

    const fragment = document.createDocumentFragment();
    let totalSize = 0;

    files.forEach((file) => {
        totalSize += file.size;

        const card = fileCardTemplate.content.firstElementChild.cloneNode(true);
        card.querySelector(".file-ext").textContent = getExtensionLabel(file.name);
        card.querySelector(".file-size").textContent = formatBytes(file.size);
        card.querySelector(".file-name").textContent = file.name;
        card.querySelector(".file-meta").textContent = file.source === "api"
            ? "已从 GitHub 仓库实时同步。点击后将直接下载仓库中的原始文件。"
            : "GitHub API 当前不可用，已切换为页面内置文件清单。";

        const fileLink = card.querySelector(".file-link");
        fileLink.href = file.url;
        fileLink.setAttribute("download", file.name);
        fileLink.textContent = "下载文件";

        fragment.appendChild(card);
    });

    fileGridElement.appendChild(fragment);
    fileCountElement.textContent = String(files.length);
    totalSizeElement.textContent = formatBytes(totalSize);
}

function mapApiFile(file) {
    return {
        name: file.name,
        path: file.path,
        size: file.size,
        url: file.download_url,
        source: "api",
    };
}

function mapFallbackFile(file, repoContext) {
    return {
        ...file,
        url: `https://github.com/${repoContext.owner}/${repoContext.repo}/blob/HEAD/${encodePath(file.path)}?raw=1`,
        source: "fallback",
    };
}

async function loadFiles() {
    const repoContext = resolveRepoContext();
    const repoLabel = `${repoContext.owner} / ${repoContext.repo}`;

    repoNameElement.textContent = repoLabel;
    repoLinkElement.href = `https://github.com/${repoContext.owner}/${repoContext.repo}`;
    setStatus("正在同步 GitHub 文件");

    try {
        const apiPath = repoContext.path ? `/${encodePath(repoContext.path)}` : "";
        const response = await fetch(`https://api.github.com/repos/${repoContext.owner}/${repoContext.repo}/contents${apiPath}`, {
            headers: {
                Accept: "application/vnd.github+json",
            },
        });

        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}`);
        }

        const entries = await response.json();
        const files = entries
            .filter((entry) => entry.type === "file")
            .filter((entry) => !CONFIG.ignoredNames.has(entry.name))
            .map(mapApiFile)
            .sort((left, right) => right.size - left.size || left.name.localeCompare(right.name, "zh-CN"));

        renderFiles(files, "当前显示的是仓库根目录中的文件。你每次推送新文件后，刷新页面即可同步。 ");
        setStatus("GitHub 文件已同步");
    } catch (error) {
        console.error(error);

        const fallbackFiles = FALLBACK_FILES
            .map((file) => mapFallbackFile(file, repoContext))
            .sort((left, right) => right.size - left.size || left.name.localeCompare(right.name, "zh-CN"));

        renderFiles(fallbackFiles, "GitHub API 读取失败，当前显示的是页面内置清单。仓库保持公开时，实际访问通常会自动恢复实时列表。 ");
        setStatus("已切换内置清单");
    }
}

loadFiles();