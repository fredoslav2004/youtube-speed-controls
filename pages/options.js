let slider = document.getElementById("slider");
let presets = document.getElementById("presets");

async function init() {
  let values = await browser.storage.local.get({
    "show-slider": true,
    "show-presets": false,
  });
  slider.checked = values["show-slider"];
  presets.checked = values["show-presets"];
  console.log(values);
}
init();

// new save/load buttons
const saveBtn = document.getElementById("save");
const loadBtn = document.getElementById("load");

saveBtn.addEventListener("click", async () => {
  await browser.storage.local.set({
    "show-slider": slider.checked,
    "show-presets": presets.checked,
  });
});

loadBtn.addEventListener("click", async () => {
  let values = await browser.storage.local.get({
    "show-slider": true,
    "show-presets": false,
  });
  slider.checked = values["show-slider"];
  presets.checked = values["show-presets"];
});
