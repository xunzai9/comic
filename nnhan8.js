var source = {
    name: "鸟鸟韩漫",
    key: "nnhanman7",
    version: "1.0.10",
    minAppVersion: "1.0.0",
    url: "https://nnhanman7.com",
    
    // 漫阅+ 必须的基础配置
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
        load: function() {
            return Network.get("https://nnhanman7.com", { "Referer": "https://nnhanman7.com/" })
                .then(function(res) {
                    var comics = [];
                    // 使用极简正则防止解析超时
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
                });
        }
    }],

    comic: {
        loadInfo: function(id) {
            return Network.get("https://nnhanman7.com" + id, { "Referer": "https://nnhanman7.com/" })
                .then(function(res) {
                    var chapters = [];
                    var reg = /href="([^"]+)"[^>]*>([\s\S]*?第[\s\S]*?话[\s\S]*?)<\/a>/g;
                    var m;
                    while ((m = reg.exec(res)) !== null) {
                        chapters.push({ 
                            id: m[1], 
                            title: m[2].replace(/<[^>]+>/g, "").trim() 
                        });
                    }
                    return { title: "漫画详情", chapters: chapters };
                });
        },
        loadEp: function(comicId, epId) {
            return Network.get("https://nnhanman7.com" + epId, { "Referer": "https://nnhanman7.com/" })
                .then(function(res) {
                    var images = [];
                    var m, reg = /img[^>]+src="([^"]+)"/g;
                    while ((m = reg.exec(res)) !== null) {
                        if (m[1].indexOf('jmpic') !== -1) images.push(m[1]);
                    }
                    return { images: images };
                });
        }
    },

    // 必须保留，解决 property of undefined 报错
    onTagSuggestionSelected: function(keyword) {
        return null;
    }
};

// 严谨的导出判定
if (typeof module !== 'undefined' && module.exports) {
    module.exports = source;
} else {
    source; // 确保脚本最后返回对象本身
}
