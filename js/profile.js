(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", async () => {
    const config = window.FAN_SITE_SUPABASE_CONFIG;
    const message = document.getElementById("profile-message");
    const form = document.getElementById("profile-form");
    const nameInput = document.getElementById("display-name");
    const emailInput = document.getElementById("email");
    const fileInput = document.getElementById("avatar-file");
    const avatarPreview = document.getElementById("avatar-preview");
    const saveButton = document.getElementById("save-profile");
    const logoutButton = document.getElementById("logout-button");
    let client, user, avatarUrl = "", previewObjectUrl = "";

    function say(text, isError) {
      message.textContent = text;
      message.className = "mt-5 text-sm " + (isError ? "text-red-600" : "text-gray-600");
    }
    function setBusy(value) {
      saveButton.disabled = value;
      logoutButton.disabled = value;
    }
    if (!config || !window.supabase || !window.supabase.createClient) {
      say("认证服务尚未配置，请检查 js/supabase-config.js。", true);
      setBusy(true);
      return;
    }
    client = window.supabase.createClient(config.url, config.publishableKey);
    const sessionResult = await client.auth.getSession();
    user = sessionResult.data && sessionResult.data.session && sessionResult.data.session.user;
    if (!user) {
      window.location.replace("./auth.html?redirect=profile");
      return;
    }
    emailInput.value = user.email || "";
    const { data: profile, error } = await client.from("profiles").select("user_id,display_name,avatar_url").eq("user_id", user.id).maybeSingle();
    if (error) {
      say("无法读取个人资料。请先在 Supabase SQL Editor 执行最新的 supabase/schema.sql。", true);
      console.error("Profile load failed:", error.message);
    } else {
      nameInput.value = profile && profile.display_name ? profile.display_name : (user.user_metadata && user.user_metadata.display_name) || "粉丝";
      avatarUrl = profile && profile.avatar_url ? profile.avatar_url : "";
      if (avatarUrl) avatarPreview.src = avatarUrl;
    }
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
        fileInput.value = "";
        say("请选择 PNG、JPG 或 WebP 图片，且大小不超过 2 MB。", true);
        return;
      }
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = URL.createObjectURL(file);
      avatarPreview.src = previewObjectUrl;
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!nameInput.value.trim()) {
        say("昵称不能为空。", true);
        return;
      }
      setBusy(true);
      try {
        const file = fileInput.files && fileInput.files[0];
        let nextAvatarUrl = avatarUrl;
        if (file) {
          const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
          const path = user.id + "/" + Date.now() + "." + extension;
          const upload = await client.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
          if (upload.error) throw upload.error;
          const publicResult = client.storage.from("avatars").getPublicUrl(path);
          nextAvatarUrl = publicResult.data.publicUrl;
        }
        const { error: saveError } = await client.from("profiles").upsert({
          user_id: user.id,
          display_name: nameInput.value.trim(),
          avatar_url: nextAvatarUrl || null,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
        if (saveError) throw saveError;
        avatarUrl = nextAvatarUrl;
        fileInput.value = "";
        say("个人资料已保存。", false);
      } catch (error) {
        say(error.message || "保存失败，请稍后重试。", true);
      } finally {
        setBusy(false);
      }
    });
    logoutButton.addEventListener("click", async () => {
      setBusy(true);
      try {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) throw signOutError;
        window.location.replace("./index.html");
      } catch (error) {
        say(error.message || "退出登录失败，请重试。", true);
        setBusy(false);
      }
    });
  });
})();