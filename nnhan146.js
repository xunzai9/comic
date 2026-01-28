class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.4.6"; 
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept-Language": "zh-CN,zh;q=0.9"
        };
    }

    // 解决 Unicode 乱码的核心函数
    decode(str) {
        if (!str) return "";
        try {
            return decodeURIComponent(JSON.parse('"' + str.replace(/"/g, '\\"') + '"'));
        } catch (e) {
            return str.replace(/\\u([0-9a-fA-F]{4})/g, function(m, g) {
                return String.fromCharCode(parseInt(g, 16));
            });
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

                // 1. 优先尝试解析静态 HTML (itemBox 结构)
                var itemRegex = /<div class="itemBox">([\s\S]*?)<\/div>/g;
                var m;
                while ((m = itemRegex.exec(html)) !== null) {
                    var chunk = m[1];
                    var link = /href="([^"]+)"[^>]*title="([^"]+)"/.exec(chunk);
                    var img = /<img src="([^"]+)"/.exec(chunk);
                    if (link && link[1].includes("/comic/")) {
                        comics.push({
                            id: link[1].replace(/\\/g, ""),
                            title: this.decode(link[2]),
                            cover: img ? img[1].replace(/\\/g, "") : ""
                        });
                    }
                }

                // 2. 如果 HTML 没匹配到，解析脚本变量 (针对日志末尾显示的 qTcmsWapTop)
                if (comics.length === 0) {
                    var scriptRegex = /\{"url":"([^"]+?)","name":"([^"]+?)"(?:,"pic":"([^"]+?)")?\}/g;
                    while ((m = scriptRegex.exec(html)) !== null) {
                        var rawId = m[1].replace(/\\/g, "");
                        if (rawId.includes("/comic/")) {
                            comics.push({
                                id: rawId,
                                title: this.decode(m[2]),
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
            var title = /<h1>([\s\S]*?)<\/h1>/.exec(html);
            var chapters = [];
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(html)) !== null) {
                chapters.push({
                    id: m[1].replace(/\\/g, ""),
                    title: this.decode(m[2].replace(/<[^>]+>/g, "").trim())
                });
            }
            return { title: title ? this.decode(title[1]) : "详情", chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            var res = await Network.get(this.url + epId, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var images = [];
            var imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            var m;
            while ((m = imgRegex.exec(html)) !== null) {
                var u = m[1].replace(/\\/g, "");
                if (u.length > 40 && !u.includes('logo')) images.push(u);
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
                    comics.push({ id: m[1].replace(/\\/g, ""), title: this.decode(m[2]), cover: "" });
                }
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
