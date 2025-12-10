/* converter.js
   Core client-side image conversion logic using canvas and built-in browser APIs.

   Features:
   - Drag & Drop + file input
   - Preview before/after
   - Shows file size before/after
   - Convert to PNG, JPEG, WEBP, SVG (raster embedded), BMP
   - Quality slider control (0-100) -> maps to [0,1]
   - Scale support (percentage)
   - Create downloadable Blob and objectURL
   - All work is client-side and offline (no upload)
*/

/* ---------- Helpers ---------- */
const bytesToSize = (bytes) => {
  if(bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const el = id => document.getElementById(id);

/* ---------- UI elements ---------- */
const dropArea = el('drop-area');
const chooseFileBtn = el('choose-file');
const fileInput = el('file-input');
const beforeImg = el('before-img');
const afterImg = el('after-img');
const beforeInfo = el('before-info');
const afterInfo = el('after-info');
const formatSelect = el('format-select');
const qualityRange = el('quality');
const qualityLabel = el('quality-label');
const convertBtn = el('convert-btn');
const downloadBtn = el('download-btn');
const fileSizeEl = el('file-size');
const scaleRange = el('scale');

/* State */
let currentFile = null;
let convertedBlob = null;
let convertedURL = null;

/* ---------- Drag & Drop ---------- */
['dragenter','dragover'].forEach(evt=>{
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.add('dragover');
  });
});
['dragleave','drop'].forEach(evt=>{
  dropArea.addEventListener(evt, e => {
    e.preventDefault(); e.stopPropagation();
    if(evt === 'drop'){
      const dt = e.dataTransfer;
      if(dt && dt.files && dt.files.length){
        handleFile(dt.files[0]);
      }
    }
    dropArea.classList.remove('dragover');
  });
});

/* Click triggers file input */
chooseFileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if(e.target.files && e.target.files.length) handleFile(e.target.files[0]);
});

/* Update quality label */
qualityRange.addEventListener('input', () => {
  qualityLabel.textContent = qualityRange.value;
});

/* Convert button */
convertBtn.addEventListener('click', async () => {
  if(!currentFile) return;
  convertBtn.disabled = true;
  convertBtn.textContent = 'Converting...';
  try{
    const outType = formatSelect.value;
    const quality = Math.max(0, Math.min(100, Number(qualityRange.value || 80))) / 100;
    const scale = Math.max(0.2, Math.min(2, Number(scaleRange.value) / 100));
    const blob = await convertImageFile(currentFile, outType, quality, scale);
    convertedBlob = blob;
    if(convertedURL) URL.revokeObjectURL(convertedURL);
    convertedURL = URL.createObjectURL(blob);
    afterImg.src = convertedURL;
    afterInfo.textContent = `${outType.split('/')[1].toUpperCase()} • ${bytesToSize(blob.size)}`;
    downloadBtn.disabled = false;
    fileSizeEl.textContent = `Before: ${bytesToSize(currentFile.size)} • After: ${bytesToSize(blob.size)}`;
  }catch(err){
    console.error(err);
    alert('Conversion failed: ' + (err.message || err));
  }finally{
    convertBtn.disabled = false;
    convertBtn.textContent = 'Convert';
  }
});

/* Download converted */
downloadBtn.addEventListener('click', () => {
  if(!convertedBlob) return;
  const ext = formatSelect.value.includes('svg') ? 'svg' : (formatSelect.value.split('/')[1] || 'img');
  const name = (currentFile && currentFile.name) ? currentFile.name.replace(/\.[^/.]+$/, '') : 'converted';
  const filename = `${name}.${ext}`;
  const link = document.createElement('a');
  link.href = convertedURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
});

/* ---------- File handling & preview ---------- */
function handleFile(file){
  // Accept image files only
  if(!file.type.startsWith('image/')){
    alert('Please select an image file.');
    return;
  }
  currentFile = file;
  convertBtn.disabled = false;
  downloadBtn.disabled = true;
  convertedBlob = null;
  // show before preview
  const objectUrl = URL.createObjectURL(file);
  beforeImg.onload = () => { URL.revokeObjectURL(objectUrl); };
  beforeImg.src = objectUrl;
  beforeInfo.textContent = `${file.type} • ${bytesToSize(file.size)}`;
  fileSizeEl.textContent = `Before: ${bytesToSize(file.size)} • After: —`;
  // clear after
  afterImg.src = '';
  afterInfo.textContent = '—';
}

/* ---------- Conversion core ---------- */

/**
 * convertImageFile(file, outType, quality, scale)
 * - file: File or Blob
 * - outType: MIME type string, e.g. "image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/bmp"
 * - quality: 0..1 (for lossy formats)
 * - scale: scale multiplier (e.g. 1 for original, 0.5 for half)
 *
 * Returns: Promise<Blob>
 */
async function convertImageFile(file, outType, quality = 0.8, scale = 1){
  // Create an image element and draw to canvas
  const img = await loadImageFromFile(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // scaled dimensions while preserving aspect ratio
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.width = width;
  canvas.height = height;

  // Clear and draw
  ctx.clearRect(0, 0, width, height);
  // Draw image with high quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  // handle different output types
  if(outType === 'image/svg+xml'){
    // For raster source -> embed as base64 PNG inside an SVG wrapper
    // This keeps the vector extension but the image is still raster inside.
    const pngData = canvas.toDataURL('image/png', quality);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="${pngData}" width="${width}" height="${height}"/></svg>`;
    return new Blob([svg], {type: 'image/svg+xml'});
  }

  if(outType === 'image/bmp' || outType === 'image/x-ms-bmp'){
    // Convert canvas pixel data to BMP binary and return Blob
    const bmpBlob = canvasToBMP(canvas);
    return bmpBlob;
  }

  // For PNG, JPEG, WEBP use toBlob where supported
  return new Promise((resolve, reject) => {
    // Map quality param for toBlob: for png it's ignored by many browsers
    const mime = outType;
    // Some browsers don't support WEBP or BMP in toBlob - fallback to PNG
    try {
      canvas.toBlob((blob) => {
        if(blob) resolve(blob);
        else reject(new Error('Conversion to blob failed.'));
      }, mime, (mime === 'image/png' ? undefined : quality));
    } catch(e){
      // fallback: use dataURL and convert
      try {
        const dataURL = canvas.toDataURL(mime, quality);
        const blob = dataURLToBlob(dataURL);
        resolve(blob);
      } catch(err){
        reject(err);
      }
    }
  });
}

/* ---------- Utilities used by conversion ---------- */

/* Load image from File/Blob */
function loadImageFromFile(file){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/* Convert dataURL to Blob */
function dataURLToBlob(dataURL){
  const parts = dataURL.split(',');
  const meta = parts[0];
  const raw = parts[1];
  const isBase64 = meta.indexOf('base64') >= 0;
  const contentType = meta.split(':')[1].split(';')[0];
  let bytes;
  if(isBase64){
    const binary = atob(raw);
    bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  } else {
    const decoded = decodeURIComponent(raw);
    bytes = new Uint8Array(decoded.length);
    for(let i=0;i<decoded.length;i++) bytes[i] = decoded.charCodeAt(i);
  }
  return new Blob([bytes], {type: contentType});
}

/* Convert canvas to BMP Blob
   Based on simple BMP writer for 24-bit RGB.
   Note: This produces uncompressed BMP (Windows BITMAPINFOHEADER).
*/
function canvasToBMP(canvas){
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0,0,width,height);
  const pixels = imageData.data;

  const rowStride = Math.floor((24 * width + 31) / 32) * 4; // row size aligned to 4 bytes
  const pixelArraySize = rowStride * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const dv = new DataView(buffer);
  let offset = 0;

  // BITMAPFILEHEADER (14 bytes)
  dv.setUint8(offset, 0x42); offset++; // 'B'
  dv.setUint8(offset, 0x4D); offset++; // 'M'
  dv.setUint32(offset, fileSize, true); offset += 4; // size
  dv.setUint16(offset, 0, true); offset += 2; // reserved1
  dv.setUint16(offset, 0, true); offset += 2; // reserved2
  dv.setUint32(offset, 54, true); offset += 4; // offset to pixel array

  // BITMAPINFOHEADER (40 bytes)
  dv.setUint32(offset, 40, true); offset += 4; // header size
  dv.setInt32(offset, width, true); offset += 4;
  dv.setInt32(offset, height, true); offset += 4;
  dv.setUint16(offset, 1, true); offset += 2; // planes
  dv.setUint16(offset, 24, true); offset += 2; // bits per pixel
  dv.setUint32(offset, 0, true); offset += 4; // compression
  dv.setUint32(offset, pixelArraySize, true); offset += 4; // image size
  dv.setInt32(offset, 2835, true); offset += 4; // x pixels per meter
  dv.setInt32(offset, 2835, true); offset += 4; // y pixels per meter
  dv.setUint32(offset, 0, true); offset += 4; // colors used
  dv.setUint32(offset, 0, true); offset += 4; // important colors

  // Pixel array (bottom-up)
  const padding = rowStride - width * 3;
  let p = 54;
  for(let y = height - 1; y >= 0; y--){
    for(let x = 0; x < width; x++){
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i+1];
      const b = pixels[i+2];
      dv.setUint8(p++, b);
      dv.setUint8(p++, g);
      dv.setUint8(p++, r);
    }
    // padding
    for(let k=0;k<padding;k++){
      dv.setUint8(p++, 0);
    }
  }

  return new Blob([buffer], {type: 'image/bmp'});
}

/* ---------- Initialize small UI behaviors ---------- */
(function initUI(){
  // Allow clicking drop-area to open file input
  dropArea.addEventListener('click', () => fileInput.click());

  // initialize quality label
  qualityLabel.textContent = qualityRange.value;

  // disable convert until file chosen
  convertBtn.disabled = true;
  downloadBtn.disabled = true;

  // accessibility: keyboard activation
  dropArea.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' ') fileInput.click();
  });

  // allow paste of image (CTRL+V)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if(!items) return;
    for(let i=0;i<items.length;i++){
      const it = items[i];
      if(it.type.indexOf('image') === 0){
        const file = it.getAsFile();
        if(file) handleFile(file);
        break;
      }
    }
  });
})();
