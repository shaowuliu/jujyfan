/*
 * 将下方两个占位值替换为 Supabase 项目的 Project URL 和 Publishable key。
 * 这里的 publishable key 会出现在浏览器中；绝不能填入 secret/service_role key。
 * 具体步骤见仓库根目录的 AUTH_SETUP.md。
 */
window.FAN_SITE_SUPABASE_CONFIG = {
    url: "https://epzfysgktuuumuxsexyb.supabase.co",
    publishableKey: "sb_publishable_vsH-zLSRtZqZ-a_ldVRHPQ_D1J6vm49"
};

/*
 * 图片永久化修复（2026-11-25）
 * 原抖音签名图片链接（x-expires=1780208448）已过期并返回 403，导致全站图片裂开。
 * 这里在运行时把它们替换为 Wikimedia Commons 上公开授权（CC BY 2.5）的鞠婧祎照片永久外链；
 * 若外链加载失败，则降级为内联 SVG 占位图，避免出现碎图。
 */
(function () {
    "use strict";

    var REPLACEMENTS = [
        ["277f1a09ba886611b820a6bb3cd74ad4", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/%E5%92%AA%E5%92%95%E9%9F%B3%E4%B9%90%E7%9B%9B%E5%85%B8_%284%29.jpg/600px-%E5%92%AA%E5%92%95%E9%9F%B3%E4%B9%90%E7%9B%9B%E5%85%B8_%284%29.jpg"],
        ["54c0dd6279433988cf541c3c35f90a7b", "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/%E9%9E%A0%E5%A9%A7%E7%A5%8E_%286%29.jpg/600px-%E9%9E%A0%E5%A9%A7%E7%A5%8E_%286%29.jpg"],
        ["2b4100b0eb62453e87a87da56dc0ebba", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Cast_of_Novoland_Castle_in_the_Sky_in_2016.png/600px-Cast_of_Novoland_Castle_in_the_Sky_in_2016.png"],
        ["15229df02170e25ce5dbd32fa31e7b1d", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/%E9%9E%A0%E5%A9%A7%E7%A5%8E_%282%29.jpg/600px-%E9%9E%A0%E5%A9%A7%E7%A5%8E_%282%29.jpg"],
        ["5b8e58c3c65b4c01ad95dab15c603694", "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/%E5%92%AA%E5%92%95%E9%9F%B3%E4%B9%90%E7%9B%9B%E5%85%B8_%285%29.jpg/600px-%E5%92%AA%E5%92%95%E9%9F%B3%E4%B9%90%E7%9B%9B%E5%85%B8_%285%29.jpg"],
        ["3b13a04cc060d927eefdaecd26d613b7", "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/%E9%9E%A0%E5%A9%A7%E7%A5%8E_%283%29.jpg/600px-%E9%9E%A0%E5%A9%A7%E7%A5%8E_%283%29.jpg"],
        ["0030dd7be15b4b1ce5d18a8ea2cc999b", "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Snh48%E9%9E%A0%E5%A9%A7%E7%A5%8E_%281%29.jpg/600px-Snh48%E9%9E%A0%E5%A9%A7%E7%A5%8E_%281%29.jpg"],
        ["38470ab57fa6eb3c412c9e0ad0408eef", "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Ju_Jing_Yi_27th.jpg/600px-Ju_Jing_Yi_27th.jpg"],
        ["98a13ea50ea543fc97129463ee9e6693", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/%E9%9E%A0%E5%A9%A7%E7%A5%8E_%285%29.jpg/600px-%E9%9E%A0%E5%A9%A7%E7%A5%8E_%285%29.jpg"],
        ["ef7827839ec6260a3d75aba2a086d204", "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Snh48%E9%9E%A0%E5%A9%A7%E7%A5%8E_%283%29.jpg/600px-Snh48%E9%9E%A0%E5%A9%A7%E7%A5%8E_%283%29.jpg"],
    ];

    var SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'>" +
        "<rect width='100%' height='100%' fill='#FFF0F3'/>" +
        "<text x='50%' y='50%' font-size='52' fill='#FF6B8B' " +
        "text-anchor='middle' dominant-baseline='middle'>" +
        "鞠婧祎 - 图片加载中</text></svg>";
    var PLACEHOLDER = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG);

    function fixImages() {
        var imgs = document.querySelectorAll("img");
        for (var i = 0; i < imgs.length; i++) {
            (function (img) {
                var src = img.getAttribute("src") || "";
                for (var k = 0; k < REPLACEMENTS.length; k++) {
                    if (src.indexOf(REPLACEMENTS[k][0]) !== -1) {
                        img.setAttribute("src", REPLACEMENTS[k][1]);
                        break;
                    }
                }
                img.addEventListener("error", function () {
                    if (!img.dataset.fallbackApplied) {
                        img.dataset.fallbackApplied = "1";
                        img.setAttribute("src", PLACEHOLDER);
                    }
                });
            })(imgs[i]);
        }

        var hero = document.querySelector(".hero-bg");
        if (hero) {
            var bg = window.getComputedStyle(hero).backgroundImage;
            for (var j = 0; j < REPLACEMENTS.length; j++) {
                if (bg.indexOf(REPLACEMENTS[j][0]) !== -1) {
                    hero.style.backgroundImage = "url('" + REPLACEMENTS[j][1] + "')";
                    break;
                }
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fixImages);
    } else {
        fixImages();
    }
})();
