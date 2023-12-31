class JpegApp extends HTMLElement {
  #fryCount = 25;

  #fryQuality = 0.3;

  #frySize = 2 ** -3;

  #progress = 0;

  /** @type {HTMLImageElement | undefined} */
  #inputImage = undefined;

  /** @type {HTMLImageElement | undefined} */
  #outputImage = undefined;

  /** @type {string} */
  #filename = "the-jpeg-zone.jpg";

  #canvas = document.createElement("canvas");
  #ctx = this.#canvas.getContext("2d");

  get progress() {
    return this.#progress;
  }

  set progress(value) {
    this.#progress = value;
    const element = this.#$("#progress-bar");
    element.style.setProperty("--percent", (value * 100).toFixed(2));
    element.hidden = value >= 1;
  }

  connectedCallback() {
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    // Some events are global
    addEventListener("dragover", this, { signal });
    addEventListener("drop", this, { signal });
    addEventListener("paste", this, { signal });
    this.addEventListener("change", this, { signal });
    this.addEventListener("click", this, { signal });
    this.addEventListener("input", this, { signal });
    this.addEventListener("submit", this, { signal });
    // Firefox likes to store form values across page loads...
    this.#$("#fry-quality").value = this.#fryQuality;
    this.#$("#fry-count").value = this.#fryCount;
    this.#$("#fry-size").value = this.#frySize;
  }

  disconnectedCallback() {
    this.abortController.abort();
  }

  /**
   * @param event {Event}
   */
  handleEvent(event) {
    const { type, target, clipboardData } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const { id } = target;
    if (type === "submit") {
      event.preventDefault();
      return;
    }
    if (type === "paste") {
      /** @type {File} */
      const [file] = clipboardData.files;
      if (file && file.type.startsWith("image/")) {
        const name = String(Date.now());
        const newFile = new File([file], name);
        this.#loadFile(newFile);
        this.#render();
      }
      return;
    }
    if (type === "dragover") {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    if (type === "drop") {
      event.preventDefault();
      this.#loadFile(event.dataTransfer.files[0]);
      this.#render();
      return;
    }
    if (type === "click" && id === "file-input") {
      this.#$("#file-input-real").click();
      return;
    }
    if (type === "change" && id === "file-input-real") {
      this.#loadFile(event.target.files[0]);
      this.#render();
      return;
    }
    if (type === "input" && id === "fry-count") {
      this.#fryCount = Number(target.value);
      this.#render();
      return;
    }
    if (type === "input" && id === "fry-quality") {
      this.#fryQuality = Number(target.value);
      this.#render();
      return;
    }
    if (type === "input" && id === "fry-size") {
      this.#frySize = Number(target.value);
      this.#render();
      return;
    }
  }

  #getFryQuality(i) {
    const base = this.#fryQuality * 100;
    return (base + ((i * 7) % 10)) / 100;
  }

  /**
   * @param {number} height
   * @param {number} width
   */
  #getScaledSize(width, height) {
    const maxSize = this.#frySize * 1_000_000;
    const size = width * height;
    if (size < maxSize) {
      return [width, height];
    }
    const scale2d = size / maxSize;
    const scale1d = Math.sqrt(scale2d);
    const w = Math.floor(width / scale1d);
    const h = Math.floor(height / scale1d);
    return [w, h];
  }

  /**
   * @param {File} file
   */
  async #loadFile(file) {
    const dataUrl = await this.#readFile(file);
    this.#filename = file.name;
    this.#inputImage = await this.#loadImage(dataUrl);
    this.#render();
  }

  async #deepFry() {
    try {
      this.#$("#fieldset").disabled = true;
      this.progress = 0;
      let image = this.#inputImage;
      const [w, h] = this.#getScaledSize(
        image.naturalWidth,
        image.naturalHeight
      );
      this.#canvas.width = w;
      this.#canvas.height = h;
      this.#ctx.fillStyle = "white";
      this.#ctx.fillRect(0, 0, w, h);
      this.#ctx.drawImage(image, 0, 0, w, h);
      const count = this.#fryCount;
      for (let i = 0; i < count; i++) {
        this.progress = (i + 1) / count;
        this.#ctx.drawImage(image, 0, 0, w, h);
        const quality = this.#getFryQuality(i);
        const dataUrl = this.#canvas.toDataURL("image/jpeg", quality);
        image = await this.#loadImage(dataUrl);
        await this.#sleep(0);
      }
      return image;
    } finally {
      this.#$("#fieldset").disabled = false;
      this.#progress = 1;
    }
  }

  /**
   * @param {File} file
   * @returns {Promise<string>}
   */
  async #readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve(reader.result);
      });
      reader.addEventListener("error", () => {
        reject(new Error(`couldn't read file: ${file.name}`));
      });
      reader.readAsDataURL(file);
    });
  }

  /**
   * @param {string} url
   * @returns {Promise<HTMLImageElement>}
   */
  async #loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = document.createElement("img");
      image.addEventListener("load", () => {
        resolve(image);
      });
      image.addEventListener("error", () => {
        reject(new Error(`couldn't load image: ${url}`));
      });
      image.src = url;
    });
  }

  async #render() {
    if (!this.#inputImage) {
      return;
    }
    const fileInputContainer = this.#$("#file-input-container");
    fileInputContainer.innerHTML = "";
    fileInputContainer.append(this.#inputImage);
    fileInputContainer.hidden = false;
    this.#outputImage = await this.#deepFry();
    const outputArea = this.#$("#output-area");
    outputArea.hidden = false;
    const downloadLink = this.#$("#download-link");
    downloadLink.download = `${this.#filename}.jpg`;
    downloadLink.href = this.#outputImage.href;
    const fileOutputContainer = this.#$("#file-output-container");
    fileOutputContainer.innerHTML = "";
    fileOutputContainer.append(this.#outputImage);
  }

  /**
   * @param {string} selector
   * @return {HTMLElement}
   */
  #$(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`no element found for: ${selector}`);
    }
    return element;
  }

  async #sleep(duration) {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  }
}

customElements.define("jpeg-app", JpegApp);
