const fetch = require('node-fetch');

module.exports = async function () {
    let settings = { method: "Get" };
    let url = "https://store.steampowered.com/api/featuredcategories"
    let steamGamesList = "";
    let games = [];
    await fetch(url, settings)
        .then(res => res.json())
        .then(json => { steamGamesList = json })
        for (let i = 0; i < steamGamesList["specials"]["items"].length; i++) {

            let gameName = String(steamGamesList["specials"]["items"][i]["name"]);
            let discount_percent = String(steamGamesList["specials"]["items"][i]["discount_percent"]);
            let discounted = String(steamGamesList["specials"]["items"][i]["discounted"]);
            let discount_expiration = String(steamGamesList["specials"]["items"][i]["discount_expiration"]);
            let price = String(steamGamesList["specials"]["items"][i]["final_price"]);
            let gameId = String(steamGamesList["specials"]["items"][i]["id"]);
            let platform = "steam"

            if(discounted && discount_percent == 50) {
                games.push({
                    game: gameName,
                    platform: platform,
                    gameId: gameId,
                    discount_expiration: discount_expiration,
                    discount_percent: discount_percent,
                    price: price
                })
            }
        }
    return games;
}