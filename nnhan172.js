class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.7.2";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9"
        };
    }

    fix(u) {
        if (!u) return "";
        let res = u.replace(/\\/g, "").trim();
        if (res.startsWith("//")) return "https:" + res;
        if (res.startsWith("/") && !res.startsWith("//")) return this.url + res;
        return res;
    }

    explore = [
        {
            title: "最近更新",
            type: "multiPartPage",
            load: async (page) => {
                // 关键改动：请求带 page 参数的路径，避开缓存和某些截断策略
                const targetUrl = this.url + "/catalog.php?page=1&orderby=active_time";
                const res = await Network.get(targetUrl, this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                const comics = [];
                
                // 既然不需要 JSON，我们直接用最激进的 HTML 行匹配
                // 即使 HTML 断掉，只要能抓到一行 a 标签就算成功
                const parts = html.split('<li');
                for (let i = 1; i < parts.length; i++) {
                    const p = parts[i];
                    if (p.includes('/comic/')) {
                        // 尝试抓取 ID
                        const idM = /href="([^"]+)"/.exec(p);
                        // 尝试抓取标题（优先找 title 属性，找不到找 a 标签中间的内容）
                        const titleM = /title="([^"]+)"/.exec(p) || />([^<]+)<\/a>/.exec(p);
                        // 尝试抓取图片
                        const coverM = /srcset="([^" ,]+)/.exec(p) || /src="([^"]+)"/.exec(p);

                        if (idM && titleM) {
                            const cid = this.fix(idM[1]);
                            const ctitle = titleM[1].trim();
                            // 只有是真正的漫画链接才加入
                            if (cid.includes('/comic/') && !comics.find(c => c.id === cid)) {
                                comics.push({
                                    id: cid,
                                    title: ctitle,
                                    cover: coverM ? this.fix(coverM[1]) : ""
                                });
                            }
                        }
                    }
                }

                if (comics.length === 0) {
                    // 最终兜底：如果上面都没抓到，说明 HTML 真的断得太厉害
                    // 尝试抓取页面上任何看起来像漫画链接的东西
                    const fallbackRegex = /href="(\/comic\/[^"]+?\.html)"[^>]*>([^<]+)/g;
                    let f;
                    while ((f = fallbackRegex.exec(html)) !== null) {
                        comics.push({ id: this.fix(f[1]), title: f[2].trim(), cover: "" });
                    }
                }

                return [{ title: "更新列表", comics: comics }];
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
                if (ctitle && !ctitle.includes("首页")) {
                    chapters.push({ id: this.fix(m[1]), title: cTitle });
                }
            }
            return { title: titleMatch ? titleMatch[1].trim() : "漫画", chapters: chapters.reverse() };
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
