# 邮箱登录与留言功能部署说明

本项目使用 GitHub Pages 托管静态页面，使用 Supabase 提供邮箱密码认证和 PostgreSQL 数据库。GitHub 仓库不保存用户密码或数据库密钥。

## 1. 创建 Supabase 项目

1. 打开 https://supabase.com/ 并创建一个项目。
2. 进入项目的 **SQL Editor**。
3. 打开本仓库的 `supabase/schema.sql`，复制全部 SQL 并执行。
4. 在 **Project Settings / API Keys** 中找到 Project URL 和 **Publishable key**（或旧项目的 anon public key）。

## 2. 配置前端

编辑 `js/supabase-config.js`，替换这两个占位值：

- `url`：你的 Supabase Project URL。
- `publishableKey`：Supabase Publishable key。

不要把 Supabase **Secret key** 或旧的 `service_role` key 放进前端文件。Publishable key 可用于浏览器，但必须与本项目的 RLS 策略一起使用。

## 3. 配置邮箱认证

在 Supabase Dashboard 的 **Authentication / Providers** 中确认 Email provider 已启用。

建议保留邮箱验证。然后在 **Authentication / URL Configuration** 中设置：

- **Site URL**：网站实际访问地址，例如 `https://shaowuliu.github.io/jujyfan/`（如果你使用自定义域名，请改成实际域名）。
- **Redirect URLs**：加入对应网站地址，例如 `https://shaowuliu.github.io/jujyfan/**`，并按需要添加本地测试地址。

如果邮箱验证邮件无法跳回网站，优先检查 Site URL、Redirect URLs 和邮件模板设置。

## 4. 启用 GitHub Pages

在 GitHub 仓库进入 **Settings / Pages**，选择从 `main` 分支的根目录发布。若仓库已经配置了 Pages，合并本功能分支后等待部署完成即可。

注意：功能分支上的代码不会自动替换主站。需要先审核并合并对应 Pull Request，之后才会部署到 main（前提是 Pages 已按上述方式配置）。

## 5. 验收步骤

1. 未登录打开网站：能看到留言列表，但留言框不可输入，发表按钮不可用。
2. 使用有效邮箱注册：如果开启邮箱验证，页面提示查收验证邮件。
3. 完成邮箱验证后，使用邮箱和密码登录。
4. 发布一条留言，确认页面显示昵称形式的匿名标识、内容和时间。
5. 刷新页面或换一个浏览器窗口：留言仍然存在。
6. 退出登录：留言列表仍可查看，但无法发表新留言。
7. 使用包含 `<script>` 或 HTML 标签的文本留言：页面应把它显示为普通文字，而不是执行 HTML。
8. 在 Supabase 的 Table Editor 中检查 `fan_comments` 表，确认每条留言都有对应的 `user_id`。

## 当前版本的范围

- 支持邮箱注册、登录、退出登录。
- 所有访客可读公开留言；只有已登录用户可发表留言。
- 留言按时间倒序展示，最多读取最近 100 条。
- 不包含留言编辑、删除、点赞、管理员审核、找回密码和实时推送。
