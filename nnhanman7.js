class NnHanManSource extends ComicSource {
    // 源的基本信息
    name = "NnHanMan"
    key = "nnhanman7"
    version = "1.0.0"
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    // 定义通用的请求头，防止图片无法加载（防盗链）
    getHeaders() {
        return {
            "Referer": this.url + "/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    }

    // 1. 发现页面（首页/推荐）
    explore = [{
        title: "最新更新",
        type: "multiPartPage",
        load: async () => {
            try {
                // 请求首页
                const res = await Network.get(this.url, {
                    headers: this.getHeaders()
                });
                
                // 解析首页漫画列表
                // 注意：这里假设 HTML 结构是类似 <div class="item">...<a href="...">...<img src="...">...</div>
                // 您可能需要根据实际网页结构调整 regex
                const comics = [];
                
                // 这是一个通用的正则匹配模式，用于提取 链接、封面、标题
                // 假设列表项包含 href, img src, title
                const regex = /<div class="[^"]*item[^"]*">[\s\S]*?href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?title="([^"]+)"/g;
                
                let match;
                while ((match = regex.exec(res)) !== null) {
                    comics.push({
                        id: match[1], // 漫画详情页的相对链接或绝对链接
                        cover: match[2],
                        title: match[3],
                        // subtitle: match[4] // 如果有最新话数可以加在这里
                    });
                }

                return [{
                    title: "最新更新",
                    comics: comics,
                    viewMore: null 
                }];
            } catch (e) {
                console.log(e);
                return [];
            }
        }
    }]

    // 2. 搜索功能
    search = {
        load: async (keyword, options, page) => {
            try {
                // 构造搜索 URL
                // 假设搜索链接为 https://nnhanman7.com/search?keyword=xxx
                const searchUrl = `${this.url}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
                
                const res = await Network.get(searchUrl, {
                    headers: this.getHeaders()
                });

                const comics = [];
                // 复用上面的正则逻辑，大多数网站搜索结果和首页结构类似
                const regex = /<div class="[^"]*item[^"]*">[\s\S]*?href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?title="([^"]+)"/g;
                
                let match;
                while ((match = regex.exec(res)) !== null) {
                    comics.push({
                        id: match[1],
                        cover: match[2],
                        title: match[3]
                    });
                }

                return {
                    comics: comics,
                    maxPage: comics.length > 0 ? page + 1 : page // 简单的分页判断
                };
            } catch (e) {
                console.log(e);
                return { comics: [], maxPage: 1 };
            }
        },
        optionList: []
    }

    // 3. 漫画详情及章节列表
    comic = {
        loadInfo: async (id) => {
            // 处理 ID，确保是完整的 URL
            const comicUrl = id.startsWith("http") ? id : this.url + id;
            
            const res = await Network.get(comicUrl, {
                headers: this.getHeaders()
            });

            // 提取标题
            const titleMatch = /<h1[^>]*>(.*?)<\/h1>/i.exec(res);
            const title = titleMatch ? titleMatch[1].trim() : "Unknown Title";

            // 提取封面
            const coverMatch = /<div class="[^"]*cover[^"]*">[\s\S]*?src="([^"]+)"/i.exec(res);
            const cover = coverMatch ? coverMatch[1] : "";

            // 提取简介
            const descMatch = /<div class="[^"]*summary[^"]*">([\s\S]*?)<\/div>/i.exec(res);
            // 简单的去除 HTML 标签
            const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

            // 提取章节列表
            // 假设结构为 <li><a href="/chapter-1">Chapter 1</a></li>
            const chapters = [];
            const chapterRegex = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*chapter[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
            // 或者尝试更通用的列表匹配
            // const chapterRegex = /<li[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g;

            let match;
            while ((match = chapterRegex.exec(res)) !== null) {
                chapters.push({
                    id: match[1], // 章节链接
                    title: match[2].trim()
                });
            }

            // 很多网站章节是倒序的（最新在最前），阅读器通常希望顺序，根据需要翻转
            // chapters.reverse();

            return {
                title: title,
                cover: cover,
                description: description,
                chapters: chapters
            };
        },

        // 4. 加载章节图片
        loadEp: async (comicId, epId) => {
            const epUrl = epId.startsWith("http") ? epId : this.url + epId;
            
            const res = await Network.get(epUrl, {
                headers: this.getHeaders()
            });

            const images = [];
            // 提取图片
            // 常见结构：<div class="reader-content"><img src="..."></div>
            // 使用正则匹配所有图片标签
            const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
            
            // 为了避免匹配到页眉页脚的图标，通常可以先截取包含漫画内容的 div
            // 这里为了简单，匹配页面内所有大图，或者您可以尝试先定位 container
            // const contentMatch = /<div class="reading-content">([\s\S]*?)<\/div>/i.exec(res);
            // const contentHtml = contentMatch ? contentMatch[1] : res;
            
            let match;
            while ((match = imgRegex.exec(res)) !== null) {
                const imgUrl = match[1];
                // 简单的过滤器：忽略 logo、小图标等非漫画图片
                if (!imgUrl.includes("logo") && !imgUrl.includes("icon") && imgUrl.length > 20) {
                     images.push(imgUrl);
                }
            }

            return {
                images: images
            };
        },

        // 图片加载时的额外处理（防盗链关键）
        onImageLoad: (url, comicId, epId) => {
            return {
                headers: {
                    "Referer": this.url, // 告诉服务器我们来自该网站
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            };
        }
    }
}
