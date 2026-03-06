function addFavicon() {
    const existing = document.querySelector("link[rel='icon']");
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "icon";
    link.href = "https://arunpanthi.com.np/logo.ico";
    link.type = "image/x-icon";

    document.head.appendChild(link);
}

async function loadSection(id, filePath) {
    const element = document.getElementById(id);

    if (!element) return;

    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}`);
        }

        const html = await response.text();
        element.innerHTML = html;

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

document.addEventListener("DOMContentLoaded", async () => {

    addFavicon();

    await loadSection("navbar", "partials/navbar.html");
    await loadSection("social-section", "partials/social.html");
    await loadSection("footer", "partials/footer.html");

});
