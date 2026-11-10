(function (root) {
    "use strict";

    function getLinePoints(startX, startY, endX, endY) {
        let x0 = Math.floor(startX);
        let y0 = Math.floor(startY);
        const x1 = Math.floor(endX);
        const y1 = Math.floor(endY);
        const points = [];
        const dx = Math.abs(x1 - x0);
        const sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0);
        const sy = y0 < y1 ? 1 : -1;
        let error = dx + dy;

        while (true) {
            points.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1) break;
            const doubledError = 2 * error;
            if (doubledError >= dy) {
                error += dy;
                x0 += sx;
            }
            if (doubledError <= dx) {
                error += dx;
                y0 += sy;
            }
        }
        return points;
    }

    const api = { getLinePoints };
    root.EditorPixelLine = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
