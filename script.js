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

        // 1. Background: Neutral Deep Gray
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, w, h);

        // 2. Grayscale Ramp (Top)
        const topH = Math.min(h * 0.12, 60);
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, '#000');
        gradient.addColorStop(1, '#fff');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, topH);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Brightness / Contrast Ramp', 10, topH - 10);

        // 3. Color Bars (Bottom)
        const botH = Math.min(h * 0.12, 60);
        const colors = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff', '#000000'];
        const barW = w / colors.length;
        for (let i = 0; i < colors.length; i++) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(i * barW, h - botH, barW, botH);
        }

        // 4. Grid & Mapping Details
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#222';
        ctx.beginPath();
        for (let x = 0; x <= w; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
        for (let y = 0; y <= h; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
        ctx.stroke();

        // 5. Geometry circle
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.min(w, h) / 2.2, 0, Math.PI * 2);
        ctx.stroke();

        // 6. Focus Patterns (Simplified Burst)
        function drawFocus(x, y, r) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
            ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
            ctx.stroke();
            for (let i = 4; i < r; i += 12) {
                ctx.beginPath(); ctx.arc(x, y, i, 0, Math.PI * 2); ctx.stroke();
            }
        }
        const burstR = Math.min(w, h) * 0.1;
        drawFocus(centerX / 2, centerY, burstR);
        drawFocus(centerX * 1.5, centerY, burstR);
        drawFocus(centerX, centerY, burstR * 1.5);

        // 7. Sharpness Font Test
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        [24, 16, 10, 8].forEach((s, i) => {
            ctx.font = `${s}px Arial`;
            ctx.fillText(`Focus Test ${s}px - 劇場合作校正圖卡`, 50, centerY + 100 + (i * 25));
        });

        // 8. Dynamic Info Plate
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(centerX - 180, centerY - 60, 360, 120);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 180, centerY - 60, 360, 120);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(name.toUpperCase(), centerX, centerY - 25);
        ctx.font = '18px monospace';
        ctx.fillText(`${w} x ${h} px`, centerX, centerY + 5);
        ctx.font = '14px Arial';
        const lumensText = resLumensEl.textContent;
        ctx.fillText(`AR: ${ar}:1 | Recommended: ${lumensText} Lumens`, centerX, centerY + 30);

        // 9. Outer Boundary (Green)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, w - 2, h - 2);

        // Download
        const link = document.createElement('a');
        link.download = `projection_pattern_${name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Initialize state
    updateState();

});
