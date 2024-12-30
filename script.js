/*
  JAVASCRIPT-DATEI FÜR DAS BILDBEARBEITUNGSTOOL
  Einhaltung der Vorgaben:
    - Keine verbotenen Canvas-Methoden (rotate, translate, scale...)
    - Alle Pixelmanipulationen via getImageData / putImageData
    - Kommentare auf Deutsch für bessere Verständlichkeit
*/

/* --- Globale Variablen --- */
const fileInput = document.getElementById("fileInput");
const imageCanvas = document.getElementById("imageCanvas");
const histogramCanvas = document.getElementById("histogramCanvas");
const ctx = imageCanvas.getContext("2d");
const histCtx = histogramCanvas.getContext("2d");

// Speichert eine Kopie des Originalbildes (für Reset)
let originalImageData = null;
// Aktuelles ImageData (wird bei jeder Bearbeitung aktualisiert)
let currentImageData = null;

/* --- [A] INITIALISIERUNG: BILD LADEN --- */
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    const img = new Image();
    img.onload = function () {
      // Canvas-Größe an das geladene Bild anpassen
      imageCanvas.width = img.width;
      imageCanvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      currentImageData = ctx.getImageData(
        0,
        0,
        imageCanvas.width,
        imageCanvas.height
      );
      // Kopie des Originalzustands
      originalImageData = ctx.getImageData(
        0,
        0,
        imageCanvas.width,
        imageCanvas.height
      );
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
});

/* --- [B] HILFSFUNKTIONEN FÜR BILDABRUF UND -UPDATE --- */
function getCurrentImageData() {
  return ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
}

function putCurrentImageData(imageData) {
  ctx.putImageData(imageData, 0, 0);
  currentImageData = imageData;
}

/* clamp() zum Sicherstellen, dass Werte im Bereich [0..255] bleiben */
function clamp(value) {
  return Math.max(0, Math.min(255, value));
}
function clampIndex(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/* --- [C] EINFACHE PIXEL-BASIERTEN FUNKTIONEN --- */

/* [1] Graustufen-Konvertierung */
function toGray() {
  let imgData = getCurrentImageData();
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    // Übliche Formel: 0.299 * R + 0.587 * G + 0.114 * B
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }
  putCurrentImageData(imgData);
}

/* [2] Schwarz-Weiß mit Schwellwert */
function toBlackAndWhite(threshold) {
  let imgData = getCurrentImageData();
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    let avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
    let val = avg >= threshold ? 255 : 0;
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
  }
  putCurrentImageData(imgData);
}

/* [3] Aufhellen / Abdunkeln (Helligkeit ändern) */
function changeBrightness(offset) {
  let imgData = getCurrentImageData();
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] + offset);
    d[i + 1] = clamp(d[i + 1] + offset);
    d[i + 2] = clamp(d[i + 2] + offset);
  }
  putCurrentImageData(imgData);
}

/* [4] Kontrast anpassen (factor > 1 => stärkerer Kontrast, 0 < factor < 1 => schwächer) */
function changeContrast(factor) {
  let imgData = getCurrentImageData();
  let d = imgData.data;
  // Beispielformel: newVal = 128 + factor*(oldVal - 128)
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(128 + factor * (d[i] - 128));
    d[i + 1] = clamp(128 + factor * (d[i + 1] - 128));
    d[i + 2] = clamp(128 + factor * (d[i + 2] - 128));
  }
  putCurrentImageData(imgData);
}

/* [5] Dynamische RGB-Anpassung (Offset für R, G, B hinzufügen) */
function adjustRGB(rOffset, gOffset, bOffset) {
  let imgData = getCurrentImageData();
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] + rOffset);
    d[i + 1] = clamp(d[i + 1] + gOffset);
    d[i + 2] = clamp(d[i + 2] + bOffset);
  }
  putCurrentImageData(imgData);
}

/* [6] Negativ */
function negative() {
  let imgData = getCurrentImageData();
  let d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
  putCurrentImageData(imgData);
}

/* --- [D] ROTATION / SPIEGELUNG (ohne Canvas rotate) --- */

/* [7] Rotation um 90° (im Uhrzeigersinn oder dagegen) */
function rotate90(isCW = true) {
  let srcData = getCurrentImageData();
  let sw = srcData.width;
  let sh = srcData.height;
  // Neues ImageData mit vertauschten Dimensionen
  let dstImageData = ctx.createImageData(sh, sw);
  let dst = dstImageData.data;
  let src = srcData.data;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      let srcIndex = (y * sw + x) * 4;
      // Zielkoordinaten für +90° oder -90°
      let dx = isCW ? sh - 1 - y : y;
      let dy = isCW ? x : sw - 1 - x;
      let dstIndex = (dy * sh + dx) * 4;
      dst[dstIndex] = src[srcIndex];
      dst[dstIndex + 1] = src[srcIndex + 1];
      dst[dstIndex + 2] = src[srcIndex + 2];
      dst[dstIndex + 3] = 255;
    }
  }

  // Canvas neu anpassen und Bild setzen
  imageCanvas.width = dstImageData.width;
  imageCanvas.height = dstImageData.height;
  putCurrentImageData(dstImageData);
}

/* [8] Horizontal / Vertikal spiegeln */
function flip(horizontal = true) {
  let srcData = getCurrentImageData();
  let w = srcData.width;
  let h = srcData.height;
  let dstImageData = ctx.createImageData(w, h);
  let dst = dstImageData.data;
  let src = srcData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let srcIndex = (y * w + x) * 4;
      let newX = horizontal ? w - 1 - x : x;
      let newY = horizontal ? y : h - 1 - y;
      let dstIndex = (newY * w + newX) * 4;
      dst[dstIndex] = src[srcIndex];
      dst[dstIndex + 1] = src[srcIndex + 1];
      dst[dstIndex + 2] = src[srcIndex + 2];
      dst[dstIndex + 3] = 255;
    }
  }

  putCurrentImageData(dstImageData);
}

/* --- [E] SKALIERUNG (ohne Canvas scale) --- */

/* [9.1] Skalierung per nächstem Nachbarn (z.B. x2 oder x0.5) ohne Glättung */
function scaleNearest(factor) {
  let srcData = getCurrentImageData();
  let w = srcData.width;
  let h = srcData.height;
  let dstW = Math.round(w * factor);
  let dstH = Math.round(h * factor);

  let dstImageData = ctx.createImageData(dstW, dstH);
  let dst = dstImageData.data;
  let src = srcData.data;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      let srcX = Math.floor(x / factor);
      let srcY = Math.floor(y / factor);
      let srcIndex = (srcY * w + srcX) * 4;
      let dstIndex = (y * dstW + x) * 4;
      dst[dstIndex] = src[srcIndex];
      dst[dstIndex + 1] = src[srcIndex + 1];
      dst[dstIndex + 2] = src[srcIndex + 2];
      dst[dstIndex + 3] = 255;
    }
  }

  imageCanvas.width = dstW;
  imageCanvas.height = dstH;
  putCurrentImageData(dstImageData);
}

/* [9.2] Skalierung per bilinearer Interpolation (x2, x0.5) mit Glättung */
function scaleBilinear(factor) {
  let srcData = getCurrentImageData();
  let w = srcData.width;
  let h = srcData.height;
  let dstW = Math.round(w * factor);
  let dstH = Math.round(h * factor);

  let dstImageData = ctx.createImageData(dstW, dstH);
  let dst = dstImageData.data;
  let src = srcData.data;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      // Gleitkomma-Koordinaten in der Quellgrafik
      let gx = x / factor;
      let gy = y / factor;
      let x1 = Math.floor(gx);
      let y1 = Math.floor(gy);
      let x2 = x1 + 1 >= w ? w - 1 : x1 + 1;
      let y2 = y1 + 1 >= h ? h - 1 : y1 + 1;

      let fracX = gx - x1;
      let fracY = gy - y1;

      // Indexberechnung
      let i1 = (y1 * w + x1) * 4;
      let i2 = (y1 * w + x2) * 4;
      let i3 = (y2 * w + x1) * 4;
      let i4 = (y2 * w + x2) * 4;

      // Bilineare Interpolation für R, G, B
      for (let c = 0; c < 3; c++) {
        let c1 = src[i1 + c] * (1 - fracX) + src[i2 + c] * fracX;
        let c2 = src[i3 + c] * (1 - fracX) + src[i4 + c] * fracX;
        let val = c1 * (1 - fracY) + c2 * fracY;
        dst[(y * dstW + x) * 4 + c] = clamp(val);
      }
      dst[(y * dstW + x) * 4 + 3] = 255;
    }
  }

  imageCanvas.width = dstW;
  imageCanvas.height = dstH;
  putCurrentImageData(dstImageData);
}

/* [10] Skalierung mit beliebigem Faktor (mit Glättung) */
function scaleAny(factor) {
  scaleBilinear(factor);
}

/* --- [F] FILTER / FALTUNGSMATRIXEN (Gauss, Sobel) --- */

/* [11] Gauss-Filter 3x3, 5x5 */
const gauss3 = [
  [1 / 16, 2 / 16, 1 / 16],
  [2 / 16, 4 / 16, 2 / 16],
  [1 / 16, 2 / 16, 1 / 16],
];
const gauss5 = [
  [1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273],
  [4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273],
  [7 / 273, 26 / 273, 41 / 273, 26 / 273, 7 / 273],
  [4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273],
  [1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273],
];

function applyConvolutionMatrix(matrix) {
  let size = matrix.length;
  let half = Math.floor(size / 2);

  let srcData = getCurrentImageData();
  let w = srcData.width;
  let h = srcData.height;
  let dstImageData = ctx.createImageData(w, h);

  let src = srcData.data;
  let dst = dstImageData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sumR = 0,
        sumG = 0,
        sumB = 0;
      for (let cy = -half; cy <= half; cy++) {
        for (let cx = -half; cx <= half; cx++) {
          let iy = clampIndex(y + cy, 0, h - 1);
          let ix = clampIndex(x + cx, 0, w - 1);
          let weight = matrix[cy + half][cx + half];
          let index = (iy * w + ix) * 4;
          sumR += src[index] * weight;
          sumG += src[index + 1] * weight;
          sumB += src[index + 2] * weight;
        }
      }
      let dstIndex = (y * w + x) * 4;
      dst[dstIndex] = clamp(sumR);
      dst[dstIndex + 1] = clamp(sumG);
      dst[dstIndex + 2] = clamp(sumB);
      dst[dstIndex + 3] = 255;
    }
  }

  putCurrentImageData(dstImageData);
}

/* [12] Sobel-Filter (Kantenerkennung) */
const sobelX = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];
const sobelY = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
];

function applySobel() {
  // Auf Graustufen umstellen für bessere Ergebnisse
  toGray();

  let srcData = getCurrentImageData();
  let w = srcData.width;
  let h = srcData.height;
  let dstImageData = ctx.createImageData(w, h);
  let src = srcData.data;
  let dst = dstImageData.data;

  let half = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let gx = 0;
      let gy = 0;
      for (let cy = -half; cy <= half; cy++) {
        for (let cx = -half; cx <= half; cx++) {
          let iy = clampIndex(y + cy, 0, h - 1);
          let ix = clampIndex(x + cx, 0, w - 1);
          let index = (iy * w + ix) * 4;
          let grayVal = src[index];
          gx += grayVal * sobelX[cy + half][cx + half];
          gy += grayVal * sobelY[cy + half][cx + half];
        }
      }
      let mag = Math.sqrt(gx * gx + gy * gy);
      let dstIndex = (y * w + x) * 4;
      dst[dstIndex] = dst[dstIndex + 1] = dst[dstIndex + 2] = clamp(mag);
      dst[dstIndex + 3] = 255;
    }
  }

  putCurrentImageData(dstImageData);
}

/* --- [G] HISTOGRAMM (RGB) [13] --- */
function drawHistogram() {
  // 1. Vérification que nous avons bien une image
  let imageData = getCurrentImageData();
  if (!imageData || !imageData.data) {
    console.error("Pas de données d'image disponibles");
    return;
  }
  console.log("Données d'image trouvées:", imageData.data.length, "pixels");

  let histW = histogramCanvas.width;
  let histH = histogramCanvas.height;

  // 2. Vérification des dimensions du canvas
  console.log("Dimensions du canvas histogramme:", histW, "x", histH);

  // 3. Vérification du contexte
  if (!histCtx) {
    console.error("Impossible d'obtenir le contexte du canvas histogramme");
    return;
  }

  // Initialisation des compteurs
  let histR = new Array(256).fill(0);
  let histG = new Array(256).fill(0);
  let histB = new Array(256).fill(0);

  // Comptage des valeurs
  let data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    histR[data[i]]++;
    histG[data[i + 1]]++;
    histB[data[i + 2]]++;
  }

  // 4. Vérification des valeurs maximales
  let maxR = Math.max(...histR);
  let maxG = Math.max(...histG);
  let maxB = Math.max(...histB);
  let maxAll = Math.max(maxR, maxG, maxB);
  console.log("Valeurs max R/G/B:", maxR, maxG, maxB);

  // Nettoyage du canvas avec une couleur de fond visible
  histCtx.fillStyle = "#e0e0e0";
  histCtx.fillRect(0, 0, histW, histH);

  // Test de dessin pour vérifier que le canvas fonctionne
  histCtx.fillStyle = "black";
  histCtx.fillRect(0, 0, 50, 50);

  // Dessin de l'histogramme
  let barWidth = histW / 256;

  // Rouge
  histCtx.strokeStyle = "rgba(255,0,0,0.7)";
  histCtx.beginPath();
  for (let i = 0; i < 256; i++) {
    let h = (histR[i] / maxAll) * histH;
    if (i === 0) {
      histCtx.moveTo(i * barWidth, histH - h);
    } else {
      histCtx.lineTo(i * barWidth, histH - h);
    }
  }
  histCtx.stroke();

  // Vert
  histCtx.strokeStyle = "rgba(0,255,0,0.7)";
  histCtx.beginPath();
  for (let i = 0; i < 256; i++) {
    let h = (histG[i] / maxAll) * histH;
    if (i === 0) {
      histCtx.moveTo(i * barWidth, histH - h);
    } else {
      histCtx.lineTo(i * barWidth, histH - h);
    }
  }
  histCtx.stroke();

  // Bleu
  histCtx.strokeStyle = "rgba(0,0,255,0.7)";
  histCtx.beginPath();
  for (let i = 0; i < 256; i++) {
    let h = (histB[i] / maxAll) * histH;
    if (i === 0) {
      histCtx.moveTo(i * barWidth, histH - h);
    } else {
      histCtx.lineTo(i * barWidth, histH - h);
    }
  }
  histCtx.stroke();

  console.log("Dessin de l'histogramme terminé");
}

/* [14] Zurücksetzen auf Original */
function resetImage() {
  if (!originalImageData) return;
  imageCanvas.width = originalImageData.width;
  imageCanvas.height = originalImageData.height;
  putCurrentImageData(originalImageData);
}

/* [18] Bild speichern (Download) */
function saveImage() {
  let link = document.createElement("a");
  link.download = "bearbeitetes_bild.png";
  link.href = imageCanvas.toDataURL();
  link.click();
}

/* [19] Verknüpfung der Buttons mit den Funktionen */
document.getElementById("btnGray").addEventListener("click", toGray);

document.getElementById("btnBinarize").addEventListener("click", () => {
  let threshold = parseInt(document.getElementById("bwThreshold").value);
  toBlackAndWhite(threshold);
});

document.getElementById("btnBrighten").addEventListener("click", () => {
  let val = parseInt(document.getElementById("brightStep").value);
  changeBrightness(val);
});
document.getElementById("btnDarken").addEventListener("click", () => {
  let val = parseInt(document.getElementById("brightStep").value);
  changeBrightness(-val);
});

document.getElementById("btnContrast").addEventListener("click", () => {
  let factor = parseFloat(document.getElementById("contrastValue").value);
  changeContrast(factor);
});

document.getElementById("btnColorAdjust").addEventListener("click", () => {
  let r = parseInt(document.getElementById("redGain").value);
  let g = parseInt(document.getElementById("greenGain").value);
  let b = parseInt(document.getElementById("blueGain").value);
  adjustRGB(r, g, b);
});

document.getElementById("btnNegative").addEventListener("click", negative);

document
  .getElementById("btnRotateCW")
  .addEventListener("click", () => rotate90(true));
document
  .getElementById("btnRotateCCW")
  .addEventListener("click", () => rotate90(false));

document.getElementById("btnFlipH").addEventListener("click", () => flip(true));
document
  .getElementById("btnFlipV")
  .addEventListener("click", () => flip(false));

document
  .getElementById("btnScaleUpNoSmooth")
  .addEventListener("click", () => scaleNearest(2));
document
  .getElementById("btnScaleDownNoSmooth")
  .addEventListener("click", () => scaleNearest(0.5));
document
  .getElementById("btnScaleUpSmooth")
  .addEventListener("click", () => scaleBilinear(2));
document
  .getElementById("btnScaleDownSmooth")
  .addEventListener("click", () => scaleBilinear(0.5));

document.getElementById("btnScaleAny").addEventListener("click", () => {
  let factor = parseFloat(document.getElementById("scaleFactor").value);
  scaleAny(factor);
});

document
  .getElementById("btnGauss3")
  .addEventListener("click", () => applyConvolutionMatrix(gauss3));
document
  .getElementById("btnGauss5")
  .addEventListener("click", () => applyConvolutionMatrix(gauss5));

document.getElementById("btnSobel").addEventListener("click", applySobel);

document
  .getElementById("btnHistogram")
  .addEventListener("click", drawHistogram);

document.getElementById("btnReset").addEventListener("click", resetImage);

document.getElementById("btnSave").addEventListener("click", saveImage);
