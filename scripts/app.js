import { mountHome } from "/scripts/home.js";
import { mountAbout } from "/scripts/about.js";
import { mountProjects } from "/scripts/projects-page.js";
import { mountResume } from "/scripts/resume.js";
import {
    applySharedContent,
    refreshHeaderState,
    scheduleScrollLiftUpdate,
    setActiveNav,
    setupReveals,
    setupSiteChrome,
} from "/scripts/site.js";

const routeMounts = {
    home: mountHome,
    about: mountAbout,
    projects: mountProjects,
    resume: mountResume,
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let currentCleanup = () => {};
let navigationToken = 0;
let enterTimer = 0;

setupSiteChrome();
mountCurrentPage();
document.addEventListener("click", handleDocumentClick);
window.addEventListener("popstate", () => {
    navigate(window.location.href, { historyMode: "pop" });
});

async function navigate(targetHref, { historyMode = "push" } = {}) {
    const targetUrl = new URL(targetHref, window.location.href);
    const currentUrl = new URL(window.location.href);

    if (historyMode !== "pop" && targetUrl.href === currentUrl.href) {
        return;
    }

    const destinationPageKey = getPageKey(targetUrl.pathname);
    if (destinationPageKey) {
        setActiveNav(destinationPageKey);
    }

    const token = ++navigationToken;

    try {
        const [nextDocument] = await Promise.all([
            fetchDocument(targetUrl),
            runLeaveAnimation(),
        ]);

        if (token !== navigationToken) {
            return;
        }

        swapDocument(nextDocument);

        if (historyMode === "push") {
            window.history.pushState({}, "", targetUrl.href);
        } else if (historyMode === "replace") {
            window.history.replaceState({}, "", targetUrl.href);
        }

        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        mountCurrentPage();
        runEnterAnimation();
    } catch (error) {
        window.location.href = targetUrl.href;
    }
}

function mountCurrentPage() {
    clearTimeout(enterTimer);
    document.body.classList.remove("is-route-leaving", "is-route-entering", "is-route-entered", "is-modal-open");
    currentCleanup();
    currentCleanup = () => {};

    const pageKey = document.body.dataset.page || getPageKey(window.location.pathname);
    applySharedContent(pageKey);
    setupReveals();
    refreshHeaderState();
    scheduleScrollLiftUpdate();

    const mount = routeMounts[pageKey];
    if (typeof mount === "function") {
        currentCleanup = mount() || (() => {});
    }
}

function handleDocumentClick(event) {
    const link = event.target.closest("a[href]");

    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
    }

    const targetUrl = new URL(link.href, window.location.href);
    const currentUrl = new URL(window.location.href);
    const sameOrigin = targetUrl.origin === window.location.origin;
    const isDownload = link.hasAttribute("download");
    const isExternal = !sameOrigin || link.target === "_blank" || targetUrl.protocol === "mailto:";
    const isHashOnly = targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search && targetUrl.hash;

    if (isDownload || isExternal || isHashOnly) {
        return;
    }

    event.preventDefault();
    navigate(targetUrl.href);
}

function fetchDocument(url) {
    return window.fetch(url.href, {
        headers: {
            "X-Requested-With": "site-router",
        },
    }).then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to load ${url.href}`);
        }

        return response.text();
    }).then((html) => new DOMParser().parseFromString(html, "text/html"));
}

function swapDocument(nextDocument) {
    const nextRoot = nextDocument.getElementById("page-root");

    if (!nextRoot) {
        throw new Error("Missing page root in destination document");
    }

    const currentRoot = document.getElementById("page-root");
    currentRoot?.replaceWith(nextRoot);

    document.title = nextDocument.title;
    document.body.dataset.page = nextDocument.body.dataset.page || getPageKey(window.location.pathname);

    const currentDescription = document.querySelector('meta[name="description"]');
    const nextDescription = nextDocument.querySelector('meta[name="description"]');

    if (currentDescription && nextDescription) {
        currentDescription.setAttribute("content", nextDescription.getAttribute("content") ?? "");
    }
}

function runLeaveAnimation() {
    if (reducedMotion) {
        return Promise.resolve();
    }

    document.body.classList.remove("is-route-entering", "is-route-entered");
    document.body.classList.add("is-route-leaving");

    return new Promise((resolve) => {
        window.setTimeout(resolve, 240);
    });
}

function runEnterAnimation() {
    if (reducedMotion) {
        document.body.classList.remove("is-route-leaving", "is-route-entering", "is-route-entered");
        return;
    }

    document.body.classList.remove("is-route-leaving");
    document.body.classList.add("is-route-entering");

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            document.body.classList.add("is-route-entered");
        });
    });

    enterTimer = window.setTimeout(() => {
        document.body.classList.remove("is-route-entering", "is-route-entered");
    }, 720);
}

function getPageKey(pathname) {
    if (pathname === "/" || pathname.endsWith("/index.html")) {
        return "home";
    }

    if (pathname === "/projects" || pathname === "/projects/" || pathname.endsWith("/projects.html") || pathname.endsWith("/projects/index.html")) {
        return "projects";
    }

    if (pathname === "/about" || pathname === "/about/" || pathname.endsWith("/about.html") || pathname.endsWith("/about/index.html")) {
        return "about";
    }

    if (pathname === "/resume" || pathname === "/resume/" || pathname.endsWith("/resume.html") || pathname.endsWith("/resume/index.html")) {
        return "resume";
    }

    return "";
}
