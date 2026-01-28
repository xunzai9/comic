class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.4.2";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Cookie": "nov_app_pf=9; PHPSESSID=qr0h2ictdifo6qdta1vkqac2tu"
        };
    }

    // 发现页：直接赋值，不要用 get
    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                try {
                    var res = await Network.get("https://nnhanman7.com/update", {
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                        "Referer": "https://nnhanman7.com/"
                    });
                    // 处理返回结果，有些版本返回 res.data，有些直接返回字符串
                    var html = (typeof res === 'object') ? res.data : res;
                    var comics = [];
                    
                    // 修正后的正则：匹配 <li> 结构，去掉对 ImgA 的死磕，改用更宽泛的匹配
                    var regex = /<li[^>]*>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?src="([^"]+)"/g;
                    var match;
                    while ((match = regex.exec(html)) !== null) {
                        var href = match[1].replace(/\\/g, "");
                        if (href.includes("/comic/")) {
                            comics.push({
                                id: href,
                                title: match[2].replace(/\\/g, ""),
                                cover: match[3].replace(/\\/g, "")
                            });
                        }
                    }
                    return [{ title: "最新更新", comics: comics }];
                } catch (err) {
                    return [{ title: "最新更新", comics: [] }];
                }
            }
        }
    ];

    search = {
        load: async (keyword, options, page) => {
            var res = await Network.get(this.url + "/search/" + encodeURIComponent(keyword), this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var comics = [];
            var regex = /href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?src="([^"]+)"/g;
            var match;
            while ((match = regex.exec(html)) !== null) {
                if (match[1].includes("/comic/")) {
                    comics.push({ id: match[1], title: match[2], cover: match[3] });
                }
            }
            return { comics: comics, maxPage: page };
        },
        enableTagsSuggestions: false,
        onTagSuggestionSelected: (ns, tag) => tag
    };

    comic = {
        loadInfo: async (id) => {
            var comicUrl = id.startsWith("http") ? id : "https://nnhanman7.com" + id;
            var res = await Network.get(comicUrl, { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
            var html = (typeof res === 'object') ? res.data : res;
            
            var titleMatch = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
            var title = titleMatch ? titleMatch[1].trim() : "漫画详情";
            
            var chapters = [];
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(html)) !== null) {
                chapters.push({
                    id: m[1].replace(/\\/g, ""),
                    title: m[2].replace(/<[^>]+>/g, "").trim()
                });
            }
            return { title: title, chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            var epUrl = epId.startsWith("http") ? epId : "https://nnhanman7.com" + epId;
            var res = await Network.get(epUrl, { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
            var html = (typeof res === 'object') ? res.data : res;
            var images = [];
            // 匹配大图地址
            var imgRegex = /src="([^"]+\.(?:jpg|png|webp))"/gi;
            var m;
            while ((m = imgRegex.exec(html)) !== null) {
                var imgUrl = m[1];
                if (imgUrl.length > 25 && !imgUrl.includes('logo')) {
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
