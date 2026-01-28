class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.8";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
        };
    }

    // 路径修复与 Unicode 解码
    fix(str) {
        if (!str) return "";
        let s = str.replace(/\\/g, "").trim();
        try {
            return decodeURIComponent(JSON.parse('"' + s + '"'));
        } catch (e) { return s; }
    }

    explore = [
        {
            title: "全站更新",
            type: "multiPartPage",
            load: async (page) => {
                // 请求目录页，获取最纯净的脚本数据
                const res = await Network.get(this.url + "/catalog.php?orderby=active_time", this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                const comics = [];

                // 方案 A：从脚本变量 qTcmsWapTop 中提取（速度最快）
                const jsonMatch = /var qTcmsWapTop\s*=\s*(\[[\s\S]*?\]);/.exec(html);
                if (jsonMatch) {
                    try {
                        const rawData = JSON.parse(jsonMatch[1]);
                        rawData.forEach(item => {
                            if (item.url && item.url.includes('/comic/')) {
                                comics.push({
                                    id: item.url,
                                    title: item.name,
                                    cover: item.pic || "" // 如果有封面字段则使用
                                });
                            }
                        });
                    } catch (e) {}
                }

                // 方案 B：如果脚本没抓到，使用行扫描法抓取 HTML 列表（双重保险）
                if (comics.length === 0) {
                    const lines = html.split('<li');
                    for (let line of lines) {
                        if (line.includes('/comic/')) {
                            const idM = /href="([^"]+)"/.exec(line);
                            const titleM = /title="([^"]+)"/.exec(line) || />([^<]+)<\/a>/.exec(line);
                            const coverM = /srcset="([^" ,]+)/.exec(line) || /src="([^"]+)"/.exec(line);
                            if (idM && titleM) {
                                comics.push({
                                    id: idM[1].replace(/\\/g, ""),
                                    title: titleM[1].trim(),
                                    cover: coverM ? coverM[1].replace(/\\/g, "") : ""
                                });
                            }
                        }
                    }
                }

                // 统一补全域名
                comics.forEach(c => {
                    if (c.id && c.id.startsWith('/')) c.id = this.url + c.id;
                    if (c.cover && c.cover.startsWith('//')) c.cover = "https:" + c.cover;
                    else if (c.cover && c.cover.startsWith('/')) c.cover = this.url + c.cover;
                });

                return [{ title: "最新韩漫", comics: comics }];
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(id, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const chapters = [];
            const cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = cpRegex.exec(html)) !== null) {
                const cLink = m[1].startsWith('http') ? m[1] : (this.url + m[1]);
                const cTitle = m[2].replace(/<[^>]+>/g, "").trim();
                if (cTitle && !cTitle.includes("首页")) {
                    chapters.push({ id: cLink, title: cTitle });
                }
            }
            return { title: titleMatch ? titleMatch[1].trim() : "详情", chapters: chapters.reverse() };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(epId, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const images = [];
            const imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            let m;
            while ((m = imgRegex.exec(html)) !== null) {
                let imgUrl = m[1];
                if (imgUrl.startsWith('//')) imgUrl = "https:" + imgUrl;
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
                let link = m[1];
                if (link.startsWith('/')) link = this.url + link;
                comics.push({ id: link, title: m[2].trim(), cover: "" });
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
