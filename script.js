// ---- DOM references ----
const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const spinButton = document.getElementById("spinButton");
const shuffleButton = document.getElementById("shuffleButton");
const namesInput = document.getElementById("namesInput");
const resultDiv = document.getElementById("result");
const removeWinnerCheckbox = document.getElementById("removeWinnerCheckbox");

// ---- Wheel state ----
let names = [];
let currentAngle = 0;
let spinning = false;
let spinStartTime = 0;
let spinDuration = 0;
let startAngleAtSpin = 0;
let targetAngle = 0;
let chosenIndex = null;

// Some nice colours for segments
const segmentColors = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#eab308",
  "#8b5cf6",
  "#06b6d4",
  "#facc15",
  "#4ade80",
  "#fb7185"
];

// ---- Helpers ----

function readNamesFromTextarea() {
  const raw = namesInput.value.split("\n");
  return raw
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
}

// Fisher–Yates shuffle
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Cubic easing out
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Resize canvas for high-DPI screens
function resizeCanvasForHiDPI() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale everything we draw
}

// ---- Drawing the wheel ----

function drawWheel() {
  resizeCanvasForHiDPI();

  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 8;

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(centerX, centerY);

  if (names.length === 0) {
    // Draw a simple empty wheel with a message
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#9ca3af";
    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add names to spin", 0, 0);
    ctx.restore();
    return;
  }

  const numSegments = names.length;
  const segmentAngle = (Math.PI * 2) / numSegments;

  for (let i = 0; i < numSegments; i++) {
    const startAngle = currentAngle + i * segmentAngle;
    const endAngle = startAngle + segmentAngle;

    // Draw segment
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    const color = segmentColors[i % segmentColors.length];
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#020617";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw text
    const textAngle = startAngle + segmentAngle / 2;
    ctx.save();
    ctx.rotate(textAngle);
    ctx.translate(radius * 0.65, 0);
    ctx.rotate(Math.PI / 2);

    ctx.fillStyle = "#020617";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const label = names[i];
    // Truncate very long names
    const display =
      label.length > 18 ? label.slice(0, 15).trimEnd() + "…" : label;

    ctx.fillText(display, 0, 0);
    ctx.restore();
  }

  // Inner circle for a nicer look
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = "#020617";
  ctx.fill();

  ctx.restore();
}

// ---- Spinning logic ----

function startSpin() {
  names = readNamesFromTextarea();
  if (names.length === 0) {
    alert("Please enter at least one name before spinning.");
    return;
  }
  if (names.length === 1) {
    // Only one name – no need for drama, but still rotate a bit
    chosenIndex = 0;
  } else {
    chosenIndex = Math.floor(Math.random() * names.length);
  }

  const numSegments = names.length;
  const segmentAngle = (Math.PI * 2) / numSegments;

  // How many full rotations (for fun)
  const extraSpins = 4 + Math.floor(Math.random() * 3); // 4–6 extra turns

  // We want the chosen segment's centre to land at -90° (top, under pointer)
  const finalAngleForWinner =
    -Math.PI / 2 - segmentAngle * (chosenIndex + 0.5);

  targetAngle = finalAngleForWinner + extraSpins * Math.PI * 2;

  spinDuration = 4000 + Math.random() * 1500; // 4–5.5 seconds
  spinStartTime = performance.now();
  startAngleAtSpin = currentAngle;
  spinning = true;

  spinButton.disabled = true;
  shuffleButton.disabled = true;
  resultDiv.textContent = "Spinning...";

  requestAnimationFrame(animateSpin);
}

function animateSpin(timestamp) {
  if (!spinning) return;

  const elapsed = timestamp - spinStartTime;
  const t = Math.min(elapsed / spinDuration, 1);
  const eased = easeOutCubic(t);

  currentAngle =
    startAngleAtSpin + (targetAngle - startAngleAtSpin) * eased;

  drawWheel();

  if (t < 1) {
    requestAnimationFrame(animateSpin);
  } else {
    spinning = false;
    spinButton.disabled = false;
    shuffleButton.disabled = false;

    const winner = names[chosenIndex];
    resultDiv.innerHTML =
      'Winner: <span class="name">' + winner + "</span>";

    if (removeWinnerCheckbox.checked) {
      removeWinnerFromTextarea(winner);
    }
  }
}

function removeWinnerFromTextarea(winner) {
  const all = readNamesFromTextarea();
  const index = all.indexOf(winner);
  if (index !== -1) {
    all.splice(index, 1);
  }
  namesInput.value = all.join("\n");
}

// ---- Event listeners ----

spinButton.addEventListener("click", () => {
  if (spinning) return;
  startSpin();
});

shuffleButton.addEventListener("click", () => {
  if (spinning) return;
  const current = readNamesFromTextarea();
  if (current.length === 0) return;
  shuffleArray(current);
  namesInput.value = current.join("\n");
  names = current.slice();
  currentAngle = 0;
  drawWheel();
});

namesInput.addEventListener("input", () => {
  if (spinning) return;
  names = readNamesFromTextarea();
  currentAngle = 0;
  drawWheel();
});

window.addEventListener("resize", () => {
  if (spinning) return;
  drawWheel();
});

// ---- Initial draw ----
names = readNamesFromTextarea();
drawWheel();
