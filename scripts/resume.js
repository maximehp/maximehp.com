import { profile } from "/data/profile.js";

export function mountResume() {
    const resumeSummary = document.getElementById("resume-summary");
    const resumeObject = document.getElementById("resume-object");
    const resumeDownload = document.getElementById("resume-download");
    const resumeFallback = document.getElementById("resume-fallback");

    if (!resumeSummary || !resumeObject || !resumeDownload || !resumeFallback) {
        return () => {};
    }

    resumeSummary.textContent = profile.resume.summary;
    resumeObject.data = profile.resume.href;
    resumeDownload.href = profile.resume.href;
    resumeFallback.href = profile.resume.href;

    return () => {};
}
