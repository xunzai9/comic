class NnHanManSource extends ComicSource {
    name = "鸟鸟韩漫"
    key = "nnhanman7"
    version = "1.0.3"
    minAppVersion = "1.0.0"
    url = "https://nnhanman7.com"

    // 必须要有的空声明，防止部分版本软件报错
    searchOptions = []

    getHeaders() {
        return {
            "Referer": this.url + "/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    }

    // 发现页：修正正则逻辑
    explore = [{
        title: "最新更新",
        type: "multiPartPage",
        load: async () => {
            const res = await Network.get(this.url, { headers: this.getHeaders() });
            const comics = [];
            // 采用更稳健的匹配方式，直接抓取 <a> 标签和里面的图片
            const regex = /<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"/g;
            let match;
            while ((match = regex.exec(res)) !== null) {
                const id = match[1];
                if (id.includes('/comic/')) {
                    comics.push({
                        id: id,
                        title: match[2],
                        cover: match[3]
                    });
                }
            }
            return [{ title: "首页推荐", comics: comics }];
        }
    }]

    // 详情页：增加容错
    comic = {
        loadInfo: async (id) => {
            const res = await Network.get(this.url + id, { headers: this.getHeaders() });
            const chapters = [];
            // 匹配该站点的章节列表结构
            const chapterRegex = /href="([^"]+)"[^>]*>([\s\S]*?第[\s\S]*?话[\s\S]*?)<\/a>/g;
            let m;
            while ((m = chapterRegex.exec(res)) !== null) {
                chapters.push({
                    id: m[1],
                    title: m[2].replace(/<[^>]+>/g, "").trim()
                });
            }
            return {
                title: "漫画详情",
                chapters: chapters
            };
        },
        loadEp: async (comicId, epId) => {
            const res = await Network.get(this.url + epId, { headers: this.getHeaders() });
            const images = [];
            const imgRegex = /img[^>]+src="([^"]+)"/g;
            let m;
            while ((m = imgRegex.exec(res)) !== null) {
                if (m[1].includes('jmpic')) images.push(m[1]);
            }
            return { images };
        }
    }

    // 必须要有的空实现，防止 TypeError
    onTagSuggestionSelected(keyword) {
        return null;
    }
}
