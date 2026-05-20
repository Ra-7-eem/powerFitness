const canvas = document.getElementById("mesh-bg");

if (canvas) {
  const ctx = canvas.getContext("2d");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointCount = 48;
  const maxDist = 140;
  const points = [];
  const mouse = { x: 0, y: 0, active: false };

  function resize() {
    const { innerWidth, innerHeight } = window;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }

  function createPoints() {
    points.length = 0;
    for (let i = 0; i < pointCount; i += 1) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  function update() {
    points.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x <= 0 || p.x >= canvas.width) p.vx *= -1;
      if (p.y <= 0 || p.y >= canvas.height) p.vy *= -1;

      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          p.x += (dx / dist) * force * 1.4;
          p.y += (dy / dist) * force * 1.4;
        }
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;

    for (let i = 0; i < points.length; i += 1) {
      const p1 = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const p2 = points[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.hypot(dx, dy);
        if (dist < maxDist) {
          const alpha = 1 - dist / maxDist;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * alpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function tick() {
    if (!prefersReduced) {
      update();
    }
    draw();
    requestAnimationFrame(tick);
  }

  resize();
  createPoints();
  tick();

  window.addEventListener("resize", () => {
    resize();
    createPoints();
  });

  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });
}
