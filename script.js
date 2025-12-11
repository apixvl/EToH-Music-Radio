const stationAnchor = new Date("2025-11-16T00:00:00Z");

const audio = document.getElementById("audio");
const currentTrackEl = document.getElementById("currentTrack");
const timeLeftEl = document.getElementById("timeLeft");

let playlist = [];
let fullSchedule = [];
let currentTrackIndex = -1;

function getElapsedSinceAnchor() {
  const now = new Date();
  const diff = (now - stationAnchor) / 1000;
  const totalLength = fullSchedule.reduce((sum, t) => sum + t.duration, 0);
  return ((diff % totalLength) + totalLength) % totalLength;
}

function getCurrentTrack(elapsed) {
  let acc = 0;
  for (let i = 0; i < fullSchedule.length; i++) {
    const track = fullSchedule[i];
    if (elapsed < acc + track.duration) {
      return {
        track,
        index: i,
        offset: elapsed - acc,
        remaining: acc + track.duration - elapsed
      };
    }
    acc += track.duration;
  }
  return null;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateRadio() {
  if (fullSchedule.length === 0) return;

  const elapsed = getElapsedSinceAnchor();
  const playing = getCurrentTrack(elapsed);

  if (!playing) return;

  const { track, offset, remaining, index } = playing;

  currentTrackEl.textContent = `🎵 ${track.title}`;
  timeLeftEl.textContent = `⏱️ ${formatTime(remaining)} remaining`;
  document.body.style.backgroundImage = `url(${track.bg || ""})`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";

  if (index !== currentTrackIndex) {
    currentTrackIndex = index;
    audio.src = track.url;
    audio.currentTime = offset;
    audio.play().catch(() => {});
  }
}

function detectDurations(tracks, callback) {
  const schedule = [];
  let loadedCount = 0;

  tracks.forEach((track, index) => {
    const tempAudio = new Audio();
    tempAudio.src = track.url;

    tempAudio.addEventListener("loadedmetadata", () => {
      schedule[index] = { ...track, duration: tempAudio.duration };
      loadedCount++;
      if (loadedCount === tracks.length) callback(schedule);
    });

    tempAudio.addEventListener("error", () => {
      console.error("Failed to load:", track.title);
      schedule[index] = { ...track, duration: 120 };
      loadedCount++;
      if (loadedCount === tracks.length) callback(schedule);
    });
  });
}

function tryAutoplay() {
  audio.play().catch(() => {
    const btn = document.createElement("button");
    btn.innerHTML = "▶ Play Radio";
    btn.style = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 15px 30px;
      font-size: 1.5rem;
      font-weight: bold;
      background: rgba(0,0,0,0.6);
      color: white;
      border: 2px solid white;
      border-radius: 12px;
      backdrop-filter: blur(6px);
      cursor: pointer;
      z-index: 9999;
    `;
    btn.onclick = () => {
      audio.play();
      btn.remove();
    };
    document.body.appendChild(btn);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetch("ring1.json")
    .then(res => res.json())
    .then(data => {
      playlist = data;
      detectDurations(playlist, (result) => {
        fullSchedule = result;
        updateRadio();
        setInterval(updateRadio, 1000);
        tryAutoplay();
      });
    })
    .catch(err => console.error("Failed to load ring1.json:", err));
});
