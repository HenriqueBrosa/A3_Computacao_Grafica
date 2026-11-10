(function (root) {
    "use strict";

    function clamp(value, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return min;
        return Math.min(max, Math.max(min, number));
    }

    function createDocument(width, height, createSurface) {
        const surfaceFactory = createSurface || function (w, h) {
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            return canvas;
        };

        const state = {
            width: Math.round(clamp(width, 1, 8192)),
            height: Math.round(clamp(height, 1, 8192)),
            layers: [],
            selectedLayerId: null,
            nextLayerNumber: 1
        };

        function makeLayer(name) {
            const layer = {
                id: `layer-${Date.now().toString(36)}-${state.nextLayerNumber}`,
                name: name || `Camada ${state.nextLayerNumber}`,
                visible: true,
                opacity: 100,
                brightness: 100,
                contrast: 100,
                saturation: 100,
                canvas: surfaceFactory(state.width, state.height)
            };
            state.nextLayerNumber += 1;
            return layer;
        }

        function addLayer(name) {
            const layer = makeLayer(name);
            const currentIndex = state.layers.findIndex((item) => item.id === state.selectedLayerId);
            const insertAt = currentIndex < 0 ? state.layers.length : currentIndex + 1;
            state.layers.splice(insertAt, 0, layer);
            state.selectedLayerId = layer.id;
            return layer;
        }

        function getLayer(id) {
            const layer = state.layers.find((item) => item.id === id);
            if (!layer) throw new Error(`Camada não encontrada: ${id}`);
            return layer;
        }

        function removeLayer(id) {
            const index = state.layers.findIndex((item) => item.id === id);
            if (index < 0) return false;
            const wasSelected = state.selectedLayerId === id;
            state.layers.splice(index, 1);
            if (state.layers.length === 0) {
                const replacement = makeLayer("Camada 1");
                state.layers.push(replacement);
                state.selectedLayerId = replacement.id;
            } else if (wasSelected) {
                state.selectedLayerId = state.layers[Math.max(0, index - 1)].id;
            }
            return true;
        }

        function moveLayer(id, offset) {
            const from = state.layers.findIndex((item) => item.id === id);
            const to = from + Math.sign(Number(offset) || 0);
            if (from < 0 || to < 0 || to >= state.layers.length) return false;
            const [layer] = state.layers.splice(from, 1);
            state.layers.splice(to, 0, layer);
            return true;
        }

        function setLayerProperty(id, key, value) {
            const layer = getLayer(id);
            if (key === "visible") {
                layer.visible = Boolean(value);
                return layer.visible;
            }
            if (key === "name") {
                const name = String(value).trim();
                if (name) layer.name = name.slice(0, 80);
                return layer.name;
            }
            const limits = {
                opacity: [0, 100],
                brightness: [0, 200],
                contrast: [0, 200],
                saturation: [0, 200]
            };
            if (!limits[key]) throw new Error(`Propriedade inválida: ${key}`);
            layer[key] = clamp(value, limits[key][0], limits[key][1]);
            return layer[key];
        }

        function selectLayer(id) {
            getLayer(id);
            state.selectedLayerId = id;
            return id;
        }

        function reset(newWidth, newHeight) {
            state.width = Math.round(clamp(newWidth, 1, 8192));
            state.height = Math.round(clamp(newHeight, 1, 8192));
            state.layers = [];
            state.selectedLayerId = null;
            state.nextLayerNumber = 1;
            const layer = makeLayer("Camada 1");
            state.layers.push(layer);
            state.selectedLayerId = layer.id;
        }

        reset(state.width, state.height);

        return {
            get width() { return state.width; },
            get height() { return state.height; },
            get layers() { return state.layers.slice(); },
            get selectedLayerId() { return state.selectedLayerId; },
            get selectedLayer() { return state.layers.find((layer) => layer.id === state.selectedLayerId) || null; },
            addLayer,
            getLayer,
            removeLayer,
            moveLayer,
            setLayerProperty,
            selectLayer,
            reset
        };
    }

    const api = { createDocument };
    root.EditorCore = Object.assign(root.EditorCore || {}, api);
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
