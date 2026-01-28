class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.4.7";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": "https://nnhanman7.com/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    // 核心解码：将 \uXXXX 还原为中文，将 \/ 还原为 /
    decodeData(str) {
        if (!str) return "";
        var result = str.replace(/\\/g, ""); // 先暴力清除所有反斜杠
        try {
            // 处理 Unicode 编码
            result = result.replace(/\\u([0-9a-fA-F]{4})/g, function(match, grp) {
                return String.fromCharCode(parseInt(grp, 16));
            });
            return decodeURIComponent(result);
        } catch (e) {
            return result;
        }
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                var res = await Network.get(this.url + "/update", this.getHeaders());
                var html = (typeof res === 'object') ? res.data : res;
                var comics = [];

                // 1. 针对 itemBox 静态 HTML 的匹配
                var itemRegex = /<div class="itemBox">([\s\S]*?)<\/div>/g;
                var m;
                while ((m = itemRegex.exec(html)) !== null) {
                    var content = m[1];
                    var linkMatch = /href="([^"]+)"[^>]*title="([^"]+)"/.exec(content);
                    var imgMatch = /<img src="([^"]+)"/.exec(content);
                    if (linkMatch) {
                        comics.push({
                            id: linkMatch[1].replace(/\\/g, ""),
                            title: this.decodeData(linkMatch[2]),
                            cover: imgMatch ? imgMatch[1].replace(/\\/g, "") : ""
                        });
                    }
                }

                // 2. 备选方案：针对脚本变量 qTcmsWapTop 的匹配 (日志中出现的结构)
                if (comics.length === 0) {
                    var scriptRegex = /\{"url":"([^"]+?)","name":"([^"]+?)"(?:,"pic":"([^"]+?)")?\}/g;
                    while ((m = scriptRegex.exec(html)) !== null) {
                        var rawId = m[1].replace(/\\/g, "");
                        if (rawId.includes("/comic/")) {
                            comics.push({
                                id: rawId,
                                title: this.decodeData(m[2]),
                                cover: m[3] ? m[3].replace(/\\/g, "") : ""
                            });
                        }
                    }
                }
                return [{ title: "最新更新", comics: comics }];
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            var res = await Network.get(this.url + id, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var titleMatch = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
            var chapters = [];
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(html)) !== null) {
                chapters.push({
                    id: m[1].replace(/\\/g, ""),
                    title: this.decodeData(m[2].replace(/<[^>]+>/g, "").trim())
                });
            }
            return { title: titleMatch ? this.decodeData(titleMatch[1]) : "详情", chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            var res = await Network.get(this.url + epId, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var images = [];
            // 匹配漫画图片正文
            var imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            var m;
            while ((m = imgRegex.exec(html)) !== null) {
                var url = m[1].replace(/\\/g, "");
                if (url.length > 40 && !url.includes('logo')) images.push(url);
            }
            return { images: images };
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
                if (m[1].includes("/comic/")) {
                    comics.push({ id: m[1].replace(/\\/g, ""), title: this.decodeData(m[2]), cover: "" });
                }
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
