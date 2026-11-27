class JpegApp extends HTMLElement {
  #fryCount = 25;
  #fryQuality = 0.3;
  #frySize = 2 ** -3;
  #progress = 0;
  /** @type {File | undefined} */
  #file;
  /** @type {Blob | undefined} */
  #blob;
  /** @type {ImageBitmap | undefined} */
  #bitmap;
  #downloadLink = document.createElement("a");

  get progress() {
    return this.#progress;
  }

  set progress(value) {
    this.#progress = value;
    const element = this.#$("#progress-bar");
    element.style.setProperty("--percent", (value * 100).toFixed(2));
    element.hidden = value >= 1;
    const canvasOutput = this.#$("#canvas-output");
    canvasOutput.dataset.loading = String(value < 1);
    this.#$("#output-form fieldset").disabled = value < 1;
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
    this.#downloadLink.hidden = true;
    // this.append(this.#downloadLink);
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
      if (items.every((x) => x.type.startsWith("image/"))) {
        event.dataTransfer.dropEffect = "copy";
      } else {
        event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    if (type === "drop") {
      event.preventDefault();
      /** @type {File} */
      const file = event.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        await this.#loadFile(file);
        this.#render();
      }
      return;
    }
    if (type === "click" && id === "download-button") {
      this.#downloadLink.click();
      return;
    }
    if (type === "click" && id === "file-input") {
      this.#$("#file-input-real").click();
      return;
    }
    if (type === "click" && id === "fry-it-again") {
      await this.#loadFile(new File([this.#blob], this.#file.name));
      this.#render();
      return;
    }
    if (type === "change" && id === "file-input-real") {
      await this.#loadFile(event.target.files[0]);
      this.#render();
      return;
    }
    if (type === "input" && id === "fry-count") {
      await this.#loadFile(this.#file);
      this.#fryCount = Number(target.value);
      this.#render();
      return;
    }
    if (type === "input" && id === "fry-quality") {
      await this.#loadFile(this.#file);
      this.#fryQuality = Number(target.value);
      this.#render();
      return;
    }
    if (type === "input" && id === "fry-size") {
      await this.#loadFile(this.#file);
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
    this.#file = file;
    await this.#loadBlob(file);
  }

  async #loadBlob(blob) {
    this.#blob = blob;
    const oldBitmap = this.#bitmap;
    this.#bitmap = await createImageBitmap(blob, {
      colorSpaceConversion: "none",
    });
    if (this.#bitmap !== oldBitmap && oldBitmap) {
      oldBitmap.close();
    }
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

  async #drawInput() {
    const canvas = this.#$("#canvas-input");
    canvas.hidden = false;
    const ctx = canvas.getContext("2d", {
      alpha: false,
      colorSpace: "srgb",
    });
    const [w, h] = this.#getScaledSize(this.#bitmap.width, this.#bitmap.height);
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(this.#bitmap, 0, 0, w, h);
  }

  async #render() {
    if (!this.#bitmap) {
      return;
    }
    await this.#drawInput();
    await this.#deepFry();
    this.#downloadLink.download = `${this.#file.name}.jpg`;
    if (this.#downloadLink.href) {
      URL.revokeObjectURL(this.#downloadLink.href);
    }
    this.#downloadLink.href = URL.createObjectURL(this.#blob);
    this.#$("#output-form fieldset").disabled = false;
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
