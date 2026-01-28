var source = {
    name: "鸟鸟韩漫",
    key: "nnhanman7",
    version: "1.0.8",
    minAppVersion: "1.0.0",
    url: "https://nnhanman7.com",

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
            var res = await Network.get("https://nnhanman7.com", { headers: this.getHeaders() });
            var comics = [];
            // 针对你提供源码的精准匹配：匹配 <li> 里的图片和标题
            var regex = /<li>[\s\S]*?href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?src="([^"]+)"/g;
            var match;
            while ((match = regex.exec(res)) !== null) {
                if (match[1].indexOf('/comic/') !== -1) {
                    comics.push({
                        id: match[1],
                        title: match[2],
                        cover: match[3]
                    });
                }
            }
            return [{ title: "首页推荐", comics: comics }];
        }
    }],

    comic: {
        loadInfo: async function(id) {
            var res = await Network.get("https://nnhanman7.com" + id, { headers: { "Referer": "https://nnhanman7.com/" } });
            var chapters = [];
            var reg = /href="([^"]+)"[^>]*>([\s\S]*?第[\s\S]*?话[\s\S]*?)<\/a>/g;
            var m;
            while ((m = reg.exec(res)) !== null) {
                chapters.push({ id: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() });
            }
            return { title: "漫画详情", chapters: chapters };
        },
        loadEp: async function(comicId, epId) {
            var res = await Network.get("https://nnhanman7.com" + epId, { headers: { "Referer": "https://nnhanman7.com/" } });
            var images = [];
            var m, reg = /img[^>]+src="([^"]+)"/g;
            while ((m = reg.exec(res)) !== null) {
                if (m[1].indexOf('jmpic') !== -1) images.push(m[1]);
            }
            return { images: images };
        }
    }
};

// 漫阅+ 必须要这一行
// @ts-ignore
module.exports = source;
