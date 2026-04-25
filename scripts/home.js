import { profile } from "/data/profile.js";
import { projects } from "/data/projects.js";
import { escapeHtml, renderSocialLinks, renderTagRow } from "/scripts/site.js";

const CAROUSEL_COPIES = 3;

export function mountHome() {
    const heroName = document.getElementById("hero-name");
    const heroTitle = document.getElementById("hero-title");
    const heroSummary = document.getElementById("hero-summary");
    const homeAvailability = document.getElementById("home-availability");

    if (!heroName || !heroTitle || !heroSummary || !homeAvailability) {
        return () => {};
    }

    heroName.textContent = `Hi! I'm ${profile.name}`;
    heroTitle.textContent = profile.title;
    heroSummary.textContent = profile.heroSummary;
    homeAvailability.textContent = profile.shortAvailability;

    renderSocialLinks(document.getElementById("home-socials"));

    return buildCarousel();
}

function buildCarousel() {
    const track = document.getElementById("project-carousel-track");
    const prevButton = document.querySelector("[data-carousel-prev]");
    const nextButton = document.querySelector("[data-carousel-next]");

    if (!track || !prevButton || !nextButton || !track.parentElement) {
        return () => {};
    }

    const viewport = track.parentElement;
    let snapTimer = 0;
    let scrollFrame = 0;
    let resizeFrame = 0;

    track.innerHTML = Array.from({ length: CAROUSEL_COPIES }, (_, copyIndex) => projects.map((project, index) => `
        <article class="carousel-slide" data-carousel-index="${index}" data-copy-index="${copyIndex}">
            <a class="carousel-card" href="/projects/?project=${encodeURIComponent(project.slug)}">
                <div class="carousel-card__image">
                    <img src="${project.images[0].src}" alt="${escapeHtml(project.images[0].alt)}">
                </div>
                <div class="carousel-card__body">
                    <div class="carousel-card__top">
                        <p class="eyebrow">Project</p>
                        <h3>${escapeHtml(project.title)}</h3>
                    </div>
                    <p>${escapeHtml(project.shortSummary)}</p>
                    <div class="tag-row carousel-card__tags" data-tag-row="${copyIndex}-${escapeHtml(project.slug)}"></div>
                    <span class="carousel-link">${index === 0 ? "Centered feature" : "Open full project view"} &rarr;</span>
                </div>
            </a>
        </article>
    `).join("")).join("");

    for (let copyIndex = 0; copyIndex < CAROUSEL_COPIES; copyIndex += 1) {
        projects.forEach((project) => {
            renderTagRow(document.querySelector(`[data-tag-row="${copyIndex}-${project.slug}"]`), project.tags);
        });
    }

    const slides = [...track.querySelectorAll(".carousel-slide")];
    const middleCopyOffset = projects.length;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const centerSlide = (slide, behavior = "smooth") => {
        if (!slide) {
            return;
        }

        const left = slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2;
        if (typeof viewport.scrollTo === "function") {
            viewport.scrollTo({
                left,
                behavior: reducedMotion ? "auto" : behavior,
            });
            return;
        }

        viewport.scrollLeft = left;
    };

    const getSingleSetWidth = () => {
        const first = slides.find((slide) => Number(slide.dataset.copyIndex) === 0 && Number(slide.dataset.carouselIndex) === 0);
        const second = slides.find((slide) => Number(slide.dataset.copyIndex) === 1 && Number(slide.dataset.carouselIndex) === 0);

        if (!first || !second) {
            return 0;
        }

        return second.offsetLeft - first.offsetLeft;
    };

    const recenterIfNeeded = () => {
        const setWidth = getSingleSetWidth();

        if (!setWidth) {
            return;
        }

        if (viewport.scrollLeft < setWidth * 0.5) {
            viewport.scrollLeft += setWidth;
        } else if (viewport.scrollLeft > setWidth * 1.5) {
            viewport.scrollLeft -= setWidth;
        }
    };

    const updateVisuals = () => {
        const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
        const sampleSlide = slides[middleCopyOffset + 1] ?? slides[middleCopyOffset] ?? slides[0];
        const slideSpan = sampleSlide ? sampleSlide.offsetLeft - slides[middleCopyOffset].offsetLeft : 320;

        slides.forEach((slide) => {
            const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
            const distance = (slideCenter - viewportCenter) / Math.max(slideSpan, 1);
            const absDistance = Math.abs(distance);
            const clamped = Math.min(absDistance, 2.1);
            const y = clamped * 0.42;
            const scale = Math.max(0.88, 1 - clamped * 0.05);
            const opacity = absDistance <= 1 ? 1 - absDistance * 0.08 : Math.max(0.84, 0.92 - (absDistance - 1) * 0.04);
            const zIndex = 30 - Math.round(clamped * 10);

            slide.style.transform = `translateY(${y}rem) scale(${scale})`;
            slide.style.opacity = opacity.toFixed(3);
            slide.style.zIndex = String(zIndex);

            slide.classList.toggle("is-active", absDistance < 0.35);
            slide.classList.toggle("is-prev", distance < -0.35 && distance > -1.35);
            slide.classList.toggle("is-next", distance > 0.35 && distance < 1.35);
            slide.classList.toggle("is-distant", absDistance >= 1.35);
        });
    };

    const scheduleVisuals = () => {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = window.requestAnimationFrame(() => {
            recenterIfNeeded();
            updateVisuals();
        });
    };

    const snapToNearest = () => {
        const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
        let nearest = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        slides.forEach((slide) => {
            const copyIndex = Number(slide.dataset.copyIndex);
            if (copyIndex !== 1) {
                return;
            }

            const center = slide.offsetLeft + slide.offsetWidth / 2;
            const distance = Math.abs(center - viewportCenter);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = slide;
            }
        });

        centerSlide(nearest, "smooth");
    };

    const scheduleSnap = () => {
        window.clearTimeout(snapTimer);
        snapTimer = window.setTimeout(() => {
            snapToNearest();
        }, 180);
    };

    const onPrevClick = () => {
        const active = slides.find((slide) => slide.classList.contains("is-active") && Number(slide.dataset.copyIndex) === 1)
            ?? slides[middleCopyOffset];
        centerSlide(active?.previousElementSibling instanceof HTMLElement ? active.previousElementSibling : slides[middleCopyOffset - 1], "smooth");
    };

    const onNextClick = () => {
        const active = slides.find((slide) => slide.classList.contains("is-active") && Number(slide.dataset.copyIndex) === 1)
            ?? slides[middleCopyOffset];
        centerSlide(active?.nextElementSibling instanceof HTMLElement ? active.nextElementSibling : slides[middleCopyOffset + 1], "smooth");
    };

    const onViewportKeydown = (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            onPrevClick();
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            onNextClick();
        }
    };

    const onViewportWheel = (event) => {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

        if (Math.abs(delta) < 1) {
            return;
        }

        event.preventDefault();
        viewport.scrollLeft += delta * 2;
        scheduleVisuals();
        scheduleSnap();
    };

    const onViewportScroll = () => {
        scheduleVisuals();
        scheduleSnap();
    };

    const onResize = () => {
        window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => {
            centerSlide(slides[middleCopyOffset], "auto");
            updateVisuals();
        });
    };

    prevButton.addEventListener("click", onPrevClick);
    nextButton.addEventListener("click", onNextClick);
    viewport.addEventListener("keydown", onViewportKeydown);
    viewport.addEventListener("wheel", onViewportWheel, { passive: false });
    viewport.addEventListener("scroll", onViewportScroll, { passive: true });
    window.addEventListener("resize", onResize);

    centerSlide(slides[middleCopyOffset], "auto");
    updateVisuals();

    return () => {
        window.cancelAnimationFrame(scrollFrame);
        window.cancelAnimationFrame(resizeFrame);
        window.clearTimeout(snapTimer);
        prevButton.removeEventListener("click", onPrevClick);
        nextButton.removeEventListener("click", onNextClick);
        viewport.removeEventListener("keydown", onViewportKeydown);
        viewport.removeEventListener("wheel", onViewportWheel);
        viewport.removeEventListener("scroll", onViewportScroll);
        window.removeEventListener("resize", onResize);
    };
}
