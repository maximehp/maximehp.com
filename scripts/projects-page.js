import { projects } from "/data/projects.js";
import { escapeHtml, renderTagRow } from "/scripts/site.js";

export function mountProjects() {
    const grid = document.getElementById("projects-grid");
    const modal = document.getElementById("project-modal");
    const modalImage = document.getElementById("modal-image");
    const modalCaption = document.getElementById("modal-caption");
    const modalTitle = document.getElementById("modal-title");
    const modalSummary = document.getElementById("modal-summary");
    const modalDescription = document.getElementById("modal-description");
    const modalTags = document.getElementById("modal-tags");
    const modalLink = document.getElementById("modal-link");
    const modalThumbs = document.getElementById("modal-thumbs");
    const modalPrev = document.querySelector("[data-modal-prev]");
    const modalNext = document.querySelector("[data-modal-next]");
    const closeControls = [...document.querySelectorAll("[data-close-modal]")];

    if (!grid || !modal || !modalImage || !modalCaption || !modalTitle || !modalSummary || !modalDescription || !modalTags || !modalLink || !modalThumbs || !modalPrev || !modalNext) {
        return () => {};
    }

    const tileImageState = new Map(projects.map((project) => [project.slug, 0]));
    let activeProjectSlug = null;
    let activeModalImageIndex = 0;
    let lastFocusedElement = null;

    renderGrid();
    openProjectFromQuery();

    const onGridClick = (event) => {
        const prevButton = event.target.closest("[data-tile-prev]");
        const nextButton = event.target.closest("[data-tile-next]");

        if (prevButton) {
            event.stopPropagation();
            cycleTile(prevButton.dataset.tilePrev, -1);
            return;
        }

        if (nextButton) {
            event.stopPropagation();
            cycleTile(nextButton.dataset.tileNext, 1);
            return;
        }

        const card = event.target.closest("[data-project-slug]");
        if (card) {
            openModal(card.dataset.projectSlug);
        }
    };

    const onGridKeydown = (event) => {
        const card = event.target.closest("[data-project-slug]");

        if (!card || event.target !== card) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openModal(card.dataset.projectSlug);
        }
    };

    const onDocumentKeydown = (event) => {
        if (modal.hidden) {
            return;
        }

        if (event.key === "Escape") {
            closeModal();
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            stepModalImage(-1);
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            stepModalImage(1);
        }
    };

    const onModalPrevClick = () => stepModalImage(-1);
    const onModalNextClick = () => stepModalImage(1);

    grid.addEventListener("click", onGridClick);
    grid.addEventListener("keydown", onGridKeydown);
    document.addEventListener("keydown", onDocumentKeydown);
    modalPrev.addEventListener("click", onModalPrevClick);
    modalNext.addEventListener("click", onModalNextClick);
    closeControls.forEach((node) => node.addEventListener("click", closeModal));

    return () => {
        grid.removeEventListener("click", onGridClick);
        grid.removeEventListener("keydown", onGridKeydown);
        document.removeEventListener("keydown", onDocumentKeydown);
        modalPrev.removeEventListener("click", onModalPrevClick);
        modalNext.removeEventListener("click", onModalNextClick);
        closeControls.forEach((node) => node.removeEventListener("click", closeModal));
        document.body.classList.remove("is-modal-open");
    };

    function renderGrid() {
        grid.innerHTML = projects.map((project) => {
            const image = project.images[tileImageState.get(project.slug) ?? 0];

            return `
                <article class="project-card glass-panel" data-project-slug="${project.slug}" tabindex="0">
                    <div class="project-card__media">
                        <button class="tile-arrow" type="button" data-tile-prev="${project.slug}" aria-label="Previous image for ${escapeHtml(project.title)}">
                            <span aria-hidden="true">&larr;</span>
                        </button>
                        <img src="${image.src}" alt="${escapeHtml(image.alt)}" data-project-image="${project.slug}">
                        <button class="tile-arrow tile-arrow--right" type="button" data-tile-next="${project.slug}" aria-label="Next image for ${escapeHtml(project.title)}">
                            <span aria-hidden="true">&rarr;</span>
                        </button>
                    </div>
                    <div class="project-card__body">
                        <div class="project-card__header">
                            <div>
                                <p class="eyebrow">Project</p>
                                <h2>${escapeHtml(project.title)}</h2>
                            </div>
                            <span class="project-card__count">${(tileImageState.get(project.slug) ?? 0) + 1}/${project.images.length}</span>
                        </div>
                        <p>${escapeHtml(project.shortSummary)}</p>
                        <div class="tag-row" data-grid-tags="${project.slug}"></div>
                    </div>
                </article>
            `;
        }).join("");

        projects.forEach((project) => {
            renderTagRow(document.querySelector(`[data-grid-tags="${project.slug}"]`), project.tags);
        });
    }

    function cycleTile(slug, direction) {
        const project = findProject(slug);

        if (!project) {
            return;
        }

        const currentIndex = tileImageState.get(slug) ?? 0;
        const nextIndex = (currentIndex + direction + project.images.length) % project.images.length;
        tileImageState.set(slug, nextIndex);

        const image = project.images[nextIndex];
        const card = document.querySelector(`[data-project-slug="${slug}"]`);

        if (!card) {
            return;
        }

        card.querySelector(`[data-project-image="${slug}"]`).src = image.src;
        card.querySelector(`[data-project-image="${slug}"]`).alt = image.alt;
        card.querySelector(".project-card__count").textContent = `${nextIndex + 1}/${project.images.length}`;
    }

    function openModal(slug) {
        const project = findProject(slug);

        if (!project) {
            return;
        }

        lastFocusedElement = document.activeElement;
        activeProjectSlug = slug;
        activeModalImageIndex = tileImageState.get(slug) ?? 0;
        renderModal(project);
        modal.hidden = false;
        document.body.classList.add("is-modal-open");
        history.replaceState({}, "", `/projects/?project=${encodeURIComponent(slug)}`);
        document.querySelector(".modal-close")?.focus();
    }

    function closeModal() {
        if (modal.hidden) {
            return;
        }

        modal.hidden = true;
        document.body.classList.remove("is-modal-open");
        activeProjectSlug = null;
        history.replaceState({}, "", "/projects/");

        if (lastFocusedElement instanceof HTMLElement) {
            lastFocusedElement.focus();
        }
    }

    function renderModal(project) {
        const image = project.images[activeModalImageIndex];
        modalImage.src = image.src;
        modalImage.alt = image.alt;
        modalCaption.textContent = image.caption ?? "";
        modalTitle.textContent = project.title;
        modalSummary.textContent = project.shortSummary;
        modalDescription.textContent = project.fullDescription;
        renderTagRow(modalTags, project.tags);

        if (project.projectUrl) {
            modalLink.hidden = false;
            modalLink.href = project.projectUrl;
        } else {
            modalLink.hidden = true;
        }

        modalThumbs.innerHTML = project.images.map((item, index) => `
            <button class="thumb ${index === activeModalImageIndex ? "is-active" : ""}" type="button" data-thumb-index="${index}" aria-label="Show image ${index + 1} for ${escapeHtml(project.title)}">
                <img src="${item.src}" alt="${escapeHtml(item.alt)}">
            </button>
        `).join("");

        modalThumbs.querySelectorAll("[data-thumb-index]").forEach((node) => {
            node.addEventListener("click", () => {
                activeModalImageIndex = Number(node.dataset.thumbIndex);
                renderModal(project);
            });
        });
    }

    function stepModalImage(direction) {
        if (!activeProjectSlug) {
            return;
        }

        const project = findProject(activeProjectSlug);

        if (!project) {
            return;
        }

        activeModalImageIndex = (activeModalImageIndex + direction + project.images.length) % project.images.length;
        renderModal(project);
    }

    function openProjectFromQuery() {
        const slug = new URLSearchParams(window.location.search).get("project");

        if (!slug) {
            return;
        }

        const project = projects.find((item) => item.slug === slug);
        if (!project) {
            history.replaceState({}, "", "/projects/");
            return;
        }

        const card = document.querySelector(`[data-project-slug="${slug}"]`);
        if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        window.setTimeout(() => openModal(slug), 240);
    }

    function findProject(slug) {
        return projects.find((project) => project.slug === slug);
    }
}
