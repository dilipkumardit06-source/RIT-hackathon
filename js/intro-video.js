/**
 * Optigoal Engine - High Definition Intro Video & Automatic Transition Engine
 * Based on AuroNote AI Architecture
 * Plays the HD 1080p video in crystal-clear quality edge-to-edge,
 * then seamlessly moves to the main landing page upon completion.
 */

class IntroVideoEngine {
  constructor() {
    this.overlay = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.progressBar = null;
    this.hasFinished = false;
  }

  init() {
    this.overlay = document.getElementById('intro-video-overlay');
    this.video = document.getElementById('intro-video');
    this.canvas = document.getElementById('intro-canvas');
    this.progressBar = document.getElementById('intro-progress-bar');

    if (!this.overlay) return;

    // Prevent background scrolling while intro video plays
    document.body.classList.add('overflow-hidden');

    this.bindEvents();

    if (this.video) {
      this.initVideoPlayer();
    } else if (this.canvas) {
      this.initCanvasFallback();
    }
  }

  initVideoPlayer() {
    this.video.muted = true;
    this.video.playsInline = true;

    // Track playback progress for the progress bar
    this.video.addEventListener('timeupdate', () => {
      if (this.progressBar && this.video.duration) {
        const pct = (this.video.currentTime / this.video.duration) * 100;
        this.progressBar.style.width = `${pct}%`;
      }
    });

    // Auto-transition when video completes
    this.video.addEventListener('ended', () => {
      if (this.progressBar) this.progressBar.style.width = '100%';
      setTimeout(() => {
        this.finishAndTransition();
      }, 400);
    });

    // Start playing video automatically
    const playPromise = this.video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay prevented or video error, falling back to canvas:', err);
        this.initCanvasFallback();
      });
    }

    // Safety fallback: if video stalls or fails to end after 11.5s
    setTimeout(() => {
      if (!this.hasFinished && this.video.currentTime > 8.0) {
        this.finishAndTransition();
      }
    }, 11500);
  }

  initCanvasFallback() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Set crisp resolution matching viewport
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;

    const totalFrames = 300;
    const images = [];
    let loaded = 0;
    let curFrame = 0;

    // Sample every 3rd frame for lightweight canvas fallback (100 frames)
    const step = 3;
    const frameIndices = [];
    for (let i = 1; i <= totalFrames; i += step) {
      frameIndices.push(i);
    }

    for (let i = 0; i < frameIndices.length; i++) {
      const img = new Image();
      const num = String(frameIndices[i]).padStart(3, '0');
      img.src = `enhanced_frames/ezgif-frame-${num}.jpg`;
      img.onload = () => {
        loaded++;
        if (loaded === 1 && curFrame === 0) {
          this.renderCanvasFrame(img);
        }
        if (loaded === 10) {
          startLoop();
        }
      };
      images.push(img);
    }

    const startLoop = () => {
      const interval = setInterval(() => {
        if (curFrame < totalFrames && images[curFrame]) {
          this.renderCanvasFrame(images[curFrame]);
          if (this.progressBar) {
            this.progressBar.style.width = `${(curFrame / (totalFrames - 1)) * 100}%`;
          }
          curFrame++;
        } else {
          clearInterval(interval);
          setTimeout(() => this.finishAndTransition(), 600);
        }
      }, 250);
    };
  }

  renderCanvasFrame(img) {
    if (!this.ctx || !img || !img.complete) return;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, cw, ch);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;

    let dw, dh, ox, oy;
    if (canvasRatio > imgRatio) {
      dw = cw;
      dh = cw / imgRatio;
      ox = 0;
      oy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * imgRatio;
      ox = (cw - dw) / 2;
      oy = 0;
    }

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(img, ox, oy, dw, dh);
  }

  finishAndTransition() {
    if (this.hasFinished) return;
    this.hasFinished = true;

    if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.transform = 'scale(1.04)';
      this.overlay.style.pointerEvents = 'none';

      setTimeout(() => {
        this.overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }, 700);
    }
  }

  replay() {
    this.hasFinished = false;
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.overlay.style.opacity = '1';
      this.overlay.style.transform = 'scale(1)';
      this.overlay.style.pointerEvents = 'auto';
    }
    if (this.progressBar) this.progressBar.style.width = '0%';
    document.body.classList.add('overflow-hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (this.video) {
      this.video.currentTime = 0;
      this.video.play().catch(e => console.warn('Replay error:', e));
    }
  }

  bindEvents() {
    const skipBtn = document.getElementById('btn-skip-intro');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.finishAndTransition();
      });
    }

    const replayBtn = document.getElementById('btn-replay-intro');
    if (replayBtn) {
      replayBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.replay();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.introVideoEngine = new IntroVideoEngine();
  window.introVideoEngine.init();
});
