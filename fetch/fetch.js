const fetch = require('node-fetch');
let settings = { method: "Get" };
let url = "https://store.steampowered.com/api/featuredcategories"
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))


async function fetchFreeSteamGames() {
    let steamGamesList = "";
    let games = [];
    await fetch(url, settings)
        .then(res => res.json())
        .then(json => { steamGamesList = json })
        for (let i = 0; i < steamGamesList["specials"]["items"].length; i++) {
            if(steamGamesList["specials"]["items"][i]["discount_percent"] == 100) {
                games.push(steamGamesList["specials"]["items"][i]["name"])
            }
        }
    return games
}
fetchFreeSteamGames()