class NnHanManSource extends ComicSource {
    // 1. 基础信息配置
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.3.0"
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    // 2. 模拟浏览器核心请求头：参考 1769584007.json
    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Connection": "keep-alive"
        };
    }

    // 3. 发现页逻辑：解析最新更新列表
    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                const res = await Network.get(this.url + "/update", this.getHeaders());
                const comics = [];
                // 使用正则提取：匹配包含链接、标题和封面的列表项
                const regex = /<li[^>]*>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?src="([^"]+)"/g;
                let match;
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

    // 4. 搜索功能
    search = {
        load: async (keyword, options, page) => {
            const searchUrl = `${this.url}/catalog.php?key=${encodeURIComponent(keyword)}&page=${page}`;
            const res = await Network.get(searchUrl, this.getHeaders());
            const comics = [];
            const regex = /<li[^>]*>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?src="([^"]+)"/g;
            let match;
            while ((match = regex.exec(res)) !== null) {
                comics.push({ id: match[1], title: match[2], cover: match[3] });
            }
            return { comics: comics, maxPage: comics.length > 0 ? page + 1 : page };
        }
    };

    // 5. 漫画详情与章节内容
    comic = {
        loadInfo: async (id) => {
            const comicUrl = id.startsWith("http") ? id : this.url + id;
            const res = await Network.get(comicUrl, this.getHeaders());
            
            // 提取标题、封面及简介
            const title = (/<h1[^>]*>(.*?)<\/h1>/i.exec(res) || ["", "加载失败"])[1].trim();
            const cover = (/<div class="[^"]*cover[^>]*>[\s\S]*?src="([^"]+)"/i.exec(res) || ["", ""])[1];
            const desc = (/<div class="[^"]*summary[^>]*">([\s\S]*?)<\/div>/i.exec(res) || ["", ""])[1].replace(/<[^>]+>/g, "").trim();
            
            const chapters = [];
            const chapterRegex = /<a[^>]+href="([^"]+)"[^>]*class="[^"]*chapter[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = chapterRegex.exec(res)) !== null) {
                chapters.push({ 
                    id: m[1], 
                    title: m[2].replace(/<[^>]+>/g, "").trim() 
                });
            }
            return { title: title, cover: cover, description: desc, chapters: chapters };
        },

        loadEp: async (comicId, epId) => {
            const epUrl = epId.startsWith("http") ? epId : this.url + epId;
            const headers = this.getHeaders();
            headers["Referer"] = this.url + comicId; // 模拟从详情页跳转以绕过防盗链
            
            const res = await Network.get(epUrl, headers);
            const images
