/**
 * THE SOUL VASTRA - Atmospheric Canvas Particles Engine
 * Subtle crimson embers and drifting smoke/fog for the cinematic hero
 */

(function () {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width, height;
  let particles = [];
  let isVisible = true;

  // Particle configuration
  const CONFIG = {
    particleCount: 42,
    smokeCount: 12,
    crimsonColors: [
      "rgba(194, 24, 32, ",
      "rgba(158, 19, 25, ",
      "rgba(230, 45, 55, ",
      "rgba(138, 21, 27, "
    ],
    smokeColors: [
      "rgba(25, 25, 30, ",
      "rgba(35, 35, 45, ",
      "rgba(18, 18, 22, "
    ]
  };

  function resize() {
    const parent = canvas.parentElement;
    width = canvas.width = parent.clientWidth;
    height = canvas.height = parent.clientHeight;
  }

  class Ember {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.2 + 0.8;
      this.speedY = -(Math.random() * 0.7 + 0.3);
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.colorBase =
        CONFIG.crimsonColors[
          Math.floor(Math.random() * CONFIG.crimsonColors.length)
        ];
      this.maxAlpha = Math.random() * 0.7 + 0.2;
      this.alpha = 0;
      this.fadeIn = true;
      this.life = 0;
      this.maxLife = Math.random() * 260 + 140;
      this.wobbleSpeed = Math.random() * 0.03 + 0.01;
      this.wobbleAmp = Math.random() * 1.5;
    }

    update() {
      this.life++;
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.life * this.wobbleSpeed) * 0.3;

      if (this.fadeIn) {
        this.alpha += 0.015;
        if (this.alpha >= this.maxAlpha) {
          this.alpha = this.maxAlpha;
          this.fadeIn = false;
        }
      } else if (this.life > this.maxLife * 0.6) {
        this.alpha -= 0.01;
      }

      if (this.y < -10 || this.alpha <= 0 || this.life >= this.maxLife) {
        this.reset();
      }
    }

    draw() {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.colorBase + this.alpha + ")";
      ctx.shadowColor = "rgba(200, 27, 36, 0.8)";
      ctx.shadowBlur = this.size * 3;
      ctx.fill();
      ctx.restore();
    }
  }

  class SmokeParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 50;
      this.radius = Math.random() * 80 + 50;
      this.speedY = -(Math.random() * 0.2 + 0.1);
      this.speedX = (Math.random() - 0.5) * 0.2;
      this.colorBase =
        CONFIG.smokeColors[
          Math.floor(Math.random() * CONFIG.smokeColors.length)
        ];
      this.maxAlpha = Math.random() * 0.08 + 0.03;
      this.alpha = 0;
      this.fadeIn = true;
      this.life = 0;
      this.maxLife = Math.random() * 400 + 200;
    }

    update() {
      this.life++;
      this.y += this.speedY;
      this.x += this.speedX;

      if (this.fadeIn) {
        this.alpha += 0.002;
        if (this.alpha >= this.maxAlpha) {
          this.fadeIn = false;
        }
      } else if (this.life > this.maxLife * 0.7) {
        this.alpha -= 0.002;
      }

      if (this.y < -this.radius || this.alpha <= 0 || this.life >= this.maxLife) {
        this.reset();
      }
    }

    draw() {
      if (this.alpha <= 0) return;
      ctx.save();
      const grad = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.radius
      );
      grad.addColorStop(0, this.colorBase + this.alpha + ")");
      grad.addColorStop(1, this.colorBase + "0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < CONFIG.smokeCount; i++) {
      particles.push(new SmokeParticle());
    }
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push(new Ember());
    }
    requestAnimationFrame(render);
  }

  function render() {
    if (isVisible) {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
    }
    requestAnimationFrame(render);
  }

  window.addEventListener("resize", resize);

  // Pause when hero is not visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isVisible = entry.isIntersecting;
    });
  }, { threshold: 0.1 });

  const heroSection = document.getElementById("hero");
  if (heroSection) {
    observer.observe(heroSection);
  }

  window.addEventListener("load", init);
})();
