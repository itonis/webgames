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
}

// --- Image Handling ---

function handleFileSelect(event, imgElement) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        imgElement.src = e.target.result;
        imgElement.style.display = 'block';
        imgElement.onload = () => {
            // Reset view on new image load if it's the first one or requested? 
            // For now, let's reset to center fit if both are empty or just keep current transform
            // Better: Reset to fit
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
    // Basic reset to center and fit
    // This is a simplified reset, can be improved to "contain" logic
    state.scale = 1;
    state.panX = 0;
    state.panY = 0;

    // Auto-fit logic for initial load
    const viewport = dom.viewLeft.getBoundingClientRect(); // Use left as reference
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const viewAspect = viewport.width / viewport.height;

    if (imgAspect > viewAspect) {
        // wider than viewport, fit width
        state.scale = viewport.width / img.naturalWidth;
    } else {
        // taller than viewport, fit height
        state.scale = viewport.height / img.naturalHeight;
    }

    // Center it
    state.panX = (viewport.width - img.naturalWidth * state.scale) / 2;
    state.panY = (viewport.height - img.naturalHeight * state.scale) / 2;

    updateTransform();
}

function swapImages() {
    const srcLeft = dom.imgLeft.src;
    const srcRight = dom.imgRight.src;

    dom.imgLeft.src = srcRight;
    dom.imgRight.src = srcLeft;

    // Handle visibility/empty states if one side is empty
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

    // Zoom towards mouse pointer
    // We need to calculate how much to adjust panX/panY to keep the point under mouse stationary
    // Mouse relative to viewport
    // Note: e.currentTarget might be left or right viewport
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // (mouseX - panX) / oldScale = imageX (coordinate in image space)
    // We want: (mouseX - newPanX) / newScale = imageX
    // So: newPanX = mouseX - imageX * newScale
    //             = mouseX - (mouseX - panX) * (newScale / oldScale)

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
