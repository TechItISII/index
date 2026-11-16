// ============================================================================
// SUPABASE CONFIGURATION & SHARED HELPERS — TECH IT ISII #25074
// Replace the two placeholder values below with your Supabase Project settings:
// Project Settings -> API -> Project URL & anon public key
// ============================================================================

window.TECHIT_CONFIG = {
  SUPABASE_URL: "https://fxszsmtlhqsbpwcodbms.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_YRnpGSWZD4B7fM3gY4ekVw_uyTFUzKM"
};

window.TechItHelpers = {
  isConfigured() {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.TECHIT_CONFIG;
    return (
      Boolean(SUPABASE_URL) &&
      Boolean(SUPABASE_ANON_KEY) &&
      !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
      !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")
    );
  },

  getClient() {
    if (!this.isConfigured() || !window.supabase) return null;
    if (!this._client) {
      this._client = window.supabase.createClient(
        window.TECHIT_CONFIG.SUPABASE_URL,
        window.TECHIT_CONFIG.SUPABASE_ANON_KEY
      );
    }
    return this._client;
  },

  escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  formatParagraphs(text) {
    return String(text ?? "")
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${this.escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  },

  formatDate(isoString) {
    if (!isoString) return "";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(isoString)).toUpperCase();
    } catch {
      return "";
    }
  },

  getDisplayName(user, profile) {
    const profileName = profile?.display_name?.trim();
    if (profileName) return profileName;
    if (!user) return "Tech It ISII";
    const metaName = user.user_metadata?.display_name?.trim();
    if (metaName) return metaName;
    if (user.email) return user.email.split("@")[0];
    return "Tech It ISII";
  },

  async getUserProfile(client, user) {
    if (!client || !user) return { role: "insider", display_name: this.getDisplayName(user) };
    try {
      const { data, error } = await client
        .from("profiles")
        .select("id, email, display_name, role, created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error || !data) {
        return { id: user.id, email: user.email, role: "insider", display_name: this.getDisplayName(user) };
      }
      return data;
    } catch {
      return { id: user.id, email: user.email, role: "insider", display_name: this.getDisplayName(user) };
    }
  },

  formatAuthorName(rawAuthor) {
    if (!rawAuthor) return "Tech It ISII";
    const s = String(rawAuthor).trim();
    if (s.includes("@")) return s.split("@")[0];
    return s;
  },

  renderAuthorByline(rawAuthor) {
    const name = this.escapeHtml(this.formatAuthorName(rawAuthor));
    return `
      <span class="author-insider-badge">TECH IT ISII INSIDER</span>
      <span class="author-name-text">Written by <strong>${name}</strong></span>
    `;
  },

  detectSocialType(url) {
    if (!url) return null;
    const clean = url.trim();
    if (/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//i.test(clean)) return "instagram";
    if (/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^/]+\/status\/\d+/i.test(clean)) return "x";
    return null;
  },

  renderSocialEmbed(container, socialUrl) {
    if (!container) return;
    container.innerHTML = "";
    const type = this.detectSocialType(socialUrl);
    if (!type) {
      container.style.display = "none";
      return;
    }

    container.style.display = "block";
    const safeUrl = this.escapeHtml(socialUrl.trim());

    if (type === "instagram") {
      container.innerHTML = `
        <div class="social-embed-box">
          <div class="social-embed-label">// INSTAGRAM POST</div>
          <blockquote class="instagram-media" data-instgrm-permalink="${safeUrl}" data-instgrm-version="14" style="width:100%;margin:0 auto;">
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">View post on Instagram ↗</a>
          </blockquote>
        </div>
      `;
      if (window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
      } else if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
        const s = document.createElement("script");
        s.async = true;
        s.src = "https://www.instagram.com/embed.js";
        document.body.appendChild(s);
      }
    } else if (type === "x") {
      const normalizedX = safeUrl.replace("https://x.com/", "https://twitter.com/");
      container.innerHTML = `
        <div class="social-embed-box">
          <div class="social-embed-label">// X (TWITTER) POST</div>
          <blockquote class="twitter-tweet" data-theme="dark">
            <a href="${normalizedX}" target="_blank" rel="noopener noreferrer">View post on X ↗</a>
          </blockquote>
        </div>
      `;
      if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load(container);
      } else if (!document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
        const s = document.createElement("script");
        s.async = true;
        s.src = "https://platform.twitter.com/widgets.js";
        document.body.appendChild(s);
      }
    }
  }
};
