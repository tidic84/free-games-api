const { EpicFreeGames } = require('epic-free-games');
const epicFreeGames = new EpicFreeGames({ country: 'FR', locale: 'fr', includeAll: true })
const STEAM_API_KEY = '79F267CAA9E32FC09113E65B6D76DD4A';
const cheerio = require('cheerio');

module.exports = async function () {
    let games = [];
    await fetchEpicGames(games);
    await fetchSteamGames(games);
    return games;
}

async function fetchEpicGames(games) {
    await epicFreeGames.getGames().then(res => {
        for (i = 0; i < res.currentGames.length; i++) {
            games.push({
                game: res.currentGames[i].title,
                platform: "epic",
                gameId: res.currentGames[i].id,
                price: res.currentGames[i].price.totalPrice.discountPrice, // Delete after
            })
            console.log(res.currentGames[i].title)
        }
    })
}

async function fetchSteamGames(games) {
    console.log("Fetching Steam games...");

    let settings = { method: "Get" };
    let url = "https://store.steampowered.com/api/featuredcategories"
    let steamGamesList = "";

    await fetch(url, settings)
        .then(res => res.json())
        .then(json => { steamGamesList = json })
        for (let i = 0; i < steamGamesList["specials"]["items"].length; i++) {
            if(steamGamesList["specials"]["items"][i]["discount_percent"] == 100) {
                games.push({
                    game: String(steamGamesList["specials"]["items"][i]["name"]),
                    platform: "steam",
                    gameId: String(steamGamesList["specials"]["items"][i]["id"]),
                    price: String(steamGamesList["specials"]["items"][i]["final_price"]) // Delete after
                })
            }
        }
    return games;
}