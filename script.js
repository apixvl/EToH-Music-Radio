// Master Config
const stationAnchor = new Date("2026-04-01T00:00:00Z");

// Elements
const audio = document.getElementById("audio");
const currentTrackEl = document.getElementById("currentTrack");
const timeLeftEl = document.getElementById("timeLeft");
const menuBtn = document.getElementById("menuBtn");
const menuContent = document.getElementById("menuContent");
const arrow = document.getElementById("arrow");

// State
let playlist = [];
let fullSchedule = [];
let currentTrackIndex = -1;
let updateInterval = null;

// --- 1. DROPDOWN LOGIC ---

function populateDropdown() {
    const list = window.allStations;
    if (!list) return;

    menuContent.innerHTML = ''; 

    list.forEach(station => {
        const link = document.createElement('a');
        link.href = "#"; // Prevent page reload
        link.textContent = station.name;
        
        link.onclick = (e) => {
            e.preventDefault();
            loadStation(station.json);
            
            // Close menu
            menuContent.classList.remove('show');
            arrow.classList.remove('arrow-rotate');
            
            // Visual feedback for "active" station
            document.querySelectorAll('.dropdown-content a').forEach(a => a.style.color = "white");
            link.style.color = "#00ffcc";
        };

        menuContent.appendChild(link);
    });
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuContent.classList.toggle('show');
    arrow.classList.toggle('arrow-rotate');
});

window.addEventListener('click', () => {
    menuContent.classList.remove('show');
    arrow.classList.remove('arrow-rotate');
});

// --- 2. RADIO ENGINE ---

function loadStation(jsonFile) {
    console.log(`📡 Loading station: ${jsonFile}`);
    
    // Stop the current interval while loading to prevent glitches
    if (updateInterval) clearInterval(updateInterval);
    
    currentTrackEl.textContent = "Loading Stations...";
    
    fetch(jsonFile)
        .then(res => res.json())
        .then(data => {
            playlist = data;
            detectDurations(playlist, (result) => {
                fullSchedule = result;
                currentTrackIndex = -1; // Reset to force audio source change
                updateRadio();
                updateInterval = setInterval(updateRadio, 1000);
            });
        })
        .catch(err => console.error(`❌ Error loading ${jsonFile}:`, err));
}

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
    
    // Background update
    document.body.style.backgroundImage = `url(${track.bg || ""})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";

    // Track switching logic
    if (index !== currentTrackIndex) {
        currentTrackIndex = index;
        audio.src = track.url;
        audio.currentTime = offset;
        audio.play().catch(() => {
            // If autoplay is blocked on station switch, show a small hint
            console.log("Autoplay blocked. User interaction required.");
        });
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
            schedule[index] = { ...track, duration: 120 }; // Fallback
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
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            padding: 15px 30px; font-size: 1.5rem; font-weight: bold;
            background: rgba(0,0,0,0.6); color: white;
            border: 2px solid white; border-radius: 12px;
            backdrop-filter: blur(6px); cursor: pointer; z-index: 9999;
        `;
        btn.onclick = () => {
            audio.play();
            btn.remove();
        };
        document.body.appendChild(btn);
    });
}

// --- 3. INIT ---

document.addEventListener("DOMContentLoaded", () => {
    populateDropdown();
    
    // Start with the first station in your window.allStations list
    if (window.allStations && window.allStations.length > 0) {
        loadStation(window.allStations[0].json);
    } else {
        // Fallback if stations.js isn't ready
        loadStation("ring1.json");
    }
    
    tryAutoplay();
});
