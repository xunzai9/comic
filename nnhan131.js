class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.3.1"
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Connection": "keep-alive"
        };
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                var res = await Network.get(this.url + "/update", this.getHeaders());
                var comics = [];
                var regex = /<li[^>]*>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?src="([^"]+)"/g;
                var match;
                while ((match = regex.exec(res)) !== null) {
                    if (match[1].includes('/comic/')) {
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
            var regex = /<li[^>]*>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?src="([^"]+)"/g;
            var match;
            while ((match = regex.exec(res)) !== null) {
                comics.push({ id: match[1], title: match[2], cover: match[3] });
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
            
            var coverMatch = /<div class="[^"]*cover[^>]*>[\s\S]*?src="([^"]+)"/i.exec(res);
            var cover = coverMatch ? coverMatch[1] : "";
            
            var descMatch = /<div class="[^"]*summary[^>]*">([\s\S]*?)<\/div>/i.exec(res);
            var desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
            
            var chapters = [];
            var chapterRegex = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*chapter[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = chapterRegex.exec(res)) !== null) {
                chapters.push({ 
                    id: m[1], 
                    title: m[2].replace(/<[^>]+>/g, "").trim() 
                });
            }
            return { title: title, cover: cover, description: desc, chapters: chapters };
        },

        loadEp: async (comicId, epId) => {
            var epUrl = epId.startsWith("http") ? epId : this.url + epId;
            var headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
                "Referer": this.url + comicId
            };
            
            var res = await Network.get(epUrl, headers);
            var images = [];
            var imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
            var m;
            while ((m = imgRegex.exec(res)) !== null) {
                var imgUrl = m[1];
                if (imgUrl.includes('jmpic') || imgUrl.includes('content') || imgUrl.length > 40) {
                    images.push(imgUrl);
                }
            }
            return { images: images };
        },

        onImageLoad: (url, comicId, epId) => {
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
