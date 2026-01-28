class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.5";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept-Encoding": "gzip, deflate", // 强制指定编码，防止流式传输截断
            "Connection": "keep-alive"
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
            title: "全部更新",
            type: "singlePage",
            load: async (page) => {
                const res = await Network.get(this.url, this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                const comics = [];
                // 放弃正则匹配 li 整体，改用最基础的 link 和 title 提取
                // 这样即使 HTML 有残缺，只要 href 和 title 还在同一行就能抓到
                const lines = html.split('<li');
                
                for (let line of lines) {
                    // 只处理包含漫画链接的行
                    if (line.includes('/comic/') && line.includes('title=')) {
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

                // 简单的去重
                const seen = new Set();
                return comics.filter(c => {
                    const duplicate = seen.has(c.id);
                    seen.add(c.id);
                    return !duplicate;
                });
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.fixUrl(id), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            if (!html) return { title: "Error", chapters: [] };

            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const chapters = [];
            // 章节解析：寻找包含 chapter 的所有链接
            const parts = html.split('href="');
            for (let i = 1; i < parts.length; i++) {
                const chunk = parts[i].split('"')[0];
                if (chunk.includes('/chapter/')) {
                    const titlePart = parts[i].split('>')[1] ? parts[i].split('>')[1].split('<')[0] : "章节";
                    const cleanTitle = titlePart.trim();
                    if (cleanTitle && !cleanTitle.includes("首页")) {
                        chapters.push({ id: this.fixUrl(chunk), title: cleanTitle });
                    }
                }
            }
            return { 
                title: titleMatch ? titleMatch[1].trim() : "漫画详情", 
                chapters: chapters.reverse() 
            };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(this.fixUrl(epId), this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const images = [];
            // 抓取正文图片
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
