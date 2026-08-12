// Macro: Clear All Character Movement States
if (typeof globalThis.clearAllMovementStates === "function") {
    globalThis.clearAllMovementStates();
} else {
    ui.notifications.error("clearAllMovementStates function is not loaded in main.js.");
}