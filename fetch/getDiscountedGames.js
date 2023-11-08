const fetch = require('node-fetch');
var egsCrawler = require('epic-games-store-crawler');
var crawler = egsCrawler.Crawler;
const STEAM_API_KEY = '79F267CAA9E32FC09113E65B6D76DD4A';
const cheerio = require('cheerio');

module.exports = async function (discount, mustSame = false) {
    let games = [];
    await fetchEpicGames(games);
    await fetchSteamGames(games);
    return games;
}

async function fetchEpicGames(games) {
    // console.log("Fetching epic games...");    
    // let gamesList = await crawler.getItems({
    //     allowCountries: 'FR',
    //     country: 'FR',
    //     locale: 'fr',
    //     count: 999,
    //     category: 'games/edition/base|bundle/games|editors',

    // });
    // for (i = 0; i < gamesList.Catalog.searchStore.elements.length; i++){
    //     if (gamesList.Catalog.searchStore.elements[i].title == "Mystery Game") continue;
    //     if (gamesList.Catalog.searchStore.elements[i].price.totalPrice.discountPrice == gamesList.Catalog.searchStore.elements[i].price.totalPrice.originalPrice) continue;
    //     games.push({
    //         game: gamesList.Catalog.searchStore.elements[i].title,
    //         platform: "epic",
    //         gameId: gamesList.Catalog.searchStore.elements[i].id,
    //         discountPrice: gamesList.Catalog.searchStore.elements[i].price.totalPrice.discountPrice,
    //         originalPrice: gamesList.Catalog.searchStore.elements[i].price.totalPrice.originalPrice,
    //     })
    //     console.log(gamesList.Catalog.searchStore.elements[i].price);
    // }
}

async function fetchSteamGames(games) {
    // console.log("Fetching Steam games...");

    // const response = await fetch('https://steamdb.info/upcoming/free/');
    // const html = await response.text();
    // console.log(html)
    // const $ = cheerio.load(html);

    // console.log($('tr.app').length); // Debug: Affiche le nombre d'éléments trouvés avec le sélecteur
    // $('tr[data-appid]').each((index, element) => {
    //     const appId = $(element).attr('data-appid');
    //     const gameName = $(element).find('.appname').text().trim();

    //     games.push({
    //         game: gameName,
    //         platform: "steam",
    //         gameId: appId,
    //     });
    // });
}