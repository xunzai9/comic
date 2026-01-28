(function() {
    return {
        name: "nnhm",
        key: "nnhanman7_test",
        version: "1.0.17",
        minAppVersion: "1.0.0",
        url: "https://nnhanman7.com",
        searchOptions: [],
        explore: [],
        comic: {
            loadInfo: function(id) { return Promise.resolve({}); },
            loadEp: function(c, e) { return Promise.resolve({}); }
        }
    };
})();
