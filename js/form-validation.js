/**
 * Form Validation Module
 * Provides client-side validation for contact forms
 * Improvements:
 * - Proper email validation (gmail.com requirement)
 * - Mobile number validation (10 digits Nepal format)
 * - Message length and character requirements
 * - XSS prevention
 */

(function() {
  'use strict';
  
  // Sanitize input to prevent XSS
  function sanitizeInput(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  // Validate email (must be @gmail.com)
  function validateEmail(email) {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  }
  
  // Validate Nepal mobile number (10 digits starting with 98, 97, 96, 95, 94, 93, 92, 91, 90)
  function validateMobile(mobile) {
    const nepalMobileRegex = /^(9[0-9]{9})$/;
    return nepalMobileRegex.test(mobile);
  }
  
  // Validate message (min 50 chars, uppercase, lowercase, space, period)
  function validateMessage(message) {
    const errors = [];
    
    if (!message || message.length < 50) {
      errors.push('Message must be at least 50 characters long');
    }
    
    if (!/[A-Z]/.test(message)) {
      errors.push('Message must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(message)) {
      errors.push('Message must contain at least one lowercase letter');
    }
    
    if (!/\s/.test(message)) {
      errors.push('Message must contain at least one space');
    }
    
    if (!/\./.test(message)) {
      errors.push('Message must contain at least one period (.)');
    }
    
    return errors;
  }
  
  // Validate name field
  function validateName(name) {
    if (!name || name.trim().length < 2) {
      return false;
    }
    // Allow letters, spaces, hyphens, and periods (for Nepali names)
    const nameRegex = /^[a-zA-Z\s\.\-]+$/;
    return nameRegex.test(name);
  }
  
  // Show error message
  function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'flex';
      errorEl.setAttribute('role', 'alert');
    }
  }
  
  // Hide error message
  function hideError(elementId) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }
  }
  
  // Initialize form validation
  function initFormValidation() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    const submitBtn = document.getElementById('submit-btn');
    if (!submitBtn) return;
    
    // Real-time validation
    const fields = [
      { id: 'first-name', validator: validateName, errorId: null },
      { id: 'main-last-name', validator: validateName, errorId: null },
      { id: 'father-first-name', validator: validateName, errorId: null },
      { id: 'mother-first-name', validator: validateName, errorId: null },
      { id: 'mobile', validator: validateMobile, errorId: 'mobile-error' },
      { id: 'email', validator: validateEmail, errorId: 'email-error' },
      { id: 'message', validator: (val) => validateMessage(val).length === 0, errorId: 'message-error-container' }
    ];
    
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (!input) return;
      
      input.addEventListener('blur', function() {
        const value = sanitizeInput(this.value);
        const isValid = field.validator(value);
        
        if (!isValid && field.errorId) {
          let errorMsg = 'Invalid input';
          if (field.id === 'mobile') {
            errorMsg = 'Mobile must be exactly 10 digits (e.g., 98XXXXXXXX)';
          } else if (field.id === 'email') {
            errorMsg = 'Must be a valid @gmail.com address';
          } else if (field.id === 'message') {
            const errors = validateMessage(value);
            errorMsg = errors.join('. ');
          }
          showError(field.errorId, errorMsg);
        } else if (field.errorId) {
          hideError(field.errorId);
        }
      });
      
      input.addEventListener('input', function() {
        if (field.errorId) {
          const value = sanitizeInput(this.value);
          const isValid = field.validator(value);
          if (isValid) {
            hideError(field.errorId);
          }
        }
        validateAllFields();
      });
    });
    
    // Validate all fields before enabling submit
    function validateAllFields() {
      const requiredFields = form.querySelectorAll('[required]');
      let allValid = true;
      
      requiredFields.forEach(field => {
        const value = sanitizeInput(field.value);
        if (!value || value.trim() === '') {
          allValid = false;
          return;
        }
        
        // Specific validations
        if (field.id === 'mobile' && !validateMobile(value)) {
          allValid = false;
        } else if (field.id === 'email' && !validateEmail(value)) {
          allValid = false;
        } else if (field.id === 'message') {
          const msgErrors = validateMessage(value);
          if (msgErrors.length > 0) {
            allValid = false;
          }
        }
      });
      
      submitBtn.disabled = !allValid;
    }
    
    // Form submission
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Final validation
      const messageField = document.getElementById('message');
      const messageErrors = validateMessage(messageField.value);
      
      if (messageErrors.length > 0) {
        const errorContainer = document.getElementById('message-error-container');
        if (errorContainer) {
          errorContainer.innerHTML = messageErrors.map(err => 
            `<div class="error-item"><i class="fas fa-exclamation-circle"></i> ${sanitizeInput(err)}</div>`
          ).join('');
          errorContainer.style.display = 'block';
          errorContainer.setAttribute('role', 'alert');
        }
        return;
      }
      
      // Sanitize all form data before submission
      const formData = new FormData(form);
      const sanitizedData = {};
      formData.forEach((value, key) => {
        sanitizedData[key] = sanitizeInput(value);
      });
      
      // Here you would normally send the data to your server
      // For now, show success message
      const thankYouMsg = document.getElementById('thank-you-message');
      if (thankYouMsg) {
        form.style.display = 'none';
        thankYouMsg.style.display = 'block';
        thankYouMsg.setAttribute('role', 'status');
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFormValidation);
  } else {
    initFormValidation();
  }
})();
