document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const physWidthInput = document.getElementById('phys-width');
    const physHeightInput = document.getElementById('phys-height');
    const projWidthInput = document.getElementById('proj-width');
    const projHeightInput = document.getElementById('proj-height');

    // Lumen Inputs
    const lumenEnvSelect = document.getElementById('lumen-env');
    const lumenGainInput = document.getElementById('lumen-gain');

    // Presets
    const presetButtons = document.querySelectorAll('.btn-preset');

    // Outputs
    const resWidthEl = document.getElementById('res-width');
    const resHeightEl = document.getElementById('res-height');
    const metaParEl = document.getElementById('meta-par');
    const metaUsageEl = document.getElementById('meta-usage');
    const resLumensEl = document.getElementById('res-lumens');

    // Visualization
    const vizFrame = document.getElementById('viz-frame');
    const vizSlice = document.getElementById('viz-slice');

    // State
    const state = {
        physW: 1355,
        physH: 270,
        projW: 1920,
        projH: 1200
    };

    function updateState() {
        state.physW = parseFloat(physWidthInput.value) || 0;
        state.physH = parseFloat(physHeightInput.value) || 0;
        state.projW = parseInt(projWidthInput.value) || 1920;
        state.projH = parseInt(projHeightInput.value) || 1200;

        calculate();
        calculateLumens();
    }

    function calculateLumens() {
        if (state.physW <= 0 || state.physH <= 0) {
            resLumensEl.textContent = '0';
            return;
        }

        const targetFL = parseFloat(lumenEnvSelect.value);
        const gain = parseFloat(lumenGainInput.value) || 1.0;

        // Area in square feet. 1 sq ft = 929.03 cm^2
        const areaSqCm = state.physW * state.physH;
        const areaSqFt = areaSqCm / 929.03;

        // Formula: Lumens = (Area * FootLamberts) / Gain
        const requiredLumens = (areaSqFt * targetFL) / gain;

        resLumensEl.textContent = Math.round(requiredLumens).toLocaleString();
    }

    function calculate() {
        if (state.physW <= 0 || state.physH <= 0 || state.projW <= 0 || state.projH <= 0) {
            resetResults();
            return;
        }

        const physAR = state.physW / state.physH;
        const projAR = state.projW / state.projH;

        // Calculation Logic:
        // We want to fit the physical rectangle into the projector rectangle
        // such that we maximize pixel usage (make it as large as possible).

        let targetW, targetH;

        if (physAR > projAR) {
            // Physical is "wider" than projector aspect. 
            // Constraint is Width.
            // Fit Width:
            targetW = state.projW;
            targetH = state.projW / physAR;
        } else {
            // Physical is "taller" (or equal) than projector aspect.
            // Constraint is Height.
            // Fit Height:
            targetH = state.projH;
            targetW = state.projH * physAR;
        }

        const finalW = Math.round(targetW);
        const finalH = Math.round(targetH);

        const totalPixels = state.projW * state.projH;
        const usedPixels = finalW * finalH;
        const usagePercent = ((usedPixels / totalPixels) * 100).toFixed(1);

        // Update UI
        resWidthEl.textContent = finalW;
        resHeightEl.textContent = finalH;
        metaParEl.textContent = physAR.toFixed(3);
        metaUsageEl.textContent = `${usagePercent}%`;

        updateVisualization(physAR, projAR);
    }

    function resetResults() {
        resWidthEl.textContent = '0';
        resHeightEl.textContent = '0';
        metaParEl.textContent = '-';
        metaUsageEl.textContent = '-';
        resLumensEl.textContent = '0';
        vizSlice.style.width = '0';
        vizSlice.style.height = '0';
    }

    function updateVisualization(physAR, projAR) {
        // We need to scale the visualization to fit in the container
        // Base size for the frame in visualization (max pixels)
        const MAX_VIZ_WIDTH = 300;
        const MAX_VIZ_HEIGHT = 200;

        // Calculate scaling factor for the FRAME to fit within MAX view box
        // We want to draw the frame with aspect ratio projAR
        let frameW, frameH;

        if (projAR > (MAX_VIZ_WIDTH / MAX_VIZ_HEIGHT)) {
            // Frame is very wide
            frameW = MAX_VIZ_WIDTH;
            frameH = MAX_VIZ_WIDTH / projAR;
        } else {
            // Frame is tall or normal
            frameH = MAX_VIZ_HEIGHT;
            frameW = MAX_VIZ_HEIGHT * projAR;
        }

        vizFrame.style.width = `${frameW}px`;
        vizFrame.style.height = `${frameH}px`;

        // Now size the slice inside relative to the frame
        // logic should mirror calculation
        if (physAR > projAR) {
            // Width 100%
            vizSlice.style.width = '100%';
            vizSlice.style.height = `${(projAR / physAR) * 100}%`;
        } else {
            // Height 100%
            vizSlice.style.height = '100%';
            vizSlice.style.width = `${(physAR / projAR) * 100}%`;
        }
    }

    // Event Listeners
    [physWidthInput, physHeightInput, projWidthInput, projHeightInput, lumenEnvSelect, lumenGainInput].forEach(el => {
        el.addEventListener('input', updateState);
    });

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            projWidthInput.value = btn.dataset.w;
            projHeightInput.value = btn.dataset.h;
            updateState();
        });
    });

    document.getElementById('btn-download').addEventListener('click', generateTestPattern);

    function generateTestPattern() {
        const w = parseInt(resWidthEl.textContent);
        const h = parseInt(resHeightEl.textContent);
        const name = document.getElementById('proj-name').value || 'SLICE';

        if (w === 0 || h === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        const centerX = w / 2;
        const centerY = h / 2;
        const gridSize = 100;
        const ar = (w / h).toFixed(2);

        // 1. Background: Black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // 2. Grid (Standard Square Grid)
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#333333';
        ctx.beginPath();
        for (let x = centerX % gridSize; x <= w; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = centerY % gridSize; y <= h; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();

        // 3. Center Axes (Red)
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h);
        ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
        ctx.stroke();

        // 4. Large Circle (White)
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        const radius = Math.min(w, h) * 0.45;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 5. Grayscale Gradient (255 to 0)
        const barH = Math.min(h * 0.1, 50);
        const gradY = h - barH;
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, '#ffffff'); // 255
        gradient.addColorStop(1, '#000000'); // 0
        ctx.fillStyle = gradient;
        ctx.fillRect(0, gradY, w, barH);

        // 6. Simple Color Strip
        const colorH = Math.min(h * 0.05, 20);
        const colorY = gradY - colorH;
        const colors = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff', '#000000'];
        const cw = w / colors.length;
        for (let i = 0; i < colors.length; i++) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(i * cw, colorY, cw, colorH);
        }

        // 7. Info Text (Minimal)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = 'bold 40px Arial';
        ctx.strokeText(name.toUpperCase(), centerX, centerY - 25);
        ctx.fillText(name.toUpperCase(), centerX, centerY - 25);

        ctx.font = '20px Arial';
        ctx.strokeText(`${w} x ${h} px  (${ar}:1)`, centerX, centerY + 25);
        ctx.fillText(`${w} x ${h} px  (${ar}:1)`, centerX, centerY + 25);

        // 8. Outer Border (Green)
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(0, 0, w, h);

        // Download
        const link = document.createElement('a');
        link.download = `projection_pattern_${name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Initialize state
    updateState();

});
