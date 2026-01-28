class NnHanManSource extends ComicSource {
    constructor() {
        super();
        this.name = "鸟鸟韩漫";
        this.key = "nnhanman7";
        this.version = "1.4.0";
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
            "Cookie": "nov_app_pf=8", // 带上站点返回的Cookie
            "Upgrade-Insecure-Requests": "1"
        };
    }

    // 辅助函数：提取JS变量中的数据
    extractJsVarData(html, varName) {
        if (!html) return [];
        // 匹配JS变量定义：var xxx = [....]; 或 var xxx = {....};
        const regex = new RegExp(`var ${varName}=([\\s\\S]*?);`, 'i');
        const match = regex.exec(html);
        if (!match) return [];
        
        try {
            // 清理截断的内容，补全基本格式
            let jsDataStr = match[1].trim();
            // 处理截断：如果以 "[{" 开头但未闭合，补全 ]；以 "{" 开头补全 }
            if (jsDataStr.startsWith("[") && !jsDataStr.endsWith("]")) {
                jsDataStr = jsDataStr.replace(/,\s*$/, "") + "]";
            } else if (jsDataStr.startsWith("{") && !jsDataStr.endsWith("}")) {
                jsDataStr = jsDataStr.replace(/,\s*$/, "") + "}";
            }
            // 解析JSON（兼容Unicode转义）
            return JSON.parse(jsDataStr);
        } catch (e) {
            console.error("解析JS变量失败：", e);
            return [];
        }
    }

    // 辅助函数：还原Unicode编码的中文
    decodeUnicode(str) {
        if (!str) return "";
        try {
            return unescape(str.replace(/\\u/g, "%u"));
        } catch (e) {
            return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => 
                String.fromCharCode(parseInt(grp, 16))
            );
        }
    }

    get explore() {
        return [
            {
                title: "最新更新",
                type: "multiPartPage",
                load: async (page) => {
                    try {
                        const res = await Network.get(this.url + "/update", this.getHeaders());
                        const html = res.data || res; // 兼容Venera的响应格式
                        const comics = [];

                        // 1. 提取JS变量 qTcmsWapTop 中的漫画数据
                        const jsData = this.extractJsVarData(html, "qTcmsWapTop");
                        if (Array.isArray(jsData) && jsData.length > 0) {
                            jsData.forEach(item => {
                                if (item.url && item.url.includes("/comic/")) {
                                    const title = this.decodeUnicode(item.name || "");
                                    const cover = item.pic || "";
                                    // 去重+过滤无效数据
                                    if (title && !comics.some(c => c.id === item.url)) {
                                        comics.push({
                                            id: item.url.replace(/\\/g, ""),
                                            title: title,
                                            cover: cover.replace(/\\/g, "")
                                        });
                                    }
                                }
                            });
                        }

                        // 2. 备用方案：匹配页面中所有含 /comic/ 的链接
                        if (comics.length === 0) {
                            const linkRegex = /href="([^"]*\/comic\/[^"]*)"[^>]*>([^<]+)</g;
                            let match;
                            while ((match = linkRegex.exec(html)) !== null) {
                                const url = match[1].replace(/\\/g, "");
                                const title = this.decodeUnicode(match[2].trim());
                                if (title && !comics.some(c => c.id === url)) {
                                    comics.push({
                                        id: url,
                                        title: title,
                                        cover: "" // 静态页面无封面，留空
                                    });
                                }
                            }
                        }

                        console.log("解析到漫画数量：", comics.length);
                        return [{ title: "最新更新", comics: comics }];
                    } catch (err) {
                        console.error("加载最新更新失败：", err);
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
                    const comics = [];

                    // 提取搜索结果的JS变量（适配站点的JS渲染逻辑）
                    const jsData = this.extractJsVarData(html, "qTcmsWapTop");
                    if (Array.isArray(jsData)) {
                        jsData.forEach(item => {
                            if (item.url && item.url.includes("/comic/")) {
                                comics.push({
                                    id: item.url.replace(/\\/g, ""),
                                    title: this.decodeUnicode(item.name || ""),
                                    cover: (item.pic || "").replace(/\\/g, "")
                                });
                            }
                        });
                    }

                    // 备用：匹配静态链接
                    if (comics.length === 0) {
                        const linkRegex = /href="([^"]*\/comic\/[^"]*)"[^>]*>([^<]+)</g;
                        let match;
                        while ((match = linkRegex.exec(html)) !== null) {
                            const url = match[1].replace(/\\/g, "");
                            const title = this.decodeUnicode(match[2].trim());
                            if (title) {
                                comics.push({ id: url, title: title, cover: "" });
                            }
                        }
                    }

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
                    
                    // 提取漫画标题
                    const titleMatch = /<h1>([\s\S]*?)<\/h1>/i.exec(html);
                    const title = titleMatch ? this.decodeUnicode(titleMatch[1].trim()) : "漫画详情";
                    
                    // 提取章节列表（适配JS动态渲染的章节）
                    const chapters = [];
                    // 方案1：提取JS中的章节数据
                    const chapterJsData = this.extractJsVarData(html, "qTcmsChapter");
                    if (Array.isArray(chapterJsData)) {
                        chapterJsData.forEach(item => {
                            if (item.url && item.url.includes("/chapter/")) {
                                chapters.push({
                                    id: item.url.replace(/\\/g, ""),
                                    title: this.decodeUnicode(item.name || "")
                                });
                            }
                        });
                    }

                    // 方案2：匹配静态章节链接
                    if (chapters.length === 0) {
                        const cpRegex = /href="([^"]*\/chapter\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
                        let m;
                        while ((m = cpRegex.exec(html)) !== null) {
                            const chapterTitle = this.decodeUnicode(m[2].replace(/<[^>]+>/g, "").trim());
                            if (chapterTitle) {
                                chapters.push({
                                    id: m[1].replace(/\\/g, ""),
                                    title: chapterTitle
                                });
                            }
                        }
                    }

                    return { title: title, chapters: chapters.reverse() };
                } catch (err) {
                    console.error("加载漫画详情失败：", err);
                    return { title: "漫画详情", chapters: [] };
                }
            },
            loadEp: async (comicId, epId) => {
                try {
                    const epUrl = epId.startsWith("http") ? epId : this.url + epId;
                    const res = await Network.get(epUrl, this.getHeaders());
                    const html = res.data || res;
                    const images = [];

                    // 提取JS中的图片数据（核心：动态渲染的图片都在JS变量里）
                    const imgJsData = this.extractJsVarData(html, "qTcmsImage");
                    if (Array.isArray(imgJsData)) {
                        imgJsData.forEach(item => {
                            const imgUrl = (item.url || item.pic || "").replace(/\\/g, "");
                            if (imgUrl && imgUrl.length > 20 && !images.includes(imgUrl)) {
                                images.push(imgUrl);
                            }
                        });
                    }

                    // 备用：匹配img标签的图片
                    if (images.length === 0) {
                        const imgRegex = /<img[^>]+src="([^"]+\.(jpg|png|webp))"[^>]*>/gi;
                        let m;
                        while ((m = imgRegex.exec(html)) !== null) {
                            const imgUrl = m[1].replace(/\\/g, "");
                            if (imgUrl && !images.includes(imgUrl)) {
                                images.push(imgUrl);
                            }
                        }
                    }

                    return { images: images };
                } catch (err) {
                    console.error("加载章节图片失败：", err);
                    return { images: [] };
                }
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
}

// 注册漫画源（Venera兼容写法）
new NnHanManSource();
