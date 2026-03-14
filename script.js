let map;
let marker;
let lat = 0;
let lng = 0;

const API_URL = "https://script.google.com/macros/s/AKfycbw4xD2FCUwBRQVORa-EChiCcA2R5O5sm6vS1_0dOehUPGpQV1-F66vVmjfgllbRaLbO/exec"; // <-- replace with your actual URL

// Sidebar toggle
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.left = menu.style.left === "0px" ? "-220px" : "0px";
}

function closeMenu() {
  document.getElementById("menu").style.left = "-220px";
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

function scrollToHowItWorks() {
  const section = document.getElementById("howItWorks");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadHomepageStats() {
  try {
    const response = await fetch(API_URL);
    const reports = await response.json();

    const total = reports.length;
    const mapped = reports.filter(r => r.lat && r.lng).length;
    const resolved = reports.filter(r => (r.status || "").toLowerCase() === "resolved").length;

    document.getElementById("reportCount").textContent = total.toLocaleString();
    document.getElementById("mappedCount").textContent = mapped.toLocaleString();
    document.getElementById("resolvedCount").textContent = resolved.toLocaleString();
  } catch (error) {
    console.log("Failed to load homepage stats", error);
    ["reportCount", "mappedCount", "resolvedCount"].forEach(id => {
      document.getElementById(id).textContent = "N/A";
    });
  }
}

// Initialize the map
function loadMap() {
  if (map) return;

  map = L.map("reportMap").setView([14.5995, 120.9842], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

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
  let photoInput = document.getElementById("photo");
  let preview = document.getElementById("photoPreview");
  loadHomepageStats();

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
    .then(() => {
      document.getElementById("trackInfo").innerText = "Tracking Number: " + tracking;
      document.getElementById("popup").classList.add("show");
      loadHomepageStats();
    })
    .catch(err => {
      console.error(err);
      alert("Submission failed. Check your API or internet connection.");
    });
}

// Hide popup
function closePopup() {
  document.getElementById("popup").classList.remove("show");
  showPage("home");
  resetForm();
}

function newReport() {
  document.getElementById("popup").classList.remove("show");
  resetForm();
  showPage("submit");
}

// Reset the form
function resetForm() {
  document.querySelectorAll("#submit input,#submit textarea").forEach(el => (el.value = ""));
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
