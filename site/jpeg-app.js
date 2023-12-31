class JpegApp extends HTMLElement {
  /** @type {number} */
  #fryCount = 25;

  /** @type {number} */
  #fryQuality = 0.3;

  /** @type {number} */
  #frySize = 2 ** -3;

  /** @type {File | undefined} */
  #file = undefined;

  /** @type {string | undefined} */
  #url = undefined;

  #canvas = document.createElement("canvas");
  #ctx = this.#canvas.getContext("2d");

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
    const { classList, id } = target;
    if (type === "paste") {
      /** @type {File} */
      const [file] = clipboardData.files;
      if (file && file.type.startsWith("image/")) {
        const name = String(Date.now());
        const newFile = new File([file], name);
        this.#file = newFile;
        this.#render();
      }
      return;
    }
    if (type === "click" && id === "file-output") {
      this.#$("#download-link").click();
      return;
    }
    if (type === "dragover") {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      return;
    }
    if (type === "drop") {
      event.preventDefault();
      [this.#file] = event.dataTransfer.files;
      this.#render();
      return;
    }
    if (type === "click" && id === "file-input") {
      this.#$("#file-input-real").click();
      return;
    }
    if (type === "change" && id === "file-input-real") {
      [this.#file] = event.target.files;
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
   * @param image {HTMLImageElement}
   */
  async #deepFry(image) {
    let img = image;
    const [w, h] = this.#getScaledSize(img.naturalWidth, img.naturalHeight);
    this.#canvas.width = w;
    this.#canvas.height = h;
    this.#ctx.fillStyle = "white";
    this.#ctx.fillRect(0, 0, w, h);
    this.#ctx.drawImage(img, 0, 0, w, h);
    const count = this.#fryCount;
    for (let i = 0; i < count; i++) {
      this.#ctx.drawImage(img, 0, 0, w, h);
      const quality = this.#getFryQuality(i);
      const dataUrl = this.#canvas.toDataURL("image/jpeg", quality);
      img = await this.#loadImage(dataUrl);
      await this.#sleep(0);
    }
    return this.#canvas.toDataURL("image/jpeg");
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
    if (!this.#file) {
      return;
    }
    const dataUrl = await this.#readFile(this.#file);
    const img = await this.#loadImage(dataUrl);
    this.#url = await this.#deepFry(img);
    const outputArea = this.#$("#output-area");
    outputArea.hidden = false;
    const downloadLink = this.#$("#download-link");
    downloadLink.download = `${this.#file.name}.jpg`;
    downloadLink.href = this.#url;
    const fileOutput = this.#$("#file-output");
    fileOutput.src = this.#url;
    const [w, h] = this.#getScaledSize(img.naturalWidth, img.naturalHeight);
    fileOutput.width = w;
    fileOutput.height = h;
  }

  /** @param {string} selector */
  #$(selector) {
    return document.querySelector(selector);
  }

  async #sleep(duration) {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  }
}

customElements.define("jpeg-app", JpegApp);
