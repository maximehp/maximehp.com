import { profile } from "/data/profile.js";
import { socials } from "/data/socials.js";

let chromeBound = false;
let lastScrollY = 0;
let scrollTicking = false;
let revealObserver = null;
let navIndicatorFrame = 0;
let scrollLiftMeasureFrame = 0;
let scrollLiftAnimationFrame = 0;
let scrollLiftCurrent = 0;
let scrollLiftTarget = 0;
let scrollLiftAnimating = false;

export function setupSiteChrome() {
    if (chromeBound) {
        refreshHeaderState();
        scheduleNavIndicatorUpdate();
        scheduleScrollLiftUpdate();
        return;
    }

    chromeBound = true;
    lastScrollY = window.scrollY;

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", scheduleNavIndicatorUpdate);
    window.addEventListener("resize", scheduleScrollLiftUpdate);
    window.addEventListener("pageshow", scheduleNavIndicatorUpdate);
    window.addEventListener("pageshow", scheduleScrollLiftUpdate);

    refreshHeaderState();
    scheduleNavIndicatorUpdate();
    scheduleScrollLiftUpdate();
}

export function applySharedContent(pageKey) {
    document.querySelectorAll("[data-current-year]").forEach((node) => {
        node.textContent = new Date().getFullYear().toString();
    });

    document.querySelectorAll("[data-footer-name]").forEach((node) => {
        node.textContent = profile.name;
    });

    document.querySelectorAll("[data-email-link]").forEach((node) => {
        node.href = `mailto:${profile.contact.email}`;
        node.textContent = profile.contact.email;
    });

    document.querySelectorAll("[data-resume-link]").forEach((node) => {
        node.href = "/resume/";
    });

    setActiveNav(pageKey);
}

export function setActiveNav(pageKey) {
    document.querySelectorAll("[data-nav]").forEach((node) => {
        const isActive = node.dataset.nav === pageKey;
        node.classList.toggle("is-active", isActive);

        if (isActive) {
            node.setAttribute("aria-current", "page");
        } else {
            node.removeAttribute("aria-current");
        }
    });

    scheduleNavIndicatorUpdate();
}

export function refreshHeaderState() {
    applyHeaderState(window.scrollY);
}

export function setupReveals() {
    const revealNodes = [...document.querySelectorAll(".reveal:not([data-scroll-lift])")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    revealObserver?.disconnect();
    revealObserver = null;

    revealNodes.forEach((node) => {
        node.classList.remove("is-visible");

        const rect = node.getBoundingClientRect();
        const isInitiallyVisible = rect.bottom > 0 && rect.top < viewportHeight * 0.92;

        if (isInitiallyVisible) {
            node.classList.add("is-visible");
        }
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
        revealNodes.forEach((node) => node.classList.add("is-visible"));
        return;
    }

    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                revealObserver?.unobserve(entry.target);
            }
        });
    }, { threshold: 0.18 });

    revealNodes
        .filter((node) => !node.classList.contains("is-visible"))
        .forEach((node) => revealObserver?.observe(node));
}

export function scheduleNavIndicatorUpdate() {
    window.cancelAnimationFrame(navIndicatorFrame);
    navIndicatorFrame = window.requestAnimationFrame(updateNavIndicator);
}

export function scheduleScrollLiftUpdate() {
    window.cancelAnimationFrame(scrollLiftMeasureFrame);
    scrollLiftMeasureFrame = window.requestAnimationFrame(updateScrollLiftTarget);
}

export function renderSocialLinks(container) {
    if (!container) {
        return;
    }

    container.innerHTML = socials.map((social) => `
        <a class="social-card" href="${social.href}" ${social.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>
            <span class="social-mark" aria-hidden="true">${escapeHtml(social.monogram)}</span>
            <span class="social-copy">
                <strong>${escapeHtml(social.label)}</strong>
                <span>${escapeHtml(social.handle)}</span>
            </span>
        </a>
    `).join("");
}

export function renderTagRow(container, tags) {
    if (!container) {
        return;
    }

    container.innerHTML = tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

export function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function handleScroll() {
    if (scrollTicking) {
        return;
    }

    scrollTicking = true;
    window.requestAnimationFrame(() => {
        applyHeaderState(window.scrollY);
        scheduleScrollLiftUpdate();
        scrollTicking = false;
    });
}

function applyHeaderState(currentScrollY) {
    const header = document.querySelector(".site-header");

    if (!header) {
        lastScrollY = currentScrollY;
        return;
    }

    const delta = currentScrollY - lastScrollY;
    header.classList.toggle("is-scrolled", currentScrollY > 12);

    if (currentScrollY <= 24 || delta < -4) {
        header.classList.remove("is-hidden");
    } else if (delta > 4 && currentScrollY > 120) {
        header.classList.add("is-hidden");
    }

    lastScrollY = currentScrollY;
}

function updateNavIndicator() {
    const nav = document.querySelector(".site-nav");
    const indicator = nav?.querySelector(".nav-indicator");
    const activeLink = nav?.querySelector(".nav-link.is-active");

    if (!nav || !indicator || !activeLink) {
        if (indicator) {
            indicator.style.opacity = "0";
            indicator.style.width = "0px";
        }
        return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const left = linkRect.left - navRect.left;

    indicator.style.opacity = "1";
    indicator.style.width = `${linkRect.width}px`;
    indicator.style.transform = `translateX(${left}px)`;
}

function updateScrollLiftTarget() {
    const liftNodes = [...document.querySelectorAll("[data-scroll-lift]")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const liftDistance = Math.max(135, Math.min(210, viewportHeight * 0.18));
    const progress = reducedMotion
        ? 1
        : Math.max(0, Math.min(1, window.scrollY / liftDistance));
    scrollLiftTarget = reducedMotion ? 1 : easeInOutQuint(progress);

    if (reducedMotion) {
        scrollLiftCurrent = scrollLiftTarget;
        applyScrollLiftProgress(liftNodes, scrollLiftCurrent);
        scrollLiftAnimating = false;
        window.cancelAnimationFrame(scrollLiftAnimationFrame);
        return;
    }

    if (!scrollLiftAnimating) {
        scrollLiftAnimating = true;
        animateScrollLifts();
    }
}

function animateScrollLifts() {
    const liftNodes = [...document.querySelectorAll("[data-scroll-lift]")];

    scrollLiftCurrent += (scrollLiftTarget - scrollLiftCurrent) * 0.18;

    if (Math.abs(scrollLiftTarget - scrollLiftCurrent) < 0.0015) {
        scrollLiftCurrent = scrollLiftTarget;
    }

    applyScrollLiftProgress(liftNodes, scrollLiftCurrent);

    if (Math.abs(scrollLiftTarget - scrollLiftCurrent) < 0.0015) {
        scrollLiftAnimating = false;
        return;
    }

    scrollLiftAnimationFrame = window.requestAnimationFrame(animateScrollLifts);
}

function applyScrollLiftProgress(liftNodes, progress) {
    if (!liftNodes.length) {
        return;
    }

    liftNodes.forEach((node) => {
        node.style.setProperty("--scroll-lift-progress", progress.toFixed(4));
    });
}

function easeInOutQuint(value) {
    if (value < 0.5) {
        return 16 * Math.pow(value, 5);
    }

    return 1 - Math.pow(-2 * value + 2, 5) / 2;
}
