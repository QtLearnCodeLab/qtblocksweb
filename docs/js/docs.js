// QtBlockly Learner-Friendly Documentation Search & Interactive Controls
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('docsSearchInput');
  const cards = document.querySelectorAll('.block-card');
  const noResults = document.getElementById('noResultsMessage');
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.category-section');

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.toLowerCase().trim();
      let matchCount = 0;

      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const matches = text.includes(query);
        card.style.display = matches ? 'flex' : 'none';
        if (matches) matchCount++;
      });

      // Show/hide section headers based on visible children
      sections.forEach(sec => {
        const visibleCards = sec.querySelectorAll('.block-card:not([style*="display: none"])');
        sec.style.display = (visibleCards.length > 0 || query === '') ? 'block' : 'none';
      });

      if (noResults) {
        noResults.style.display = (matchCount === 0 && query !== '') ? 'block' : 'none';
      }
    });
  }

  // Active section scroll spy
  const mainScroll = document.querySelector('.docs-main');
  if (mainScroll) {
    mainScroll.addEventListener('scroll', function () {
      let currentSectionId = '';
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 160 && rect.bottom >= 100) {
          currentSectionId = section.getAttribute('id');
        }
      });

      if (currentSectionId) {
        navItems.forEach(item => {
          if (item.getAttribute('href') === '#' + currentSectionId) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      }
    });
  }
});

// Copy snippet to clipboard
function copySnippet(button) {
  const pre = button.closest('.code-container').querySelector('pre');
  if (!pre) return;
  const code = pre.textContent;

  navigator.clipboard.writeText(code).then(() => {
    const originalText = button.innerHTML;
    button.innerHTML = '✓ Copied!';
    button.classList.add('copied');
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy code: ', err);
  });
}
