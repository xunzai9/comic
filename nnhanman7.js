const source = {
    name: "鸟鸟韩漫",
    key: "nnhanman7",
    version: "1.0.5",
    minAppVersion: "1.0.0",
    url: "https://nnhanman7.com",
    searchOptions: [],

    getHeaders: function() {
        return {
            "Referer": "https://nnhanman7.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
    },

    explore: [{
        title: "最新更新",
        type: "multiPartPage",
        load: async function() {
            try {
                const res = await Network.get("https://nnhanman7.com", { headers: this.getHeaders() });
                const comics = [];
                // 首页列表正则
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
            } catch (e) {
                return [];
            }
        }
    }],

    comic: {
        loadInfo: async function(id) {
            const baseUrl = "https://nnhanman7.com";
            const res = await Network.get(baseUrl + id, { 
                headers: { "Referer": baseUrl + "/" } 
            });
            const chapters = [];
            const chapterRegex = /href="([^"]+)"[^>]*>([\s\S]*?第[\s\S]*?话[\s\S]*?)<\/a>/g;
            let m;
            while ((m = chapterRegex.exec(res)) !== null) {
                chapters.push({
                    id: m[1],
                    title: m[2].replace(/<[^>]+>/g, "").trim()
                });
            }
            return { title: "漫画详情", chapters: chapters };
        },
        loadEp: async function(comicId, epId) {
            const baseUrl = "https://nnhanman7.com";
            const res = await Network.get(baseUrl + epId, { 
                headers: { "Referer": baseUrl + "/" } 
            });
            const images = [];
            const imgRegex = /img[^>]+src="([^"]+)"/g;
            let m;
            while ((m = imgRegex.exec(res)) !== null) {
                if (m[1].includes('jmpic')) images.push(m[1]);
            }
            return { images: images };
        }
    },

    onTagSuggestionSelected: function(keyword) {
        return null;
    }
};

// 漫阅+ 最终识别的是这个变量
// @ts-ignore
module.exports = source;
