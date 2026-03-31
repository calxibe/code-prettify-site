function initializeMenuToggle() {
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("header nav");

  if (!menuToggle || !nav) {
    return;
  }

  menuToggle.addEventListener("click", () => {
    const isActive = menuToggle.classList.toggle("active");
    menuToggle.setAttribute("aria-expanded", String(isActive));
    nav.classList.toggle("open");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeMenuToggle();
});