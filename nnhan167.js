class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.7";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
        };
    }

    fixUrl(u) {
        if (!u) return "";
        let res = u.trim().replace(/\\/g, "");
        if (res.startsWith("//")) return "https:" + res;
        if (res.startsWith("/") && !res.startsWith("//")) return this.url + res;
        return res;
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPartPage",
            load: async (page) => {
                // 重点：不再请求首页，改为请求目录页，避开首页的加载截断问题
                const targetUrl = this.url + "/catalog.php?orderby=active_time";
                const res = await Network.get(targetUrl, this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                const comics = [];
                // 使用最稳健的分割法提取
                const parts = html.split('<li');
                for (let i = 1; i < parts.length; i++) {
                    const p = parts[i];
                    if (p.includes('/comic/')) {
                        const idM = /href="([^"]+)"/.exec(p);
                        const titleM = /title="([^"]+)"/.exec(p) || />([^<]+)<\/a>/.exec(p);
                        const coverM = /srcset="([^" ,]+)/.exec(p) || /src="([^"]+)"/.exec(p);

                        if (idM && titleM) {
                            comics.push({
                                id: this.fixUrl(idM[1]),
                                title: titleM[1].trim(),
                                cover: coverM ? this.fixUrl(coverM[1]) : ""
                            });
                        }
                    }
                }
                return [{ title: "目录更新", comics: comics }];
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.fixUrl(id), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const chapters = [];
            const cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = cpRegex.exec(html)) !== null) {
                const cTitle = m[2].replace(/<[^>]+>/g, "").trim();
                if (cTitle && !cTitle.includes("首页")) {
                    chapters.push({ id: this.fixUrl(m[1]), title: cTitle });
                }
            }
            return { title: titleMatch ? titleMatch[1].trim() : "详情", chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(this.fixUrl(epId), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const images = [];
            const imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            let m;
            while ((m = imgRegex.exec(html)) !== null) {
                const imgUrl = this.fixUrl(m[1]);
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
                comics.push({ id: this.fixUrl(m[1]), title: m[2].trim(), cover: "" });
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
