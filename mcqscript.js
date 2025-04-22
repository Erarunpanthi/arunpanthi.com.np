// script.js
document.addEventListener('DOMContentLoaded', function() {
  // Process all nav buttons
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(button => {
    // Process href links
    const originalOnClick = button.getAttribute('onclick');
    
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
    
    // Add eye icon and click handler
    const icon = document.createElement('i');
    icon.className = 'fas fa-eye';
    button.prepend(icon);
    button.innerHTML = icon.outerHTML + ' ' + button.textContent.trim();
    
    // Add click handler for answer toggle
    button.addEventListener('click', function(e) {
      if (originalOnClick && originalOnClick.includes("location.href='#")) {
        return;
      }
      
      const card = this.closest('.card');
      if (!card) return;
      
      const answer = card.querySelector('.answer');
      if (!answer) return;
      
      answer.classList.toggle('visible');
      answer.classList.toggle('show');
      
      card.classList.add('viewed');
      
      const icon = this.querySelector('i');
      if (answer.classList.contains('show') || answer.classList.contains('visible')) {
        icon.className = 'fas fa-eye-slash';
        this.innerHTML = icon.outerHTML + ' Hide Answer';
      } else {
        icon.className = 'fas fa-eye';
        this.innerHTML = icon.outerHTML + ' Show Answer';
      }
    });
  });
  
  // Process all section IDs that might have spaces
  const sections = document.querySelectorAll('section[id]');
  sections.forEach(section => {
    const originalId = section.id;
    if (originalId.includes(' ')) {
      const newId = originalId.replace(/\s+/g, '-');
      section.id = newId;
      
      document.querySelectorAll(`.nav-btn[onclick*="#${originalId}"]`).forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        btn.setAttribute('onclick', onclick.replace(`#${originalId}`, `#${newId}`));
      });
    }
  });
});
