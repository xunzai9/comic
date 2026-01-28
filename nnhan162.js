class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.2";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    // 路径补全工具
    fixUrl(u) {
        if (!u) return "";
        let res = u.trim().replace(/\\/g, "");
        if (res.startsWith("//")) res = "https:" + res;
        return res;
    }

    explore = [
        {
            title: "首页",
            type: "multiPartPage",
            load: async (page) => {
                const res = await Network.get(this.url, this.getHeaders());
                const html = (typeof res === 'object') ? res.data : res;
                if (!html) return [];

                const result = [];
                // 更加鲁棒的板块切分，适配手机端 class 命名
                const sections = html.split(/class="imgBox"/i);
                
                for (let i = 1; i < sections.length; i++) {
                    const sectionHtml = sections[i].split(/<\/ul>/i)[0];
                    const titleMatch = /class="Title">([^<]+)</i.exec(sections[i]);
                    if (!titleMatch) continue;
                    
                    const sectionTitle = titleMatch[1].trim();
                    const comics = [];
                    // 核心修正：适配 picture 标签和 srcset 属性的多种写法
                    const itemRegex = /<li[^>]*>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?srcset="([^" ]+)/g;
                    
                    let m;
                    while ((m = itemRegex.exec(sectionHtml)) !== null) {
                        comics.push({
                            id: this.fixUrl(m[1]),
                            title: m[2].trim(),
                            cover: this.fixUrl(m[3])
                        });
                    }
                    if (comics.length > 0) result.push({ title: sectionTitle, comics: comics });
                }
                return result;
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const fullUrl = id.startsWith('http') ? id : (this.url + id);
            const res = await Network.get(fullUrl, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            
            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const chapters = [];
            // 修正：支持带或不带引号的 chapter 链接匹配
            const cpRegex = /href="([^"]*?\/chapter\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = cpRegex.exec(html)) !== null) {
                const cTitle = m[2].replace(/<[^>]+>/g, "").trim();
                if (cTitle && !cTitle.includes("首页")) {
                    chapters.push({
                        id: this.fixUrl(m[1]),
                        title: cTitle
                    });
                }
            }
            return { 
                title: titleMatch ? titleMatch[1].trim() : "详情", 
                chapters: chapters.reverse() 
            };
        },
        loadEp: async (comicId, epId) => {
            const fullUrl = epId.startsWith('http') ? epId : (this.url + epId);
            const res = await Network.get(fullUrl, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const images = [];
            // 抓取正文图片地址
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
