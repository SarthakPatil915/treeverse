/* assets/js/search.js
   Flipkart-style suggestions, works from different folder depths by detecting script URL.
*/
(function () {
  // CONFIG: list of your json filenames (exact names in /data/)
  const jsonFiles = [
    "annual_herbs.json",
    "biennial_herbs.json",
    "culinary_herbs.json",
    "deciduous_shrubs.json",
    "deciduous_trees.json",
    "evergreen_shrubs.json",
    "evergreen_trees.json",
    "flowering_climbers.json",
    "flowering_shrubs.json",
    "foliage_shrubs.json",
    "fruit_trees.json",
    "ground-cover_Creepers.json",
    "hook_climbers.json",
    "medicinal_creepers.json",
    "medicinal_herbs.json",
    "medicinal_shrubs.json",
    "ornamental_trees.json",
    "perennial_herbs.json",
    "root_climbers.json",
    "tendril_climbers.json",
    "timber_trees.json",
    "twining_climbers.json",
    "vegetable_creepers.json"
  ];

  // helper: escape HTML
  function escHTML(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }

  // find input and suggestions container
  const input = document.getElementById("searchInput") || document.querySelector(".Search-Bar");
  if (!input) {
    console.warn("search.js: no search input found (id=searchInput or class=Search-Bar).");
    return;
  }

  // ensure suggestions box exists (or create)
  let suggestionsBox = document.getElementById("suggestions");
  if (!suggestionsBox) {
    const wrapper = input.closest(".search-wrapper") || (() => {
      const w = document.createElement("div");
      w.className = "search-wrapper";
      input.parentNode.insertBefore(w, input);
      w.appendChild(input);
      return w;
    })();
    suggestionsBox = document.createElement("div");
    suggestionsBox.id = "suggestions";
    suggestionsBox.className = "suggestions-box";
    wrapper.appendChild(suggestionsBox);
  }

  // derive base URL from this script location so data path resolves correctly
  const scriptEl = document.currentScript || document.scripts[document.scripts.length - 1];
  let baseUrl = "";
  if (scriptEl && scriptEl.src) {
    baseUrl = scriptEl.src.replace(/\/assets\/js\/search\.js.*$/i, "");
  } else {
    baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, "");
  }
  baseUrl = baseUrl.replace(/\/$/, ""); // remove trailing slash

  // fetch all JSONs and build an index
  const allPlants = [];
  let loaded = false;
  (async function loadAll() {
    for (const file of jsonFiles) {
      try {
        const res = await fetch(`${baseUrl}/data/${file}`);
        if (!res.ok) {
          console.warn("search.js: failed to load", file, res.status);
          continue;
        }
        const arr = await res.json();
        if (!Array.isArray(arr)) continue;
        arr.forEach((item, idx) => {
          allPlants.push({
            name: item.common_name || item.name || "",
            scientific: item.scientific_name || "",
            id: (item.id !== undefined && item.id !== null) ? item.id : idx,
            file,
            image: item.image_url || ""
          });
        });
      } catch (e) {
        console.warn("search.js: error loading", file, e);
      }
    }
    loaded = true;
  })();

  // UI + behavior
  let currentIndex = -1;
  let visibleItems = [];

  function hideSuggestions() {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
    currentIndex = -1;
    visibleItems = [];
  }

  function showSuggestions(items, query) {
    suggestionsBox.innerHTML = "";
    if (!items.length) {
      suggestionsBox.innerHTML = '<div class="no-results">No results</div>';
      suggestionsBox.style.display = "block";
      return;
    }

    const q = query.trim().toLowerCase();
    items.slice(0, 8).forEach((p, i) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.setAttribute("data-idx", i);

      // highlight matched part in name
      let displayName = escHTML(p.name);
      if (q) {
        const li = p.name.toLowerCase().indexOf(q);
        if (li >= 0) {
          displayName = escHTML(p.name.slice(0, li)) +
                        "<strong>" + escHTML(p.name.slice(li, li + q.length)) + "</strong>" +
                        escHTML(p.name.slice(li + q.length));
        }
      }

      // optional image (if available) + text
      const imgHtml = p.image ? `<img class="sugg-img" src="${p.image}" alt="${escHTML(p.name)}">` : "";
      const sci = p.scientific ? `<div style="font-size:12px;color:#666;">${escHTML(p.scientific)}</div>` : "";

      item.innerHTML = `${imgHtml}<div style="flex:1"><div>${displayName}</div>${sci}</div>`;
      item.addEventListener("click", () => {
        goToPlant(p);
      });

      suggestionsBox.appendChild(item);
    });

    suggestionsBox.style.display = "block";
    currentIndex = -1;
    visibleItems = Array.from(suggestionsBox.querySelectorAll(".suggestion-item"));
  }

  // Return redirect URL for a plant entry (adjust mapping if your file/naming differs)
  function buildRedirectUrl(plant) {
  // Detect the base folder from current script
  const base = baseUrl || ".";

  let route = "pages/plants/";
  // Map file to info page
  if (/evergreen_trees\.json/i.test(plant.file)) route += "tree/evergreen_tree.html";
  else if (/deciduous_trees\.json/i.test(plant.file)) route += "tree/deciduous_tree.html";
  else if (/fruit_trees\.json/i.test(plant.file)) route += "tree/fruit_tree.html";
  else if (/ornamental_trees\.json/i.test(plant.file)) route += "tree/ornamental_tree.html";
  else if (/timber_trees\.json/i.test(plant.file)) route += "tree/timber_tree.html";
  // Herbs
  else if (/annual_herbs\.json/i.test(plant.file)) route += "herb/annual_herb.html";
  else if (/biennial_herbs\.json/i.test(plant.file)) route += "herb/biennial_herb.html";
  else if (/culinary_herbs\.json/i.test(plant.file)) route += "herb/culinary_herb.html";
  else if (/medicinal_herbs\.json/i.test(plant.file)) route += "herb/medicinal_herb.html";
  else if (/perennial_herbs\.json/i.test(plant.file)) route += "herb/perennial_herb.html";
  // Shrubs
  else if (/deciduous_shrubs\.json/i.test(plant.file)) route += "shrub/deciduous_shrub.html";
  else if (/evergreen_shrubs\.json/i.test(plant.file)) route += "shrub/evergreen_shrub.html";
  else if (/flowering_shrubs\.json/i.test(plant.file)) route += "shrub/flowering_shrub.html";
  else if (/foliage_shrubs\.json/i.test(plant.file)) route += "shrub/foliage_shrub.html";
  else if (/medicinal_shrubs\.json/i.test(plant.file)) route += "shrub/medicinal_shrub.html";
  // Climbers
  else if (/flowering_climbers\.json/i.test(plant.file)) route += "climber/flowering_climber.html";
  else if (/hook_climbers\.json/i.test(plant.file)) route += "climber/hook_climber.html";
  else if (/root_climbers\.json/i.test(plant.file)) route += "climber/root_climber.html";
  else if (/tendril_climbers\.json/i.test(plant.file)) route += "climber/tendril_climber.html";
  else if (/twining_climbers\.json/i.test(plant.file)) route += "climber/twining_climber.html";
  // Creepers
  else if (/ground-cover_Creepers\.json/i.test(plant.file)) route += "creeper/ground-cover_creeper.html";
  else if (/medicinal_creepers\.json/i.test(plant.file)) route += "creeper/medicinal_creeper.html";
  else if (/vegetable_creepers\.json/i.test(plant.file)) route += "creeper/vegetable_creeper.html";
  // fallback: go to herb info
  else route += "herb/annual_herb.html";

  const url = new URL(`${base}/${route}`, window.location.origin);
  url.searchParams.set("id", plant.id);
  return url.href;
}



  function goToPlant(plant) {
    const url = buildRedirectUrl(plant);
    window.location.href = url;
  }

  // simple debounce + search
  let debounceT;
  function onInputChange(val) {
    clearTimeout(debounceT);
    debounceT = setTimeout(() => {
      const q = String(val || "").trim().toLowerCase();
      if (!q) {
        hideSuggestions();
        return;
      }
      if (!loaded) {
        suggestionsBox.innerHTML = '<div class="no-results">Loading suggestions…</div>';
        suggestionsBox.style.display = "block";
        return;
      }
      // filter by common name or scientific name
      const matches = allPlants.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.scientific && p.scientific.toLowerCase().includes(q))
      );
      showSuggestions(matches, q);
    }, 120);
  }

  input.addEventListener("input", (e) => onInputChange(e.target.value));

  // keyboard navigation
  input.addEventListener("keydown", (e) => {
    if (suggestionsBox.style.display === "none") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (currentIndex < visibleItems.length - 1) currentIndex++;
      updateSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentIndex > 0) currentIndex--;
      updateSelection();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentIndex >= 0 && visibleItems[currentIndex]) {
        visibleItems[currentIndex].click();
      } else {
        // if no suggestion selected, you might want to do a general search page
        // window.location.href = `/search-results.html?q=${encodeURIComponent(input.value)}`;
        hideSuggestions();
      }
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  function updateSelection() {
    visibleItems.forEach((el, idx) => {
      el.classList.toggle("selected", idx === currentIndex);
      if (idx === currentIndex) {
        // ensure selected is visible
        el.scrollIntoView({ block: "nearest" });
      }
    });
  }

  // click outside to hide
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
      hideSuggestions();
    }
  });

})();
