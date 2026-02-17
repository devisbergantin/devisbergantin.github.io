const canvas = document.getElementById("glitchCanvas");
const ctx = canvas.getContext("2d");

// ============================
// CANVAS DIMENSIONE FISSA
// ============================
canvas.width = 1920;
canvas.height = 1440;

// ============================
// TEMPO
// ============================
let frame = 0;
const TOTAL_FRAMES = 360;

// ============================
// FADE
// ============================
const FADE_IN_START = 39, FADE_IN_END = 130;
const FADE_OUT_START = 308, FADE_OUT_END = 351;

function ease(t) { 
    return t * t * (3 - 2 * t); 
}

function baseAlpha(f) {
    if(f < FADE_IN_START) return 0;
    if(f < FADE_IN_END) return ease((f - FADE_IN_START) / (FADE_IN_END - FADE_IN_START));
    if(f < FADE_OUT_START) return 1;
    if(f < FADE_OUT_END) return 1 - ease((f - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START));
    return 0;
}

// ============================
// IMMAGINI
// ============================
const sources = [
    "glpng/glitch1.png",
    "glpng/glitch2.png",
    "glpng/glitch3.png",
    "glpng/glitch4.png",
    "glpng/glitch5.png"
];

const images = [];
let loaded = 0;

sources.forEach((src, i) => {
    images[i] = new Image();
    images[i].onload = () => {
        loaded++;
        if (loaded === sources.length) start();
    };
    images[i].src = src;
});

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

// ============================
// CAMBIO IMMAGINI
// ============================
let currentImg = 0, hold = 0;
let sectionImg = 0, sectionHold = 0;

function updateImage() {
    hold--;
    if(hold <= 0) {
        currentImg = Math.floor(rand(0, images.length));
        hold = Math.floor(rand(1, 2));
    }
}

function updateSectionImage() {
    sectionHold--;
    if(sectionHold <= 0) {
        sectionImg = Math.floor(rand(0, images.length));
        sectionHold = Math.floor(rand(2, 8));
    }
}

// ============================
// FRAMMENTI SPARSI
// ============================
let bodyFragments = [];

function spawnBodyFragment(img, alpha) {
    const fw = rand(99, 221);
    const fh = rand(99, 221);
    const fx = rand(0, canvas.width - fw);
    const fy = rand(0, canvas.height - fh);

    bodyFragments.push({
        sx: rand(0, img.width - fw),
        sy: rand(0, img.height - fh),
        sw: fw,
        sh: fh,
        dx: fx,
        dy: fy,
        dw: fw,
        dh: fh,
        alpha: alpha
    });
}

function drawBodyFragments() {
    for (let i = bodyFragments.length - 1; i >= 0; i--) {
        const f = bodyFragments[i];
        ctx.globalAlpha = f.alpha * baseAlpha(frame);

        ctx.drawImage(
            images[currentImg],
            f.sx, f.sy, f.sw, f.sh,
            f.dx, f.dy, f.dw, f.dh
        );

        f.alpha -= 0.003 + (f.sw / 9700);
        if (f.alpha <= 0) bodyFragments.splice(i, 1);
    }
}

// ============================
// SEZIONI ROTANTI
// ============================
const SECTION_COUNT = 61;
const sections = [];
const ROT_SPEED_MIN = 0.0125, ROT_SPEED_MAX = 0.0197;
const SCALE_START_MIN = 1.7, SCALE_START_MAX = 3.9, SCALE_DECAY = 0.0007;
const SECTION_MIN_SIZE = 694, SECTION_MAX_SIZE = 1006;
const SECTION_ALPHA = 0.93;
const EDGE_JITTER = 64;
const INTERNAL_POINTS = 10;

function randomPoints(sw, sh, n) {
    const pts = [];
    for (let i = 0; i < n; i++){
        pts.push({ x: rand(-EDGE_JITTER, EDGE_JITTER), y: rand(-EDGE_JITTER, EDGE_JITTER) });
    }
    return pts;
}

function initSections() {
    sections.length = 0;

    for (let i = 0; i < SECTION_COUNT; i++) {
        let sw, sh, cx, cy;

        if(Math.random() < 0.38) {
            sw = rand(SECTION_MIN_SIZE*1.9, SECTION_MAX_SIZE*3.4);
            sh = rand(SECTION_MIN_SIZE*1.9, SECTION_MAX_SIZE*3.4);
            cx = canvas.width/2 + rand(-500,500);
            cy = canvas.height/2 + rand(-450,450);
        } else {
            sw = rand(SECTION_MIN_SIZE*0.5, SECTION_MAX_SIZE*0.85);
            sh = rand(SECTION_MIN_SIZE*0.5, SECTION_MAX_SIZE*0.85);
            cx = rand(sw/2, canvas.width - sw/2);
            cy = rand(sh/2, canvas.height - sh/2);
        }

        const sec = {
            sx: cx - sw/2,
            sy: cy - sh/2,
            sw, sh,
            cx, cy,
            angle: rand(0, Math.PI*2),
            rotSpeed: rand(ROT_SPEED_MIN, ROT_SPEED_MAX) * (Math.random()<0.5?-1:1),
            scale: rand(SCALE_START_MIN, SCALE_START_MAX),
            driftX: rand(-0.01,0.01),
            driftY: rand(-0.01,0.01)
        };

        sec.edgePts = randomPoints(sw, sh, INTERNAL_POINTS);
        sec.baseEdgePts = sec.edgePts.map(p => ({ x: p.x, y: p.y }));

        sections.push(sec);
    }
}

function drawStructuralSections(img) {
    ctx.globalAlpha = baseAlpha(frame) * SECTION_ALPHA;

    sections.forEach(sec => {
        ctx.save();
        ctx.translate(sec.cx, sec.cy);
        ctx.rotate(sec.angle);
        ctx.scale(sec.scale, sec.scale);

        const flicker = Math.sin(frame * 0.06) * 2.1;

        sec.edgePts.forEach((p,i) => {
            const base = sec.baseEdgePts[i];
            p.x = base.x + flicker*rand(-7.9,7.9);
            p.y = base.y + flicker*rand(-7.9,7.9);
        });

        ctx.beginPath();
        sec.edgePts.forEach((p,i) => {
            const x = -sec.sw/2 + (i/(sec.edgePts.length-1))*sec.sw + p.x;
            const y = -sec.sh/2 + p.y;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(
            img,
            sec.sx, sec.sy, sec.sw, sec.sh,
            -sec.sw/2, -sec.sh/2,
            sec.sw, sec.sh
        );

        ctx.restore();

        sec.angle += sec.rotSpeed;
        sec.scale -= SCALE_DECAY;
        sec.scale += rand(-0.004,0.007);

        const hw = (sec.sw*sec.scale)/2;
        const hh = (sec.sh*sec.scale)/2;

        // Resetta se esce dai bordi (solo posizione centrale)
        if(sec.scale < 0.35 || sec.cx-hw < 0 || sec.cx+hw>canvas.width || sec.cy-hh<0 || sec.cy+hh>canvas.height){
            sec.scale = rand(SCALE_START_MIN, SCALE_START_MAX);
            sec.angle = rand(0, Math.PI*2);
            sec.cx = canvas.width/2;
            sec.cy = canvas.height/2;
            sec.edgePts = randomPoints(sec.sw, sec.sh, INTERNAL_POINTS);
            sec.baseEdgePts = sec.edgePts.map(p => ({x:p.x,y:p.y}));
            sec.rotSpeed = rand(ROT_SPEED_MIN, ROT_SPEED_MAX)*(Math.random()<0.5?-1:1);
        }
    });
}

// ============================
// LOOP
// ============================
function start() {
    currentImg = 0;
    hold = 1;
    initSections();
    requestAnimationFrame(draw);
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Clipping totale per contenere glitch dentro il canvas
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,0,canvas.width,canvas.height);
    ctx.clip();

    const alpha = baseAlpha(frame);

    if(alpha>0 && images[currentImg]){
        updateImage();
        updateSectionImage();

        for(let i=2;i<5;i++){
            const burst = Math.sin(frame*rand(0.08,0.14))*0.5+0.5;
            if(Math.random()<0.25+burst*5.6){
                spawnBodyFragment(images[currentImg], alpha);
            }
        }

        drawBodyFragments();
        drawStructuralSections(images[sectionImg]);
    }

    ctx.restore(); // fine clipping totale

    frame = (frame+1)%TOTAL_FRAMES;
    requestAnimationFrame(draw);
}
