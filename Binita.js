// Create and append the modal and its backdrop dynamically
function createModal() {
    // Create modal backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 9998;
        display: none;
    `;
    document.body.appendChild(backdrop);

    // Create modal card
    const modal = document.createElement("div");
    modal.className = "modal-card";
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        text-align: center;
        display: none;
    `;

    // Modal title
    const title = document.createElement("h1");
    title.id = "modal-title";
    title.style.cssText = `
        font-size: 18px;
        color: #ff4757;
        margin: 0 0 10px;
    `;
    title.textContent = "Action Blocked";
    modal.appendChild(title);

    // Modal message
    const message = document.createElement("p");
    message.id = "modal-message";
    message.style.cssText = `
        font-size: 14px;
        color: #333;
        margin: 0 0 20px;
    `;
    message.textContent = "This action is not allowed on this page.";
    modal.appendChild(message);

    // Close button
    const closeButton = document.createElement("button");
    closeButton.className = "close-btn";
    closeButton.style.cssText = `
        display: inline-block;
        background: #ff4757;
        color: white;
        padding: 5px 15px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
    `;
    closeButton.textContent = "Close";
    closeButton.onclick = closeModal;
    modal.appendChild(closeButton);

    // Add hover effect for button
    closeButton.onmouseover = () => (closeButton.style.background = "#ff6f61");
    closeButton.onmouseout = () => (closeButton.style.background = "#ff4757");

    document.body.appendChild(modal);
}

// Show the modal with dynamic content
function showModal(title, message) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").textContent = message;

    document.querySelector(".modal-backdrop").style.display = "block";
    document.querySelector(".modal-card").style.display = "block";
}

// Close the modal
function closeModal() {
    document.querySelector(".modal-backdrop").style.display = "none";
    document.querySelector(".modal-card").style.display = "none";
}

// Initialize modal on page load
createModal();

// Event listeners for blocking actions
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    showModal("Right-Click Disabled", "Right-click is not allowed on this page.");
});

document.addEventListener("selectstart", function (e) {
    e.preventDefault();
    showModal("Text Selection Disabled", "Text selection is restricted on this page.");
});

document.addEventListener("copy", function (e) {
    e.preventDefault();
    showModal("Copying Disabled", "Copying content is not permitted on this page.");
});

document.addEventListener("dragstart", function (e) {
    e.preventDefault();
    showModal("Drag-and-Drop Disabled", "Dragging and dropping content is restricted.");
});

document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        showModal("Printing Disabled", "Printing this page is not allowed.");
    } else if (e.ctrlKey && e.shiftKey && e.key === "i") {
        e.preventDefault();
        showModal("Developer Tools Disabled", "Inspect Element is disabled.");
    } else if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        showModal("View Source Disabled", "Viewing the source code is not allowed.");
    } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        showModal("Saving Disabled", "Saving this page is restricted.");
    } else if (e.key === "F12") {
        e.preventDefault();
        showModal("Developer Tools Disabled", "Accessing Developer Tools is not allowed.");
    } else if (e.key === "PrintScreen") {
        e.preventDefault();
        showModal("Screenshots Disabled", "Taking screenshots is not permitted.");
    }
});

// Detect window blur to warn about screenshots
window.addEventListener("blur", () => {
    showModal("Warning!", "Screenshots may have been taken. Content is protected.");
});
