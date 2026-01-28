class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.7.1";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
        };
    }

    // 路径补全
    fix(u) {
        if (!u) return "";
        let res = u.replace(/\\/g, "").trim();
        if (res.startsWith("//")) return "https:" + res;
        if (res.startsWith("/") && !res.startsWith("//")) return this.url + res;
        return res;
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                // 请求目录页，它的数据排布比首页更紧凑
                const res = await Network.get(this.url + "/catalog.php?orderby=active_time", this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                const comics = [];
                
                // 方案：直接全局搜索所有的 <li> 块内容
                // 即使 HTML 断了，只要抓到一组 href 和 title 就能显示
                const itemRegex = /<li[^>]*>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?srcset="([^" ,]+)/g;
                
                let m;
                while ((m = itemRegex.exec(html)) !== null) {
                    const id = this.fix(m[1]);
                    // 只抓取漫画链接，过滤搜索词链接
                    if (id.includes('/comic/')) {
                        comics.push({
                            id: id,
                            title: m[2].trim(),
                            cover: this.fix(m[3])
                        });
                    }
                }

                // 兜底：如果带封面的正则没抓到（可能 srcset 还没加载出来就断了）
                // 就用最简单的链接+标题正则再扫一遍
                if (comics.length === 0) {
                    const simpleRegex = /href="(\/comic\/[^"]+?\.html)"[^>]*title="([^"]+)"/g;
                    let sm;
                    while ((sm = simpleRegex.exec(html)) !== null) {
                        const sid = this.fix(sm[1]);
                        if (!comics.find(c => c.id === sid)) {
                            comics.push({ id: sid, title: sm[2].trim(), cover: "" });
                        }
                    }
                }

                return [{ title: "全站更新", comics: comics }];
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.fix(id), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const chapters = [];
            const cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = cpRegex.exec(html)) !== null) {
                const cTitle = m[2].replace(/<[^>]+>/g, "").trim();
                if (cTitle && !cTitle.includes("首页")) {
                    chapters.push({ id: this.fix(m[1]), title: cTitle });
                }
            }
            return { title: titleMatch ? titleMatch[1].trim() : "漫画详情", chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(this.fix(epId), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const images = [];
            const imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            let m;
            while ((m = imgRegex.exec(html)) !== null) {
                const imgUrl = this.fix(m[1]);
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
            const regex = /href="([^"]+\/comic\/[^"]+)"[^>]*title="([^"]+)"/g;
            let m;
            while ((m = regex.exec(html)) !== null) {
                comics.push({ id: this.fix(m[1]), title: m[2].trim(), cover: "" });
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
