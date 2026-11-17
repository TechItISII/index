document.addEventListener("DOMContentLoaded", () => {

  // 1. CUSTOM CURSOR (desktop fine pointer)
  const cursorDot = document.getElementById("cursorDot");
  const cursorRing = document.getElementById("cursorRing");

  if (cursorDot && cursorRing && window.matchMedia("(pointer: fine)").matches) {
    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let hasMoved = false;
    let isRobotCarrying = false;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (isRobotCarrying) return;
      if (!hasMoved) {
        ringX = mouseX;
        ringY = mouseY;
        hasMoved = true;
        cursorDot.style.opacity = "1";
        cursorRing.style.opacity = "1";
      }
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    });

    function animateCursor() {
      if (!isRobotCarrying) {
        const ease = 0.18;
        ringX += (mouseX - ringX) * ease;
        ringY += (mouseY - ringY) * ease;
        cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Robotic Arm Back-to-Top Animation (from right edge + air-cutting speed lines)
    const backToTopBtn = document.getElementById("backToTopBtn");
    const robotArmOverlay = document.getElementById("robotArmOverlay");
    const airSpeedOverlay = document.getElementById("airSpeedOverlay");

    if (backToTopBtn && robotArmOverlay) {
      backToTopBtn.addEventListener("click", (e) => {
        if (isRobotCarrying) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        isRobotCarrying = true;

        const startX = hasMoved ? mouseX : window.innerWidth * 0.5;
        const startY = hasMoved ? mouseY : window.innerHeight - 90;
        const holdX = Math.min(startX + 110, window.innerWidth - 65);
        const startScroll = window.scrollY;

        // Claw tip sits at (22, 50) inside the 1600x100 SVG
        const placeArmAndCursor = (x, y) => {
          cursorDot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          cursorRing.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          robotArmOverlay.style.transform = `translate3d(${x - 22}px, ${y - 50}px, 0)`;
        };

        // 1. Emerge horizontally from the right edge to the cursor (smooth & deliberate)
        robotArmOverlay.style.transition = "none";
        robotArmOverlay.style.transform = `translate3d(${window.innerWidth + 30}px, ${startY - 50}px, 0)`;
        robotArmOverlay.classList.add("is-visible");
        robotArmOverlay.offsetHeight;

        robotArmOverlay.style.transition = "transform 0.52s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease";
        robotArmOverlay.style.transform = `translate3d(${startX - 22}px, ${startY - 50}px, 0)`;

        setTimeout(() => {
          // 2. Grab cursor, pause briefly, then pull slightly right
          robotArmOverlay.classList.add("is-grabbing");
          document.body.classList.add("cursor-hover");

          setTimeout(() => {
            const pullDuration = 380;
            const pullStart = performance.now();
            const pullStep = (now) => {
              const p = Math.min((now - pullStart) / pullDuration, 1);
              const easedP = 1 - Math.pow(1 - p, 3);
              const curX = startX + (holdX - startX) * easedP;
              placeArmAndCursor(curX, startY);

              if (p < 1) {
                requestAnimationFrame(pullStep);
              } else {
                // Wait until settled on the right before starting upward scroll
                setTimeout(() => {
                  // 3. Scroll to top with cartoon rocket wind streaks
                  if (airSpeedOverlay) airSpeedOverlay.classList.add("is-active");
                  document.body.classList.add("is-air-rushing");

                  const scrollDuration = 950;
                  const scrollStart = performance.now();
                  const easeInOutCubic = (t) =>
                    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

                  const scrollStep = (tNow) => {
                    const elapsed = tNow - scrollStart;
                    const progress = Math.min(elapsed / scrollDuration, 1);
                    const eased = easeInOutCubic(progress);
                    window.scrollTo(0, startScroll * (1 - eased));

                    if (progress < 1) {
                      requestAnimationFrame(scrollStep);
                    } else {
                      window.scrollTo(0, 0);
                      if (airSpeedOverlay) airSpeedOverlay.classList.remove("is-active");
                      document.body.classList.remove("is-air-rushing");

                      // Wait until screen is completely still before returning cursor
                      setTimeout(() => {
                        // 4. Return cursor smoothly to exact original screen position (startX, startY)
                        const returnDuration = 380;
                        const returnStart = performance.now();
                        const returnStep = (rNow) => {
                          const rp = Math.min((rNow - returnStart) / returnDuration, 1);
                          const easedR = 1 - Math.pow(1 - rp, 3);
                          const rx = holdX + (startX - holdX) * easedR;
                          placeArmAndCursor(rx, startY);

                          if (rp < 1) {
                            requestAnimationFrame(returnStep);
                          } else {
                            // 5. Release cursor & retract arm into right edge
                            robotArmOverlay.classList.remove("is-grabbing");
                            document.body.classList.remove("cursor-hover");
                            mouseX = startX;
                            mouseY = startY;
                            ringX = startX;
                            ringY = startY;

                            setTimeout(() => {
                              robotArmOverlay.style.transition = "transform 0.48s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease";
                              robotArmOverlay.classList.remove("is-visible");
                              robotArmOverlay.style.transform = `translate3d(${window.innerWidth + 30}px, ${startY - 50}px, 0)`;
                              isRobotCarrying = false;
                            }, 200);
                          }
                        };
                        requestAnimationFrame(returnStep);
                      }, 180);
                    }
                  };
                  requestAnimationFrame(scrollStep);
                }, 160);
              }
            };
            requestAnimationFrame(pullStep);
          }, 200);
        }, 520);
      });
    }

    document.addEventListener("mouseleave", () => {
      cursorDot.style.opacity = "0";
      cursorRing.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      if (hasMoved) {
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
