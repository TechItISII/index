document.addEventListener("DOMContentLoaded", async () => {
  const H = window.TechItHelpers;
  const client = H.getClient();

  const configAlert = document.getElementById("configAlert");
  const authSection = document.getElementById("authSection");
  const dashboardSection = document.getElementById("dashboardSection");
  const loginForm = document.getElementById("loginForm");
  const mfaForm = document.getElementById("mfaForm");
  const mfaCancelBtn = document.getElementById("mfaCancelBtn");
  const forcePasswordForm = document.getElementById("forcePasswordForm");
  const forceNewPassword = document.getElementById("forceNewPassword");
  const forceConfirmPassword = document.getElementById("forceConfirmPassword");
  const forcePassCancelBtn = document.getElementById("forcePassCancelBtn");
  const mfaSetupForm = document.getElementById("mfaSetupForm");
  const mfaGateQrContainer = document.getElementById("mfaGateQrContainer");
  const mfaGateSecretWrap = document.getElementById("mfaGateSecretWrap");
  const mfaGateSecret = document.getElementById("mfaGateSecret");
  const mfaGateCode = document.getElementById("mfaGateCode");
  const mfaGateCancelBtn = document.getElementById("mfaGateCancelBtn");
  const authFeedback = document.getElementById("authFeedback");
  const dashFeedback = document.getElementById("dashFeedback");
  const adminUserPill = document.getElementById("adminUserPill");
  const dashSectionLabel = document.getElementById("dashSectionLabel");
  const dashTitle = document.getElementById("dashTitle");
  const roleDiagnosticAlert = document.getElementById("roleDiagnosticAlert");
  const adminUsersList = document.getElementById("adminUsersList");
  const adminMediaList = document.getElementById("adminMediaList");
  const userManageForm = document.getElementById("userManageForm");
  const manageUserId = document.getElementById("manageUserId");
  const manageUserEmail = document.getElementById("manageUserEmail");
  const manageUserDisplayName = document.getElementById("manageUserDisplayName");
  const manageUserRole = document.getElementById("manageUserRole");
  const manageUserPassword = document.getElementById("manageUserPassword");
  const manageUserPasswordLabel = document.getElementById("manageUserPasswordLabel");
  const saveUserBtn = document.getElementById("saveUserBtn");
  const cancelEditUserBtn = document.getElementById("cancelEditUserBtn");

  const admin2faModal = document.getElementById("admin2faModal");
  const admin2faBackdrop = document.getElementById("admin2faBackdrop");
  const admin2faClose = document.getElementById("admin2faClose");
  const admin2faForm = document.getElementById("admin2faForm");
  const admin2faDesc = document.getElementById("admin2faDesc");
  const admin2faInput = document.getElementById("admin2faInput");
  const admin2faError = document.getElementById("admin2faError");

  const newsForm = document.getElementById("newsForm");
  const newsIdInput = document.getElementById("newsId");
  const newsTitleInput = document.getElementById("newsTitle");
  const newsTagInput = document.getElementById("newsTag");
  const newsSummaryInput = document.getElementById("newsSummary");
  const newsContentInput = document.getElementById("newsContent");
  const newsImageUrlInput = document.getElementById("newsImageUrl");
  const newsImageFileInput = document.getElementById("newsImageFile");
  const newsSocialUrlInput = document.getElementById("newsSocialUrl");
  const newsPublishedInput = document.getElementById("newsPublished");
  const saveNewsBtn = document.getElementById("saveNewsBtn");
  const resetNewsBtn = document.getElementById("resetNewsBtn");

  const adminPostsList = document.getElementById("adminPostsList");
  const adminHistoryList = document.getElementById("adminHistoryList");

  const profileForm = document.getElementById("profileForm");
  const profileDisplayName = document.getElementById("profileDisplayName");
  const profileNewPassword = document.getElementById("profileNewPassword");
  const profileLogoutBtn = document.getElementById("profileLogoutBtn");

  const mfaStatusText = document.getElementById("mfaStatusText");
  const enrollMfaBtn = document.getElementById("enrollMfaBtn");
  const reconfigureMfaBtn = document.getElementById("reconfigureMfaBtn");
  const mfaEnrollBox = document.getElementById("mfaEnrollBox");
  const mfaQrContainer = document.getElementById("mfaQrContainer");
  const mfaProfileSecretWrap = document.getElementById("mfaProfileSecretWrap");
  const mfaProfileSecret = document.getElementById("mfaProfileSecret");
  const mfaEnrollCode = document.getElementById("mfaEnrollCode");
  const verifyEnrollBtn = document.getElementById("verifyEnrollBtn");

  let pendingMfaFactorId = null;
  let gateEnrollFactorId = null;
  let enrollingFactorId = null;
  let currentProfile = { role: "insider", display_name: "Tech It ISII" };

  // Step-up 2FA prompt for any sensitive account management action
  const requireFresh2FA = (actionDescription) => {
    return new Promise((resolve) => {
      if (!admin2faModal || !admin2faForm) {
        resolve(false);
        return;
      }

      admin2faDesc.textContent = actionDescription;
      admin2faInput.value = "";
      admin2faError.style.display = "none";
      admin2faModal.classList.add("is-open");
      admin2faModal.setAttribute("aria-hidden", "false");
      setTimeout(() => admin2faInput.focus(), 80);

      const cleanup = (result) => {
        admin2faModal.classList.remove("is-open");
        admin2faModal.setAttribute("aria-hidden", "true");
        admin2faForm.removeEventListener("submit", onSubmit);
        admin2faClose.removeEventListener("click", onCancel);
        admin2faBackdrop.removeEventListener("click", onCancel);
        resolve(result);
      };

      const onCancel = () => cleanup(false);

      const onSubmit = async (e) => {
        e.preventDefault();
        admin2faError.style.display = "none";
        const code = admin2faInput.value.trim();

        const { data: factors } = await client.auth.mfa.listFactors();
        const verified = (factors?.totp || []).filter(f => f.status === "verified");
        if (!verified.length) {
          showFeedback(admin2faError, "No verified 2FA factor found.", true);
          return;
        }

        const { error } = await client.auth.mfa.challengeAndVerify({
          factorId: verified[0].id,
          code
        });

        if (error) {
          showFeedback(admin2faError, `Invalid 2FA code: ${error.message}`, true);
          return;
        }

        cleanup(true);
      };

      admin2faForm.addEventListener("submit", onSubmit);
      admin2faClose.addEventListener("click", onCancel);
      admin2faBackdrop.addEventListener("click", onCancel);
    });
  };

  const showFeedback = (el, msg, isError = false) => {
    el.style.display = "block";
    el.className = `admin-feedback ${isError ? "is-error" : "is-success"}`;
    el.textContent = msg;
  };

  if (!client) {
    configAlert.style.display = "block";
    loginForm.querySelector("button[type='submit']").disabled = true;
    return;
  }

  // Tab switching
  document.querySelectorAll("[data-admin-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-admin-tab");
      document.querySelectorAll("[data-admin-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-panel").forEach(p => {
        p.style.display = p.id === `tab-${target}` ? "block" : "none";
      });
      if (target === "posts") loadPosts();
      if (target === "live") loadLiveStatus();
      if (target === "history" && currentProfile.role === "admin") loadHistory();
      if (target === "console" && currentProfile.role === "admin") loadAdminConsole();
      if (target === "profile") loadProfileAndMfa();
    });
  });

  const switchToTab = (tabName) => {
    const btn = document.querySelector(`[data-admin-tab="${tabName}"]`);
    if (btn) btn.click();
  };

  const resetEditor = () => {
    newsForm.reset();
    newsIdInput.value = "";
    newsTagInput.value = "TEAM NEWS";
    newsPublishedInput.checked = true;
    saveNewsBtn.textContent = "Publish News →";
    resetNewsBtn.style.display = "none";
  };

  resetNewsBtn.addEventListener("click", resetEditor);

  const applyHashTab = () => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return false;
    const isAdmin = currentProfile.role === "admin";
    const allowedTabs = isAdmin
      ? ["editor", "posts", "live", "history", "console", "profile"]
      : ["editor", "posts", "live", "profile"];
    if (allowedTabs.includes(hash)) {
      switchToTab(hash);
      return true;
    }
    return false;
  };

  window.addEventListener("hashchange", () => {
    if (dashboardSection.style.display !== "none") {
      applyHashTab();
    }
  });

  const showDashboard = async (user) => {
    const loginPwEl = document.getElementById("loginPassword");
    if (loginPwEl) loginPwEl.value = "";
    authSection.style.display = "none";
    dashboardSection.style.display = "block";
    currentProfile = await H.getUserProfile(client, user);
    const isAdmin = currentProfile.role === "admin";

    document.querySelectorAll("[data-admin-only]").forEach(el => {
      el.style.display = isAdmin ? "inline-flex" : "none";
    });

    const displayName = H.getDisplayName(user, currentProfile);
    adminUserPill.textContent = `● ${isAdmin ? "ADMIN" : "INSIDER"} · ${displayName}`;
    if (dashSectionLabel) {
      dashSectionLabel.textContent = isAdmin
        ? "// ADMIN CONSOLE · FULL CONTROL"
        : "// INSIDER STUDIO · POSTS & DISPATCHES";
    }
    if (dashTitle) {
      dashTitle.innerHTML = isAdmin
        ? "Admin <em>Control Center</em>"
        : "Insider <em>Post Studio</em>";
    }

    if (roleDiagnosticAlert) {
      if (!isAdmin) {
        roleDiagnosticAlert.style.display = "block";
        roleDiagnosticAlert.innerHTML = `ℹ️ Sei connesso come <strong>INSIDER</strong> (<code>${H.escapeHtml(user.email)}</code>). Se questo account deve avere i permessi di <strong>ADMIN</strong>, assicurati di aver eseguito il nuovo <code>supabase/schema.sql</code> ed esegui in SQL Editor:<br><code>update public.profiles set role = 'admin' where email = '${H.escapeHtml(user.email)}';</code>`;
      } else {
        roleDiagnosticAlert.style.display = "none";
      }
    }

    if (window.refreshTechItNavAuth) await window.refreshTechItNavAuth();
    if (!applyHashTab()) {
      await loadPosts();
    }
  };

  const showAuth = () => {
    authSection.style.display = "block";
    dashboardSection.style.display = "none";
    loginForm.style.display = "block";
    mfaForm.style.display = "none";
    if (forcePasswordForm) forcePasswordForm.style.display = "none";
    if (mfaSetupForm) mfaSetupForm.style.display = "none";
  };

  const cleanupUnverifiedTotp = async () => {
    const { data: factors } = await client.auth.mfa.listFactors();
    const unverified = (factors?.totp || []).filter(f => f.status !== "verified");
    for (const f of unverified) {
      await client.auth.mfa.unenroll({ factorId: f.id });
    }
  };

  const startMandatoryMfaSetup = async () => {
    loginForm.style.display = "none";
    mfaForm.style.display = "none";
    mfaSetupForm.style.display = "flex";
    mfaGateQrContainer.innerHTML = `<span style="color:#07090e;font-size:0.85rem;">Generating QR...</span>`;

    await cleanupUnverifiedTotp();
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `TechItISII-${Date.now()}`
    });

    if (error || !data) {
      showFeedback(authFeedback, `2FA setup error: ${error?.message || "Unknown error"}`, true);
      return;
    }

    gateEnrollFactorId = data.id;
    mfaGateQrContainer.innerHTML = `<img src="${data.totp.qr_code}" alt="2FA QR Code" />`;
    if (data.totp.secret && mfaGateSecret && mfaGateSecretWrap) {
      mfaGateSecret.textContent = data.totp.secret;
      mfaGateSecretWrap.style.display = "flex";
    }
  };

  const checkSessionAndAal = async () => {
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      showAuth();
      return;
    }

    // Step 1: Force password change on first login if created by Admin
    if (session.user?.user_metadata?.must_change_password === true && forcePasswordForm) {
      loginForm.style.display = "none";
      mfaForm.style.display = "none";
      if (mfaSetupForm) mfaSetupForm.style.display = "none";
      forcePasswordForm.style.display = "flex";
      return;
    }

    const { data: factors } = await client.auth.mfa.listFactors();
    const verifiedTotp = (factors?.totp || []).filter(f => f.status === "verified");

    // Step 2: First login or no 2FA yet: force mandatory 2FA enrollment before dashboard access
    if (verifiedTotp.length === 0) {
      await startMandatoryMfaSetup();
      return;
    }

    const { data: aalData } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData && aalData.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
      pendingMfaFactorId = verifiedTotp[0].id;
      loginForm.style.display = "none";
      if (mfaSetupForm) mfaSetupForm.style.display = "none";
      mfaForm.style.display = "flex";
      return;
    }

    await showDashboard(session.user);
  };

  // Login submit
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authFeedback.style.display = "none";
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      showFeedback(authFeedback, `Login failed: ${error.message}`, true);
      return;
    }
    await checkSessionAndAal();
  });

  // 2FA challenge submit
  mfaForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authFeedback.style.display = "none";
    const code = document.getElementById("mfaCode").value.trim();
    if (!pendingMfaFactorId) return;

    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId: pendingMfaFactorId,
      code
    });

    if (error) {
      showFeedback(authFeedback, `Invalid 2FA code: ${error.message}`, true);
      return;
    }
    await checkSessionAndAal();
  });

  if (forcePasswordForm) {
    forcePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      authFeedback.style.display = "none";
      const pw = forceNewPassword.value;
      const confirmPw = forceConfirmPassword.value;
      if (pw !== confirmPw) {
        showFeedback(authFeedback, "Passwords do not match.", true);
        return;
      }

      const { error } = await client.auth.updateUser({
        password: pw,
        data: { must_change_password: false }
      });
      if (error) {
        showFeedback(authFeedback, `Password update error: ${error.message}`, true);
        return;
      }

      forcePasswordForm.reset();
      forcePasswordForm.style.display = "none";
      await checkSessionAndAal();
    });
  }

  if (forcePassCancelBtn) {
    forcePassCancelBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      if (window.refreshTechItNavAuth) await window.refreshTechItNavAuth();
      showAuth();
    });
  }

  if (mfaSetupForm) {
    mfaSetupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      authFeedback.style.display = "none";
      const code = mfaGateCode.value.trim();
      if (!gateEnrollFactorId || !code) return;

      const { error } = await client.auth.mfa.challengeAndVerify({
        factorId: gateEnrollFactorId,
        code
      });
      if (error) {
        showFeedback(authFeedback, `Invalid 2FA code: ${error.message}`, true);
        return;
      }
      mfaGateCode.value = "";
      await checkSessionAndAal();
    });
  }

  if (mfaGateCancelBtn) {
    mfaGateCancelBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      if (window.refreshTechItNavAuth) await window.refreshTechItNavAuth();
      showAuth();
    });
  }

  mfaCancelBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    if (window.refreshTechItNavAuth) await window.refreshTechItNavAuth();
    showAuth();
  });

  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      if (window.refreshTechItNavAuth) await window.refreshTechItNavAuth();
      showAuth();
    });
  }

  // Upload image to Supabase Storage
  newsImageFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop();
    const fileName = `news-${Date.now()}.${ext}`;
    showFeedback(dashFeedback, "Uploading image...", false);

    const { error } = await client.storage.from("news-media").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (error) {
      showFeedback(dashFeedback, `Image upload error: ${error.message}`, true);
      return;
    }

    const { data: urlData } = client.storage.from("news-media").getPublicUrl(fileName);
    newsImageUrlInput.value = urlData.publicUrl;
    showFeedback(dashFeedback, "Image uploaded and linked!", false);
  });

  // Create or Update News
  newsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const payload = {
      title: newsTitleInput.value.trim(),
      tag: newsTagInput.value.trim() || "TEAM NEWS",
      summary: newsSummaryInput.value.trim(),
      content: newsContentInput.value.trim(),
      image_url: newsImageUrlInput.value.trim() || "IMG/logo-esports-banner.jpg",
      social_url: newsSocialUrlInput.value.trim() || null,
      published: newsPublishedInput.checked,
      author_email: H.getDisplayName(user, currentProfile)
    };

    const editingId = newsIdInput.value;
    let res;
    if (editingId) {
      res = await client.from("news").update(payload).eq("id", editingId);
    } else {
      res = await client.from("news").insert([payload]);
    }

    if (res.error) {
      showFeedback(dashFeedback, `Save error: ${res.error.message}`, true);
      return;
    }

    showFeedback(dashFeedback, editingId ? "News updated! Home page is synced." : "News published! Home page is synced.", false);
    resetEditor();
    await loadPosts();
  });

  // Load All Posts
  async function loadPosts() {
    const { data, error } = await client
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      adminPostsList.innerHTML = `<div class="blog-empty">Error loading posts: ${H.escapeHtml(error.message)}</div>`;
      return;
    }

    if (!data || !data.length) {
      adminPostsList.innerHTML = `<div class="blog-empty">No news posts yet. Create your first one!</div>`;
      return;
    }

    adminPostsList.innerHTML = data
      .map(
        post => `
      <div class="admin-item-card">
        <div class="admin-item-info">
          <div class="admin-item-meta">
            <span class="blog-card-tag">${H.escapeHtml(post.tag)}</span>
            <span class="admin-status-dot ${post.published ? "is-live" : "is-draft"}">
              ${post.published ? "PUBLISHED" : "DRAFT"}
            </span>
            <span>${H.formatDate(post.created_at)}</span>
          </div>
          <h4>${H.escapeHtml(post.title)}</h4>
          <p>${H.escapeHtml(post.summary)}</p>
        </div>
        <div class="admin-item-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-edit="${post.id}">Edit</button>
          <button type="button" class="btn btn-ghost btn-sm" data-delete="${post.id}">Delete</button>
        </div>
      </div>`
      )
      .join("");

    adminPostsList.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const post = data.find(p => p.id === btn.getAttribute("data-edit"));
        if (!post) return;
        newsIdInput.value = post.id;
        newsTitleInput.value = post.title;
        newsTagInput.value = post.tag;
        newsSummaryInput.value = post.summary;
        newsContentInput.value = post.content;
        newsImageUrlInput.value = post.image_url || "";
        newsSocialUrlInput.value = post.social_url || "";
        newsPublishedInput.checked = Boolean(post.published);
        saveNewsBtn.textContent = "Update News →";
        resetNewsBtn.style.display = "inline-flex";
        switchToTab("editor");
      });
    });

    adminPostsList.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-delete");
        if (!confirm("Delete this news post? It will still be saved in Audit History.")) return;
        const { error: delErr } = await client.from("news").delete().eq("id", id);
        if (delErr) {
          showFeedback(dashFeedback, `Delete error: ${delErr.message}`, true);
          return;
        }
        showFeedback(dashFeedback, "News deleted (saved in Audit History).", false);
        await loadPosts();
      });
    });
  }

  // Load Audit History (Clearer Diffs & Color-coded Actions)
  const describeChanges = (oldData, newData) => {
    if (!oldData && newData) return "New post published/created.";
    if (oldData && !newData) return "Post removed from active list (backup preserved).";
    if (!oldData || !newData) return "";
    const changed = [];
    if (oldData.title !== newData.title) changed.push("Title");
    if (oldData.tag !== newData.tag) changed.push("Tag");
    if (oldData.summary !== newData.summary) changed.push("Summary");
    if (oldData.content !== newData.content) changed.push("Content");
    if (oldData.image_url !== newData.image_url) changed.push("Image");
    if (oldData.social_url !== newData.social_url) changed.push("Social Embed");
    if (oldData.published !== newData.published) {
      changed.push(newData.published ? "Status → Published" : "Status → Draft");
    }
    return changed.length ? `Modified: ${changed.join(", ")}` : "Metadata updated";
  };

  async function loadHistory() {
    const { data, error } = await client
      .from("news_history")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(40);

    if (error) {
      adminHistoryList.innerHTML = `<div class="blog-empty">Error loading history: ${H.escapeHtml(error.message)}</div>`;
      return;
    }

    if (!data || !data.length) {
      adminHistoryList.innerHTML = `<div class="blog-empty">No history entries yet.</div>`;
      return;
    }

    adminHistoryList.innerHTML = data
      .map(entry => {
        const snap = entry.new_data || entry.old_data || {};
        const canRestore = Boolean(entry.old_data);
        const actionClass =
          entry.action === "CREATE"
            ? "is-create"
            : entry.action === "DELETE"
              ? "is-delete"
              : "is-update";
        const actionLabel =
          entry.action === "CREATE"
            ? "CREATED"
            : entry.action === "DELETE"
              ? "DELETED"
              : "UPDATED";
        const diffSummary = describeChanges(entry.old_data, entry.new_data);

        return `
        <div class="admin-item-card audit-card">
          <div class="admin-item-info">
            <div class="admin-item-meta">
              <span class="audit-pill ${actionClass}">${actionLabel}</span>
              <span>${H.formatDate(entry.changed_at)}</span>
              <span>by <strong>${H.escapeHtml(H.formatAuthorName(entry.changed_by || "admin"))}</strong></span>
            </div>
            <h4>${H.escapeHtml(snap.title || "Untitled")}</h4>
            <p class="audit-diff-line">${H.escapeHtml(diffSummary)}</p>
          </div>
          ${
            canRestore
              ? `<div class="admin-item-actions">
                  <button type="button" class="btn btn-ghost btn-sm" data-restore="${entry.id}">Restore Previous</button>
                 </div>`
              : ""
          }
        </div>`;
      })
      .join("");

    adminHistoryList.querySelectorAll("[data-restore]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const entry = data.find(h => h.id === btn.getAttribute("data-restore"));
        if (!entry || !entry.old_data) return;
        const old = entry.old_data;
        const { error: restErr } = await client.from("news").upsert({
          id: old.id,
          title: old.title,
          tag: old.tag,
          summary: old.summary,
          content: old.content,
          image_url: old.image_url,
          social_url: old.social_url,
          published: old.published,
          author_email: old.author_email
        });
        if (restErr) {
          showFeedback(dashFeedback, `Restore error: ${restErr.message}`, true);
          return;
        }
        showFeedback(dashFeedback, `Restored "${old.title}"!`, false);
        await loadHistory();
      });
    });
  }

  // Admin Console (Full Control: Stats, Users/Roles, Storage)
  async function loadAdminConsole() {
    if (currentProfile.role !== "admin") return;

    const [{ data: allNews }, { data: profiles }, { data: histCountData }, { data: mediaFiles }] =
      await Promise.all([
        client.from("news").select("id, published"),
        client.from("profiles").select("*").order("created_at", { ascending: true }),
        client.from("news_history").select("id"),
        client.storage.from("news-media").list("", { limit: 50, sortBy: { column: "created_at", order: "desc" } })
      ]);

    const statTotalNews = document.getElementById("statTotalNews");
    const statPublishedNews = document.getElementById("statPublishedNews");
    const statTotalUsers = document.getElementById("statTotalUsers");
    const statTotalHistory = document.getElementById("statTotalHistory");

    if (statTotalNews) statTotalNews.textContent = allNews ? allNews.length : 0;
    if (statPublishedNews) statPublishedNews.textContent = allNews ? allNews.filter(n => n.published).length : 0;
    if (statTotalUsers) statTotalUsers.textContent = profiles ? profiles.length : 0;
    if (statTotalHistory) statTotalHistory.textContent = histCountData ? histCountData.length : 0;

    // Render Users & Roles
    if (adminUsersList) {
      if (!profiles || !profiles.length) {
        adminUsersList.innerHTML = `<div class="blog-empty">No profiles found. Run the updated <code>supabase/schema.sql</code>.</div>`;
      } else {
        adminUsersList.innerHTML = profiles
          .map(p => {
            const isSelf = p.id === currentProfile.id;
            const isAdm = p.role === "admin";
            return `
            <div class="admin-item-card">
              <div class="admin-item-info">
                <div class="admin-item-meta">
                  <span class="audit-pill ${isAdm ? "is-delete" : "is-create"}">${isAdm ? "ADMIN" : "INSIDER"}</span>
                  <span>${H.escapeHtml(p.email)}</span>
                  ${isSelf ? `<span class="admin-status-dot is-live">YOU</span>` : ""}
                </div>
                <h4>${H.escapeHtml(p.display_name || p.email)}</h4>
              </div>
              <div class="admin-item-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-edit-user="${p.id}">Edit</button>
                ${
                  !isSelf
                    ? `<button type="button" class="btn btn-ghost btn-sm" data-toggle-role="${p.id}" data-next-role="${isAdm ? "insider" : "admin"}">
                         Set ${isAdm ? "Insider" : "Admin"}
                       </button>
                       <button type="button" class="btn btn-ghost btn-sm" data-delete-user="${p.id}">Delete</button>`
                    : ""
                }
              </div>
            </div>`;
          })
          .join("");

        adminUsersList.querySelectorAll("[data-edit-user]").forEach(btn => {
          btn.addEventListener("click", () => {
            const userRow = profiles.find(p => p.id === btn.getAttribute("data-edit-user"));
            if (!userRow) return;
            manageUserId.value = userRow.id;
            manageUserEmail.value = userRow.email;
            manageUserEmail.disabled = false;
            manageUserDisplayName.value = userRow.display_name || "";
            manageUserRole.value = userRow.role || "insider";
            manageUserPassword.value = "";
            manageUserPassword.required = false;
            manageUserPasswordLabel.textContent = "New Password (optional, min. 8 chars)";
            saveUserBtn.textContent = "Update Account →";
            cancelEditUserBtn.style.display = "inline-flex";
            userManageForm.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        });

        adminUsersList.querySelectorAll("[data-toggle-role]").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-toggle-role");
            const nextRole = btn.getAttribute("data-next-role");
            const userRow = profiles.find(p => p.id === id);
            const verified = await requireFresh2FA(
              `Enter your 2FA code to change ${userRow?.email || "user"}'s role to ${nextRole.toUpperCase()}.`
            );
            if (!verified) return;

            const { error } = await client.rpc("admin_update_user", {
              target_user_id: id,
              new_display_name: userRow?.display_name || "",
              new_role: nextRole,
              new_password: null
            });
            if (error) {
              showFeedback(dashFeedback, `Role update error: ${error.message}`, true);
              return;
            }
            showFeedback(dashFeedback, `User role updated to ${nextRole.toUpperCase()}!`, false);
            await loadAdminConsole();
          });
        });

        adminUsersList.querySelectorAll("[data-delete-user]").forEach(btn => {
          btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-delete-user");
            const userRow = profiles.find(p => p.id === id);
            if (!confirm(`Permanently delete ${userRow?.email || "this user"}?`)) return;
            const verified = await requireFresh2FA(
              `Enter your 2FA code to permanently delete ${userRow?.email || "this account"}.`
            );
            if (!verified) return;

            const { error } = await client.rpc("admin_delete_user", { target_user_id: id });
            if (error) {
              showFeedback(dashFeedback, `Delete user error: ${error.message}`, true);
              return;
            }
            showFeedback(dashFeedback, "User account deleted.", false);
            await loadAdminConsole();
          });
        });
      }
    }

    // Render Storage Media Manager
    if (adminMediaList) {
      const files = (mediaFiles || []).filter(f => f.name && !f.name.startsWith("."));
      if (!files.length) {
        adminMediaList.innerHTML = `<div class="blog-empty">No uploaded images in <code>news-media</code> yet.</div>`;
      } else {
        adminMediaList.innerHTML = files
          .map(file => {
            const { data: pub } = client.storage.from("news-media").getPublicUrl(file.name);
            const url = pub.publicUrl;
            return `
            <div class="media-card">
              <img src="${H.escapeHtml(url)}" alt="${H.escapeHtml(file.name)}" loading="lazy" />
              <div class="media-card-foot">
                <span title="${H.escapeHtml(file.name)}">${H.escapeHtml(file.name)}</span>
                <div class="media-card-actions">
                  <button type="button" class="btn btn-ghost btn-sm" data-copy-url="${H.escapeHtml(url)}">Copy URL</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-del-media="${H.escapeHtml(file.name)}">Delete</button>
                </div>
              </div>
            </div>`;
          })
          .join("");

        adminMediaList.querySelectorAll("[data-copy-url]").forEach(btn => {
          btn.addEventListener("click", async () => {
            await navigator.clipboard.writeText(btn.getAttribute("data-copy-url"));
            showFeedback(dashFeedback, "Image URL copied to clipboard!", false);
          });
        });

        adminMediaList.querySelectorAll("[data-del-media]").forEach(btn => {
          btn.addEventListener("click", async () => {
            const name = btn.getAttribute("data-del-media");
            if (!confirm(`Delete ${name} from Storage?`)) return;
            const { error } = await client.storage.from("news-media").remove([name]);
            if (error) {
              showFeedback(dashFeedback, `Storage delete error: ${error.message}`, true);
              return;
            }
            showFeedback(dashFeedback, `Deleted ${name} from Storage.`, false);
            await loadAdminConsole();
          });
        });
      }
    }
  }

  const resetUserForm = () => {
    if (!userManageForm) return;
    userManageForm.reset();
    manageUserId.value = "";
    manageUserEmail.disabled = false;
    manageUserRole.value = "insider";
    manageUserPassword.required = true;
    manageUserPasswordLabel.textContent = "Password * (min. 8 chars)";
    saveUserBtn.textContent = "Create Account →";
    cancelEditUserBtn.style.display = "none";
  };

  if (cancelEditUserBtn) {
    cancelEditUserBtn.addEventListener("click", resetUserForm);
  }

  if (userManageForm) {
    userManageForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (currentProfile.role !== "admin") return;

      const editingId = manageUserId.value;
      const email = manageUserEmail.value.trim();
      const displayName = manageUserDisplayName.value.trim();
      const role = manageUserRole.value;
      const password = manageUserPassword.value;

      if (editingId) {
        const verified = await requireFresh2FA(
          `Enter your 2FA code to update ${email}.`
        );
        if (!verified) return;

        const { error } = await client.rpc("admin_update_user", {
          target_user_id: editingId,
          new_display_name: displayName,
          new_role: role,
          new_password: password || null,
          new_email: email
        });
        if (error) {
          showFeedback(dashFeedback, `Update user error: ${error.message}`, true);
          return;
        }
        showFeedback(dashFeedback, "User account updated!", false);
      } else {
        const verified = await requireFresh2FA(
          `Enter your 2FA code to create account ${email} (${role.toUpperCase()}).`
        );
        if (!verified) return;

        const { error } = await client.rpc("admin_create_user", {
          user_email: email,
          user_password: password,
          user_display_name: displayName,
          user_role: role
        });
        if (error) {
          showFeedback(dashFeedback, `Create user error: ${error.message}`, true);
          return;
        }

        // Send welcome sign-in email (uses Supabase Magic Link template instead of Reset Password)
        const baseOrigin = window.location.origin.startsWith("http")
          ? window.location.origin
          : "https://techit.isii.it";
        const redirectUrl = `${baseOrigin}/admin.html`;
        const { error: mailErr } = await client.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: redirectUrl
          }
        });

        if (mailErr) {
          showFeedback(
            dashFeedback,
            `Account ${email} created as ${role.toUpperCase()}, but welcome email failed: ${mailErr.message}`,
            false
          );
        } else {
          showFeedback(
            dashFeedback,
            `Account ${email} created as ${role.toUpperCase()} and welcome login email sent!`,
            false
          );
        }
      }

      resetUserForm();
      await loadAdminConsole();
    });
  }

  // Live Stream Tab
  const liveStatusForm = document.getElementById("liveStatusForm");
  const livePlatform = document.getElementById("livePlatform");
  const liveIsActive = document.getElementById("liveIsActive");
  const liveTitle = document.getElementById("liveTitle");
  const liveStreamUrl = document.getElementById("liveStreamUrl");
  const liveThumbnailUrl = document.getElementById("liveThumbnailUrl");

  async function loadLiveStatus() {
    if (!liveStatusForm) return;
    const { data } = await client.from("live_status").select("*").eq("id", "main").maybeSingle();
    if (!data) return;
    livePlatform.value = data.platform || "youtube";
    liveIsActive.checked = Boolean(data.is_live);
    liveTitle.value = data.title || "";
    liveStreamUrl.value = data.stream_url || "";
    liveThumbnailUrl.value = data.thumbnail_url || "";
  }

  if (livePlatform) {
    livePlatform.addEventListener("change", () => {
      if (livePlatform.value === "instagram" && liveStreamUrl.value.includes("youtube.com")) {
        liveStreamUrl.value = "https://www.instagram.com/tech_it_isii/live/";
      } else if (livePlatform.value === "youtube" && liveStreamUrl.value.includes("instagram.com")) {
        liveStreamUrl.value = "https://www.youtube.com/@TechItISII/live";
      }
    });
  }

  if (liveStatusForm) {
    liveStatusForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { data: { user } } = await client.auth.getUser();
      const payload = {
        id: "main",
        is_live: liveIsActive.checked,
        platform: livePlatform.value,
        title: liveTitle.value.trim(),
        stream_url: liveStreamUrl.value.trim(),
        thumbnail_url: liveThumbnailUrl.value.trim() || null,
        updated_by: user ? H.getDisplayName(user, currentProfile) : "team",
        updated_at: new Date().toISOString()
      };
      const { error } = await client.from("live_status").upsert(payload);
      if (error) {
        showFeedback(dashFeedback, `Live status error: ${error.message}`, true);
        return;
      }
      showFeedback(
        dashFeedback,
        liveIsActive.checked
          ? `🔴 LIVE MODE ACTIVE (${livePlatform.value.toUpperCase()})! Home page updated.`
          : "Live mode turned OFF. Home page returned to Latest News.",
        false
      );
    });
  }

  // Profile & 2FA Security Tab
  async function loadProfileAndMfa() {
    const { data: { user } } = await client.auth.getUser();
    if (user && profileDisplayName) {
      currentProfile = await H.getUserProfile(client, user);
      profileDisplayName.value = H.getDisplayName(user, currentProfile);
    }
    await loadMfaStatus();
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const displayName = profileDisplayName.value.trim();
      const newPassword = profileNewPassword.value;

      const updatePayload = {
        data: { display_name: displayName }
      };
      if (newPassword) {
        updatePayload.password = newPassword;
      }

      const { data, error } = await client.auth.updateUser(updatePayload);
      if (error) {
        showFeedback(dashFeedback, `Profile update error: ${error.message}`, true);
        return;
      }

      if (data?.user) {
        await client.from("profiles").update({ display_name: displayName }).eq("id", data.user.id);
        currentProfile = await H.getUserProfile(client, data.user);
        const isAdmin = currentProfile.role === "admin";
        adminUserPill.textContent = `● ${isAdmin ? "ADMIN" : "INSIDER"} · ${H.getDisplayName(data.user, currentProfile)}`;
      }

      profileNewPassword.value = "";
      if (window.refreshTechItNavAuth) await window.refreshTechItNavAuth();
      showFeedback(dashFeedback, "Profile & account settings saved!", false);
    });
  }

  async function loadMfaStatus() {
    const { data: factors } = await client.auth.mfa.listFactors();
    const verified = (factors?.totp || []).filter(f => f.status === "verified");
    if (verified.length > 0) {
      mfaStatusText.innerHTML = "✅ <strong>2FA (TOTP) is ACTIVE</strong> on this account.";
      enrollMfaBtn.style.display = "none";
      if (reconfigureMfaBtn) reconfigureMfaBtn.style.display = "inline-flex";
      mfaEnrollBox.style.display = "none";
    } else {
      mfaStatusText.innerHTML = "⚠️ <strong>2FA is NOT enabled yet.</strong> Enable it below.";
      enrollMfaBtn.style.display = "inline-flex";
      if (reconfigureMfaBtn) reconfigureMfaBtn.style.display = "none";
    }
  }

  const startProfileEnroll = async () => {
    await cleanupUnverifiedTotp();
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `TechItISII-${Date.now()}`
    });
    if (error || !data) {
      showFeedback(dashFeedback, `2FA setup error: ${error?.message || "Unknown error"}`, true);
      return;
    }
    enrollingFactorId = data.id;
    mfaQrContainer.innerHTML = `<img src="${data.totp.qr_code}" alt="2FA QR Code" />`;
    if (data.totp.secret && mfaProfileSecret && mfaProfileSecretWrap) {
      mfaProfileSecret.textContent = data.totp.secret;
      mfaProfileSecretWrap.style.display = "flex";
    }
    mfaEnrollBox.style.display = "flex";
    enrollMfaBtn.style.display = "none";
    if (reconfigureMfaBtn) reconfigureMfaBtn.style.display = "none";
  };

  enrollMfaBtn.addEventListener("click", startProfileEnroll);

  if (reconfigureMfaBtn) {
    reconfigureMfaBtn.addEventListener("click", async () => {
      if (!confirm("Reset your current 2FA Authenticator and generate a new QR code?")) return;
      const { data: factors } = await client.auth.mfa.listFactors();
      for (const f of factors?.totp || []) {
        await client.auth.mfa.unenroll({ factorId: f.id });
      }
      await startProfileEnroll();
    });
  }

  verifyEnrollBtn.addEventListener("click", async () => {
    const code = mfaEnrollCode.value.trim();
    if (!enrollingFactorId || !code) return;
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId: enrollingFactorId,
      code
    });
    if (error) {
      showFeedback(dashFeedback, `Verification failed: ${error.message}`, true);
      return;
    }
    showFeedback(dashFeedback, "2FA is now active on your account!", false);
    await loadMfaStatus();
  });

  await checkSessionAndAal();
});
