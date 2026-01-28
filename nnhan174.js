class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.7.4";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
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
            title: "全站更新",
            type: "multiPartPage",
            load: async (page) => {
                // 尝试访问目录页
                const res = await Network.get(this.url + "/catalog.php?orderby=active_time", this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                let comics = [];

                // --- 1. 脚本块防御性解析 ---
                // 使用极其宽松的正则，哪怕 JSON 不完整也能抓到里面的内容
                const itemRegex = /"url":"([^"]+)","name":"([^"]+)"/g;
                let m;
                while ((m = itemRegex.exec(html)) !== null) {
                    const cid = this.fix(m[1]);
                    // 只有包含 /comic/ 的才是漫画，排除关键词
                    if (cid.includes('/comic/')) {
                        let title = m[2].replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
                        comics.push({ id: cid, title: title, cover: "" });
                    }
                }

                // --- 2. HTML 暴力提取 ---
                // 针对 body 可能没加载出来的情况，直接在全文本搜寻 <li> 结构
                const listParts = html.split('<li');
                for (let i = 1; i < listParts.length; i++) {
                    const p = listParts[i];
                    if (p.includes('/comic/')) {
                        const idM = /href="([^"]+)"/.exec(p);
                        const titleM = /title="([^"]+)"/.exec(p) || />([^<]+)<\/a>/.exec(p);
                        const coverM = /srcset="([^" ,]+)/.exec(p) || /src="([^"]+)"/.exec(p);

                        if (idM && titleM) {
                            const cid = this.fix(idM[1]);
                            const ctitle = titleM[1].trim();
                            let existing = comics.find(c => c.id === cid);
                            if (existing) {
                                if (!existing.cover) existing.cover = coverM ? this.fix(coverM[1]) : "";
                            } else {
                                comics.push({ id: cid, title: ctitle, cover: coverM ? this.fix(coverM[1]) : "" });
                            }
                        }
                    }
                }

                // --- 3. 终极自救方案 ---
                // 如果以上都没抓到（因为网页断得太早），尝试去抓取“搜索词”并把它们转换成搜索任务（可选逻辑）
                // 这里暂时保持返回，如果列表为空，用户可以尝试搜索

                return [{ title: "目录列表", comics: comics }];
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
            // 搜索页通常结构简单，更容易加载成功
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
