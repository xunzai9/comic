class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.9";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
        };
    }

    // 路径补全与 Unicode 强制转换
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
                const res = await Network.get(this.url + "/catalog.php?orderby=active_time", this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                let comics = [];

                // 1. 尝试从脚本变量中提取 (qTcmsWapTop)
                // 增加对 Unicode 编码的兼容性匹配
                const jsonMatch = /qTcmsWapTop\s*=\s*(\[[\s\S]*?\]);/.exec(html);
                if (jsonMatch) {
                    try {
                        // 使用正则表达式直接提取 name 和 url，避免 JSON.parse 在截断时报错
                        const itemRegex = /"url":"([^"]+)","name":"([^"]+)"/g;
                        let m;
                        while ((m = itemRegex.exec(jsonMatch[1])) !== null) {
                            // 解码 Unicode (\uXXXX)
                            let title = m[2].replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
                            comics.push({
                                id: this.fix(m[1]),
                                title: title,
                                cover: "" // 脚本里通常不带封面，交给下方的 HTML 匹配补全
                            });
                        }
                    } catch (e) {}
                }

                // 2. 尝试从 HTML 列表中提取 (包含封面)
                const listParts = html.split('<li');
                for (let i = 1; i < listParts.length; i++) {
                    const part = listParts[i];
                    if (part.includes('/comic/')) {
                        const idM = /href="([^"]+)"/.exec(part);
                        const titleM = /title="([^"]+)"/.exec(part) || />([^<]+)<\/a>/.exec(part);
                        const coverM = /srcset="([^" ,]+)/.exec(part) || /src="([^"]+)"/.exec(part);

                        if (idM && titleM) {
                            const cid = this.fix(idM[1]);
                            const ctitle = titleM[1].trim();
                            const ccover = coverM ? this.fix(coverM[1]) : "";
                            
                            // 如果刚才脚本已经抓到了，就更新它的封面，否则新增
                            let existing = comics.find(c => c.id === cid);
                            if (existing) {
                                if (!existing.cover) existing.cover = ccover;
                            } else {
                                comics.push({ id: cid, title: ctitle, cover: ccover });
                            }
                        }
                    }
                }

                return [{ title: "目录更新", comics: comics }];
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
            return { title: titleMatch ? titleMatch[1].trim() : "详情", chapters: chapters.reverse() };
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
