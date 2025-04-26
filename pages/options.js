let slider = document.getElementById("slider");
let presets = document.getElementById("presets");
let maxSpeed = document.getElementById("max-speed");
let defaultSpeed = document.getElementById("default-speed");

slider.addEventListener("change", (e) =>
  browser.storage.local.set({ "show-slider": e.target.checked })
);
presets.addEventListener("change", (e) =>
  browser.storage.local.set({ "show-presets": e.target.checked })
);
maxSpeed.addEventListener("input", (e) =>
  browser.storage.local.set({ "max-speed": parseFloat(e.target.value) })
);
defaultSpeed.addEventListener("input", (e) =>
  browser.storage.local.set({ "default-speed": parseFloat(e.target.value) })
);

async function init() {
  let values = await browser.storage.local.get({
    "show-slider": true,
    "show-presets": false,
    "max-speed": 3.0,
    "default-speed": 1.0,
  });
  slider.checked = values["show-slider"];
  presets.checked = values["show-presets"];
  maxSpeed.value = values["max-speed"];
  defaultSpeed.value = values["default-speed"];
}
init();
