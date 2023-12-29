class JpegApp extends HTMLElement {
  /** @type {number} */
  #quality = 0.01;

  /** @type {File | undefined} */
  #file = undefined;

  /** @type {string | undefined} */
  #url = undefined;

  #canvas = document.createElement("canvas");
  #ctx = this.#canvas.getContext("2d");

  connectedCallback() {
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    this.addEventListener("change", this, { signal });
    this.addEventListener("click", this, { signal });
    this.addEventListener("dragover", this, { signal });
    this.addEventListener("drop", this, { signal });
    this.addEventListener("input", this, { signal });
  }

  disconnectedCallback() {
    this.abortController.abort();
  }

  /** @param event {Event} */
  handleEvent(event) {
    const { type, target } = event;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const { classList } = target;
    if (type === "click" && classList.contains("FileOutput")) {
      this.#$(".DownloadLink").click();
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
    if (type === "click" && classList.contains("FileInput")) {
      this.#$("._FileInput").click();
      return;
    }
    if (type === "change" && classList.contains("_FileInput")) {
      [this.#file] = event.target.files;
      this.#render();
      return;
    }
    if (type === "input" && classList.contains("FileQuality")) {
      const n = Number(target.value);
      this.#quality = n / 100;
      this.#render();
      return;
    }
  }

  /** @param img {Image} */
  #deepFry(img) {
    this.#canvas.width = img.width;
    this.#canvas.height = img.height;
    this.#ctx.fillStyle = "white";
    this.#ctx.fillRect(0, 0, img.width, img.height);
    this.#ctx.drawImage(img, 0, 0);
    return this.#canvas.toDataURL("image/jpeg", this.#quality);
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
   * @returns {Promise<Image>}
   */
  async #loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
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
    this.#url = this.#deepFry(img);
    const downloadLink = this.#$(".DownloadLink");
    downloadLink.download = `${this.#file.name}.jpg`;
    downloadLink.href = this.#url;
    downloadLink.hidden = false;
    const fileOutput = this.#$(".FileOutput");
    fileOutput.hidden = false;
    fileOutput.src = this.#url;
  }

  /** @param {string} selector */
  #$(selector) {
    return document.querySelector(selector);
  }
}

customElements.define("jpeg-app", JpegApp);
