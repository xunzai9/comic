class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫";
    key = "nnhanman7";
    version = "1.6.1";
    minAppVersion = "1.0.0";
    url = "https://nnhanman7.com";

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Referer": this.url + "/"
        };
    }

    clean(str) {
        return str ? str.trim().replace(/\\/g, "") : "";
    }

    explore = [
        {
            title: "首页",
            type: "multiPartPage",
            load: async (page) => {
                try {
                    const res = await Network.get(this.url, this.getHeaders());
                    const html = (typeof res === 'object') ? res.data : res;
                    if (!html) return [];

                    const result = [];
                    const sections = html.split('<div class="imgBox">');
                    
                    for (let i = 1; i < sections.length; i++) {
                        const sectionHtml = sections[i].split('</div>')[0] + sections[i];
                        const titleMatch = /<span class="Title">\s*([^<]+?)\s*<\/span>/i.exec(sectionHtml);
                        if (!titleMatch) continue;
                        
                        const sectionTitle = titleMatch[1].trim();
                        const comics = [];
                        // 匹配 <li> 内的漫画信息
                        const itemRegex = /<li>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?srcset="([^" ]+)/g;
                        let m;
                        while ((m = itemRegex.exec(sectionHtml)) !== null) {
                            comics.push({
                                id: this.clean(m[1]),
                                title: this.clean(m[2]),
                                cover: this.clean(m[3])
                            });
                        }
                        if (comics.length > 0) result.push({ title: sectionTitle, comics: comics });
                    }
                    return result;
                } catch (e) {
                    return [];
                }
            }
        }
    ];

    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.url + id, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            if (!html) return { title: "加载失败", chapters: [] };

            const titleMatch = /<h1>(.*?)<\/h1>/i.exec(html) || /<title>(.*?) - /i.exec(html);
            const chapters = [];
            // 只匹配正式章节，避开“首页”链接
            const cpRegex = /href="(\/comic\/[^"]*?\/chapter-[^"]*?\.html)"[^>]*>([\s\S]*?)<\/a>/g;
            let m;
            while ((m = cpRegex.exec(html)) !== null) {
                chapters.push({
                    id: this.clean(m[1]),
                    title: this.clean(m[2].replace(/<[^>]+>/g, ""))
                });
            }
            return { 
                title: titleMatch ? this.clean(titleMatch[1]) : "未知漫画", 
                chapters: chapters.reverse() 
            };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(this.url + epId, this.getHeaders());
            const html = (typeof res === 'object') ? res.data : res;
            const images = [];
            const imgRegex = /src="([^"]+?\.(?:jpg|png|webp|jpeg)[^"]*?)"/gi;
            let m;
            while ((m = imgRegex.exec(html)) !== null) {
                const imgUrl = this.clean(m[1]);
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
            const regex = /href="(\/comic\/[^"]+?\.html)"[^>]*title="([^"]+)"/g;
            let m;
            while ((m = regex.exec(html)) !== null) {
                comics.push({ id: this.clean(m[1]), title: this.clean(m[2]), cover: "" });
            }
            return { comics: comics };
        }
    };
}

new NnHanManSource();
