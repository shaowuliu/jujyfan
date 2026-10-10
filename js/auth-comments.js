/* Persistent public comments using Supabase Auth and profile display data. */
(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", () => {
    const statusEl = document.getElementById("auth-status");
    const accountLink = document.getElementById("account-link");
    const mobileAccountLink = document.getElementById("mobile-account-link");
    const commentAuthLink = document.getElementById("comment-auth-link");
    const commentInput = document.getElementById("comment-input");
    const postCommentButton = document.getElementById("post-comment");
    const commentHint = document.getElementById("comment-hint");
    const commentsList = document.getElementById("comments-list");
    const config = window.FAN_SITE_SUPABASE_CONFIG;
    const configReady = config && typeof config.url === "string" &&
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url) &&
      typeof config.publishableKey === "string" && config.publishableKey.length > 20 &&
      !config.publishableKey.includes("REPLACE_ME");

    function message(text, className) {
      const el = document.createElement("p");
      el.className = className || "text-gray-500";
      el.textContent = text;
      return el;
    }
    function setStatus(text, isError) {
      statusEl.textContent = text;
      statusEl.className = "text-sm " + (isError ? "text-red-600" : "text-gray-700");
    }
    if (!configReady || !window.supabase || !window.supabase.createClient) {
      setStatus("用户服务暂不可用。", true);
      postCommentButton.disabled = true;
      commentInput.disabled = true;
      commentsList.replaceChildren(message("留言服务尚未配置。"));
      return;
    }

    const client = window.supabase.createClient(config.url, config.publishableKey);
    let currentUser = null;
    let busy = false;

    function updateAuthUI(user) {
      currentUser = user || null;
      const signedIn = Boolean(currentUser);
      commentInput.disabled = !signedIn || busy;
      postCommentButton.disabled = !signedIn || busy;
      commentHint.textContent = signedIn
        ? "你已登录，可以发表评论。留言公开展示，请勿填写个人敏感信息。"
        : "留言公开可见；发表留言前请先使用邮箱验证码登录。";
      commentInput.placeholder = signedIn
        ? "写下你对鞠婧祎的祝福或支持（最多 1000 字）..."
        : "请先登录后留言（最多 1000 字）";
      const target = signedIn ? "./profile.html" : "./auth.html?redirect=profile";
      const label = signedIn ? "个人中心" : "登录";
      [accountLink, mobileAccountLink].forEach((link) => {
        if (!link) return;
        link.href = target;
        link.textContent = label;
      });
      commentAuthLink.href = target;
      commentAuthLink.textContent = signedIn ? "管理个人资料" : "邮箱验证码登录";
      setStatus(signedIn ? "当前已登录：" + (currentUser.email || "邮箱账户") : "登录后即可发表留言；访客仍可查看公开留言。");
    }

    function formatDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "时间未知";
      return date.toLocaleString("zh-CN", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    }

    async function loadComments() {
      commentsList.replaceChildren(message("正在加载留言..."));
      const { data, error } = await client.from("fan_comments")
        .select("id,user_id,content,created_at").order("created_at", { ascending:false }).limit(100);
      if (error) {
        commentsList.replaceChildren(message("暂时无法加载留言。请确认 Supabase 数据库配置。", "text-red-600"));
        console.error("Failed to load comments:", error.message);
        return;
      }
      const userIds = Array.from(new Set((data || []).map((row) => row.user_id).filter(Boolean)));
      let profilesById = {};
      if (userIds.length) {
        const profileResult = await client.from("profiles").select("user_id,display_name,avatar_url").in("user_id", userIds);
        if (!profileResult.error) {
          (profileResult.data || []).forEach((profile) => { profilesById[profile.user_id] = profile; });
        } else {
          console.warn("Profile display data unavailable:", profileResult.error.message);
        }
      }
      commentsList.replaceChildren();
      if (!data || !data.length) {
        commentsList.appendChild(message("还没有留言。登录后发表第一条吧。"));
        return;
      }
      data.forEach((row) => {
        const profile = profilesById[row.user_id] || {};
        const item = document.createElement("article");
        item.className = "flex gap-4";
        const avatar = document.createElement("img");
        avatar.className = "w-10 h-10 rounded-full object-cover flex-shrink-0 bg-light";
        avatar.alt = "";
        avatar.src = profile.avatar_url || "./assets/default-avatar.svg";
        avatar.onerror = () => { avatar.onerror = null; avatar.src = "./assets/default-avatar.svg"; };
        const body = document.createElement("div");
        body.className = "flex-1 min-w-0";
        const header = document.createElement("div");
        header.className = "flex flex-wrap justify-between items-center gap-2 mb-1";
        const author = document.createElement("span");
        author.className = "font-medium";
        author.textContent = profile.display_name || ("粉丝" + String(row.user_id || "").slice(0, 6));
        const date = document.createElement("time");
        date.className = "text-sm text-gray-500";
        date.dateTime = row.created_at || "";
        date.textContent = formatDate(row.created_at);
        header.append(author, date);
        const content = document.createElement("p");
        content.className = "text-gray-700 whitespace-pre-wrap break-words";
        content.textContent = row.content;
        body.append(header, content);
        item.append(avatar, body);
        commentsList.appendChild(item);
      });
    }

    postCommentButton.addEventListener("click", async () => {
      if (busy) return;
      const content = commentInput.value.trim();
      if (!content) {
        setStatus("留言内容不能为空。", true);
        commentInput.focus();
        return;
      }
      if (content.length > 1000) {
        setStatus("留言不能超过 1000 字。", true);
        return;
      }
      busy = true;
      updateAuthUI(currentUser);
      try {
        const { data: userResult, error: userError } = await client.auth.getUser();
        if (userError || !userResult.user) {
          updateAuthUI(null);
          throw new Error("登录状态已失效，请重新登录后留言。");
        }
        const { error } = await client.from("fan_comments").insert({ user_id:userResult.user.id, content });
        if (error) throw error;
        commentInput.value = "";
        setStatus("留言发表成功。");
        await loadComments();
      } catch (error) {
        setStatus(error.message || "留言发表失败，请稍后重试。", true);
      } finally {
        busy = false;
        updateAuthUI(currentUser);
      }
    });

    client.auth.onAuthStateChange((_event, session) => updateAuthUI(session ? session.user : null));
    (async () => {
      const { data, error } = await client.auth.getSession();
      if (error) setStatus("读取登录状态失败，请刷新页面重试。", true);
      updateAuthUI(data && data.session ? data.session.user : null);
      await loadComments();
    })();
  });
})();