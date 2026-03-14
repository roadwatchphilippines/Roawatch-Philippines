let map;
let marker;
let lat = 0;
let lng = 0;

const API_URL = "https://script.google.com/macros/s/AKfycbw4xD2FCUwBRQVORa-EChiCcA2R5O5sm6vS1_0dOehUPGpQV1-F66vVmjfgllbRaLbO/exec"; // <-- replace with your actual URL

// Sidebar toggle
function isMenuOpen() {
  return document.getElementById("menu").classList.contains("open");
}

function openMenu() {
  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");
  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
  menuBtn?.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");
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
  document.getElementById(page).classList.add("active");
  closeMenu();

  if (page === "submit") {
    setTimeout(loadMap, 300);
  }
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
      document.getElementById("locationText").value = road || "";
    } catch (error) {
      console.log("Reverse geocoding failed", error);
    }
  });
}

// Photo preview
document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");

  document.addEventListener("pointerdown", (event) => {
    if (!isMenuOpen()) return;

    const clickInsideSidebar = menu.contains(event.target);
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

  let photoInput = document.getElementById("photo");
  let preview = document.getElementById("photoPreview");

  photoInput.addEventListener("change", function () {
    let file = this.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
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





