const fetch = require('node-fetch');
var egsCrawler = require('epic-games-store-crawler');
var crawler = egsCrawler.Crawler;

module.exports = async function (discount, mustSame = false) {
    let settings = { method: "Get" };
    let url = {
        steam: "https://store.steampowered.com/api/featuredcategories",
        epic: "https://www.epicgames.com/store/api/featured",
    };
    let games = [];

    await fetchSteamGames(games, url, settings, discount, mustSame);
    await fetchEpicGames(games, url, settings, discount, mustSame);
    // console.log(games)
    return games;
}

async function fetchSteamGames(games, url, settings, discount, mustSame) {
    let gamesList = "";

    await fetch(url.steam, settings)
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
}

async function fetchEpicGames(games, url, settings, discount, mustSame) {
    let gamesList = await crawler.getItems({
        allowedCountries: 'FR',
        category: 'games/edition/base|bundle/games|editors',
        count: 1000,
        country: 'FR',
        locale: 'fr'
    });

    // gamesList = gamesList.items;
    if (mustSame) {
        for (i = 0; i < gamesList.Catalog.searchStore.elements.length; i++) {
            discount_percent =(parseInt(gamesList.Catalog.searchStore.elements[i].price.totalPrice.discount) / parseInt(gamesList.Catalog.searchStore.elements[i].price.totalPrice.originalPrice) * 100).toFixed(0);
            if (gamesList.Catalog.searchStore.elements[i].price.totalPrice.discount > 0 && discount_percent == discount) {
                discount_expiration = new Date(gamesList.Catalog.searchStore.elements[i].promotions.promotionalOffers[0].promotionalOffers[0].endDate).getTime();
                
                // console.log();
                games.push({
                    game: gamesList.Catalog.searchStore.elements[i].title,
                    platform: "epic",
                    gameId: gamesList.Catalog.searchStore.elements[i].id,
                    discount_expiration: discount_expiration,
                    discount_percent: discount_percent,
                    price: gamesList.Catalog.searchStore.elements[i].price.totalPrice.discountPrice
                })
            }
        }
    } else {
        for (i = 0; i < gamesList.Catalog.searchStore.elements.length; i++) {
            discount_percent =(parseInt(gamesList.Catalog.searchStore.elements[i].price.totalPrice.discount) / parseInt(gamesList.Catalog.searchStore.elements[i].price.totalPrice.originalPrice) * 100).toFixed(0);
            if (gamesList.Catalog.searchStore.elements[i].price.totalPrice.discount > 0 && discount_percent >= discount) {
                discount_expiration = new Date(gamesList.Catalog.searchStore.elements[i].promotions.promotionalOffers[0].promotionalOffers[0].endDate).getTime();
                
                // console.log();
                games.push({
                    game: gamesList.Catalog.searchStore.elements[i].title,
                    platform: "epic",
                    gameId: gamesList.Catalog.searchStore.elements[i].id,
                    discount_expiration: discount_expiration,
                    discount_percent: discount_percent,
                    price: gamesList.Catalog.searchStore.elements[i].price.totalPrice.discountPrice
                })
            }
        }
    }
}