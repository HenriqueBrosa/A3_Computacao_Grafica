"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createDocument } = require("../src/js/core/document.js");
const { getLinePoints } = require("../src/js/tools/pixel-line.js");
const { renderDocument } = require("../src/js/core/renderer.js");

class FakeCanvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.drawCalls = [];
        this.context = {
            clearRect: (...args) => this.drawCalls.push(["clearRect", ...args]),
            drawImage: (...args) => this.drawCalls.push(["drawImage", ...args]),
            save: () => this.drawCalls.push(["save"]),
            restore: () => this.drawCalls.push(["restore"]),
            fillRect: (...args) => this.drawCalls.push(["fillRect", ...args])
        };
    }
    getContext() { return this.context; }
}

function makeDocument(width = 8, height = 6) {
    return createDocument(width, height, (w, h) => new FakeCanvas(w, h));
}

test("cria documento com uma camada transparente e tela nas dimensões pedidas", () => {
    const doc = makeDocument(13, 9);
    assert.equal(doc.width, 13);
    assert.equal(doc.height, 9);
    assert.equal(doc.layers.length, 1);
    assert.equal(doc.layers[0].canvas.width, 13);
    assert.equal(doc.layers[0].canvas.height, 9);
    assert.equal(doc.selectedLayerId, doc.layers[0].id);
});

test("adiciona, seleciona, renomeia, oculta, reordena e remove camadas", () => {
    const doc = makeDocument();
    const base = doc.layers[0];
    const second = doc.addLayer("Rascunho");
    const third = doc.addLayer("Detalhes");

    assert.deepEqual(doc.layers.map((layer) => layer.name), ["Camada 1", "Rascunho", "Detalhes"]);
    assert.equal(doc.selectedLayerId, third.id);
    doc.selectLayer(base.id);
    assert.equal(doc.selectedLayerId, base.id);
    assert.equal(doc.setLayerProperty(second.id, "visible", false), false);
    assert.equal(doc.getLayer(second.id).visible, false);
    assert.equal(doc.setLayerProperty(second.id, "name", "  Fundo  "), "Fundo");
    assert.equal(doc.getLayer(second.id).name, "Fundo");
    assert.equal(doc.moveLayer(base.id, 1), true);
    assert.deepEqual(doc.layers.map((layer) => layer.id), [second.id, base.id, third.id]);
    assert.equal(doc.moveLayer(third.id, 1), false);
    assert.equal(doc.removeLayer(base.id), true);
    assert.deepEqual(doc.layers.map((layer) => layer.id), [second.id, third.id]);
});

test("mantém pelo menos uma camada e restringe os filtros aos seus limites", () => {
    const doc = makeDocument();
    const layer = doc.selectedLayer;
    assert.equal(doc.setLayerProperty(layer.id, "opacity", 140), 100);
    assert.equal(doc.setLayerProperty(layer.id, "brightness", -20), 0);
    assert.equal(doc.setLayerProperty(layer.id, "contrast", 250), 200);
    assert.equal(doc.setLayerProperty(layer.id, "saturation", 60), 60);
    assert.throws(() => doc.setLayerProperty(layer.id, "unknown", 2), /Propriedade inválida/);
    assert.equal(doc.removeLayer(layer.id), true);
    assert.equal(doc.layers.length, 1);
    assert.equal(doc.selectedLayer.name, "Camada 1");
});

test("redefine documento e recria a tela com as dimensões informadas", () => {
    const doc = makeDocument();
    doc.addLayer("Temporária");
    doc.reset(32, 24);
    assert.equal(doc.width, 32);
    assert.equal(doc.height, 24);
    assert.equal(doc.layers.length, 1);
    assert.equal(doc.layers[0].canvas.width, 32);
    assert.equal(doc.layers[0].canvas.height, 24);
});

test("gera traços contínuos de pixels em linhas horizontal, vertical e diagonal", () => {
    assert.deepEqual(getLinePoints(1, 2, 4, 2), [
        { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }
    ]);
    assert.deepEqual(getLinePoints(3, 1, 3, 4), [
        { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }
    ]);
    assert.deepEqual(getLinePoints(0, 0, 3, 3), [
        { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }
    ]);
    assert.deepEqual(getLinePoints(2.9, 1.8, 1.1, 0.2), [
        { x: 2, y: 1 }, { x: 1, y: 0 }
    ]);
});

test("renderiza apenas camadas visíveis, na ordem inferior-superior, com filtros", () => {
    const doc = makeDocument();
    const base = doc.selectedLayer;
    const overlay = doc.addLayer("Sobreposição");
    doc.setLayerProperty(overlay.id, "visible", false);
    doc.setLayerProperty(base.id, "opacity", 65);
    doc.setLayerProperty(base.id, "brightness", 120);

    const target = new FakeCanvas(doc.width, doc.height);
    renderDocument(doc, target);
    const drawCalls = target.drawCalls.filter((call) => call[0] === "drawImage");
    assert.equal(drawCalls.length, 1);
    assert.equal(drawCalls[0][1], base.canvas);
    assert.equal(target.context.globalAlpha, 1);
    assert.equal(target.context.filter, "none");
});

test("importa uma imagem para nova camada ajustada sem distorcer a proporção", async () => {
    const { importImageAsLayer } = require("../src/js/io/image-io.js");
    const doc = makeDocument(8, 6);
    const originalCreateImageBitmap = global.createImageBitmap;
    global.createImageBitmap = async () => ({ width: 4, height: 2, close() {} });
    try {
        const layer = await importImageAsLayer(doc, {
            type: "image/png",
            size: 12,
            name: "arte.png"
        });
        assert.equal(layer.name, "arte");
        assert.equal(layer.canvas.drawCalls.some((call) => call[0] === "drawImage" && call[1].width === 4 && call[1].height === 2 && call[2] === 0 && call[3] === 1 && call[4] === 8 && call[5] === 4), true);
        assert.equal(doc.selectedLayerId, layer.id);
    } finally {
        if (originalCreateImageBitmap === undefined) delete global.createImageBitmap;
        else global.createImageBitmap = originalCreateImageBitmap;
    }
});
