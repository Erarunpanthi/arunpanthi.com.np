// hide-links.js
window.addEventListener('DOMContentLoaded', (event) => {
    // Select all elements with class 'cta-button' and hide them
    const buttons = document.querySelectorAll('.cta-button');
    buttons.forEach(button => {
        button.style.display = 'none';  // Hide the link
    });
});
