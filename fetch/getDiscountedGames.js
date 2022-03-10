const fetch = require('node-fetch');
var egsCrawler = require('epic-games-store-crawler');
var crawler = egsCrawler.Crawler;

module.exports = async function (discount, mustSame = false) {
    let settings = { method: "Get" };
    let steam_url = "https://store.steampowered.com/api/featuredcategories";

    let games = [];

    await fetchSteamGames(games, steam_url, settings, discount, mustSame);
    await fetchEpicGames(games, settings, discount, mustSame);
    return games;
}

async function fetchSteamGames(games, steam_url, settings, discount, mustSame) {
    console.log("Fetching steam games...");
    let gamesList = "";

    await fetch(steam_url, settings)
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

async function fetchEpicGames(games, settings, discount, mustSame) {
    console.log("Fetching epic games...");
    let gamesList = "";
    if (discount == 'free' || discount == "100" || discount == 100) {
        gamesList = await crawler.getFreeGames({
            allowCountries: 'FR',
            country: 'FR',
            locale: 'fr'
        });
        gamesList = gamesList.Catalog.searchStore.elements
        // console.log(gamesList)
        for (i in gamesList) {
            if(gamesList[i].price.totalPrice.discountPrice == 0 && gamesList[i].price.totalPrice.discount != 0) {
                games.push({
                    game: gamesList[i].title,
                    platform: "epic",
                    gameId: gamesList[i].id,
                    discount_percent: `${100}`,
                    price: `${gamesList[i].price.totalPrice.discountPrice}`
                })
            }
        }
        return
    }

    gamesList = await crawler.getItems({
        allowedCountries: 'FR',
        category: 'games/edition/base|bundle/games|editors',
        count: 1000,
        country: 'FR',
        locale: 'fr'
    });
    if (mustSame) {
        for (i = 0; i < gamesList.Catalog.searchStore.elements.length; i++) {
            discount_percent =(parseInt(gamesList.Catalog.searchStore.elements[i].price.totalPrice.discount) / parseInt(gamesList.Catalog.searchStore.elements[i].price.totalPrice.originalPrice) * 100).toFixed(0);
            if (gamesList.Catalog.searchStore.elements[i].price.totalPrice.discount > 0 && discount_percent == discount) {
                discount_expiration = new Date(gamesList.Catalog.searchStore.elements[i].promotions.promotionalOffers[0].promotionalOffers[0].endDate).getTime();
                
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
                
                games.push({
                    game: gamesList.Catalog.searchStore.elements[i].title,
                    platform: "epic",
                    gameId: gamesList.Catalog.searchStore.elements[i].id,
                    discount_expiration: discount_expiration,
                    discount_percent: discount_percent,
                    price: `${gamesList.Catalog.searchStore.elements[i].price.totalPrice.discountPrice}`
                })
            }
        }
    }
}