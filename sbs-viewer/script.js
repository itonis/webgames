/**
 * SBS Pic Viewer - Logic
 */

const state = {
    scale: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeftImageWidth: 0, // For boundary checks
    initialLeftImageHeight: 0
};

const dom = {
    viewLeft: document.getElementById('viewLeft'),
    viewRight: document.getElementById('viewRight'),
    imgLeft: document.getElementById('imgLeft'),
    imgRight: document.getElementById('imgRight'),
    fileLeft: document.getElementById('fileLeft'),
    fileRight: document.getElementById('fileRight'),
    swapBtn: document.getElementById('swapBtn')
};

// --- Initialization ---

function init() {
    setupEventListeners();
}

function setupEventListeners() {
    // Image Loading
    dom.fileLeft.addEventListener('change', (e) => handleFileSelect(e, dom.imgLeft));
    dom.fileRight.addEventListener('change', (e) => handleFileSelect(e, dom.imgRight));

    // Pan & Zoom (Apply listener to container to capture all interactions)
    // We attach to both viewports to allow interaction on either side to control both
    [dom.viewLeft, dom.viewRight].forEach(el => {
        el.addEventListener('wheel', handleWheel, { passive: false });
        el.addEventListener('mousedown', handleMouseDown);
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Swap
    dom.swapBtn.addEventListener('click', swapImages);
    // Drag and Drop
    [dom.viewLeft, dom.viewRight].forEach(el => {
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('dragleave', handleDragLeave);
        el.addEventListener('drop', handleDrop);
    });
}

// --- Image Handling ---

function handleFileSelect(event, imgElement) {
    const file = event.target.files[0];
    if (!file) return;
    loadImage(file, imgElement);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Determine target image element based on viewport
    const targetImg = e.currentTarget.id === 'viewLeft' ? dom.imgLeft : dom.imgRight;
    loadImage(file, targetImg);
}

function loadImage(file, imgElement) {
    const reader = new FileReader();
    reader.onload = (e) => {
        imgElement.src = e.target.result;
        imgElement.style.display = 'block';
        imgElement.onload = () => {
            if (imgElement === dom.imgLeft) {
                state.initialLeftImageWidth = imgElement.naturalWidth;
                state.initialLeftImageHeight = imgElement.naturalHeight;
            }
            resetView(imgElement);
            // Hide empty state text if image is loaded
            imgElement.parentElement.querySelector('.empty-state').style.display = 'none';
        };
    };
    reader.readAsDataURL(file);
}

function resetView(img) {
    if (!img.naturalWidth || !img.naturalHeight) return;

    state.scale = 1;
    state.panX = 0;
    state.panY = 0;

    const viewport = dom.viewLeft.getBoundingClientRect();
    if (viewport.width === 0 || viewport.height === 0) return;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const viewAspect = viewport.width / viewport.height;

    let fitScale;
    if (imgAspect > viewAspect) {
        // Fit width
        fitScale = viewport.width / img.naturalWidth;
    } else {
        // Fit height
        fitScale = viewport.height / img.naturalHeight;
    }

    // "Center or fit": Use fit scale but don't upscale small images (cap at 1)
    state.scale = Math.min(1, fitScale);

    // Center the image
    state.panX = (viewport.width - img.naturalWidth * state.scale) / 2;
    state.panY = (viewport.height - img.naturalHeight * state.scale) / 2;

    updateTransform();
}

function swapImages() {
    // Prevent resetView from triggering on swap
    dom.imgLeft.onload = null;
    dom.imgRight.onload = null;

    const srcLeft = dom.imgLeft.src;
    const srcRight = dom.imgRight.src;

    dom.imgLeft.src = srcRight;
    dom.imgRight.src = srcLeft;

    const leftVisible = dom.imgLeft.style.display;
    dom.imgLeft.style.display = dom.imgRight.style.display;
    dom.imgRight.style.display = leftVisible;
}

// --- Transforms ---

function updateTransform() {
    const transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
    dom.imgLeft.style.transform = transform;
    dom.imgRight.style.transform = transform;
}

// --- Interaction Handlers ---

function handleWheel(e) {
    e.preventDefault();

    const zoomIntensity = 0.1;
    const oldScale = state.scale;
    let newScale = oldScale + (e.deltaY < 0 ? zoomIntensity : -zoomIntensity) * oldScale; // Proportional zoom

    newScale = Math.max(0.1, Math.min(newScale, 20)); // Limits

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    state.panX = mouseX - (mouseX - state.panX) * (newScale / oldScale);
    state.panY = mouseY - (mouseY - state.panY) * (newScale / oldScale);
    state.scale = newScale;

    updateTransform();
}

function handleMouseDown(e) {
    if (e.button !== 0) return; // Left click only
    state.isDragging = true;
    state.startX = e.clientX - state.panX;
    state.startY = e.clientY - state.panY;

    dom.viewLeft.style.cursor = 'grabbing';
    dom.viewRight.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
    if (!state.isDragging) return;

    e.preventDefault();
    state.panX = e.clientX - state.startX;
    state.panY = e.clientY - state.startY;

    // Check boundaries (Implement 50% padding logic later if needed here, or post-update)
    // For now, free drag + update

    updateTransform();
}

function handleMouseUp() {
    state.isDragging = false;
    dom.viewLeft.style.cursor = 'grab';
    dom.viewRight.style.cursor = 'grab';
}

init();
