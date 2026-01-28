class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.8.0";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    // 模拟移动端浏览器，减少被 Cloudflare 截断的概率
    ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

    // 路径补全工具
    _fixUrl(u) {
        if (!u) return "";
        let res = u.replace(/\\/g, "").trim();
        if (res.startsWith("//")) return "https:" + res;
        if (res.startsWith("/") && !res.startsWith("//")) return this.url + res;
        return res;
    }

    // 模仿你提供的脚本：探索页配置
    explore = [
        {
            title: "全站更新",
            type: "multiPageComicList",
            load: async (page) => {
                // 鸟鸟韩漫目录页通常比首页更稳定
                const targetUrl = `${this.url}/catalog.php?page=${page}&orderby=active_time`;
                const response = await Network.get(targetUrl, { "User-Agent": this.ua });
                
                const html = (typeof response === 'object') ? response.data : response;
                const comics = [];

                // --- 策略：暴力正则匹配 (应对 HTML 截断) ---
                // 不使用 HtmlDocument 这种依赖完整 DOM 的解析器，因为源码常断掉
                // 我们直接在全文本里扫描 <li> 块
                const parts = html.split('<li');
                for (let i = 1; i < parts.length; i++) {
                    const p = parts[i];
                    if (p.includes('/comic/')) {
                        const idM = /href="([^"]+)"/.exec(p);
                        const titleM = /title="([^"]+)"/.exec(p) || />([^<]+)<\/a>/.exec(p);
                        const coverM = /srcset="([^" ,]+)/.exec(p) || /src="([^"]+)"/.exec(p);

                        if (idM && titleM) {
                            const cid = this._fixUrl(idM[1]);
                            if (cid.includes('/comic/')) {
                                comics.push(new Comic({
                                    id: cid,
                                    title: titleM[1].trim(),
                                    cover: coverM ? this._fixUrl(coverM[1]) : "",
                                    url: cid
                                }));
                            }
                        }
                    }
                }

                // 如果常规列表没抓到，尝试从脚本热搜词里救急
                if (comics.length === 0) {
                    const hotRegex = /"url":"([^"]+)","name":"([^"]+)"/g;
                    let m;
                    while ((m = hotRegex.exec(html)) !== null) {
                        let title = m[2].replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
                        comics.push(new Comic({
                            id: this._fixUrl(m[1]),
                            title: "[热词] " + title,
                            cover: ""
                        }));
                    }
                }

                return {
                    comics: comics,
                    maxPage: comics.length > 0 ? page + 1 : page
                };
            }
        }
    ];

    comic = {
        loadInfo: async (comicId) => {
            const response = await Network.get(this._fixUrl(comicId), { "User-Agent": this.ua });
            const html = (typeof response === 'object') ? response.data : response;
            
            // 提取标题
            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const title = titleMatch ? titleMatch[1].trim() : "未知漫画";

            // 提取章节 (模仿规范化 Map 结构)
            const chapters = new Map();
            const cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            const tempChapters = [];
            while ((m = cpRegex.exec(html)) !== null) {
                const cTitle = m[2].replace(/<[^>]+>/g, "").trim();
                if (cTitle && !cTitle.includes("首页")) {
                    tempChapters.push({ id: this._fixUrl(m[1]), title: cTitle });
                }
            }
            
            // 倒序排列，确保最新章节在最后
            tempChapters.reverse().forEach(ch => {
                chapters.set(ch.id, ch.title);
            });

            return new ComicDetails({
                id: comicId,
                title: title,
                chapters: chapters
            });
        },

        loadEp: async (comicId, epId) => {
            const response = await Network.get(this._fixUrl(epId), { "User-Agent": this.ua });
            const html = (typeof response === 'object') ? response.data : response;
            
            const images = [];
            // 针对该站点的图片 CDN 进行精准匹配
            const imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            let m;
            while ((m = imgRegex.exec(html)) !== null) {
                const imgUrl = this._fixUrl(m[1]);
                if (imgUrl.includes("jmpic.xyz") && !imgUrl.includes("logo")) {
                    images.push(imgUrl);
                }
            }
            return { images };
        }
    };

    search = {
        load: async (keyword, options, page) => {
            const url = `${this.url}/catalog.php?key=${encodeURIComponent(keyword)}`;
            const response = await Network.get(url, { "User-Agent": this.ua });
            const html = (typeof response === 'object') ? response.data : response;
            
            const comics = [];
            const regex = /href="([^"]+\/comic\/[^"]+)"[^>]*title="([^"]+)"/g;
            let m;
            while ((m = regex.exec(html)) !== null) {
                comics.push(new Comic({
                    id: this._fixUrl(m[1]),
                    title: m[2].trim(),
                    cover: ""
                }));
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
