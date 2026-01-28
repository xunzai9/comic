class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.4.8";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9"
        };
    }

    // 辅助工具：清洗并转义字符串
    clean(str) {
        if (!str) return "";
        var s = str.replace(/\\/g, ""); // 移除所有反斜杠
        try {
            // 处理可能存在的 Unicode 编码 (\uXXXX)
            return s.replace(/\\u([0-9a-fA-F]{4})/g, function(match, grp) {
                return String.fromCharCode(parseInt(grp, 16));
            });
        } catch (e) {
            return s;
        }
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                try {
                    var res = await Network.get(this.url + "/update", this.getHeaders());
                    var html = (typeof res === 'object') ? res.data : res;
                    var comics = [];

                    // 1. 静态 HTML 匹配 (适配 itemBox)
                    var itemRegex = /<div class="itemBox">([\s\S]*?)<\/div>/g;
                    var m;
                    while ((m = itemRegex.exec(html)) !== null) {
                        var box = m[1];
                        var link = /href="([^"]+)"[^>]*title="([^"]+)"/.exec(box);
                        var img = /<img[^>]+src="([^"]+)"/.exec(box);
                        if (link && link[1].includes("/comic/")) {
                            comics.push({
                                id: this.clean(link[1]),
                                title: this.clean(link[2]),
                                cover: img ? this.clean(img[1]) : ""
                            });
                        }
                    }

                    // 2. 备用：脚本变量匹配 (适配 qTcmsWapTop)
                    if (comics.length === 0) {
                        var scriptRegex = /\{"url":"([^"]+?)","name":"([^"]+?)"(?:,"pic":"([^"]+?)")?\}/g;
                        while ((m = scriptRegex.exec(html)) !== null) {
                            var rawUrl = this.clean(m[1]);
                            if (rawUrl.includes("/comic/")) {
                                comics.push({
                                    id: rawUrl,
                                    title: this.clean(m[2]),
                                    cover: m[3] ? this.clean(m[3]) : ""
                                });
                            }
                        }
                    }
                    return [{ title: "最新更新", comics: comics }];
                } catch (e) {
                    return [{ title: "最新更新", comics: [] }];
                }
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            var res = await Network.get(this.url + id, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var title = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
            var chapters = [];
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(html)) !== null) {
                chapters.push({
                    id: this.clean(m[1]),
                    title: this.clean(m[2].replace(/<[^>]+>/g, "").trim())
                });
            }
            return { title: title ? this.clean(title[1]) : "详情", chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            var res = await Network.get(this.url + epId, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var images = [];
            // 注意：该站正文图片通常在大图域名下
            var imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            var m;
            while ((m = imgRegex.exec(html)) !== null) {
                var u = this.clean(m[1]);
                if (u.length > 35 && !u.includes('logo')) images.push(u);
            }
            return { images: images };
        },
        onImageLoad: (url) => {
            // 处理图片反爬
            return {
                headers: {
                    "Referer": "https://nnhanman7.com/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
                }
            };
        }
    };

    search = {
        load: async (keyword) => {
            var res = await Network.get(this.url + "/catalog.php?key=" + encodeURIComponent(keyword), this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var comics = [];
            var regex = /href="([^"]+)"[^>]*title="([^"]+)"/g;
            var m;
            while ((m = regex.exec(html)) !== null) {
                var raw = this.clean(m[1]);
                if (raw.includes("/comic/")) {
                    comics.push({ id: raw, title: this.clean(m[2]), cover: "" });
                }
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
