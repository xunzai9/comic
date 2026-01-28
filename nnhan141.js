class NnHanManSource extends ComicSource {
    constructor() {
        super();
        this.name = "鸟鸟韩漫";
        this.key = "nnhanman7";
        this.version = "1.4.1";
        this.minAppVersion = "1.0.0";
        this.url = "https://nnhanman7.com";
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Cookie": "nov_app_pf=9; PHPSESSID=qr0h2ictdifo6qdta1vkqac2tu", // 用日志里的最新Cookie
            "Upgrade-Insecure-Requests": "1"
        };
    }

    // 还原最初的正则：匹配静态HTML里的<li>漫画列表
    matchStaticComics(html) {
        const comics = [];
        // 用用户最开始提供的网站结构正则（匹配<li>里的ImgA链接）
        const regex = /<li>[\s\S]*?<a class="ImgA" href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img src="([^"]+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            const comicHref = match[1].replace(/\\/g, "");
            const comicTitle = match[2].replace(/\\/g, "");
            const comicCover = match[3].replace(/\\/g, "");
            // 过滤非漫画链接
            if (comicHref.startsWith("/comic/")) {
                comics.push({
                    id: comicHref,
                    title: comicTitle,
                    cover: comicCover
                });
            }
        }
        return comics;
    }

    get explore() {
        return [
            {
                title: "最新更新",
                type: "multiPartPage",
                load: async (page) => {
                    try {
                        const res = await Network.get(this.url + "/update", this.getHeaders());
                        const html = res.data || res;
                        console.log("HTML长度：", html.length);

                        // 优先匹配静态HTML里的漫画列表（站点核心结构）
                        const comics = this.matchStaticComics(html);

                        if (comics.length > 0) {
                            console.log("解析到静态漫画数量：", comics.length);
                            return [{ title: "最新更新", comics: comics }];
                        }

                        // 备用：匹配其他链接（防止静态结构变化）
                        const linkRegex = /<a[^>]+href="([^"]*\/comic\/[^"]*)"[^>]+title="([^"]+)"/g;
                        let match;
                        while ((match = linkRegex.exec(html)) !== null) {
                            comics.push({
                                id: match[1].replace(/\\/g, ""),
                                title: match[2].replace(/\\/g, ""),
                                cover: ""
                            });
                        }

                        console.log("最终解析数量：", comics.length);
                        return [{ title: "最新更新", comics: comics }];
                    } catch (err) {
                        console.error("加载失败：", err);
                        return [{ title: "最新更新", comics: [] }];
                    }
                }
            }
        ];
    }

    get search() {
        return {
            load: async (keyword, options, page) => {
                try {
                    const searchUrl = this.url + "/search/" + encodeURIComponent(keyword);
                    const res = await Network.get(searchUrl, this.getHeaders());
                    const html = res.data || res;
                    const comics = this.matchStaticComics(html);
                    return { comics: comics, maxPage: page };
                } catch (err) {
                    console.error("搜索失败：", err);
                    return { comics: [], maxPage: page };
                }
            },
            enableTagsSuggestions: false,
            onTagSuggestionSelected: (ns, tag) => tag
        };
    }

    get comic() {
        return {
            loadInfo: async (id) => {
                try {
                    const comicUrl = id.startsWith("http") ? id : this.url + id;
                    const res = await Network.get(comicUrl, this.getHeaders());
                    const html = res.data || res;
                    
                    const titleMatch = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
                    const title = titleMatch ? titleMatch[1].trim() : "漫画详情";
                    
                    const chapters = [];
                    const cpRegex = /<a[^>]+href="([^"]*\/chapter\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
                    let m;
                    while ((m = cpRegex.exec(html)) !== null) {
                        chapters.push({
                            id: m[1].replace(/\\/g, ""),
                            title: m[2].replace(/<[^>]+>/g, "").trim()
                        });
                    }
                    return { title: title, chapters: chapters.reverse() };
                } catch (err) {
                    console.error("加载详情失败：", err);
                    return { title: "漫画详情", chapters: [] };
                }
            },
            loadEp: async (comicId, epId) => {
                try {
                    const epUrl = epId.startsWith("http") ? epId : this.url + epId;
                    const res = await Network.get(epUrl, this.getHeaders());
                    const html = res.data || res;
                    const images = [];
                    const imgRegex = /<img[^>]+src="([^"]+\.(jpg|png|webp))"[^>]*>/gi;
                    let m;
                    while ((m = imgRegex.exec(html)) !== null) {
                        images.push(m[1].replace(/\\/g, ""));
                    }
                    return { images: images };
                } catch (err) {
                    console.error("加载章节失败：", err);
                    return { images: [] };
                }
            },
            onImageLoad: (url) => ({
                headers: {
                    "Referer": this.url + "/",
                    "User-Agent": this.getHeaders()["User-Agent"]
                }
            })
        };
    }
}

new NnHanManSource();
