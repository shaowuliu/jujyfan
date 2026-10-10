# 邮箱验证码登录、个人中心与留言部署说明

本项目使用 GitHub Pages 托管静态页面，使用 Supabase Auth 提供邮箱验证码认证，使用 PostgreSQL 保存公开留言和公开资料字段。网站不要求用户设置密码；邮箱地址保存在 Supabase Auth 中，不写入公开的 profiles 表。

## 1. 更新 Supabase 数据库

1. 打开 Supabase Dashboard -> SQL Editor。
2. 打开本仓库最新的 `supabase/schema.sql`，复制全部内容并执行。
3. 此脚本会新增 `profiles` 表、头像存储桶和对应 RLS 策略，并为已有账号补充资料记录；不会删除或重建已有的 `fan_comments` 数据。
4. `profiles` 仅包含 user_id、display_name、avatar_url、updated_at。公开读取仅用于展示评论作者昵称和头像；用户只能新增或修改自己的资料。
5. 头像限制为 PNG/JPG/WebP，最大 2 MB，上传路径限定在当前用户 UID 文件夹下。

## 2. 配置前端

`js/supabase-config.js` 中的 Project URL 和 Publishable key 可出现在浏览器中。不要把 Supabase Secret key 或旧的 service_role key 放入前端。数据库安全依赖 RLS 和 Storage policies。

## 3. 配置邮箱验证码（重要）

在 Supabase Dashboard 的 Authentication / Providers / Email 中确认 Email provider 已启用。

在 Authentication / Email Templates 中，将 **Magic Link / Confirm signup** 等实际用于 OTP 的邮件模板正文配置为包含验证码变量 `{{ .Token }}`，例如：

```
你的鞠婧祎应援站登录验证码是：{{ .Token }}
验证码短时间内有效，请勿转发给他人。
```

邮箱验证码登录通过 `signInWithOtp` 发送验证码，再用 `verifyOtp({ email, token, type: "email" })` 验证。如果模板仍只呈现登录链接而没有 `{{ .Token }}`，用户将收不到可输入的数字验证码。可在 Supabase 的 Auth rate limits 中检查邮件发送频率限制。

在 Authentication / URL Configuration 中设置：
- **Site URL**：实际站点地址，例如 `https://shaowuliu.github.io/jujyfan/`。
- **Redirect URLs**：加入 `https://shaowuliu.github.io/jujyfan/**`（如使用自定义域名，请改为实际域名）。

## 4. 页面功能

- 首页不再展开登录/注册表单；导航栏提供登录或个人中心入口。
- `auth.html`：邮箱 + 一次性验证码登录，首次验证时自动创建账户，无需密码。
- `profile.html`：查看邮箱、修改昵称、上传头像、退出登录。
- 首页公开留言仍保留，未登录访客可查看，登录用户可发表留言。
- 评论作者展示 profiles 中的昵称和头像；历史留言记录保留不变，没有资料的旧账号使用默认昵称/头像。
- 评论内容使用 textContent 渲染；留言表的 RLS 仍限制登录用户只能以自己的 UID 插入留言。

## 5. 验收清单

1. 首页顶部不出现邮箱/验证码输入表单，只显示“登录”或“个人中心”入口。
2. 输入邮箱后收到数字验证码；输入验证码后进入个人中心。
3. 首次登录后账户自动创建，无需密码。
4. 修改昵称并保存后，个人中心能显示更新后的昵称。
5. 上传头像后刷新页面，头像仍然存在。
6. 首页历史留言仍在；新留言展示用户昵称与头像。
7. 退出登录后仍可查看留言，但不能发表留言。
8. 使用访客账号访问数据库时不能修改他人资料，也不能以他人 UID 发表留言。
