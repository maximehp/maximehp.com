import { profile } from "/data/profile.js";
import { escapeHtml, renderSocialLinks, renderTagRow } from "/scripts/site.js";

export function mountAbout() {
    const aboutPhoto = document.getElementById("about-photo");
    const aboutTitle = document.getElementById("about-title");
    const aboutSubtitle = document.getElementById("about-subtitle");
    const aboutSummary = document.getElementById("about-summary");
    const aboutAvailability = document.getElementById("about-availability");
    const aboutTopics = document.getElementById("about-topics");
    const aboutBio = document.getElementById("about-bio");
    const aboutCurrent = document.getElementById("about-current");
    const aboutInterests = document.getElementById("about-interests");

    if (!aboutPhoto || !aboutTitle || !aboutSubtitle || !aboutSummary || !aboutAvailability || !aboutTopics || !aboutBio || !aboutCurrent || !aboutInterests) {
        return () => {};
    }

    aboutPhoto.src = profile.headshot.src;
    aboutPhoto.alt = profile.headshot.alt;
    aboutTitle.textContent = profile.aboutHeading;
    aboutSubtitle.textContent = profile.title;
    aboutSummary.textContent = profile.aboutSummary;
    aboutAvailability.textContent = profile.shortAvailability;
    aboutTopics.textContent = profile.contact.preferredTopics;

    aboutBio.innerHTML = profile.fullBio.map((paragraph) => `
        <p>${escapeHtml(paragraph)}</p>
    `).join("");

    aboutCurrent.innerHTML = profile.currentWork.map((item) => `
        <div class="detail-item">
            <span class="detail-dot" aria-hidden="true"></span>
            <p>${escapeHtml(item)}</p>
        </div>
    `).join("");

    renderTagRow(aboutInterests, profile.interests);
    renderSocialLinks(document.getElementById("about-socials"));

    return () => {};
}
