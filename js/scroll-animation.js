/**
 * Optigoal Engine - Pure Full-Screen Canvas Frame Scroll Animation
 * Edge-to-edge 300-frame 4K/retina scrub animation with inertia damping,
 * automatic play on load with transition to next section, and full user scroll control.
 */

class ScrollAnimationEngine {
  constructor() {
    this.totalFrames = 300;
    this.images = [];
    this.loadedImagesCount = 0;
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    
    this.currentFrameIndex = 0;
    this.targetFrameIndex = 0;
    this.isPlaying = false;
    this.playInterval = null;
    this.hasAutoAdvanced = false;
    
    this.progressIndicator = null;
    this.playBtn = null;
    this.headlineBlock = null;
  }

  init() {
    this.container = document.getElementById('hero-scroll-track');
    this.canvas = document.getElementById('scroll-animation-canvas');
    this.progressIndicator = document.getElementById('scroll-progress-bar');
    this.playBtn = document.getElementById('btn-toggle-autoplay');
    this.headlineBlock = document.getElementById('scroll-headline-block');
    
    if (!this.canvas || !this.container) return;

    this.ctx = this.canvas.getContext('2d');

    this.setupCanvasSize();
    this.preloadFrames();
    this.bindEvents();
    this.startRenderLoop();

    // Check if initial scroll is at the top; if so, trigger cinematic auto-play
    if (window.scrollY < 80) {
      setTimeout(() => {
        if (window.scrollY < 80 && !this.isPlaying && !this.hasAutoAdvanced) {
          this.startAutoPlay(true);
        }
      }, 500);
    }
  }

  setupCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    
    if (this.images[Math.round(this.currentFrameIndex)]?.complete) {
      this.drawFrame(Math.round(this.currentFrameIndex));
    }
  }

  preloadFrames() {
    for (let i = 1; i <= this.totalFrames; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      img.src = `enhanced_frames/ezgif-frame-${frameNum}.jpg`;
      
      img.onload = () => {
        this.loadedImagesCount++;
        // Render first frame immediately once loaded
        if (i === 1 && Math.round(this.currentFrameIndex) === 0) {
          this.drawFrame(0);
        }
      };
      
      // If already cached
      if (img.complete && img.naturalWidth > 0 && i === 1) {
        this.drawFrame(0);
      }
      
      this.images.push(img);
    }
  }

  drawFrame(index) {
    if (!this.ctx) return;
    
    // Safety clamp
    index = Math.max(0, Math.min(this.totalFrames - 1, Math.round(index)));
    
    // Find nearest loaded frame if this one hasn't finished loading yet
    let img = this.images[index];
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < 35; offset++) {
        if (index - offset >= 0 && this.images[index - offset]?.complete && this.images[index - offset]?.naturalWidth > 0) {
          img = this.images[index - offset];
          break;
        } else if (index + offset < this.totalFrames && this.images[index + offset]?.complete && this.images[index + offset]?.naturalWidth > 0) {
          img = this.images[index + offset];
          break;
        }
      }
      
      // Global fallback to any loaded frame if not found in radius
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let k = 0; k < this.totalFrames; k++) {
          if (this.images[k]?.complete && this.images[k]?.naturalWidth > 0) {
            img = this.images[k];
            break;
          }
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // Clear canvas with dark midnight backdrop
    this.ctx.fillStyle = '#030712';
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Full-screen Cover Aspect Ratio calculation (edge-to-edge, zero black bars)
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;
    
    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      // Screen is wider than image (cover width)
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      // Screen is taller than image (cover height)
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    // High quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  updateScroll() {
    if (this.isPlaying) return;

    const rect = this.container.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const totalDistance = rect.height - windowHeight;
    
    if (totalDistance <= 0) return;

    const scrolled = -rect.top;
    let progress = scrolled / totalDistance;
    progress = Math.max(0, Math.min(1, progress));

    this.targetFrameIndex = Math.min(
      this.totalFrames - 1,
      Math.floor(progress * (this.totalFrames - 1))
    );

    if (this.progressIndicator) {
      this.progressIndicator.style.width = `${progress * 100}%`;
    }

    this.updateHeadlineOpacity(progress);
  }

  updateHeadlineOpacity(progress) {
    if (!this.headlineBlock) return;
    if (progress > 0.12 && progress < 0.85) {
      const textOpacity = Math.max(0, 1 - (progress - 0.12) * 5);
      this.headlineBlock.style.opacity = textOpacity.toString();
      this.headlineBlock.style.pointerEvents = textOpacity < 0.2 ? 'none' : 'auto';
    } else if (progress <= 0.12) {
      this.headlineBlock.style.opacity = '1';
      this.headlineBlock.style.pointerEvents = 'auto';
    } else {
      this.headlineBlock.style.opacity = '0';
      this.headlineBlock.style.pointerEvents = 'none';
    }
  }

  startRenderLoop() {
    const render = () => {
      if (Math.abs(this.targetFrameIndex - this.currentFrameIndex) > 0.03) {
        this.currentFrameIndex += (this.targetFrameIndex - this.currentFrameIndex) * 0.35;
        const frameToDraw = Math.round(this.currentFrameIndex);
        this.drawFrame(frameToDraw);
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  startAutoPlay(autoAdvanceOnEnd = true) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.updatePlayBtnState(true);

    // If near the end, restart from beginning
    if (this.targetFrameIndex >= this.totalFrames - 5) {
      this.targetFrameIndex = 0;
      this.currentFrameIndex = 0;
    }

    const stepMs = 33; // ~30 fps smooth scrub
    this.playInterval = setInterval(() => {
      if (this.targetFrameIndex >= this.totalFrames - 1) {
        this.stopAutoPlay();
        
        if (autoAdvanceOnEnd && !this.hasAutoAdvanced) {
          this.hasAutoAdvanced = true;
          setTimeout(() => {
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
              dashboard.scrollIntoView({ behavior: 'smooth' });
            }
          }, 450);
        }
        return;
      }

      this.targetFrameIndex = Math.min(this.totalFrames - 1, this.targetFrameIndex + 1);
      const progress = this.targetFrameIndex / (this.totalFrames - 1);
      
      if (this.progressIndicator) {
        this.progressIndicator.style.width = `${progress * 100}%`;
      }
      this.updateHeadlineOpacity(progress);
    }, stepMs);
  }

  stopAutoPlay() {
    this.isPlaying = false;
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this.updatePlayBtnState(false);
  }

  toggleAutoPlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay(true);
    }
  }

  updatePlayBtnState(isPlaying) {
    if (!this.playBtn) return;
    if (isPlaying) {
      this.playBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-brand-cyan" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        <span class="text-brand-cyan">Pause Scrub</span>`;
    } else {
      this.playBtn.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>
        <span>Auto Scrub</span>`;
    }
  }

  bindEvents() {
    // When the user interacts via wheel/touch, pause autoplay so user has direct control
    const onUserManualInteraction = () => {
      if (this.isPlaying) {
        this.stopAutoPlay();
      }
    };

    window.addEventListener('wheel', onUserManualInteraction, { passive: true });
    window.addEventListener('touchmove', onUserManualInteraction, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Space', 'PageDown', 'PageUp'].includes(e.code)) {
        onUserManualInteraction();
      }
    });

    window.addEventListener('scroll', () => {
      if (!this.isPlaying) {
        this.updateScroll();
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.setupCanvasSize();
      if (!this.isPlaying) {
        this.updateScroll();
      }
    });

    if (this.playBtn) {
      this.playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleAutoPlay();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.scrollAnimationEngine = new ScrollAnimationEngine();
  window.scrollAnimationEngine.init();
});
