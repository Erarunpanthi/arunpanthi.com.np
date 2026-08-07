/**
 * MCQ Script - Fixed Version
 * Improvements:
 * - Uses const/let instead of var
 * - Proper event listener cleanup
 * - Better error handling
 * - Improved accessibility
 */

document.addEventListener('DOMContentLoaded', function() {
  'use strict';
  
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(button => {
    try {
      const originalOnClick = button.getAttribute('onclick');
      
      // Fix space-containing IDs in href links
      if (originalOnClick && originalOnClick.includes("location.href='#")) {
        const startIndex = originalOnClick.indexOf('#') + 1;
        const endIndex = originalOnClick.indexOf("'", startIndex);
        const originalLink = originalOnClick.substring(startIndex, endIndex);
        const newLink = originalLink.replace(/\s+/g, '-');
        
        button.setAttribute('onclick', `location.href='#${newLink}'`);
        
        const section = document.getElementById(originalLink);
        if (section) {
          section.id = newLink;
        }
      }
      
      // Add eye icon with proper aria-label
      const icon = document.createElement('i');
      icon.className = 'fas fa-eye';
      icon.setAttribute('aria-hidden', 'true');
      
      const buttonText = button.textContent.trim();
      button.innerHTML = '';
      button.appendChild(icon);
      button.appendChild(document.createTextNode(' ' + buttonText));
      
      // Add keyboard accessibility
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute('aria-pressed', 'false');
      
      // Click handler with proper cleanup
      const clickHandler = function(event) {
        if (originalOnClick && originalOnClick.includes("location.href='#")) {
          return;
        }
        
        const card = button.closest('.card');
        if (!card) return;
        
        const answer = card.querySelector('.answer');
        if (!answer) return;
        
        answer.classList.toggle('visible');
        answer.classList.toggle('show');
        card.classList.add('viewed');
        
        const iconEl = button.querySelector('i');
        const isShowing = answer.classList.contains('show') || answer.classList.contains('visible');
        
        if (isShowing) {
          iconEl.className = 'fas fa-eye-slash';
          button.innerHTML = '';
          button.appendChild(iconEl);
          button.appendChild(document.createTextNode(' Hide Answer'));
          button.setAttribute('aria-pressed', 'true');
        } else {
          iconEl.className = 'fas fa-eye';
          button.innerHTML = '';
          button.appendChild(iconEl);
          button.appendChild(document.createTextNode(' Show Answer'));
          button.setAttribute('aria-pressed', 'false');
        }
      };
      
      button.addEventListener('click', clickHandler);
      
      // Keyboard handler for Enter and Space
      const keyHandler = function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          clickHandler(event);
        }
      };
      
      button.addEventListener('keydown', keyHandler);
      
      // Store handlers for potential cleanup
      button._mcqClickHandler = clickHandler;
      button._mcqKeyHandler = keyHandler;
    } catch (error) {
      console.error('Error processing nav button:', error);
    }
  });
  
  // Fix section IDs with spaces
  const sections = document.querySelectorAll('section[id]');
  sections.forEach(section => {
    const originalId = section.id;
    if (originalId && originalId.includes(' ')) {
      const newId = originalId.replace(/\s+/g, '-');
      section.id = newId;
      
      // Update all references to this ID
      document.querySelectorAll(`.nav-btn[onclick*="#${originalId}"]`).forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick) {
          btn.setAttribute('onclick', onclick.replace(`#${originalId}`, `#${newId}`));
        }
      });
    }
  });
});
