/**
 * Theme Manager — Dark/Light Mode
 * 
 * Persists theme preference in localStorage and applies globally.
 * Should be loaded before any other scripts in <head> or early in <script> section.
 */

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
  
  // Emit event for other scripts to listen to theme changes
  window.dispatchEvent(new CustomEvent('themechanged', { detail: { theme: newTheme } }));
}

function updateThemeIcon(theme) {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

// Initialize theme immediately (before DOM content is loaded)
document.addEventListener('DOMContentLoaded', initTheme, { once: true });

// Also try to initialize if already loaded
if (document.readyState === 'loading') {
  initTheme();
}
