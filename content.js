class NormalPlayerObserver {
  // ytd-watch-flexy > #player-theater-container > #player-container > ytd-player#ytd-player > #container > #movie_player
  //                                                                                                                      > .html5-video-container > video
  //                                                                                                                      > .ytp-chrome-bottom > .ytp-chrome-controls > .ytp-left-controls

  /**
   * @param {(video: HTMLVideoElement, vcLeft: Element)} newPlayerCallback
   */
  constructor(newPlayerCallback) {
    /**
     * @type {(video: HTMLVideoElement, vcLeft: Element)}
     */
    this._newPlayerCallback = newPlayerCallback;

    this._find();
  }
  _find() {
    if (this._tryIdentify()) return;

    document.addEventListener(
      "yt-navigate-finish",
      this._onNavFinish.bind(this)
    );

    // this._observeMutations()
  }
  _tryIdentify() {
    let video = document.querySelector("video");
    if (!video) return false;

    let vcLeft = document.querySelector(".ytp-left-controls");
    if (!vcLeft) return false;

    this._newPlayerCallback(video, vcLeft);
    return true;
  }
  _onNavFinish() {
    this._tryIdentify();
  }
  _observeMutations() {
    this._observer = new MutationObserver(this._onMutation.bind(this));
    this._observer.observe(document, { childList: true, subtree: true });
  }
  _onMutation(mutationList, observer) {
    for (let mutation of mutationList) {
      for (let addedNode of mutation.addedNodes) {
        if (
          addedNode.nodeName !== "VIDEO" ||
          addedNode.nodeName !== "DIV" ||
          addedNode.className !== "ytp-left-controls"
        )
          continue;

        if (this._tryIdentify()) {
          observer.disconnect();
          this._observer = null;
        }
      }
    }
  }
}

class ShortsPlayerObserver {
  // Shorts player DOM element layout (video and controls):
  // #shorts-container > #shorts-inner-container > ytd-reel-video-renderer[id][is-active][show-player-controls] > #player-container
  //                                                                                                                            > ytd-player#player > #container.ytd-player > #shorts-player > .html5-video-container > video
  //                                                                                                                            > .player-controls > ytd-shorts-player-controls > yt-icon-button
  // #shorts-inner-container > ytd-reel-video-renderer is loaded and inserted in sets of 10
  // delayed async load and insert of #player-container > ytd-player#player

  /**
   * @param {(videoElement: HTMLVideoElement, controlsContainer: Element)} newPlayerCallback
   */
  constructor(newPlayerCallback) {
    /** @type {(videoElement: HTMLVideoElement, controlsContainer: Element)} */
    this._newPlayerCallback = newPlayerCallback;
    /** @type {MutationObserver} */
    this._observer = new MutationObserver(this._onMutation.bind(this));
    this._observerVideo = new MutationObserver(
      this._onVideoMutation.bind(this)
    );

    this._findAndObserve();
    document.addEventListener(
      "yt-navigate-finish",
      this._findAndObserve.bind(this)
    );
  }

  _findAndObserve() {
    let container = document.querySelector("#shorts-inner-container");
    if (!container) return;
    this._observer.observe(container, { childList: true });
  }

  /**
   * @type {MutationCallback}
   */
  _onMutation(mutList, observer) {
    for (let mut of mutList) {
      if (mut.type !== "childList") continue;

      for (let newNode of mut.addedNodes) {
        if (newNode.nodeName !== "YTD-REEL-VIDEO-RENDERER") continue;

        let playerContainer = newNode.querySelector("#player-container");
        this._tryPlayerContainer(playerContainer);
      }
    }
  }

  _tryPlayerContainer(playerContainer) {
    let videoElement = playerContainer.querySelector("video");
    if (!videoElement) {
      this._observerVideo.observe(playerContainer, { childList: true });
      return;
    }

    let controlsContainer = playerContainer.querySelector(
      ".player-controls > ytd-shorts-player-controls"
    );
    if (!controlsContainer)
      throw new Error(
        "Unexpected: player controls container missing in player container"
      );

    this._newPlayerCallback(videoElement, controlsContainer);
  }

  /**
   * @type {MutationCallback}
   */
  _onVideoMutation(mutList, observer) {
    for (let mut of mutList) {
      if (mut.type !== "childList") continue;

      for (let newNode of mut.addedNodes) {
        if (newNode.id !== "player") continue;

        let playerContainer = newNode.closest("#player-container");
        this._tryPlayerContainer(playerContainer);
      }
    }
  }
}

class Instance {
  /**
   * @param {HTMLVideoElement} video
   * @param {Element} controlsContainer
   */
  constructor(video, controlsContainer) {
    /** @type {HTMLVideoElement} */
    this._video = video;
    this._controlsContainer = controlsContainer;

    this._removeExisting();
    this._create();
    this._bind();
    this._updateRateDisplay();
    this._updateControlVisibility();
    this._insert();
  }
  _removeExisting() {
    let existing = this._controlsContainer.querySelector(".pbspeed-container");
    if (existing) existing.remove();
  }
  _create() {
    let container = document.createElement("div");
    container.className = "pbspeed-container";
    container.style =
      "margin:0 14px; display:flex; align-items: center; gap:12px;";

    let displayHTML = `
      <div class="rdisplay" 
        style="
          grid-row: 1; 
          grid-column: 1; 
          font-size:14px; 
          user-select: none;
        ">
        ⏱ <span class="pbspeed-value"></span></div>`;
    let initialValue = 1;
    let maxValue = 3;
    let sliderHTML = `
      <style>
      .pbspeed-slider {
        -webkit-appearance: none;
        width: 7em;
        height: 4px;
        outline: none;
        border-radius: 2px;
        margin: 0;
        padding: 0;
        /* initial background: white up to 50%, gray afterwards */
        background: linear-gradient(
        to right,
        #fff 0%,
        #fff ${initialValue / maxValue * 100}%,
        #888 ${initialValue / maxValue * 100}%,
        #888 100%
        );
      }
      .pbspeed-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        margin-top: -4px; /* center the thumb vertically */
        border: none;
      }
      .pbspeed-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
      }
      .pbspeed-slider::-moz-range-track {
        height: 4px;
        background: transparent;
      }
      </style>
      <input
      id="slider"
      class="pbspeed-slider"
      type="range"
      min="0"
      max="3"
      step="0.05"
      oninput="
        const pct = (this.value - this.min) / (this.max - this.min) * 100;
        this.style.background = 
        'linear-gradient(to right, #fff 0%, #fff ' + pct + '%, #888 ' + pct + '%, #888 100%)';
      "
      />`;
    const presetValues = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
    // first set the displayHTML and sliderHTML into the container
    container.innerHTML = displayHTML + sliderHTML;
    // then build the presets container as an inline-flex row
    const presetsContainer = document.createElement("div");
    presetsContainer.className = "setrs";
    presetsContainer.style.cssText = `
      display: inline-flex;
      flex-direction: row;
      gap: 2px;
      align-items: center;
    `;
    // create each preset button
    for (let v of presetValues) {
      const btn = document.createElement("div");
      btn.textContent = v.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      btn.style.cssText = `
          font-size:14px; 
          cursor:pointer;
          line-height: 1.2em;
          background-color: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          padding: 0.12em 0.34em;
          margin-right: 0.2em;
          border: 1px solid rgba(255, 255, 255, 0.3);
          min-width: 1.5em;
        `;
      presetsContainer.appendChild(btn);
    }

    // append the presets row to the main container
    container.appendChild(presetsContainer);

    // assign to instance fields
    this._container = container;
    this._display = container.querySelector(".rdisplay");
    this._rateDisplay = this._display.querySelector(".pbspeed-value");
    this._slider = container.querySelector(".pbspeed-slider");
    this._presets = container.querySelector(".setrs");
  }
  _bind() {
    this._video.addEventListener(
      "ratechange",
      this._updateRateDisplay.bind(this)
    );

    for (let x of this._presets.childNodes)
      x.addEventListener("click", this._onPresetClick.bind(this));

    this._slider.addEventListener("input", this._onSliderInput.bind(this));

    this._display.addEventListener("click", this._onRdisplayClick.bind(this));
    this._display.style.cursor = "pointer";

    // (How) Can we listen to option changes from a content script?
    // browser.storage.onChanged.addEventListener(e => console.log(e))
    // browser.storage.local.addEventListener('changed', e => console.log(e))
    // browser.storage.local.onChanged.addEventListener(e => console.log(e))
  }
  _updateRateDisplay() {
    let value = this._video.playbackRate;
    this._rateDisplay.innerText = `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}x`;
    this._slider.value = value;
  }
  _onPresetClick(e) {
    this._video.playbackRate = e.target.innerText;
  }
  _onSliderInput(e) {
    this._video.playbackRate = e.target.value;
  }
  _onRdisplayClick(e) {
    this._video.playbackRate = 1.0;
  }
  async _updateControlVisibility() {
    let values = await browser.storage.local.get({
      "show-slider": true,
      "show-presets": false,
    });
    this._presets.style.display = values["show-presets"] ? "inline-flex" : "none";
    this._slider.style.display = values["show-slider"] ? "block" : "none";
  }
  _insert() {
    let timeDisplay =
      this._controlsContainer.querySelector(".ytp-time-display");
    if (timeDisplay) {
      timeDisplay.insertAdjacentElement("afterend", this._container);
      return true;
    }

    this._controlsContainer.appendChild(this._container);
    return true;
  }
}

let init = async () => {
  /**
   * @type {(videoElement: HTMLVideoElement, controlsContainer: Element)}
   */
  let onNewPlayer = (video, controlsContainer) => {
    console.debug(
      "[YouTube Playback Speed Control] Identified elements, initializing controls…",
      video,
      controlsContainer
    );
    new Instance(video, controlsContainer);
  };
  new NormalPlayerObserver(onNewPlayer);
  new ShortsPlayerObserver(onNewPlayer);
};
init();
