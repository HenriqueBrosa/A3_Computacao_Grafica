(function (root) {
    "use strict";

    async function importImageAsLayer(model, file) {
        if (!file || !file.type || !file.type.startsWith("image/")) {
            throw new Error("Selecione um arquivo de imagem válido.");
        }
        if (file.size > 100 * 1024 * 1024) {
            throw new Error("A imagem excede o limite de 100 MB.");
        }

        let bitmap;
        let objectUrl;
        try {
            if (typeof createImageBitmap === "function") {
                bitmap = await createImageBitmap(file);
            } else {
                objectUrl = URL.createObjectURL(file);
                bitmap = await new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onload = () => resolve(image);
                    image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
                    image.src = objectUrl;
                });
            }

            const layer = model.addLayer(file.name.replace(/\.[^.]+$/, "") || "Imagem importada");
            const context = layer.canvas.getContext("2d");
            const scale = Math.min(model.width / bitmap.width, model.height / bitmap.height);
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const x = Math.floor((model.width - width) / 2);
            const y = Math.floor((model.height - height) / 2);
            context.imageSmoothingEnabled = false;
            context.clearRect(0, 0, model.width, model.height);
            context.drawImage(bitmap, x, y, width, height);
            return layer;
        } finally {
            if (bitmap && typeof bitmap.close === "function") bitmap.close();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
    }

    function exportCanvasAsPng(canvas, filename) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Não foi possível gerar o arquivo PNG."));
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename || "imagem.png";
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                resolve();
            }, "image/png");
        });
    }

    const api = { importImageAsLayer, exportCanvasAsPng };
    root.EditorImageIO = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
