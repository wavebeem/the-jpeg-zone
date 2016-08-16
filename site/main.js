"use strict";

function $(sel) {
  return document.querySelector(sel);
}

function debounce(delay, f) {
  var lastRun = null;
  var id = null;
  return function() {
    if (id !== null) {
      id = setTimeout(f, delay);
    } else {
      clearTimeout(id);
      id = setTimeout(f, delay);
    }
  };
}

var state = {
  quality: 0.01,
  url: null,
};

var DELAY = 500;

function jpegify(quality, url) {
  var elem = document.createElement("img");
  elem.src = url;
  var canvas = document.createElement("canvas");
  canvas.width = elem.width;
  canvas.height = elem.height;
  var context = canvas.getContext("2d");
  context.drawImage(elem, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}

function display(url) {
  var elem = $(".FileOutput");
  elem.src = url;
  elem.classList.remove("FileOutput__hidden");
}

function setText(elem, text) {
  elem.innerHTML = "";
  elem.appendChild(document.createTextNode(text));
}

function readFile(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.addEventListener("load", function() {
      resolve(reader.result);
    });
    reader.addEventListener("error", function() {
      reject();
    });
    reader.readAsDataURL(file);
  });
}

var tryRun = debounce(DELAY, function() {
  if (state.url) {
    run(state.url, state.quality);
  }
});

function run(url, quality) {
  readFile(url)
    .then(jpegify.bind(null, quality))
    .then(display)
    .catch(function(err) {
      console.error("Oopsy!");
      console.log(err);
    });
}

$(".FileQuality").addEventListener("input", function(event) {
  var n = event.target.value;
  state.quality = n / 100;
  setText($(".FileQualityLabel"), n + "%");
  tryRun();
});

$(".FileInput").addEventListener("change", function(event) {
  if (event.target.files.length > 0) {
    state.url = event.target.files[0];
    tryRun();
  }
});
