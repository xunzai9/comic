class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.3.2" // 提升版本号以强制刷新
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9"
        };
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                var res = await Network.get(this.url + "/update", this.getHeaders());
                var comics = [];
                // 修复匹配逻辑：根据日志中的 HTML，匹配包含 href、title 和 img src 的结构
                var regex = /<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"/g;
                var match;
                while ((match = regex.exec(res)) !== null) {
                    // 过滤掉非漫画链接（如 logo 或 脚本链接）
                    if (match[1].includes('/comic/') && !comics.some(c => c.id === match[1])) {
                        comics.push({
                            id: match[1],
                            title: match[2],
                            cover: match[3]
                        });
                    }
                }
                return [{ title: "最新更新", comics: comics }];
            }
        }
    ];

    search = {
        load: async (keyword, options, page) => {
            var searchUrl = this.url + "/catalog.php?key=" + encodeURIComponent(keyword) + "&page=" + page;
            var res = await Network.get(searchUrl, this.getHeaders());
            var comics = [];
            var regex = /<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"/g;
            var match;
            while ((match = regex.exec(res)) !== null) {
                if (match[1].includes('/comic/')) {
                    comics.push({ id: match[1], title: match[2], cover: match[3] });
                }
            }
            return { comics: comics, maxPage: comics.length > 0 ? page + 1 : page };
        }
    };

    comic = {
        loadInfo: async (id) => {
            var comicUrl = id.startsWith("http") ? id : this.url + id;
            var res = await Network.get(comicUrl, this.getHeaders());
            
            var titleMatch = /<h1[^>]*>(.*?)<\/h1>/i.exec(res);
            var title = titleMatch ? titleMatch[1].trim() : "加载失败";
            
            // 封面提取优化
            var coverMatch = /<div class="[^"]*cover[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i.exec(res);
            var cover = coverMatch ? coverMatch[1] : "";
            
            var descMatch = /<div class="[^"]*summary[^>]*">([\s\S]*?)<\/div>/i.exec(res);
            var desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
            
            var chapters = [];
            // 章节列表正则增强
            var chapterRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = chapterRegex.exec(res)) !== null) {
                if (m[1].includes('/chapter/')) {
                    chapters.push({ 
                        id: m[1], 
                        title: m[2].replace(/<[^>]+>/g, "").trim() 
                    });
                }
            }
            // 章节倒序排列（通常最新的在前面，需要翻转）
            return { title: title, cover: cover, description: desc, chapters: chapters.reverse() };
        },

        loadEp: async (comicId, epId) => {
            var epUrl = epId.startsWith("http") ? epId : this.url + epId;
            var res = await Network.get(epUrl, this.getHeaders());
            var images = [];
            // 匹配正文图片：通常带有 data-original 或 src
            var imgRegex = /<img[^>]+(?:src|data-original)="([^"]+)"[^>]*>/g;
            var m;
            while ((m = imgRegex.exec(res)) !== null) {
                var imgUrl = m[1];
                // 过滤广告图（根据长度或关键词）
                if (imgUrl.includes('jmpic') || imgUrl.includes('content') || imgUrl.length > 50) {
                    images.push(imgUrl);
                }
            }
            return { images: images };
        },

        onImageLoad: (url) => {
            return {
                headers: {
                    "Referer": "https://nnhanman7.com/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
                }
            };
        }
    };
}

new NnHanManSource();
