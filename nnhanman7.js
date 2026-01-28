var source = {
    name: "鸟鸟韩漫",
    key: "nnhanman7",
    version: "1.0.6",
    minAppVersion: "1.0.0",
    url: "https://nnhanman7.com",
    searchOptions: [],

    getHeaders: function() {
        return {
            "Referer": "https://nnhanman7.com/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        };
    },

    explore: [{
        title: "最新更新",
        type: "multiPartPage",
        load: async function() {
            try {
                var res = await Network.get("https://nnhanman7.com", { headers: this.getHeaders() });
                var comics = [];
                var regex = /<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"/g;
                var match;
                while ((match = regex.exec(res)) !== null) {
                    var id = match[1];
                    if (id.indexOf('/comic/') !== -1) {
                        comics.push({
                            id: id,
                            title: match[2],
                            cover: match[3]
                        });
                    }
                }
                return [{ title: "首页更新", comics: comics }];
            } catch (e) {
                return [];
            }
        }
    }],

    comic: {
        loadInfo: async function(id) {
            var res = await Network.get("https://nnhanman7.com" + id, { 
                headers: { "Referer": "https://nnhanman7.com/" } 
            });
            var chapters = [];
            var chapterRegex = /href="([^"]+)"[^>]*>([\s\S]*?第[\s\S]*?话[\s\S]*?)<\/a>/g;
            var m;
            while ((m = chapterRegex.exec(res)) !== null) {
                chapters.push({
                    id: m[1],
                    title: m[2].replace(/<[^>]+>/g, "").trim()
                });
            }
            return { title: "漫画详情", chapters: chapters };
        },
        loadEp: async function(comicId, epId) {
            var res = await Network.get("https://nnhanman7.com" + epId, { 
                headers: { "Referer": "https://nnhanman7.com/" } 
            });
            var images = [];
            var imgRegex = /img[^>]+src="([^"]+)"/g;
            var m;
            while ((m = imgRegex.exec(res)) !== null) {
                if (m[1].indexOf('jmpic') !== -1) images.push(m[1]);
            }
            return { images: images };
        }
    },

    onTagSuggestionSelected: function(keyword) {
        return null;
    }
};
