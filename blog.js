document.addEventListener("DOMContentLoaded", async () => {
  const blogGrid = document.getElementById("blogGrid");
  const blogFilters = document.getElementById("blogFilters");
  const blogSearch = document.getElementById("blogSearch");
  const blogStatusBanner = document.getElementById("blogStatusBanner");

  const blogModal = document.getElementById("blogModal");
  const blogModalBackdrop = document.getElementById("blogModalBackdrop");
  const blogModalClose = document.getElementById("blogModalClose");
  const blogModalImg = document.getElementById("blogModalImg");
  const blogModalDate = document.getElementById("blogModalDate");
  const blogModalTitle = document.getElementById("blogModalTitle");
  const blogModalAuthor = document.getElementById("blogModalAuthor");
  const blogModalText = document.getElementById("blogModalText");
  const blogModalSocial = document.getElementById("blogModalSocial");

  const H = window.TechItHelpers;
  let allPosts = [];
  let activeTag = "ALL";
  let searchQuery = "";

  const FALLBACK_POSTS = [
    {
      id: "rebrand-2026",
      title: "Tech It ISII Unveils New Cyber-Lupa Rebrand",
      tag: "REBRAND 2026–27",
      summary: "Piacenza White & Red meets Esports Robotics for the 2026–27 BIOBUZZ season.",
      content:
        'For the 2026–27 BIOBUZZ™ season, Team #25074 introduces a complete visual rebrand designed to unite our local roots with a modern, high-impact esports aesthetic.\n\nThe new crest reimagines the Lupa — historic symbol of Piacenza — fused with cybernetic circuit traces and glowing red optical sensors, framed in Piacenza’s iconic White & Red colors alongside the Italian tricolore.\n\nRepresenting ISII "Guglielmo Marconi", this new identity marks a sharper, more professional chapter for our engineering, outreach, and competition presence.',
      image_url: "IMG/logo-esports-banner.jpg",
      social_url: "",
      created_at: "2026-11-16T12:00:00Z"
    }
  ];

  const openModal = (post) => {
    blogModalImg.src = post.image_url || "IMG/logo-esports-banner.jpg";
    blogModalDate.textContent = `${H.formatDate(post.created_at)} · ${post.tag || "TEAM NEWS"}`;
    blogModalTitle.textContent = post.title;
    if (blogModalAuthor) {
      blogModalAuthor.innerHTML = H.renderAuthorByline(post.author_email);
    }
    blogModalText.innerHTML = H.formatParagraphs(post.content);
    H.renderSocialEmbed(blogModalSocial, post.social_url);

    blogModal.classList.add("is-open");
    blogModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    blogModal.classList.remove("is-open");
    blogModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  if (blogModalClose) blogModalClose.addEventListener("click", closeModal);
  if (blogModalBackdrop) blogModalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && blogModal.classList.contains("is-open")) closeModal();
  });

  const renderFilters = () => {
    const tags = ["ALL", ...new Set(allPosts.map(p => (p.tag || "TEAM NEWS").toUpperCase()))];
    blogFilters.innerHTML = tags
      .map(
        tag => `
        <button type="button" class="roster-tab ${tag === activeTag ? "active" : ""}" data-tag="${H.escapeHtml(tag)}">
          ${H.escapeHtml(tag)}
        </button>`
      )
      .join("");

    blogFilters.querySelectorAll(".roster-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        activeTag = btn.getAttribute("data-tag");
        renderFilters();
        renderPosts();
      });
    });
  };

  const renderPosts = () => {
    const filtered = allPosts.filter(post => {
      const postTag = (post.tag || "TEAM NEWS").toUpperCase();
      const matchesTag = activeTag === "ALL" || postTag === activeTag;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q);
      return matchesTag && matchesQuery;
    });

    if (!filtered.length) {
      blogGrid.innerHTML = `<div class="blog-empty">No dispatches match your current filter.</div>`;
      return;
    }

    blogGrid.innerHTML = filtered
      .map(
        (post, idx) => `
      <article class="blog-card" data-idx="${idx}" tabindex="0" role="button" aria-label="Read ${H.escapeHtml(post.title)}">
        <div class="blog-card-media">
          <img src="${H.escapeHtml(post.image_url || "IMG/logo-esports-banner.jpg")}" alt="${H.escapeHtml(post.title)}" loading="lazy" />
          <span class="blog-card-tag">${H.escapeHtml(post.tag || "TEAM NEWS")}</span>
        </div>
        <div class="blog-card-body">
          <span class="blog-card-date">${H.formatDate(post.created_at)}${post.social_url ? " · SOCIAL EMBED" : ""}</span>
          <h2 class="blog-card-title">${H.escapeHtml(post.title)}</h2>
          <div class="blog-card-author">${H.renderAuthorByline(post.author_email)}</div>
          <p class="blog-card-summary">${H.escapeHtml(post.summary)}</p>
          <span class="news-read-more">READ DISPATCH →</span>
        </div>
      </article>`
      )
      .join("");

    blogGrid.querySelectorAll(".blog-card").forEach(card => {
      const post = filtered[Number(card.getAttribute("data-idx"))];
      card.addEventListener("click", () => openModal(post));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(post);
        }
      });
    });
  };

  if (blogSearch) {
    blogSearch.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderPosts();
    });
  }

  const client = H.getClient();
  if (!client) {
    blogStatusBanner.style.display = "block";
    blogStatusBanner.innerHTML =
      '⚙️ <strong>Preview Mode:</strong> Configure <code>supabase-config.js</code> to load live posts from your Supabase database.';
    allPosts = FALLBACK_POSTS;
    renderFilters();
    renderPosts();
    return;
  }

  blogGrid.innerHTML = `<div class="blog-empty">Loading dispatches...</div>`;
  const { data, error } = await client
    .from("news")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    blogStatusBanner.style.display = "block";
    blogStatusBanner.textContent = "⚠️ Could not reach Supabase. Showing cached local dispatch.";
    allPosts = FALLBACK_POSTS;
  } else {
    allPosts = data && data.length ? data : FALLBACK_POSTS;
  }

  renderFilters();
  renderPosts();
});
