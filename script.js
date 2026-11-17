document.addEventListener("DOMContentLoaded", () => {

  // 1. CUSTOM CURSOR, TARGET ACQUIRED, PORTAL & ROBOTIC ARM (ALL PAGES + MOBILE)
  const cursorDot = document.getElementById("cursorDot");
  const cursorRing = document.getElementById("cursorRing");
  const isFinePointer = window.matchMedia("(pointer: fine)").matches;

  let mouseX = -100, mouseY = -100;
  let hasMoved = false;
  let isRobotCarrying = false;
  let isAnimatingScroll = false;

  // Ensure Air Speed Overlay exists on every page (index, blog, social, admin)
  let airSpeedOverlay = document.getElementById("airSpeedOverlay");
  if (!airSpeedOverlay) {
    airSpeedOverlay = document.createElement("div");
    airSpeedOverlay.id = "airSpeedOverlay";
    airSpeedOverlay.className = "air-speed-overlay";
    airSpeedOverlay.setAttribute("aria-hidden", "true");
    airSpeedOverlay.innerHTML = `
      <span class="wind-streak" style="--x:6%;--h:130px;--d:0.28s;--del:0s;"></span>
      <span class="wind-streak is-red" style="--x:13%;--h:190px;--d:0.34s;--del:0.08s;"></span>
      <span class="wind-streak" style="--x:22%;--h:110px;--d:0.26s;--del:0.14s;"></span>
      <span class="wind-streak" style="--x:31%;--h:170px;--d:0.32s;--del:0.04s;"></span>
      <span class="wind-streak is-red" style="--x:44%;--h:140px;--d:0.29s;--del:0.12s;"></span>
      <span class="wind-streak" style="--x:58%;--h:200px;--d:0.35s;--del:0.02s;"></span>
      <span class="wind-streak is-red" style="--x:69%;--h:120px;--d:0.27s;--del:0.1s;"></span>
      <span class="wind-streak" style="--x:79%;--h:180px;--d:0.33s;--del:0.06s;"></span>
      <span class="wind-streak" style="--x:88%;--h:140px;--d:0.28s;--del:0.15s;"></span>
      <span class="wind-streak is-red" style="--x:94%;--h:160px;--d:0.31s;--del:0.05s;"></span>
    `;
    document.body.appendChild(airSpeedOverlay);
  }

  // Ensure Cyber Portal element exists on every page
  const cyberPortal = document.createElement("div");
  cyberPortal.className = "cyber-portal";
  cyberPortal.setAttribute("aria-hidden", "true");
  document.body.appendChild(cyberPortal);

  // "TARGET ACQUIRED" HUD tag (works on BOTH desktop & mobile)
  const targetTag = document.createElement("div");
  targetTag.className = "cursor-target-acquired";
  targetTag.textContent = "TARGET ACQUIRED";
  document.body.appendChild(targetTag);

  let targetTagTimer = null;
  let glitchInterval = null;
  const GLITCH_FRAMES = ["T▓RGET ░CQ█IRED", "T?RGET ???", "S█GNAL LOST // ???", "T4RG3T ▓CQU1R3D"];

  const showTargetAcquired = (x, y, durationMs = 700, offsetY = 28) => {
    clearInterval(glitchInterval);
    targetTag.classList.remove("is-glitched");
    targetTag.textContent = "TARGET ACQUIRED";

    const safeX = Math.max(85, Math.min(x, window.innerWidth - 85));
    const safeY = Math.min(y + offsetY, window.innerHeight - 36);
    targetTag.style.left = `${safeX}px`;
    targetTag.style.top = `${safeY}px`;
    targetTag.classList.add("is-shown");

    clearTimeout(targetTagTimer);
    targetTagTimer = setTimeout(() => {
      targetTag.classList.remove("is-shown");
    }, durationMs);
  };

  const showGlitchedTarget = (x, y, durationMs = 950) => {
    clearInterval(glitchInterval);
    const safeX = Math.max(85, Math.min(x, window.innerWidth - 85));
    const safeY = Math.min(y + 58, window.innerHeight - 36);
    targetTag.style.left = `${safeX}px`;
    targetTag.style.top = `${safeY}px`;
    targetTag.classList.add("is-shown", "is-glitched");

    let idx = 0;
    targetTag.textContent = GLITCH_FRAMES[0];
    glitchInterval = setInterval(() => {
      idx = (idx + 1) % GLITCH_FRAMES.length;
      targetTag.textContent = GLITCH_FRAMES[idx];
    }, 95);

    clearTimeout(targetTagTimer);
    targetTagTimer = setTimeout(() => {
      clearInterval(glitchInterval);
      targetTag.classList.remove("is-shown", "is-glitched");
      targetTag.textContent = "TARGET ACQUIRED";
    }, durationMs);
  };

  document.addEventListener("pointerdown", (e) => {
    const clickable = e.target.closest("a, button, .btn, .roster-tab, .blog-card, input[type='submit']");
    if (!clickable) return;

    showTargetAcquired(e.clientX, e.clientY, 700);
    try {
      sessionStorage.setItem(
        "techit_target_acquired",
        JSON.stringify({ x: e.clientX, y: e.clientY, expires: Date.now() + 1100 })
      );
    } catch {
      // Ignore storage errors
    }
  });

  if (cursorDot && cursorRing && isFinePointer) {
    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (isRobotCarrying || document.body.classList.contains("cursor-in-portal")) return;
      if (!hasMoved) {
        hasMoved = true;
        cursorDot.style.opacity = "1";
        cursorRing.style.opacity = "1";
      }
      const pos = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      cursorDot.style.transform = pos;
      cursorRing.style.transform = pos;
    });

    document.addEventListener("mouseleave", () => {
      cursorDot.style.opacity = "0";
      cursorRing.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      if (hasMoved && !document.body.classList.contains("cursor-in-portal")) {
        cursorDot.style.opacity = "1";
        cursorRing.style.opacity = "1";
      }
    });

    const interactables = document.querySelectorAll("a, button, input, textarea, .about-card, .member-card, .esports-crest-frame, .hero-number");
    interactables.forEach(el => {
      el.addEventListener("mouseenter", () => document.body.classList.add("cursor-hover"));
      el.addEventListener("mouseleave", () => document.body.classList.remove("cursor-hover"));
    });
  }

  // Arrival from Black Hole Portal: open -> spit out cursor -> close & disappear
  try {
    const portalArrival = sessionStorage.getItem("techit_portal_arrival");
    if (portalArrival) {
      sessionStorage.removeItem("techit_portal_arrival");
      const { x, y, expires } = JSON.parse(portalArrival);
      if (expires > Date.now()) {
        if (isFinePointer && cursorDot && cursorRing) {
          mouseX = x;
          mouseY = y;
          hasMoved = true;
          const pos = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          cursorDot.style.transform = pos;
          cursorRing.style.transform = pos;
          document.body.classList.add("cursor-in-portal");
        }

        // 1. Open black hole + show glitched interference tag underneath
        cyberPortal.style.left = `${x}px`;
        cyberPortal.style.top = `${y}px`;
        cyberPortal.offsetHeight;
        cyberPortal.classList.add("is-open");
        showGlitchedTarget(x, y, 420);

        // 2. Spit cursor back out with vortex pop + restore clean TARGET ACQUIRED below portal
        setTimeout(() => {
          if (cursorDot && cursorRing && isFinePointer) {
            document.body.classList.remove("cursor-in-portal");
            document.body.classList.add("cursor-spitting");
            cursorDot.style.opacity = "1";
            cursorRing.style.opacity = "1";
            setTimeout(() => document.body.classList.remove("cursor-spitting"), 440);
          }
          showTargetAcquired(x, y, 700, 58);

          // 3. Close black hole & disappear
          setTimeout(() => {
            cyberPortal.classList.remove("is-open");
          }, 340);
        }, 360);
      }
    } else {
      const saved = sessionStorage.getItem("techit_target_acquired");
      if (saved) {
        sessionStorage.removeItem("techit_target_acquired");
        const parsed = JSON.parse(saved);
        const remaining = parsed.expires - Date.now();
        if (remaining > 50) {
          if (cursorDot && cursorRing && isFinePointer) {
            mouseX = parsed.x;
            mouseY = parsed.y;
            hasMoved = true;
            const pos = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
            cursorDot.style.opacity = "1";
            cursorRing.style.opacity = "1";
            cursorDot.style.transform = pos;
            cursorRing.style.transform = pos;
          }
          showTargetAcquired(parsed.x, parsed.y, remaining);
        }
      }
    }
  } catch {
    // Ignore storage errors
  }

  // Directional Smooth Scroll + Robotic Arm (Desktop) + Air Flow (Desktop & Mobile)
  const robotArmOverlay = document.getElementById("robotArmOverlay");

  const runDirectionalScroll = (targetY, clickX, clickY) => {
    const startScroll = window.scrollY;
    const distance = targetY - startScroll;
    if (Math.abs(distance) < 4) return;

    const isGoingDown = distance > 0;
    const scrollDuration = Math.min(1050, Math.max(550, Math.abs(distance) * 0.45));
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const startAirScroll = (onDone) => {
      isAnimatingScroll = true;
      airSpeedOverlay.classList.toggle("is-down", isGoingDown);
      airSpeedOverlay.classList.add("is-active");
      document.body.classList.add("is-air-rushing");

      const scrollStart = performance.now();
      const scrollStep = (tNow) => {
        const progress = Math.min((tNow - scrollStart) / scrollDuration, 1);
        const eased = easeInOutCubic(progress);
        window.scrollTo(0, startScroll + distance * eased);

        if (progress < 1) {
          requestAnimationFrame(scrollStep);
        } else {
          window.scrollTo(0, targetY);
          airSpeedOverlay.classList.remove("is-active", "is-down");
          document.body.classList.remove("is-air-rushing");
          isAnimatingScroll = false;
          if (onDone) onDone();
        }
      };
      requestAnimationFrame(scrollStep);
    };

    // Mobile / touch or pages without Robotic Arm: directional air-flow scroll
    if (!isFinePointer || !cursorDot || !cursorRing || !robotArmOverlay) {
      startAirScroll();
      return;
    }

    if (isRobotCarrying) return;
    isRobotCarrying = true;

    const startX = hasMoved ? mouseX : clickX;
    const startY = hasMoved ? mouseY : clickY;
    const holdX = window.innerWidth - 36;
    const offscreenX = window.innerWidth + 160;
    const CLAW_CENTER_X = 18;
    const CLAW_CENTER_Y = 50;

    const placeArmAndCursor = (x, y) => {
      const cPos = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      cursorDot.style.transform = cPos;
      cursorRing.style.transform = cPos;
      robotArmOverlay.style.transform = `translate3d(${x - CLAW_CENTER_X}px, ${y - CLAW_CENTER_Y}px, 0)`;
    };

    // 1. Arm enters smoothly from completely outside right edge
    robotArmOverlay.style.transition = "none";
    robotArmOverlay.style.transform = `translate3d(${offscreenX}px, ${startY - CLAW_CENTER_Y}px, 0)`;
    robotArmOverlay.classList.add("is-visible");
    robotArmOverlay.offsetHeight;

    robotArmOverlay.style.transition = "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)";
    robotArmOverlay.style.transform = `translate3d(${startX - CLAW_CENTER_X}px, ${startY - CLAW_CENTER_Y}px, 0)`;

    setTimeout(() => {
      // 2. Clamp claw shut onto cursor
      robotArmOverlay.classList.add("is-grabbing");
      document.body.classList.add("cursor-hover");

      setTimeout(() => {
        // CRITICAL: disable CSS transition so arm & cursor stay 100% locked in rAF
        robotArmOverlay.style.transition = "none";
        const pullStart = performance.now();
        const pullDuration = 520;
        const pullStep = (now) => {
          const p = Math.min((now - pullStart) / pullDuration, 1);
          const easedP = 1 - Math.pow(1 - p, 3);
          placeArmAndCursor(startX + (holdX - startX) * easedP, startY);

          if (p < 1) {
            requestAnimationFrame(pullStep);
          } else {
            placeArmAndCursor(holdX, startY);
            setTimeout(() => {
              startAirScroll(() => {
                setTimeout(() => {
                  const returnStart = performance.now();
                  const returnDuration = 520;
                  const returnStep = (rNow) => {
                    const rp = Math.min((rNow - returnStart) / returnDuration, 1);
                    const easedR = 1 - Math.pow(1 - rp, 3);
                    placeArmAndCursor(holdX + (startX - holdX) * easedR, startY);

                    if (rp < 1) {
                      requestAnimationFrame(returnStep);
                    } else {
                      placeArmAndCursor(startX, startY);
                      robotArmOverlay.classList.remove("is-grabbing");
                      document.body.classList.remove("cursor-hover");
                      mouseX = startX;
                      mouseY = startY;

                      setTimeout(() => {
                        robotArmOverlay.style.transition = "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
                        robotArmOverlay.style.transform = `translate3d(${offscreenX}px, ${startY - CLAW_CENTER_Y}px, 0)`;
                        setTimeout(() => {
                          robotArmOverlay.classList.remove("is-visible");
                          isRobotCarrying = false;
                        }, 600);
                      }, 240);
                    }
                  };
                  requestAnimationFrame(returnStep);
                }, 200);
              });
            }, 180);
          }
        };
        requestAnimationFrame(pullStep);
      }, 260);
    }, 650);
  };

  // Intercept same-page anchor links & cross-page internal links (Portal)
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link || link.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http")) return;

    // Same-page hash link (e.g. #hero, #about, #robot, #team, #stagioni, #contatti)
    if (href.startsWith("#")) {
      const targetEl = document.querySelector(href);
      if (!targetEl) return;
      e.preventDefault();
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetY = href === "#hero"
        ? 0
        : Math.max(0, Math.min(targetEl.getBoundingClientRect().top + window.scrollY - 72, maxScroll));
      runDirectionalScroll(targetY, e.clientX || window.innerWidth * 0.5, e.clientY || window.innerHeight * 0.5);
      return;
    }

    // Cross-page internal link (e.g. blog.html, social.html, admin.html, index.html) -> Cyber Portal
    const [pagePart] = href.split("#");
    const currentFile = window.location.pathname.split("/").pop() || "index.html";
    if (pagePart && pagePart !== currentFile && /\.(html)$/i.test(pagePart)) {
      e.preventDefault();
      const px = e.clientX || window.innerWidth * 0.5;
      const py = e.clientY || window.innerHeight * 0.5;

      // 1. Open black hole + glitched interference tag underneath
      cyberPortal.style.left = `${px}px`;
      cyberPortal.style.top = `${py}px`;
      cyberPortal.classList.add("is-open");
      showGlitchedTarget(px, py, 1100);

      try {
        sessionStorage.setItem(
          "techit_portal_arrival",
          JSON.stringify({ x: px, y: py, expires: Date.now() + 3500 })
        );
      } catch {
        // Ignore storage errors
      }

      // 2. Vortex-suck cursor into the black hole
      setTimeout(() => {
        if (isFinePointer) document.body.classList.add("cursor-sucking");

        // 3. Close black hole after cursor is eaten
        setTimeout(() => {
          if (isFinePointer) document.body.classList.add("cursor-in-portal");
          cyberPortal.classList.remove("is-open");

          // 4. Open new page
          setTimeout(() => {
            window.location.href = href;
          }, 340);
        }, 440);
      }, 340);
    }
  });

  // Fast Scroll / iPhone Status-Bar Tap-to-Top Air Flow (Mobile & Desktop)
  let lastScrollY = window.scrollY;
  let lastScrollTime = performance.now();
  let fastScrollTimer = null;

  window.addEventListener("scroll", () => {
    if (isAnimatingScroll) {
      lastScrollY = window.scrollY;
      lastScrollTime = performance.now();
      return;
    }
    const now = performance.now();
    const curY = window.scrollY;
    const dy = curY - lastScrollY;
    const dt = Math.max(now - lastScrollTime, 16);
    const speed = Math.abs(dy) / dt;

    if (speed > 2.2 && Math.abs(dy) > 35) {
      airSpeedOverlay.classList.toggle("is-down", dy > 0);
      airSpeedOverlay.classList.add("is-active");
      document.body.classList.add("is-air-rushing");

      clearTimeout(fastScrollTimer);
      fastScrollTimer = setTimeout(() => {
        if (!isAnimatingScroll) {
          airSpeedOverlay.classList.remove("is-active", "is-down");
          document.body.classList.remove("is-air-rushing");
        }
      }, 240);
    }

    lastScrollY = curY;
    lastScrollTime = now;
  }, { passive: true });

  // 2. NAVBAR & MOBILE MENU
  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.querySelector(".nav-links");

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  }, { passive: true });

  const setMenuState = (isOpen) => {
    navLinks.classList.toggle("active", isOpen);
    navToggle.classList.toggle("active", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  };

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      setMenuState(!navLinks.classList.contains("active"));
    });

    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => setMenuState(false));
    });

    document.addEventListener("click", (e) => {
      if (navLinks.classList.contains("active") &&
          !navLinks.contains(e.target) &&
          !navToggle.contains(e.target)) {
        setMenuState(false);
      }
    });
  }

  // 3. SCROLL REVEAL ANIMATIONS
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.style.getPropertyValue('--delay');
        if (delay) {
          entry.target.style.transitionDelay = delay;
        }
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

  document.querySelectorAll(".animate-in, .about-card, .member-card, .timeline-item").forEach(el => {
    el.classList.add("animate-in");
    observer.observe(el);
  });

  // 4. COUNTER ANIMATION
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = +entry.target.getAttribute("data-target");
        let count = 0;
        const inc = Math.max(target / 60, 0.1);

        const updateCount = () => {
          count += inc;
          if (count < target) {
            entry.target.innerText = Math.ceil(count);
            requestAnimationFrame(updateCount);
          } else {
            entry.target.innerText = target;
          }
        };
        updateCount();
        statsObserver.unobserve(entry.target);
      }
    });
  });

  document.querySelectorAll(".stat-num").forEach(stat => statsObserver.observe(stat));

  // 5. 3D TILT (desktop)
  if (window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-tilt]").forEach(el => {
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / rect.height) * -8;
        const rotateY = ((x - rect.width / 2) / rect.width) * 8;
        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`;
        el.style.transition = "none";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
        el.style.transition = "transform 0.45s ease";
      });
    });
  }

  // 6. ROSTER FILTER TABS
  const rosterTabs = document.querySelectorAll(".roster-tab");
  const rosterGroups = document.querySelectorAll(".roster-group");

  rosterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const filter = tab.getAttribute("data-filter");

      rosterTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      rosterGroups.forEach(group => {
        const groupName = group.getAttribute("data-group");
        const shouldShow = filter === "all" || filter === groupName;
        group.classList.toggle("is-hidden", !shouldShow);
      });
    });
  });

  // 7. NAVBAR AUTH STATUS (tutte le pagine)
  const navAuthSlot = document.getElementById("navAuthSlot");
  const renderNavAuth = async () => {
    const client = window.TechItHelpers?.getClient();
    if (!navAuthSlot || !client) return;

    const { data: { session } } = await client.auth.getSession();
    if (!session || !session.user) {
      navAuthSlot.innerHTML = `<a href="admin.html" class="nav-login-btn">LOGIN</a>`;
      return;
    }

    const profile = await window.TechItHelpers.getUserProfile(client, session.user);
    const isAdmin = profile.role === "admin";
    const roleLabel = isAdmin ? "TECH IT ISII ADMIN" : "TECH IT ISII INSIDER";
    const roleBadgeClass = isAdmin ? "is-admin-badge" : "is-insider-badge";
    const primaryLinks = isAdmin
      ? `<a href="admin.html#console" class="nav-dropdown-link">Admin Console</a>
         <a href="admin.html#editor" class="nav-dropdown-link">Create / Manage Posts</a>`
      : `<a href="admin.html#editor" class="nav-dropdown-link">Create / Manage Posts</a>`;

    const displayName = window.TechItHelpers.escapeHtml(
      window.TechItHelpers.getDisplayName(session.user, profile)
    );
    const email = window.TechItHelpers.escapeHtml(session.user.email || "");

    navAuthSlot.innerHTML = `
      <div class="nav-user-menu" id="navUserMenu">
        <button type="button" class="nav-user-trigger" id="navUserTrigger" aria-expanded="false" aria-haspopup="true">
          <span class="nav-user-dot"></span>
          <span class="nav-user-name">${displayName}</span>
          <span class="nav-user-caret">▾</span>
        </button>
        <div class="nav-user-dropdown" id="navUserDropdown">
          <div class="nav-user-dropdown-head">
            <span class="author-insider-badge ${roleBadgeClass}">${roleLabel}</span>
            <strong>${displayName}</strong>
            <small>${email}</small>
          </div>
          ${primaryLinks}
          <a href="admin.html#profile" class="nav-dropdown-link">Account &amp; 2FA Settings</a>
          <button type="button" class="nav-dropdown-link is-logout" id="navLogoutBtn">Disconnect</button>
        </div>
      </div>
    `;

    const trigger = document.getElementById("navUserTrigger");
    const menu = document.getElementById("navUserMenu");
    const logoutAction = document.getElementById("navLogoutBtn");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    logoutAction.addEventListener("click", async () => {
      await client.auth.signOut();
      if (window.location.pathname.endsWith("admin.html")) {
        window.location.reload();
      } else {
        await renderNavAuth();
      }
    });
  };
  renderNavAuth();
  window.refreshTechItNavAuth = renderNavAuth;

  // 8. LATEST NEWS MODAL (comparsa e scomparsa) + AUTO-SYNC DA SUPABASE
  const newsCardTrigger = document.getElementById("newsCardTrigger");
  const newsModal = document.getElementById("newsModal");
  const newsModalClose = document.getElementById("newsModalClose");
  const newsModalBackdrop = document.getElementById("newsModalBackdrop");

  if (newsCardTrigger && newsModal) {
    let latestSocialUrl = "";
    let socialRendered = false;
    let activeLiveUrl = "";

    const activateLiveCard = ({ platform, title, streamUrl, thumbnailUrl }) => {
      activeLiveUrl = streamUrl;
      newsCardTrigger.classList.add("is-live-stream", `is-live-${platform}`);
      newsCardTrigger.removeAttribute("aria-haspopup");
      newsCardTrigger.setAttribute("aria-label", `Watch Live on ${platform}: ${title}`);

      const tagEl = document.getElementById("latestNewsTag");
      const badgeEl = document.getElementById("latestNewsBadge");
      const imgEl = document.getElementById("latestNewsImg");
      const titleEl = document.getElementById("latestNewsTitle");
      const ctaEl = document.getElementById("latestNewsCta");
      const overlayEl = document.getElementById("liveOverlayBadge");
      const overlayTextEl = document.getElementById("liveOverlayText");

      const isYT = platform === "youtube";
      if (tagEl) tagEl.innerHTML = `<i class="status-pulse"></i> ● LIVE NOW`;
      if (badgeEl) badgeEl.textContent = isYT ? "YOUTUBE LIVE" : "INSTAGRAM LIVE";
      if (titleEl) titleEl.textContent = title || (isYT ? "Watch us live on YouTube" : "Watch us live on Instagram");
      if (ctaEl) ctaEl.textContent = isYT ? "OPEN YOUTUBE ↗" : "OPEN INSTAGRAM ↗";
      if (overlayEl) overlayEl.style.display = "inline-flex";
      if (overlayTextEl) overlayTextEl.textContent = isYT ? "ON AIR · YOUTUBE" : "ON AIR · @TECH_IT_ISII";

      const ytId = isYT ? window.TechItHelpers?.extractYouTubeId(streamUrl) : null;
      if (imgEl) {
        if (thumbnailUrl) {
          imgEl.src = thumbnailUrl;
        } else if (ytId) {
          imgEl.src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
        } else {
          imgEl.src = "IMG/logo-esports-banner.jpg";
        }
      }
    };

    const setNewsModalOpen = (open) => {
      newsModal.classList.toggle("is-open", open);
      newsModal.setAttribute("aria-hidden", String(!open));
      newsCardTrigger.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";

      if (open && latestSocialUrl && !socialRendered && window.TechItHelpers) {
        const socialContainer = document.getElementById("newsModalSocial");
        window.TechItHelpers.renderSocialEmbed(socialContainer, latestSocialUrl);
        socialRendered = true;
      }
    };

    newsCardTrigger.addEventListener("click", () => {
      if (activeLiveUrl) {
        window.open(activeLiveUrl, "_blank", "noopener,noreferrer");
        return;
      }
      setNewsModalOpen(!newsModal.classList.contains("is-open"));
    });

    if (newsModalClose) {
      newsModalClose.addEventListener("click", () => setNewsModalOpen(false));
    }
    if (newsModalBackdrop) {
      newsModalBackdrop.addEventListener("click", () => setNewsModalOpen(false));
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && newsModal.classList.contains("is-open")) {
        setNewsModalOpen(false);
      }
    });

    // Auto-check Live Stream (Supabase live_status + optional YouTube API v3) or Latest News
    const client = window.TechItHelpers?.getClient();
    const checkLiveAndNews = async () => {
      let liveHandled = false;

      if (client) {
        try {
          const { data: liveData } = await client
            .from("live_status")
            .select("*")
            .eq("id", "main")
            .maybeSingle();

          if (liveData && liveData.is_live && liveData.stream_url) {
            activateLiveCard({
              platform: liveData.platform || "youtube",
              title: liveData.title,
              streamUrl: liveData.stream_url,
              thumbnailUrl: liveData.thumbnail_url
            });
            liveHandled = true;
          }
        } catch {
          // Ignore if live_status table not created yet
        }
      }

      // Optional automatic YouTube Data API v3 live check
      const ytKey = window.TECHIT_CONFIG?.YOUTUBE_API_KEY;
      const ytChan = window.TECHIT_CONFIG?.YOUTUBE_CHANNEL_ID;
      if (!liveHandled && ytKey && ytChan) {
        try {
          const ytRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(ytChan)}&eventType=live&type=video&key=${encodeURIComponent(ytKey)}`
          );
          if (ytRes.ok) {
            const ytJson = await ytRes.json();
            const item = ytJson.items?.[0];
            if (item?.id?.videoId) {
              activateLiveCard({
                platform: "youtube",
                title: item.snippet?.title || "Tech It ISII Live on YouTube",
                streamUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                thumbnailUrl: item.snippet?.thumbnails?.high?.url || ""
              });
              liveHandled = true;
            }
          }
        } catch {
          // Ignore YT API errors
        }
      }

      if (!liveHandled && client) {
        try {
          const { data, error } = await client
            .from("news")
            .select("*")
            .eq("published", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error || !data) return;

          const badgeEl = document.getElementById("latestNewsBadge");
          const imgEl = document.getElementById("latestNewsImg");
          const titleEl = document.getElementById("latestNewsTitle");
          const modalImgEl = document.getElementById("newsModalImg");
          const modalDateEl = document.getElementById("newsModalDate");
          const modalTitleEl = document.getElementById("newsModalTitle");
          const modalAuthorEl = document.getElementById("newsModalAuthor");
          const modalTextEl = document.getElementById("newsModalText");

          const imgSrc = data.image_url || "IMG/logo-esports-banner.jpg";
          if (badgeEl) badgeEl.textContent = data.tag || "TEAM NEWS";
          if (imgEl) imgEl.src = imgSrc;
          if (titleEl) titleEl.textContent = data.title;
          if (modalImgEl) modalImgEl.src = imgSrc;
          if (modalDateEl) {
            const dateStr = window.TechItHelpers.formatDate(data.created_at);
            modalDateEl.textContent = `${dateStr} · ${data.tag || "TEAM NEWS"}`;
          }
          if (modalTitleEl) modalTitleEl.textContent = data.title;
          if (modalAuthorEl) {
            modalAuthorEl.innerHTML = window.TechItHelpers.renderAuthorByline(data.author_email);
          }
          if (modalTextEl) {
            modalTextEl.innerHTML = window.TechItHelpers.formatParagraphs(data.content);
          }

          latestSocialUrl = data.social_url || "";
          socialRendered = false;
        } catch {
          // Fallback to static hero news if offline
        }
      }
    };

    checkLiveAndNews();
  }

  // 8. CONTACT FORM
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const successMsg = document.getElementById("formSuccess");

    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }

      submitBtn.classList.add("is-loading");
      setTimeout(() => {
        submitBtn.classList.remove("is-loading");
        contactForm.reset();
        successMsg.style.display = "block";
        setTimeout(() => { successMsg.style.display = "none"; }, 6000);
      }, 900);
    });
  }

  // 8. EASTER EGG
  const EasterEggTrigger = document.getElementById('EasterEgg-trigger');
  if (EasterEggTrigger) {
    let isActive = true;
    EasterEggTrigger.addEventListener('click', () => {
      if (isActive) {
        EasterEggTrigger.textContent = 'No coffee anymore =,)';
        EasterEggTrigger.classList.add('EasterEgg-active');
      } else {
        EasterEggTrigger.textContent = 'plz give us coffee';
        EasterEggTrigger.classList.remove('EasterEgg-active');
      }
      EasterEggTrigger.style.transform = 'scale(0.85)';
      setTimeout(() => {
        EasterEggTrigger.style.transform = isActive ? 'scale(1.25) rotate(8deg)' : 'scale(1)';
      }, 50);
      isActive = !isActive;
    });
  }
});
