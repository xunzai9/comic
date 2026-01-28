class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.6";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
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
            title: "全部推荐",
            type: "multiPartPage", // 必须是这个类型
            load: async (page) => {
                const res = await Network.get(this.url, this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                const comics = [];
                // 采用“行扫描”法，无视 HTML 是否闭合
                // 只要这一行包含漫画特征就抓取
                const lines = html.split('<li');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.includes('/comic/') && (line.includes('title=') || line.includes('srcset='))) {
                        const idM = /href="([^"]+)"/.exec(line);
                        const titleM = /title="([^"]+)"/.exec(line);
                        const coverM = /srcset="([^" ,]+)/.exec(line) || /src="([^"]+)"/.exec(line);

                        if (idM && titleM) {
                            comics.push({
                                id: this.fixUrl(idM[1]),
                                title: titleM[1].trim(),
                                cover: coverM ? this.fixUrl(coverM[1]) : ""
                            });
                        }
                    }
                }

                // 移除重复项
                const seen = new Set();
                const uniqueComics = comics.filter(c => {
                    if (seen.has(c.id)) return false;
                    seen.add(c.id);
                    return true;
                });

                // 封装成 multiPartPage 需要的格式
                return [{
                    title: "最新更新",
                    comics: uniqueComics
                }];
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.fixUrl(id), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            if (!html) return { title: "加载失败", chapters: [] };

            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const chapters = [];
            // 章节匹配
            const cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = cpRegex.exec(html)) !== null) {
                const cTitle = m[2].replace(/<[^>]+>/g, "").trim();
                if (cTitle && !cTitle.includes("首页")) {
                    chapters.push({ id: this.fixUrl(m[1]), title: cTitle });
                }
            }
            return { 
                title: titleMatch ? titleMatch[1].trim() : "详情", 
                chapters: chapters.reverse() 
            };
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
