class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.8.1";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

    _fixUrl(u) {
        if (!u) return "";
        let res = u.replace(/\\/g, "").trim();
        if (res.startsWith("//")) return "https:" + res;
        if (res.startsWith("/") && !res.startsWith("//")) return this.url + res;
        return res;
    }

    explore = [
        {
            title: "全站更新",
            type: "multiPageComicList",
            load: async (page) => {
                const targetUrl = `${this.url}/catalog.php?page=${page}&orderby=active_time`;
                const response = await Network.get(targetUrl, { "User-Agent": this.ua });
                
                // --- 修复点：确保获取到正确的 HTML 文本 ---
                let html = "";
                if (typeof response === 'string') {
                    html = response;
                } else if (response && response.body) {
                    html = response.body; // 对齐 Manhwa18cc 的写法
                } else if (response && response.data) {
                    html = response.data;
                }

                if (!html) return { comics: [], maxPage: page };

                const comics = [];
                // 使用 split 分割块，即便 HTML 不完整也能解析出部分
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

                // 降级处理：脚本热搜词
                if (comics.length === 0) {
                    const hotRegex = /"url":"([^"]+)","name":"([^"]+)"/g;
                    let m;
                    while ((m = hotRegex.exec(html)) !== null) {
                        let title = m[2].replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
                        let curUrl = this._fixUrl(m[1]);
                        if (!comics.find(c => c.id === curUrl)) {
                            comics.push(new Comic({
                                id: curUrl,
                                title: "[热词] " + title,
                                cover: "",
                                url: curUrl
                            }));
                        }
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
            let html = (typeof response === 'string') ? response : (response.body || response.data || "");
            
            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const title = titleMatch ? titleMatch[1].trim() : "漫画详情";

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
            let html = (typeof response === 'string') ? response : (response.body || response.data || "");
            
            const images = [];
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
            let html = (typeof response === 'string') ? response : (response.body || response.data || "");
            
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
            return
