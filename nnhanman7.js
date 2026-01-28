class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.0.1"
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    // 网站有防盗链，必须设置 Referer
    getHeaders() {
        return {
            "Referer": this.url + "/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "X-Requested-With": "XMLHttpRequest"
        }
    }

    // 1. 发现/首页
    explore = [{
        title: "最新更新",
        type: "multiPartPage",
        load: async () => {
            try {
                const res = await Network.get(this.url, { headers: this.getHeaders() });
                
                // 基于您提供的HTML分析：
                // 结构: <li> <a class="ImgA" href="..."> ... <img src="..."> ... <a class="txtA">标题</a>
                const comics = [];
                
                // 正则匹配：
                // 1. 匹配 href="/comic/..."
                // 2. 匹配 title="..."
                // 3. 匹配 img src="..."
                const regex = /<a\s+class="ImgA"\s+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?img\s+src="([^"]+)"/g;

                let match;
                while ((match = regex.exec(res)) !== null) {
                    let cover = match[3];
                    // 处理 webp 和 jpg 的情况，有时源码里是 srcset，这里取 img src
                    if (cover.startsWith("//")) cover = "https:" + cover;

                    comics.push({
                        id: match[1], // 比如 /comic/nv-tong-shi-tai-fan-gui.html
                        title: match[2],
                        cover: cover
                    });
                }

                return [{
                    title: "首页推荐",
                    comics: comics,
                    viewMore: null 
                }];
            } catch (e) {
                console.error(e);
                return [];
            }
        }
    }]

    // 2. 搜索
    search = {
        load: async (keyword, options, page) => {
            try {
                // 根据HTML中 <form action="/catalog.php" name="key"> 分析得出
                const searchUrl = `${this.url}/catalog.php?key=${encodeURIComponent(keyword)}&page=${page}`;
                
                const res = await Network.get(searchUrl, { headers: this.getHeaders() });
                const comics = [];
                
                // 搜索结果页通常复用列表样式
                const regex = /<a\s+class="ImgA"\s+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?img\s+src="([^"]+)"/g;
                
                let match;
                while ((match = regex.exec(res)) !== null) {
                    comics.push({
                        id: match[1],
                        title: match[2],
                        cover: match[3]
                    });
                }

                return {
                    comics: comics,
                    maxPage: comics.length > 0 ? page + 1 : page
                };
            } catch (e) {
                return { comics: [], maxPage: 1 };
            }
        },
        optionList: []
    }

    // 3. 漫画详情 (根据常规韩漫网站结构推断)
    comic = {
        loadInfo: async (id) => {
            const fullUrl = this.url + id;
            const res = await Network.get(fullUrl, { headers: this.getHeaders() });

            // 提取标题 (通常在 h1 或 h2)
            const titleMatch = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(res) || /<title>([^<]+)/.exec(res);
            const title = titleMatch ? titleMatch[1].trim() : "未知标题";

            // 提取封面
            const coverMatch = /<div[^>]*class="[^"]*img[^"]*"[^>]*>[\s\S]*?src="([^"]+)"/i.exec(res);
            const cover = coverMatch ? coverMatch[1] : "";

            // 提取简介
            const descMatch = /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(res) || /name="description"\s+content="([^"]+)"/.exec(res);
            let description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

            // 提取章节
            // 假设章节链接结构包含 href="..." 和 章节名
            const chapters = [];
            
            // 匹配所有指向章节的链接，通常包含 chapter 字样或数字
            // 针对该网站首页看到的 /comic/xxx/chapter-xxx.html 结构
            const chapterRegex = /<li[^>]*>[\s\S]*?<a[^>]+href="([^"]*chapter[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/g;
            
            let match;
            while ((match = chapterRegex.exec(res)) !== null) {
                chapters.push({
                    id: match[1],
                    title: match[2].replace(/<[^>]+>/g, "").trim() // 去除可能的 span 标签
                });
            }

            // 如果章节是倒序的（最新的在上面），阅读器通常需要反转
            // chapters.reverse(); 

            return {
                title: title,
                cover: cover,
                description: description,
                chapters: chapters
            };
        },

        // 4. 阅读章节
        loadEp: async (comicId, epId) => {
            const fullUrl = this.url + epId;
            const res = await Network.get(fullUrl, { headers: this.getHeaders() });

            const images = [];
            // 匹配阅读页的所有图片
            // 通常韩漫网站是长条图，img 标签在 content 容器内
            const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
            
            let match;
            while ((match = imgRegex.exec(res)) !== null) {
                const imgUrl = match[1];
                // 简单的过滤：排除 logo、icon、banner
                if (!imgUrl.includes("logo") && !imgUrl.includes("icon") && !imgUrl.includes("favicon")) {
                    // 处理相对路径
                    if (imgUrl.startsWith("http")) {
                         images.push(imgUrl);
                    } else {
                         images.push(this.url + imgUrl);
                    }
                }
            }

            return {
                images: images
            };
        },
        
        // 图片加载头信息
        onImageLoad: (url) => {
            return {
                headers: {
                    "Referer": this.url + "/",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                }
            };
        }
    }
}
