async function loadSection(id, filePath) {
    const element = document.getElementById(id);

    if (!element) return;

    try {
        const response = await fetch(filePath);
        const html = await response.text();
        element.innerHTML = html;

        // After footer loads, set the year
        if (id === "footer") {
            const yearElement = document.getElementById("year");
            if (yearElement) {
                yearElement.textContent = new Date().getFullYear();
            }
        }

    } catch (error) {
        console.error("Error loading section:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadSection("navbar", "partials/navbar.html");
    loadSection("social-section", "partials/social.html");
    loadSection("footer", "partials/footer.html");
});
