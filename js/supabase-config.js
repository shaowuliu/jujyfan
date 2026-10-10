/*
 * 将下方两个占位值替换为 Supabase 项目的 Project URL 和 Publishable key。
 * 这里的 publishable key 会出现在浏览器中；绝不能填入 secret/service_role key。
 * 具体步骤见仓库根目录的 AUTH_SETUP.md。
 */
window.FAN_SITE_SUPABASE_CONFIG = {
    url: "https://YOUR_PROJECT_REF.supabase.co",
    publishableKey: "sb_publishable_REPLACE_ME"
};
