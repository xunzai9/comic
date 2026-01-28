class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.3.5" // 再次提升版本，确保软件重新加载
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
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
                
                // 【核心修改】极其宽松的匹配模式：抓取所有 /comic/ 链接及其前后的标题
                // 专门应对混淆网页中的数据抓取
                var regex = /href="([^"]*?\/comic\/[^"]*?)".*?title="([^"]+?)"/g;
                var match;
                while ((match = regex.exec(res)) !== null) {
                    var id = match[1];
                    var title = match[2];
                    
                    // 尝试匹配紧随其后的图片地址，如果找不到则使用默认占位图
                    var imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/i;
                    var imgPart = res.substring(regex.lastIndex, regex.lastIndex + 500);
                    var imgMatch = imgRegex.exec(imgPart);
                    var cover = imgMatch ? imgMatch[1] : "";

                    if (!comics.some(c => c.id === id)) {
                        comics.push({
                            id: id,
                            title: title,
                            cover: cover
                        });
                    }
                }
                return [{ title: "最新更新", comics: comics }];
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            var comicUrl = id.startsWith("http") ? id : this.url + id;
            var res = await Network.get(comicUrl, this.getHeaders());
            
            var titleMatch = /<h1>(.*?)<\/h1>/i.exec(res) || /title="([^"]+)"/i.exec(res);
            var title = titleMatch ? titleMatch[1] : "未知漫画";
            
            var chapters = [];
            // 匹配章节链接
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)".*?>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(res)) !== null) {
                chapters.push({
                    id: m[1],
                    title: m[2].replace(/<[^>]+>/g, "").trim()
                });
            }
            return { title: title, chapters: chapters.reverse() };
        },

        loadEp: async (comicId, epId) => {
            var epUrl = epId.startsWith("http") ? epId : this.url + epId;
            var res = await Network.get(epUrl, this.getHeaders());
            var images = [];
            // 匹配大图地址，通常在混淆代码的数组里
            var imgRegex = /(?:src|data-original)="([^"]+?\.(?:jpg|png|webp)[^"]*?)"/gi;
            var m;
            while ((m = imgRegex.exec(res)) !== null) {
                if (m[1].includes('http') && m[1].length > 30) {
                    images.push(m[1]);
                }
            }
            return { images: images };
        },

        onImageLoad: (url) => {
            return { headers: { "Referer": "https://nnhanman7.com/" } };
        }
    };
}

new NnHanManSource();
