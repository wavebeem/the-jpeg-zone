"use strict";

function $(sel) {
  return document.querySelector(sel);
}

var state = {
  quality: 0.01,
  url: null,
};

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
  $(".DownloadLink").href = url;
  $(".DownloadLink").classList.remove("hidden");
  $(".FileOutput").classList.remove("hidden");
  $(".FileOutput").src = url;
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

function tryRun() {
  if (state.url) {
    run(state.url, state.quality);
  }
}

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
  tryRun();
});

$("._FileInput").addEventListener("change", function(event) {
  if (event.target.files.length > 0) {
    state.url = event.target.files[0];
    tryRun();
  }
});

$(".FileInput").addEventListener("click", function(event) {
  $("._FileInput").click();
});

$(".FileInput").addEventListener("drop", function(event) {
  console.log(event);
  event.preventDefault();
  state.url = event.dataTransfer.files[0];
  tryRun();
});

$(".FileInput").addEventListener("dragover", function(event) {
  console.log(event);
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});

$(".FileOutput").addEventListener("click", function(event) {
  $(".DownloadLink").click();
});
