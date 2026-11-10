(function (root) {
    "use strict";

    function renderDocument(model, targetCanvas) {
        targetCanvas.width = model.width;
        targetCanvas.height = model.height;
        const context = targetCanvas.getContext("2d");
        context.clearRect(0, 0, model.width, model.height);
        context.imageSmoothingEnabled = false;

        model.layers.forEach((layer) => {
            if (!layer.visible) return;
            context.save();
            context.globalAlpha = layer.opacity / 100;
            context.filter = `brightness(${layer.brightness}%) contrast(${layer.contrast}%) saturate(${layer.saturation}%)`;
            context.drawImage(layer.canvas, 0, 0);
            context.restore();
        });
        context.filter = "none";
        context.globalAlpha = 1;
        return targetCanvas;
    }

    function createCompositeCanvas(model) {
        const canvas = document.createElement("canvas");
        return renderDocument(model, canvas);
    }

    const api = { renderDocument, createCompositeCanvas };
    root.EditorRenderer = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
