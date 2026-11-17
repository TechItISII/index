document.addEventListener("DOMContentLoaded", async () => {
  const H = window.TechItHelpers;
  const cfg = window.TECHIT_CONFIG || {};
  const youtubeGrid = document.getElementById("youtubeGrid");
  const instagramGrid = document.getElementById("instagramGrid");

  // 1. YOUTUBE LATEST 3 VIDEOS
  const loadYouTube = async () => {
    if (!youtubeGrid) return;
    if (!cfg.YOUTUBE_API_KEY || !cfg.YOUTUBE_CHANNEL_ID) {
      youtubeGrid.innerHTML = `
        <div class="blog-empty social-setup-box">
          <p>⚙️ Add <code>YOUTUBE_API_KEY</code> and <code>YOUTUBE_CHANNEL_ID</code> in <code>supabase-config.js</code> to load the latest 3 videos automatically.</p>
          <a href="https://www.youtube.com/@TechItISII" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Watch on YouTube ↗</a>
        </div>`;
      return;
    }

    try {
      // Every YouTube channel's "Uploads" playlist ID is "UU" + channelId without "UC"
      const uploadsId = cfg.YOUTUBE_CHANNEL_ID.startsWith("UC")
        ? `UU${cfg.YOUTUBE_CHANNEL_ID.slice(2)}`
        : cfg.YOUTUBE_CHANNEL_ID;
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsId)}&maxResults=3&key=${encodeURIComponent(cfg.YOUTUBE_API_KEY)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || `HTTP ${res.status}`);
      }
      const items = (json.items || []).slice(0, 3);

      if (!items.length) {
        youtubeGrid.innerHTML = `<div class="blog-empty">No YouTube videos found yet.</div>`;
        return;
      }

      youtubeGrid.innerHTML = items
        .map(item => {
          const sn = item.snippet || {};
          const vid = sn.resourceId?.videoId || item.id?.videoId;
          const thumb = sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || "IMG/logo-esports-banner.jpg";
          const link = `https://www.youtube.com/watch?v=${vid}`;
          return `
          <a href="${H.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="blog-card">
            <div class="blog-card-media">
              <img src="${H.escapeHtml(thumb)}" alt="${H.escapeHtml(sn.title || "YouTube Video")}" loading="lazy" />
              <span class="blog-card-tag social-badge-yt">YOUTUBE</span>
            </div>
            <div class="blog-card-body">
              <span class="blog-card-date">${H.formatDate(sn.publishedAt)}</span>
              <h3 class="blog-card-title">${H.escapeHtml(sn.title || "Tech It ISII Video")}</h3>
              <p class="blog-card-summary">${H.escapeHtml((sn.description || "").slice(0, 110))}${sn.description?.length > 110 ? "..." : ""}</p>
              <span class="news-read-more">WATCH VIDEO ↗</span>
            </div>
          </a>`;
        })
        .join("");
    } catch (err) {
      youtubeGrid.innerHTML = `
        <div class="blog-empty social-setup-box">
          <p>⚠️ Could not fetch YouTube feed: <code>${H.escapeHtml(err?.message || "Unknown error")}</code></p>
          <a href="https://www.youtube.com/@TechItISII" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Open @TechItISII ↗</a>
        </div>`;
    }
  };

  // 2. INSTAGRAM LATEST 3 POSTS (Behold.so free JSON feed)
  const loadInstagram = async () => {
    if (!instagramGrid) return;
    if (!cfg.BEHOLD_FEED_URL) {
      instagramGrid.innerHTML = `
        <div class="blog-empty social-setup-box">
          <p>⚙️ Connect <code>@tech_it_isii</code> on <strong>Behold.so</strong> (free) and paste the JSON feed URL into <code>BEHOLD_FEED_URL</code> in <code>supabase-config.js</code>.</p>
          <a href="https://www.instagram.com/tech_it_isii?igsh=czV2NGNjMWVxeXBp" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">View @tech_it_isii on Instagram ↗</a>
        </div>`;
      return;
    }

    try {
      const res = await fetch(cfg.BEHOLD_FEED_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const posts = (Array.isArray(json) ? json : json.posts || []).slice(0, 3);

      if (!posts.length) {
        instagramGrid.innerHTML = `<div class="blog-empty">No Instagram posts found yet.</div>`;
        return;
      }

      instagramGrid.innerHTML = posts
        .map(post => {
          const img = post.sizes?.medium?.mediaUrl || post.mediaUrl || post.thumbnailUrl || "IMG/logo-esports-banner.jpg";
          const caption = post.caption || "Tech It ISII on Instagram";
          const shortCap = caption.length > 110 ? `${caption.slice(0, 110)}...` : caption;
          const link = post.permalink || "https://www.instagram.com/tech_it_isii";
          return `
          <a href="${H.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="blog-card">
            <div class="blog-card-media">
              <img src="${H.escapeHtml(img)}" alt="Instagram post" loading="lazy" />
              <span class="blog-card-tag social-badge-ig">INSTAGRAM</span>
            </div>
            <div class="blog-card-body">
              <span class="blog-card-date">${H.formatDate(post.timestamp)}</span>
              <p class="blog-card-summary">${H.escapeHtml(shortCap)}</p>
              <span class="news-read-more">VIEW ON INSTAGRAM ↗</span>
            </div>
          </a>`;
        })
        .join("");
    } catch {
      instagramGrid.innerHTML = `
        <div class="blog-empty social-setup-box">
          <p>⚠️ Could not fetch Instagram feed right now.</p>
          <a href="https://www.instagram.com/tech_it_isii?igsh=czV2NGNjMWVxeXBp" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Open @tech_it_isii ↗</a>
        </div>`;
    }
  };

  await Promise.all([loadYouTube(), loadInstagram()]);
});
