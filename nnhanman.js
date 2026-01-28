// @ts-ignore
var source = {
    name: "鸟鸟韩漫",
    key: "nnhanman7",
    version: "1.0.7",
    minAppVersion: "1.0.0",
    url: "https://nnhanman7.com",
    searchOptions: [],
    getHeaders: function() {
        return { "Referer": "https://nnhanman7.com/", "User-Agent": "Mozilla/5.0 (Mobile) Safari/537.36" };
    },
    explore: [{
        title: "首页",
        type: "multiPartPage",
        load: function() {
            return Network.get("https://nnhanman7.com", { "Referer": "https://nnhanman7.com/" })
                .then(function(res) {
                    var comics = [];
                    var regex = /<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"/g;
                    var match;
                    while ((match = regex.exec(res)) !== null) {
                        if (match[1].indexOf('/comic/') !== -1) {
                            comics.push({ id: match[1], title: match[2], cover: match[3] });
                        }
                    }
                    return [{ title: "首页推荐", comics: comics }];
                });
        }
    }],
    comic: {
        loadInfo: function(id) {
            return Network.get("https://nnhanman7.com" + id, { "Referer": "https://nnhanman7.com/" })
                .then(function(res) {
                    var chapters = [];
                    var regex = /href="([^"]+)"[^>]*>([\s\S]*?第[\s\S]*?话[\s\S]*?)<\/a>/g;
                    var m;
                    while ((m = regex.exec(res)) !== null) {
                        chapters.push({ id: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() });
                    }
                    return { title: "详情", chapters: chapters };
                });
        },
        loadEp: function(cId, eId) {
            return Network.get("https://nnhanman7.com" + eId, { "Referer": "https://nnhanman7.com/" })
                .then(function(res) {
                    var images = [];
                    var m, regex = /img[^>]+src="([^"]+)"/g;
                    while ((m = regex.exec(res)) !== null) {
                        if (m[1].indexOf('jmpic') !== -1) images.push(m[1]);
                    }
                    return { images: images };
                });
        }
    }
};
