/* Email authentication and persistent public comments for the fan site. */
(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const statusEl = document.getElementById("auth-status");
        const emailInput = document.getElementById("auth-email");
        const passwordInput = document.getElementById("auth-password");
        const signupButton = document.getElementById("auth-signup");
        const loginButton = document.getElementById("auth-login");
        const logoutButton = document.getElementById("auth-logout");
        const commentInput = document.getElementById("comment-input");
        const postCommentButton = document.getElementById("post-comment");
        const commentHint = document.getElementById("comment-hint");
        const commentsList = document.getElementById("comments-list");

        const config = window.FAN_SITE_SUPABASE_CONFIG;
        const configReady = config &&
            typeof config.url === "string" &&
            /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url) &&
            typeof config.publishableKey === "string" &&
            config.publishableKey.length > 20 &&
            !config.publishableKey.includes("REPLACE_ME");

        if (!configReady || !window.supabase || typeof window.supabase.createClient !== "function") {
            statusEl.textContent = "用户服务尚未配置。请按 AUTH_SETUP.md 完成 Supabase 配置后再使用注册、登录和留言功能。";
            signupButton.disabled = true;
            loginButton.disabled = true;
            postCommentButton.disabled = true;
            commentInput.disabled = true;
            commentsList.replaceChildren(createMessage("留言服务尚未配置。"));
            return;
        }

        const client = window.supabase.createClient(config.url, config.publishableKey);
        let currentUser = null;
        let busy = false;

        function createMessage(text, className = "text-gray-500") {
            const message = document.createElement("p");
            message.className = className;
            message.textContent = text;
            return message;
        }

        function setStatus(message, isError = false) {
            statusEl.textContent = message;
            statusEl.className = isError ? "mb-4 text-sm text-red-600" : "mb-4 text-sm text-gray-700";
        }

        function setBusy(value) {
            busy = value;
            [signupButton, loginButton, logoutButton, postCommentButton].forEach((button) => {
                button.disabled = value || (button === postCommentButton && !currentUser);
            });
        }

        function updateAuthUI(user) {
            currentUser = user || null;
            const signedIn = Boolean(currentUser);
            emailInput.disabled = signedIn;
            passwordInput.disabled = signedIn;
            signupButton.hidden = signedIn;
            loginButton.hidden = signedIn;
            logoutButton.hidden = !signedIn;
            commentInput.disabled = !signedIn;
            postCommentButton.disabled = !signedIn || busy;
            commentHint.textContent = signedIn
                ? "你已登录，可以发表留言。留言公开展示，请勿填写个人敏感信息。"
                : "登录后即可发表留言，所有访客都可以查看。";
            commentInput.placeholder = signedIn
                ? "写下你对鞠婧祎的祝福或支持（最多 1000 字）..."
                : "请先登录后留言（最多 1000 字）";
            if (signedIn) {
                setStatus("已登录：" + currentUser.email);
            } else {
                setStatus("尚未登录。可使用邮箱注册或登录；访客仍可查看公开留言。");
            }
        }

        function formatDate(value) {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "时间未知";
            return date.toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        function renderComments(rows) {
            commentsList.replaceChildren();
            if (!rows || rows.length === 0) {
                commentsList.appendChild(createMessage("还没有留言。登录后发表第一条吧。"));
                return;
            }

            rows.forEach((row) => {
                const item = document.createElement("article");
                item.className = "flex gap-4";

                const avatar = document.createElement("div");
                avatar.className = "w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0";
                avatar.setAttribute("aria-hidden", "true");
                const avatarText = document.createElement("span");
                avatarText.className = "font-medium";
                avatarText.textContent = "粉";
                avatar.appendChild(avatarText);

                const body = document.createElement("div");
                body.className = "flex-1 min-w-0";

                const header = document.createElement("div");
                header.className = "flex flex-wrap justify-between items-center gap-2 mb-1";
                const author = document.createElement("span");
                author.className = "font-medium";
                author.textContent = "粉丝" + String(row.user_id || "").slice(0, 6);
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

        async function loadComments() {
            commentsList.replaceChildren(createMessage("正在加载留言..."));
            const { data, error } = await client
                .from("fan_comments")
                .select("id, user_id, content, created_at")
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) {
                commentsList.replaceChildren(createMessage(
                    "暂时无法加载留言。请确认已执行 supabase/schema.sql，并检查 Supabase 配置。",
                    "text-red-600"
                ));
                console.error("Failed to load comments:", error.message);
                return;
            }
            renderComments(data);
        }

        function readCredentials() {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            if (!email || !emailInput.checkValidity()) {
                setStatus("请输入有效的邮箱地址。", true);
                emailInput.focus();
                return null;
            }
            if (password.length < 8) {
                setStatus("密码至少需要 8 位。", true);
                passwordInput.focus();
                return null;
            }
            return { email, password };
        }

        signupButton.addEventListener("click", async () => {
            if (busy) return;
            const credentials = readCredentials();
            if (!credentials) return;
            setBusy(true);
            try {
                const { data, error } = await client.auth.signUp(credentials);
                if (error) throw error;
                if (data.session) {
                    updateAuthUI(data.user);
                    setStatus("注册成功，已登录。");
                } else {
                    setStatus("注册请求已提交。请查收邮箱并完成验证，然后再登录。");
                }
            } catch (error) {
                setStatus(error.message || "注册失败，请稍后重试。", true);
            } finally {
                setBusy(false);
                postCommentButton.disabled = !currentUser;
            }
        });

        loginButton.addEventListener("click", async () => {
            if (busy) return;
            const credentials = readCredentials();
            if (!credentials) return;
            setBusy(true);
            try {
                const { data, error } = await client.auth.signInWithPassword(credentials);
                if (error) throw error;
                updateAuthUI(data.user);
                setStatus("登录成功。");
            } catch (error) {
                setStatus(error.message || "登录失败，请检查邮箱和密码。", true);
            } finally {
                setBusy(false);
                postCommentButton.disabled = !currentUser;
            }
        });

        logoutButton.addEventListener("click", async () => {
            if (busy) return;
            setBusy(true);
            try {
                const { error } = await client.auth.signOut();
                if (error) throw error;
                updateAuthUI(null);
                passwordInput.value = "";
                setStatus("已退出登录。");
            } catch (error) {
                setStatus(error.message || "退出登录失败，请重试。", true);
            } finally {
                setBusy(false);
                postCommentButton.disabled = !currentUser;
            }
        });

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

            setBusy(true);
            try {
                const { data: userResult, error: userError } = await client.auth.getUser();
                if (userError || !userResult.user) {
                    updateAuthUI(null);
                    throw new Error("登录状态已失效，请重新登录后留言。");
                }

                const { error } = await client.from("fan_comments").insert({
                    user_id: userResult.user.id,
                    content
                });
                if (error) throw error;

                commentInput.value = "";
                setStatus("留言发表成功。");
                await loadComments();
            } catch (error) {
                setStatus(error.message || "留言发表失败，请稍后重试。", true);
            } finally {
                setBusy(false);
                postCommentButton.disabled = !currentUser;
            }
        });

        client.auth.onAuthStateChange((_event, session) => {
            updateAuthUI(session ? session.user : null);
        });

        (async () => {
            const { data, error } = await client.auth.getSession();
            if (error) {
                setStatus("读取登录状态失败，请刷新页面重试。", true);
            } else {
                updateAuthUI(data.session ? data.session.user : null);
            }
            await loadComments();
        })();
    });
})();
