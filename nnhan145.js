class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.4.5"; 
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": "https://nnhanman7.com/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    // 内部匹配逻辑：适配 itemBox 结构
    parseHtml(html) {
        var comics = [];
        // 匹配逻辑：定位 itemBox -> 提取 href/title -> 提取 img src
        var itemRegex = /<div class="itemBox">([\s\S]*?)<\/div>/g;
        var m;
        while ((m = itemRegex.exec(html)) !== null) {
            var content = m[1];
            var linkMatch = /href="([^"]+)"[^>]*title="([^"]+)"/.exec(content);
            var imgMatch = /<img src="([^"]+)"/.exec(content);

            if (linkMatch && linkMatch[1].includes("/comic/")) {
                comics.push({
                    id: linkMatch[1],
                    title: linkMatch[2],
                    cover: imgMatch ? imgMatch[1] : ""
                });
            }
        }
        return comics;
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                try {
                    var res = await Network.get("https://nnhanman7.com/update", this.getHeaders());
                    var html = (typeof res === 'object') ? res.data : res;
                    var comics = this.parseHtml(html);
                    return [{ title: "最新更新", comics: comics }];
                } catch (err) {
                    return [{ title: "最新更新", comics: [] }];
                }
            }
        }
    ];

    search = {
        load: async (keyword, options, page) => {
            var res = await Network.get(this.url + "/catalog.php?key=" + encodeURIComponent(keyword), this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var comics = this.parseHtml(html);
            return { comics: comics, maxPage: page };
        },
        enableTagsSuggestions: false,
        onTagSuggestionSelected: (ns, tag) => tag
    };

    comic = {
        loadInfo: async (id) => {
            var url = id.startsWith("http") ? id : "https://nnhanman7.com" + id;
            var res = await Network.get(url, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            
            var titleMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || /title="([^"]+)"/i.exec(html);
            var title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "漫画";
            
            var chapters = [];
            // 匹配章节，注意源码中章节链接包含 /chapter/
            var cpRegex = /<a[^>]+href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(html)) !== null) {
                chapters.push({
                    id: m[1],
                    title: m[2].replace(/<[^>]+>/g, "").replace(/&hearts;/g, "♥").trim()
                });
            }
            return { title: title, chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            var url = epId.startsWith("http") ? epId : "https://nnhanman7.com" + epId;
            var res = await Network.get(url, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var images = [];
            // 匹配漫画正文图片
            var imgRegex = /<img[^>]+src="([^"]+\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            var m;
            while ((m = imgRegex.exec(html)) !== null) {
                var imgUrl = m[1];
                // 排除 logo 和图标
                if (imgUrl.length > 40 && !imgUrl.includes('logo')) {
                    images.push(imgUrl);
                }
            }
            return { images: images };
        },
        onImageLoad: (url) => {
            return {
                headers: {
                    "Referer": "https://nnhanman7.com/",
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
                }
            };
        }
    };
}

new NnHanManSource();
