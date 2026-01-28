class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.3.9" 
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    // 辅助函数：将 \uXXXX 还原为中文
    decodeUnicode(str) {
        if (!str) return "";
        try {
            return unescape(str.replace(/\\u/g, "%u"));
        } catch (e) {
            return str.replace(/\\u([0-9a-fA-F]{4})/g, function (match, grp) {
                return String.fromCharCode(parseInt(grp, 16));
            });
        }
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                var res = await Network.get(this.url + "/update", this.getHeaders());
                var comics = [];
                
                // 专门匹配脚本中的 JSON 片段：{"url":"...","name":"...","pic":"..."}
                var regex = /\{"url":"([^"]+?)","name":"([^"]+?)"(?:,"pic":"([^"]+?)")?/g;
                var match;
                
                while ((match = regex.exec(res)) !== null) {
                    var rawUrl = match[1].replace(/\\/g, ''); // 去掉反斜杠
                    if (rawUrl.includes('/comic/')) {
                        var title = this.decodeUnicode(match[2]);
                        var cover = match[3] ? match[3].replace(/\\/g, '') : "";
                        
                        if (!comics.some(c => c.id === rawUrl)) {
                            comics.push({
                                id: rawUrl,
                                title: title,
                                cover: cover
                            });
                        }
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
            var title = titleMatch ? titleMatch[1] : "漫画详情";
            
            var chapters = [];
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)".*?>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(res)) !== null) {
                chapters.push({ 
                    id: m[1].replace(/\\/g, ''), 
                    title: m[2].replace(/<[^>]+>/g, "").trim() 
                });
            }
            return { title: title, chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            var epUrl = epId.startsWith("http") ? epId : this.url + epId;
            var res = await Network.get(epUrl, this.getHeaders());
            var images = [];
            // 在章节页，图片地址通常也在脚本变量或 img 标签中
            var imgRegex = /(?:src|data-original|pic|url)":"?([^" ]+?\.(?:jpg|png|webp)[^" ]*?)"?/gi;
            var m;
            while ((m = imgRegex.exec(res)) !== null) {
                var imgUrl = m[1].replace(/\\/g, '');
                if (imgUrl.length > 20 && !images.includes(imgUrl)) {
                    images.push(imgUrl);
                }
            }
            return { images: images };
        },
        onImageLoad: (url) => {
            return { 
                headers: { 
                    "Referer": "https://nnhanman7.com/", 
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" 
                } 
            };
        }
    };
}

new NnHanManSource();
