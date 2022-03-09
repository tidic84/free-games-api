const fetch = require('node-fetch');

module.exports = async function (discount, mustSame = false) {
    let settings = { method: "Get" };
    let url = {
        steam: "https://store.steampowered.com/api/featuredcategories",
        epic: "https://www.epicgames.com/store/api/featured",
    };
    let gamesList = "";
    let games = [];
    await fetch(url, settings)
        .then(res => res.json())
        .then(json => { gamesList = json })
        for (let i = 0; i < gamesList["specials"]["items"].length; i++) {

            let gameName = String(gamesList["specials"]["items"][i]["name"]);
            let discount_percent = String(gamesList["specials"]["items"][i]["discount_percent"]);
            let discounted = String(gamesList["specials"]["items"][i]["discounted"]);
            let discount_expiration = String(gamesList["specials"]["items"][i]["discount_expiration"]);
            let price = String(gamesList["specials"]["items"][i]["final_price"]);
            let gameId = String(gamesList["specials"]["items"][i]["id"]);
            let platform = "steam"

            if (mustSame) {
                if(discounted && discount_percent == discount) {
                    games.push({
                        game: gameName,
                        platform: platform,
                        gameId: gameId,
                        discount_expiration: discount_expiration,
                        discount_percent: discount_percent,
                        price: price
                    })
                }
            } else {
                if(discounted && discount_percent >= discount) {
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
        }
    return games;
}