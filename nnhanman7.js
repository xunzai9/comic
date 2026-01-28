class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.0.2"
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    getHeaders() {
        return {
            "Referer": this.url + "/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    }

    explore = [{
        title: "最新更新",
        type: "multiPartPage",
        load: async () => {
            try {
                const res = await Network.get(this.url, { headers: this.getHeaders() });
                const comics = [];
                
                // 优化后的正则：专门针对你源码中的 <li> 结构
                // 匹配 href, title 和 srcset 中的图片链接
                const regex = /<li>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?srcset="([^"\s]+)"/g;

                let match;
                while ((match = regex.exec(res)) !== null) {
                    let comicId = match[1];
                    let title = match[2];
                    let cover = match[3];

                    // 排除重复项或非漫画链接
                    if (comicId.includes('/comic/') && !comics.find(c => c.id === comicId)) {
                        comics.push({
                            id: comicId,
                            title: title,
                            cover: cover
                        });
                    }
                }

                return [{
                    title: "最近更新",
                    comics: comics
                }];
            } catch (e) {
                return [];
            }
        }
    }]

    // 搜索、详情和章节部分保持之前的逻辑，但确保 ID 处理正确
    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.url + id, { headers: this.getHeaders() });
            const chapters = [];
            // 针对该站点的章节正则
            const chapterRegex = /href="([^"]+)"[^>]*title="([^"]*第[^"]*话[^"]*)"/g;
            let m;
            while ((m = chapterRegex.exec(res)) !== null) {
                chapters.push({ id: m[1], title: m[2] });
            }
            return {
                title: "漫画详情", // 建议从res中正则提取
                chapters: chapters.reverse() // 首页显示是倒序，这里反转回正序
            };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(this.url + epId, { headers: this.getHeaders() });
            const images = [];
            const imgRegex = /img\s+src="([^"]+)"/g;
            let m;
            while ((m = imgRegex.exec(res)) !== null) {
                if(m[1].includes('jmpic')) images.push(m[1]);
            }
            return { images };
        }
    }
}
