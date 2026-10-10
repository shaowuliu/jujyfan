(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", async () => {
    const config = window.FAN_SITE_SUPABASE_CONFIG;
    const message = document.getElementById("auth-message");
    const requestForm = document.getElementById("request-code-form");
    const verifyForm = document.getElementById("verify-code-form");
    const emailInput = document.getElementById("email");
    const tokenInput = document.getElementById("token");
    const sendButton = document.getElementById("send-code");
    const verifyButton = document.getElementById("verify-code");
    const resendButton = document.getElementById("resend-code");
    let pendingEmail = "";
    let busy = false;

    function say(text, isError) {
      message.textContent = text;
      message.className = "mt-5 text-sm text-center " + (isError ? "text-red-600" : "text-gray-600");
    }
    function setBusy(value) {
      busy = value;
      [sendButton, verifyButton, resendButton].forEach((button) => { button.disabled = value; });
    }
    function safeRedirect() {
      const value = new URLSearchParams(window.location.search).get("redirect");
      return value === "home" ? "./index.html" : "./profile.html";
    }
    if (!config || !window.supabase || !window.supabase.createClient) {
      say("认证服务尚未配置，请检查 js/supabase-config.js。", true);
      setBusy(true);
      return;
    }
    const client = window.supabase.createClient(config.url, config.publishableKey);
    const existing = await client.auth.getSession();
    if (existing.data && existing.data.session) {
      window.location.replace("./profile.html");
      return;
    }
    async function sendCode() {
      if (busy) return;
      const email = emailInput.value.trim();
      if (!email || !emailInput.checkValidity()) {
        say("请输入有效的邮箱地址。", true);
        emailInput.focus();
        return;
      }
      setBusy(true);
      try {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true }
        });
        if (error) throw error;
        pendingEmail = email;
        emailInput.value = email;
        emailInput.readOnly = true;
        verifyForm.hidden = false;
        say("验证码已发送到 " + email + "。请输入邮件中的验证码；验证码邮件模板需配置为发送数字验证码。", false);
        tokenInput.focus();
      } catch (error) {
        say(error.message || "发送验证码失败，请稍后重试。", true);
      } finally {
        setBusy(false);
      }
    }
    requestForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await sendCode();
    });
    resendButton.addEventListener("click", sendCode);
    verifyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;
      const token = tokenInput.value.trim();
      if (!pendingEmail || !/^[0-9]{6,10}$/.test(token)) {
        say("请输入邮件中的有效数字验证码。", true);
        tokenInput.focus();
        return;
      }
      setBusy(true);
      try {
        const { error } = await client.auth.verifyOtp({ email: pendingEmail, token, type: "email" });
        if (error) throw error;
        say("验证成功，正在进入个人中心…", false);
        window.location.replace(safeRedirect());
      } catch (error) {
        say(error.message || "验证码无效或已过期，请重新获取。", true);
      } finally {
        setBusy(false);
      }
    });
  });
})();