import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ComfyUI.CLIPTextEncodeWithPresets",
    async nodeCreated(node) {
        if (node.comfyClass !== "CLIPTextEncodeWithPresets") return;

        // Find the default multiline 'text' widget
        const textWidget = node.widgets.find(w => w.name === "text");
        if (!textWidget) return;

        const STORAGE_KEY = "comfyui_prompt_presets_library";
        const DEFAULT_OPTION = "-- Select a Preset --";

        // Read presets from browser LocalStorage
        function getPresets() {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
            } catch (e) {
                return {};
            }
        }

        // Save presets to browser LocalStorage
        function savePresets(presets) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
        }

        // Update dropdown options
        function updateComboValues() {
            const presets = getPresets();
            const keys = [DEFAULT_OPTION, ...Object.keys(presets)];
            presetCombo.options.values = keys;
            presetCombo.value = keys[0];
            app.graph.setDirtyCanvas(true, true);
        }

        // 1. Dropdown Widget (Click to instantly load prompt)
        const presetCombo = node.addWidget(
            "combo",
            "Presets",
            DEFAULT_OPTION,
            (value) => {
                if (value && value !== DEFAULT_OPTION) {
                    const presets = getPresets();
                    if (presets[value]) {
                        textWidget.value = presets[value];
                        if (textWidget.callback) {
                            textWidget.callback(textWidget.value);
                        }
                        app.graph.setDirtyCanvas(true, true);
                    }
                }
            },
            { values: [DEFAULT_OPTION] }
        );
        // Prevent dropdown from polluting workflow serialization
        presetCombo.serializeValue = () => undefined;

        // 2. Button: Save Current Prompt
        const btnSave = node.addWidget("button", "💾 Save Current Prompt", null, () => {
            const currentText = textWidget.value ? textWidget.value.trim() : "";
            if (!currentText) {
                alert("The prompt field is empty!");
                return;
            }
            const name = prompt("Enter a title/name for this preset:");
            if (!name || !name.trim()) return;

            const presets = getPresets();
            presets[name.trim()] = currentText;
            savePresets(presets);
            updateComboValues();
            presetCombo.value = name.trim();
            alert(`Preset "${name.trim()}" saved successfully!`);
        });
        btnSave.serializeValue = () => undefined;

        // 3. Button: Delete Selected Preset
        const btnDelete = node.addWidget("button", "🗑️ Delete Selected Preset", null, () => {
            const selected = presetCombo.value;
            if (!selected || selected === DEFAULT_OPTION) {
                alert("Please select a preset from the dropdown first!");
                return;
            }
            if (confirm(`Are you sure you want to delete preset "${selected}"?`)) {
                const presets = getPresets();
                delete presets[selected];
                savePresets(presets);
                updateComboValues();
            }
        });
        btnDelete.serializeValue = () => undefined;

        // 4. Button: Export Presets (Download JSON)
        const btnExport = node.addWidget("button", "📤 Export Presets (JSON)", null, () => {
            const presets = getPresets();
            if (Object.keys(presets).length === 0) {
                alert("No presets found to export!");
                return;
            }
            const jsonStr = JSON.stringify(presets, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const dateStr = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `comfyui_prompts_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        btnExport.serializeValue = () => undefined;

        // 5. Button: Import Presets (Upload JSON)
        const btnImport = node.addWidget("button", "📥 Import Presets (JSON)", null, () => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".json";
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        if (typeof importedData !== "object" || Array.isArray(importedData)) {
                            alert("Invalid JSON format. It must be a key-value object of { 'name': 'prompt' }.");
                            return;
                        }
                        const currentPresets = getPresets();
                        // Merge existing presets with imported ones
                        const mergedPresets = { ...currentPresets, ...importedData };
                        savePresets(mergedPresets);
                        updateComboValues();
                        alert(`Successfully imported ${Object.keys(importedData).length} preset(s)!`);
                    } catch (err) {
                        alert("Failed to read JSON file: " + err.message);
                    }
                };
                reader.readAsText(file);
            };
            fileInput.click();
        });
        btnImport.serializeValue = () => undefined;

        // Initialize values and expand node size cleanly
        updateComboValues();
        const minSize = node.computeSize();
        node.setSize([Math.max(node.size[0], 400), Math.max(node.size[1], minSize[1] + 30)]);
    }
});