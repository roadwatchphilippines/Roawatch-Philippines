let map;
let marker;
let lat = 0;
let lng = 0;

const API_URL = "https://script.google.com/macros/s/AKfycbw4xD2FCUwBRQVORa-EChiCcA2R5O5sm6vS1_0dOehUPGpQV1-F66vVmjfgllbRaLbO/exec"; // <-- replace with your actual URL

// Sidebar toggle
function isMenuOpen() {
  return document.getElementById("menu")?.classList.contains("open") || false;
}

function openMenu() {
  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");
  if (!menu) return;
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
  menuBtn?.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");
  if (!menu) return;
  menu.classList.remove("open");
  menu.setAttribute("aria-hidden", "true");
  menuBtn?.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  if (isMenuOpen()) {
    closeMenu();
    return;
  }

  openMenu();
}

// Show specific page/section
function showPage(page) {
  document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
  const selectedPage = document.getElementById(page);
  if (!selectedPage) return;
  selectedPage.classList.add("active");
  closeMenu();

  if (page === "submit") {
    setTimeout(loadMap, 300);
  }
}


function resolveInitialPage() {
  const params = new URLSearchParams(window.location.search);
  const requestedPage = params.get("page");
  const hashPage = window.location.hash.replace("#", "");
  if (requestedPage === "submit" || hashPage === "submit") return "submit";
  return "home";
}

function setupSubmitQr() {
  const submitQr = document.getElementById("submitQr");
  if (!submitQr) return;

  const submitUrl = `${window.location.origin}${window.location.pathname}?page=submit`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(submitUrl)}`;

  submitQr.src = qrApiUrl;
}

// Initialize the map
function loadMap() {
  if (map) return;

  map = L.map('reportMap').setView([14.5995, 120.9842], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  map.on("click", function (e) {
    lat = e.latlng.lat;
    lng = e.latlng.lng;

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);

    document.getElementById("selectedLocation").innerText =
      "Selected: " + lat.toFixed(5) + " , " + lng.toFixed(5);
  });

  loadReports(); // Load existing reports on the map
}

// Auto-detect user location
async function detectLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  if (!map) {
    loadMap();
  }

  navigator.geolocation.getCurrentPosition(async function (pos) {
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;

    map.setView([lat, lng], 16);

    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);

    document.getElementById("selectedLocation").innerText =
      "Selected: " + lat.toFixed(5) + " , " + lng.toFixed(5);

    try {
      let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      let data = await response.json();
      let road = data.address?.road || data.display_name;
      const locationInput = document.getElementById("locationText");
      if (locationInput) {
        locationInput.value = road || "";
      }
    } catch (error) {
      console.log("Reverse geocoding failed", error);
    }
  }, function () {
    alert("Unable to detect location. Please allow GPS permission or place a pin manually.");
  });
}

// Photo preview
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const introOverlay = document.getElementById("brandIntro");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (body) {
    if (prefersReducedMotion) {
      body.classList.add("intro-done");
      introOverlay?.setAttribute("aria-hidden", "true");
    } else {
      body.classList.add("intro-playing");
      introOverlay?.setAttribute("aria-hidden", "false");

      setTimeout(() => {
        body.classList.remove("intro-playing");
        body.classList.add("intro-done");
        introOverlay?.setAttribute("aria-hidden", "true");
      }, 1450);
    }
  }

  const initialPage = resolveInitialPage();
  showPage(initialPage);
  setupSubmitQr();

  const revealTargets = document.querySelectorAll(".hero-card, .card, .issue-card");
  revealTargets.forEach((el) => el.classList.add("reveal-target"));

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });

    revealTargets.forEach((el) => revealObserver.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("revealed"));
  }

  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");

  document.addEventListener("pointerdown", (event) => {
    if (!isMenuOpen()) return;

    const clickInsideSidebar = menu?.contains(event.target);
    const clickMenuToggle = menuBtn?.contains(event.target);

    if (!clickInsideSidebar && !clickMenuToggle) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      closeMenu();
    }
  });

  const photoInput = document.getElementById("photo");
  const preview = document.getElementById("photoPreview");

  if (photoInput && preview) {
    photoInput.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }

  const liveStatus = document.getElementById("liveStatus");
  const statuses = [
    "Live updates active across Metro Manila",
    "Citizens are reporting hazards in real-time",
    "Safer roads start with your report"
  ];

  if (liveStatus) {
    let statusIndex = 0;
    setInterval(() => {
      statusIndex = (statusIndex + 1) % statuses.length;
      liveStatus.textContent = statuses[statusIndex];
    }, 3200);
  }
});

// Submit report
function submitReport() {
  if (lat === 0 && !document.getElementById("locationText").value.trim()) {
    alert("Please select location on map or type the road name");
    return;
  }

  let tracking = "RW" + Date.now();

  let formData = new FormData();
  formData.append("tracking", tracking);
  formData.append("lastname", document.getElementById("lastname").value);
  formData.append("firstname", document.getElementById("firstname").value);
  formData.append("mi", document.getElementById("mi").value);
  formData.append("email", document.getElementById("email").value);
  formData.append("phone", document.getElementById("phone").value);
  formData.append("location", document.getElementById("locationText").value);
  formData.append("issue", document.getElementById("issue").value);
  formData.append("lat", lat || "");
  formData.append("lng", lng || "");
  if (document.getElementById("photo").files[0]) {
    formData.append("photo", document.getElementById("photo").files[0]);
  }

  fetch(API_URL, {
    method: "POST",
    body: formData
  })
    .then(res => res.text())
    .then(res => {
      // Show the popup correctly
document.getElementById("trackInfo").innerText = "Tracking Number: " + tracking;
      document.getElementById("popup").classList.add("show"); // use class for fade-in
    })
    .catch(err => {
      console.error(err);
      alert("Submission failed. Check your API or internet connection.");
    });
}

// Hide popup
function closePopup() {
  document.getElementById("popup").classList.remove("show");
  showPage('home');
  resetForm();
}

function newReport() {
  document.getElementById("popup").classList.remove("show");
  resetForm();
  showPage('submit');
}
// Reset the form
function resetForm() {
  document.querySelectorAll("#submit input,#submit textarea").forEach(el => el.value = "");
  document.getElementById("selectedLocation").innerText = "No location selected";
  lat = 0;
  lng = 0;
  if (marker) map.removeLayer(marker);
  document.getElementById("photoPreview").style.display = "none";
}

// Load existing reports
async function loadReports() {
  try {
    let response = await fetch(API_URL);
    let reports = await response.json();

    reports.forEach(r => {
      if (!r.lat || !r.lng) return;

      L.marker([parseFloat(r.lat), parseFloat(r.lng)])
        .addTo(map)
        .bindPopup("<b>" + r.issue + "</b><br>" + r.location + "<br>Status: " + (r.status || "Pending"));
    });
  } catch (err) {
    console.log("Error loading reports", err);
  }
}



