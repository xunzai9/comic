class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.3.8" 
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    // 辅助函数：解码 Unicode (\u6f2b\u753b -> 漫画)
    decodeUnicode(str) {
        if (!str) return "";
        return str.replace(/\\u([0-9a-fA-F]{4})/g, function (match, grp) {
            return String.fromCharCode(parseInt(grp, 16));
        }).replace(/\\/g, '');
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                var res = await Network.get(this.url + "/update", this.getHeaders());
                var comics = [];
                
                // 策略：匹配源码中所有包含 url、name、pic 的 JSON 片段
                // 格式如：{"url":"\/comic\/123","name":"\u6f2b\u753b","pic":"..."}
                var regex = /\{"url":"([^"]+?)","name":"([^"]+?)"(?:,"pic":"([^"]+?)")?/g;
                var match;
                
                while ((match = regex.exec(res)) !== null) {
                    var rawUrl = match[1].replace(/\\/g, '');
                    var rawName = match[2];
                    var rawPic = match[3] ? match[3].replace(/\\/g, '') : "";

                    // 只有包含 /comic/ 的才是真正的漫画入口
                    if (rawUrl.includes('/comic/')) {
                        var id = rawUrl;
                        var title = this.decodeUnicode(rawName);
                        var cover = rawPic;

                        if (!comics.some(c => c.id === id)) {
                            comics.push({ id: id, title: title, cover: cover });
                        }
                    }
                }
                
                // 如果 JSON 匹配不到，启用备用宽松 HTML 匹配
                if (comics.length === 0) {
                    var backupRegex = /href="([^"]*?\/comic\/[^"]*?)".*?>([^<]+)</g;
                    while ((match = backupRegex.exec(res)) !== null) {
                        comics.push({ id: match[1], title: match[2].trim(), cover: "" });
                    }
                }

                return [{ title: "最新更新", comics: comics }];
            }
        }
    ];

    search = {
        load: async (keyword, options, page) => {
            var searchUrl = this.url + "/search/" + encodeURIComponent(keyword);
            var res = await Network.get(searchUrl, this.getHeaders());
            var comics = [];
            var regex = /\{"url":"([^"]+?)","name":"([^"]+?)"(?:,"pic":"([^"]+?)")?/g;
            var match;
            while ((match = regex.exec(res)) !== null) {
                var rawUrl = match[1].replace(/\\/g, '');
                if (rawUrl.includes('/comic/')) {
                    comics.push({
                        id: rawUrl,
                        title: this.decodeUnicode(match[2]),
                        cover: match[3] ? match[3].replace(/\\/g, '') : ""
                    });
                }
            }
            return { comics: comics, maxPage: page };
        },
        enableTagsSuggestions: false,
        onTagSuggestionSelected: (ns, tag) => { return tag; }
    };

    comic = {
        loadInfo: async (id) => {
            var comicUrl = id.startsWith("http") ? id : this.url + id;
            var res = await Network.get(comicUrl, this.getHeaders());
            var titleMatch = /<h1>(.*?)<\/h1>/i.exec(res);
            var title = titleMatch ? titleMatch[1] : "详情页";
            var chapters = [];
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)".*?>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(res)) !== null) {
                chapters.push({ id: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() });
            }
            return { title: title, chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            var epUrl = epId.startsWith("http") ? epId : this.url + epId;
            var res = await Network.get(epUrl, this.getHeaders());
            var images = [];
            // 图片通常在 qTcmsColor 变量或直接 img 标签中
            var imgRegex = /(?:src|data-original|pic)="([^"]+?\.(?:jpg|png|webp)[^"]*?)"/gi;
            var m;
            while ((m = imgRegex.exec(res)) !== null) {
                var url = m[1].replace(/\\/g, '');
                if (url.length > 20 && !images.includes(url)) images.push(url);
            }
            return { images: images };
        },
        onImageLoad: (url) => {
            return { headers: { "Referer": "https://nnhanman7.com/", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } };
        }
    };
}

new NnHanManSource();
