class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.0";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
        };
    }

    // 格式化与清理
    clean(str) {
        return str ? str.trim().replace(/\\/g, "") : "";
    }

    explore = [
        {
            title: "首页",
            type: "multiPartPage",
            load: async (page) => {
                const res = await Network.get(this.url, this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                const result = [];

                // 1. 先将整个页面切分成不同的 imgBox 块
                const sections = html.split('<div class="imgBox">');
                // 跳过第一块（通常是头部信息）
                for (let i = 1; i < sections.length; i++) {
                    const sectionHtml = sections[i].split('</div>')[0] + sections[i]; // 确保包含标题和列表
                    
                    // 2. 提取板块名称 (如：最近更新, 热门漫画)
                    const titleMatch = /<span class="Title">\s*([^<]+?)\s*<\/span>/i.exec(sectionHtml);
                    if (!titleMatch) continue;
                    
                    const sectionTitle = titleMatch[1].trim();
                    const comics = [];

                    // 3. 提取该板块下的漫画
                    // 匹配逻辑：找 <li> 里的 href (ID), title (标题), 以及 source 里的 srcset (高清封面)
                    const itemRegex = /<li>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?srcset="([^"]+)"/g;
                    let m;
                    while ((m = itemRegex.exec(sectionHtml)) !== null) {
                        comics.push({
                            id: this.clean(m[1]),
                            title: this.clean(m[2]),
                            cover: this.clean(m[3].split(',')[0].split(' ')[0]) // 提取 srcset 中的图片地址
                        });
                    }

                    if (comics.length > 0) {
                        result.push({
                            title: sectionTitle,
                            comics: comics
                        });
                    }
                }
                return result;
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.url + id, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            
            // 匹配标题
            const titleMatch = /<title>([\s\S]*?) - /i.exec(html) || /<h1>(.*?)<\/h1>/i.exec(html);
            
            const chapters = [];
            // 匹配章节列表：href="/comic/xxx/chapter-xxx.html"
            const cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = cpRegex.exec(html)) !== null) {
                const cTitle = m[2].replace(/<[^>]+>/g, "").trim();
                // 排除非章节链接（如返回首页等）
                if (cTitle && !cTitle.includes("首页") && !cTitle.includes("联系")) {
                    chapters.push({
                        id: this.clean(m[1]),
                        title: this.clean(cTitle)
                    });
                }
            }
            
            return {
                title: titleMatch ? this.clean(titleMatch[1]) : "未知漫画",
                chapters: chapters.reverse() // 网站最新在最前，软件习惯正序显示
            };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(this.url + epId, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const images = [];
            
            // 匹配正文图片：src="https://...webp"
            // 注意避开 logo 和广告图
            const imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            let m;
            while ((m = imgRegex.exec(html)) !== null) {
                const imgUrl = this.clean(m[1]);
                if (imgUrl.includes("jmpic.xyz") && !imgUrl.includes("logo")) {
                    images.push(imgUrl);
                }
            }
            return { images: images };
        }
    };

    search = {
        load: async (keyword) => {
            const res = await Network.get(this.url + "/catalog.php?key=" + encodeURIComponent(keyword), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const comics = [];
            // 搜索页通常比较简洁，直接抓取包含 /comic/ 的链接
            const regex = /href="([^"]+)"[^>]*title="([^"]+)"/g;
            let m;
            while ((m = regex.exec(html)) !== null) {
                const link = this.clean(m[1]);
                if (link.startsWith("/comic/")) {
                    comics.push({
                        id: link,
                        title: this.clean(m[2]),
                        cover: "" // 搜索页若无封面可留空
                    });
                }
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
