// ========================
// NAVIGATION
// ========================
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

function showSection(sectionId) {
  sections.forEach(s => s.classList.remove('active'));
  navBtns.forEach(b => b.classList.remove('active'));

  const target = document.getElementById(sectionId);
  const btn = document.getElementById('nav-' + sectionId);

  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (btn) btn.classList.add('active');
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.getAttribute('data-section');
    showSection(section);
  });
});

// ========================
// THEME TOGGLE
// ========================
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
body.className = savedTheme;

themeToggle.addEventListener('click', () => {
  if (body.classList.contains('dark')) {
    body.classList.replace('dark', 'light');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.replace('light', 'dark');
    localStorage.setItem('theme', 'dark');
  }
});

// ========================
// SCROLL REVEAL ANIMATION
// ========================
function revealOnScroll() {
  const cards = document.querySelectorAll('.section.active .card, .section.active .skill-card, .section.active .timeline-card, .section.active .project-card, .section.active .cert-card, .section.active .edu-card');
  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    if (rect.top < window.innerHeight - 60) {
      card.style.opacity = '1';
    }
  });
}

window.addEventListener('scroll', revealOnScroll);
revealOnScroll();

// ========================
// TECH BADGE HOVER GLOW
// ========================
document.querySelectorAll('.tech-badge').forEach(badge => {
  badge.addEventListener('mouseenter', () => {
    badge.style.boxShadow = '0 0 12px rgba(0,212,170,0.25)';
  });
  badge.addEventListener('mouseleave', () => {
    badge.style.boxShadow = '';
  });
});

// ========================
// HERO NAME TYPING EFFECT
// ========================
const heroName = document.querySelector('.hero-name');
if (heroName) {
  const fullText = heroName.textContent;
  heroName.textContent = '';
  let i = 0;
  const typeInterval = setInterval(() => {
    heroName.textContent += fullText[i];
    i++;
    if (i >= fullText.length) clearInterval(typeInterval);
  }, 40);
}

// ========================
// PARTICLE CURSOR TRAIL
// ========================
let trail = [];
const maxTrail = 8;

document.addEventListener('mousemove', (e) => {
  const dot = document.createElement('div');
  dot.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(0,212,170,0.5);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: all 0.5s ease;
  `;
  document.body.appendChild(dot);
  trail.push(dot);

  setTimeout(() => {
    dot.style.opacity = '0';
    dot.style.transform = 'translate(-50%, -50%) scale(0)';
    setTimeout(() => dot.remove(), 500);
  }, 100);

  if (trail.length > maxTrail) {
    const old = trail.shift();
    if (old && old.parentNode) old.remove();
  }
});

console.log('%c👨‍💻 Adalbert NANDA TONLIO | Ingénieur DevOps Senior', 'color: #00d4aa; font-size: 16px; font-weight: bold;');
console.log('%c🔗 GitHub: https://github.com/Adalbert-code', 'color: #60a5fa; font-size: 12px;');
