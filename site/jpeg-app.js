class JpegApp extends HTMLElement {
  #fryCount = 25;
  #fryQuality = 0.3;
  #frySize = 2 ** -3;
  #progress = 0;
  /** @type {Blob | undefined} */
  #blob;
  /** @type {ImageBitmap | undefined} */
  #bitmap;
  /** @type {string} */
  #filename = "the-jpeg-zone.jpg";

  get progress() {
    return this.#progress;
  }

  set progress(value) {
    this.#progress = value;
    const element = this.#$("#progress-bar");
    element.style.setProperty("--percent", (value * 100).toFixed(2));
    element.hidden = value >= 1;
    const canvasOutput = this.#$("#canvas-output");
    canvasOutput.dataset.loading = String(value >= 1);
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
  async handleEvent(event) {
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
      console.log("Pastey??");
      if (clipboardData.files.length > 0) {
        /** @type {File} */
        const file = clipboardData.files[0];
        if (file?.type.startsWith("image/")) {
          const name = String(Date.now());
          const newFile = new File([file], name);
          await this.#loadFile(newFile);
          this.#render();
        }
      }
      return;
    }
    if (type === "dragover") {
      event.preventDefault();
      const items = [...event.dataTransfer.items];
      console.log(items);
      if (items.every((x) => x.type.startsWith("image/"))) {
        event.dataTransfer.dropEffect = "copy";
      } else {
        event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    if (type === "drop") {
      event.preventDefault();
      if (event.dataTransfer.files.length > 0) {
        await this.#loadFile(event.dataTransfer.files[0]);
        this.#render();
      }
      return;
    }
    if (type === "click" && id === "file-input") {
      this.#$("#file-input-real").click();
      return;
    }
    if (type === "click" && id === "fry-it-again") {
      // this.#inputImage = this.#outputImage;
      this.#render();
      return;
    }
    if (type === "change" && id === "file-input-real") {
      await this.#loadFile(event.target.files[0]);
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
    console.trace();
    this.#filename = file.name;
    await this.#loadBlob(file);
  }

  async #loadBlob(blob) {
    this.#blob = blob;
    // Avoid memory leaks...
    // if (this.#bitmap) {
    //   this.#bitmap.close();
    // }
    this.#bitmap = await createImageBitmap(blob, {
      colorSpaceConversion: "none",
    });
  }

  async #deepFry() {
    try {
      this.#$("#fieldset").disabled = true;
      const canvas = this.#$("#canvas-output");
      const ctx = canvas.getContext("2d", {
        alpha: false,
        colorSpace: "srgb",
      });
      this.progress = 0;
      // let image = this.#inputImage;
      const [w, h] = this.#getScaledSize(
        this.#bitmap.width,
        this.#bitmap.height,
      );
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(this.#bitmap, 0, 0, w, h);
      const count = this.#fryCount;
      for (let i = 0; i < count; i++) {
        this.progress = (i + 1) / count;
        ctx.drawImage(this.#bitmap, 0, 0, w, h);
        const quality = this.#getFryQuality(i);
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });
        await this.#loadBlob(blob);
        await this.#sleep(0);
      }
    } finally {
      this.#$("#fieldset").disabled = false;
      this.#progress = 1;
    }
  }

  async #render() {
    if (!this.#bitmap) {
      return;
    }
    this.#deepFry();
    const canvasOutput = this.#$("#canvas-output");
    // TODO: draw #bitmap to fileInput
    // this.#outputImage = await this.#deepFry();
    const outputArea = this.#$("#output-area");
    outputArea.hidden = false;
    const downloadLink = this.#$("#download-link");
    downloadLink.download = `${this.#filename}.jpg`;
    downloadLink.href = URL.createObjectURL(this.#blob);
    // TODO: Set the downloadLink src to a data URL of the output canvas...
    // const fileOutputContainer = this.#$("#file-output-container");
    // fileOutputContainer.replaceChildren(this.#canvas);
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
