// js/hide-links.js – Option 1
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cta-button a').forEach(link => {
        link.setAttribute('aria-hidden', 'true');
    });
}); 
// js/hide-links.js – Option 2
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cta-button a').forEach(link => {
        link.classList.add('visually-hidden');
    });
});
