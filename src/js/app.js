(function () {
    "use strict";

    const canvas = document.getElementById("imageCanvas");
    const canvasContext = canvas.getContext("2d");
    const layerList = document.getElementById("layers");
    const colorPicker = document.getElementById("color-picker");
    const fileInput = document.getElementById("image-file-input");
    const filterControls = Array.from(document.querySelectorAll("[data-filter]"));
    const toolNames = { brush: "Desenhar", eyedropper: "Conta-gotas", eraser: "Borracha" };
    let model = EditorCore.createDocument(canvas.width, canvas.height);
    let activeTool = "brush";
    let isDrawing = false;
    let activePointerId = null;
    let previousPoint = null;
    let brushSize = 1;

    function updateCanvasDimensions() {
        canvas.width = model.width;
        canvas.height = model.height;
        canvasContext.imageSmoothingEnabled = false;
        canvas.setAttribute("aria-label", `Tela de desenho ${model.width} por ${model.height} pixels`);
        document.getElementById("canvas-size").textContent = `${model.width} × ${model.height} px`;
    }

    function render() {
        EditorRenderer.renderDocument(model, canvas);
        renderLayers();
        renderSelectedLayerProperties();
    }

    function renderLayers() {
        layerList.replaceChildren();
        model.layers.slice().reverse().forEach((layer) => {
            const item = document.createElement("li");
            item.className = `layer-item${layer.id === model.selectedLayerId ? " selected" : ""}${layer.visible ? "" : " hidden-layer"}`;
            item.dataset.layerId = layer.id;

            const visibility = document.createElement("button");
            visibility.type = "button";
            visibility.className = "layer-visibility";
            visibility.textContent = layer.visible ? "◉" : "○";
            visibility.title = layer.visible ? "Ocultar camada" : "Mostrar camada";
            visibility.setAttribute("aria-label", visibility.title);
            visibility.setAttribute("aria-pressed", String(layer.visible));
            visibility.addEventListener("click", () => {
                model.setLayerProperty(layer.id, "visible", !layer.visible);
                render();
            });

            const select = document.createElement("button");
            select.type = "button";
            select.className = "layer-select";
            select.textContent = layer.name;
            select.title = `${layer.name} — clique para selecionar, duplo clique para renomear`;
            select.addEventListener("click", () => {
                model.selectLayer(layer.id);
                render();
            });
            select.addEventListener("dblclick", () => {
                const newName = window.prompt("Nome da camada:", layer.name);
                if (newName !== null) {
                    model.setLayerProperty(layer.id, "name", newName);
                    render();
                }
            });

            const moveUp = document.createElement("button");
            moveUp.type = "button";
            moveUp.className = "layer-move";
            moveUp.textContent = "↑";
            moveUp.title = "Mover para cima";
            moveUp.setAttribute("aria-label", `Mover ${layer.name} para cima`);
            moveUp.addEventListener("click", () => {
                if (model.moveLayer(layer.id, 1)) render();
            });

            const moveDown = document.createElement("button");
            moveDown.type = "button";
            moveDown.className = "layer-move";
            moveDown.textContent = "↓";
            moveDown.title = "Mover para baixo";
            moveDown.setAttribute("aria-label", `Mover ${layer.name} para baixo`);
            moveDown.addEventListener("click", () => {
                if (model.moveLayer(layer.id, -1)) render();
            });

            item.append(visibility, select, moveUp, moveDown);
            layerList.appendChild(item);
        });
    }

    function renderSelectedLayerProperties() {
        const layer = model.selectedLayer;
        if (!layer) return;
        document.getElementById("selected-layer-name").textContent = layer.name;
        filterControls.forEach((control) => {
            const property = control.dataset.filter;
            control.value = layer[property];
            document.getElementById(`${property}-value`).textContent = `${layer[property]}%`;
        });
        document.getElementById("delete-layer-button").disabled = model.layers.length <= 1;
    }

    function setTool(tool) {
        activeTool = tool;
        document.querySelectorAll("[data-tool]").forEach((button) => {
            const selected = button.dataset.tool === tool;
            button.classList.toggle("active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        canvas.classList.toggle("tool-eyedropper", tool === "eyedropper");
        canvas.classList.toggle("tool-eraser", tool === "eraser");
        document.getElementById("active-tool-status").textContent = `Ferramenta: ${toolNames[tool]}`;
    }

    function getCanvasPoint(event) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const x = Math.floor((event.clientX - rect.left) * model.width / rect.width);
        const y = Math.floor((event.clientY - rect.top) * model.height / rect.height);
        if (x < 0 || y < 0 || x >= model.width || y >= model.height) return null;
        return { x, y };
    }

    function paintSegment(from, to) {
        const layer = model.selectedLayer;
        if (!layer) return;
        const context = layer.canvas.getContext("2d");
        const size = activeTool === "brush" ? brushSize : 1;
        const offset = Math.floor((size - 1) / 2);
        const points = EditorPixelLine.getLinePoints(from.x, from.y, to.x, to.y);
        if (activeTool === "eraser") {
            points.forEach(({ x, y }) => context.clearRect(x, y, 1, 1));
        } else {
            context.fillStyle = colorPicker.value;
            points.forEach(({ x, y }) => context.fillRect(x - offset, y - offset, size, size));
        }
        render();
    }

    function pickColor(point) {
        const composite = EditorRenderer.createCompositeCanvas(model);
        const context = composite.getContext("2d", { willReadFrequently: true });
        const pixel = context.getImageData(point.x, point.y, 1, 1).data;
        if (pixel[3] === 0) return;
        const hex = `#${Array.from(pixel.slice(0, 3), (part) => part.toString(16).padStart(2, "0")).join("")}`;
        colorPicker.value = hex;
        document.getElementById("color-value").textContent = hex.toUpperCase();
        setTool("brush");
    }

    canvas.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const point = getCanvasPoint(event);
        if (!point) return;
        event.preventDefault();
        if (activeTool === "eyedropper") {
            pickColor(point);
            return;
        }
        isDrawing = true;
        activePointerId = event.pointerId;
        previousPoint = point;
        canvas.setPointerCapture(event.pointerId);
        paintSegment(point, point);
    });

    canvas.addEventListener("pointermove", (event) => {
        if (!isDrawing || event.pointerId !== activePointerId) return;
        const point = getCanvasPoint(event);
        if (!point) {
            previousPoint = null;
            return;
        }
        if (previousPoint) paintSegment(previousPoint, point);
        previousPoint = point;
    });

    function stopDrawing(event) {
        if (event && activePointerId !== null && event.pointerId !== activePointerId) return;
        isDrawing = false;
        activePointerId = null;
        previousPoint = null;
    }
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("lostpointercapture", stopDrawing);

    document.querySelectorAll("[data-tool]").forEach((button) => {
        button.addEventListener("click", () => setTool(button.dataset.tool));
    });

    colorPicker.addEventListener("input", () => {
        document.getElementById("color-value").textContent = colorPicker.value.toUpperCase();
    });

    document.getElementById("brush-size").addEventListener("input", (event) => {
        brushSize = Number(event.target.value);
        document.getElementById("brush-size-value").textContent = `${brushSize} px`;
    });

    filterControls.forEach((control) => {
        control.addEventListener("input", () => {
            const property = control.dataset.filter;
            model.setLayerProperty(model.selectedLayerId, property, Number(control.value));
            document.getElementById(`${property}-value`).textContent = `${control.value}%`;
            render();
        });
    });

    document.getElementById("add-layer-button").addEventListener("click", () => {
        model.addLayer();
        render();
    });

    document.getElementById("delete-layer-button").addEventListener("click", () => {
        const layer = model.selectedLayer;
        if (layer && model.layers.length > 1 && window.confirm(`Excluir a camada “${layer.name}”?`)) {
            model.removeLayer(layer.id);
            render();
        }
    });

    document.getElementById("new-canvas-button").addEventListener("click", () => {
        const width = window.prompt("Largura da tela em pixels (1–8192):", String(model.width));
        if (width === null) return;
        const height = window.prompt("Altura da tela em pixels (1–8192):", String(model.height));
        if (height === null) return;
        const nextWidth = Number(width);
        const nextHeight = Number(height);
        if (!Number.isInteger(nextWidth) || !Number.isInteger(nextHeight) || nextWidth < 1 || nextHeight < 1 || nextWidth > 8192 || nextHeight > 8192) {
            window.alert("Informe valores inteiros entre 1 e 8192 pixels.");
            return;
        }
        if (!window.confirm("Criar uma nova tela? O conteúdo atual será substituído.")) return;
        model.reset(nextWidth, nextHeight);
        updateCanvasDimensions();
        render();
    });

    document.getElementById("import-image-button").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        try {
            await EditorImageIO.importImageAsLayer(model, file);
            render();
        } catch (error) {
            window.alert(error.message || "Não foi possível importar a imagem.");
        } finally {
            fileInput.value = "";
        }
    });

    document.getElementById("export-button").addEventListener("click", async () => {
        try {
            const composite = EditorRenderer.createCompositeCanvas(model);
            await EditorImageIO.exportCanvasAsPng(composite, "editor-grafico.png");
        } catch (error) {
            window.alert(error.message || "Não foi possível exportar o PNG.");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        if (target && target.matches("input, textarea, select, button")) return;
        const shortcuts = { b: "brush", i: "eyedropper", e: "eraser" };
        const tool = shortcuts[event.key.toLowerCase()];
        if (tool) setTool(tool);
    });

    updateCanvasDimensions();
    render();
    console.log("Editor Gráfico 2D iniciado.");
})();
