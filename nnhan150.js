class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.5.0";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
        };
    }

    // 清理和格式化数据
    clean(str) {
        if (!str) return "";
        return str.replace(/\\/g, "").trim();
    }

    explore = [
        {
            title: "主页推荐",
            type: "multiPartPage",
            load: async (page) => {
                var res = await Network.get(this.url, this.getHeaders());
                var html = (typeof res === 'object') ? res.data : res;
                var result = [];

                // 定义要抓取的板块名称
                var sections = [
                    { name: "最近更新", key: "最近更新" },
                    { name: "新书发布", key: "新书发布" },
                    { name: "热门漫画", key: "热门漫画" }
                ];

                sections.forEach(sec => {
                    var sectionComics = [];
                    // 定位板块：先找包含板块名称的 Sub_H2 块，然后抓取紧随其后的 ul
                    var secRegex = new RegExp('<span class="Title">' + sec.name + '[\\s\\S]*?<ul class="col_3_1">([\\s\\S]*?)<\\/ul>', 'i');
                    var secMatch = secRegex.exec(html);
                    
                    if (secMatch) {
                        var listHtml = secMatch[1];
                        var itemRegex = /<li>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?srcset="([^"]+)"/g;
                        var m;
                        while ((m = itemRegex.exec(listHtml)) !== null) {
                            sectionComics.push({
                                id: this.clean(m[1]),
                                title: this.clean(m[2]),
                                cover: this.clean(m[3].split(' ')[0]) // 取 srcset 中的第一个 url
                            });
                        }
                    }
                    
                    if (sectionComics.length > 0) {
                        result.push({ title: sec.name, comics: sectionComics });
                    }
                });

                return result;
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            var res = await Network.get(this.url + id, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            
            // 标题抓取
            var titleMatch = /<title>(.*?) - /i.exec(html) || /<h1>(.*?)<\/h1>/i.exec(html);
            
            var chapters = [];
            // 章节抓取逻辑：匹配 /comic/xxx/chapter-xxx.html 格式
            var cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            var m;
            while ((m = cpRegex.exec(html)) !== null) {
                var cpTitle = m[2].replace(/<[^>]+>/g, "").trim();
                // 排除包含“首页”等非章节文字
                if (cpTitle && !cpTitle.includes("首页")) {
                    chapters.push({
                        id: this.clean(m[1]),
                        title: cpTitle
                    });
                }
            }
            
            // 这里的 reverse() 是因为网页通常最新章节在最上面，软件需要从第一话开始显示
            return { 
                title: titleMatch ? this.clean(titleMatch[1]) : "未知漫画", 
                chapters: chapters.length > 30 ? chapters.reverse() : chapters 
            };
        },
        loadEp: async (comicId, epId) => {
            var res = await Network.get(this.url + epId, this.getHeaders());
            var html = (typeof res === 'object') ? res.data : res;
            var images = [];
            
            // 匹配正文大图
            var imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            var m;
            while ((m = imgRegex.exec(html)) !== null) {
                var u = this.clean(m[1]);
                // 排除 logo、图标等干扰项
                if (u.length > 40 && !u.includes('logo') && !u.includes('icon')) {
                    images.push(u);
                }
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
                var link = this.clean(m[1]);
                if (link.includes("/comic/")) {
                    comics.push({ 
                        id: link, 
                        title: this.clean(m[2]), 
                        cover: "" 
                    });
                }
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
