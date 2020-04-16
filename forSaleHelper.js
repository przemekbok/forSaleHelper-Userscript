// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Helper for board game called 'For Sale' which is available on boardgamearena.com.
// @author       You
// @match        https://boardgamearena.com/*
// @grant        none
// ==/UserScript==

setTimeout(() => {
  init();
}, 4000);

/*
DA RULES:
-variables and comments named in english language
-camelCase
*/

/*todo:
 */

function init() {
  if (
    document.location.origin == "https://boardgamearena.com" &&
    document.location.pathname.includes("forsale")
  ) {
    //vizualize players resources
    visualizePlayersResources();
    visualizeCardsInDeck();

    const config = { attributes: true, childList: true, subtree: true };
    let coins = getStartingCoins();
    let log = document.querySelector("#logs");

    //set observer to observe logs and update visualizations
    let logObserver = new MutationObserver(() => {
      updateVisualization(parseInt(coins));
    });
    logObserver.observe(log, config);
  }
}

function updateVisualization(startCash) {
  let players = {};

  document.querySelectorAll(".player-name > a").forEach((e) => {
    players[e.textContent.replace(" ", "-")] = {
      balance: startCash,
      cards: [],
    };
  });

  players = getPlayersStateFromLogs(players);

  updateResourcesVisualization(players);
  updateDeckVisualization();
}

function getStartingCoins() {
  let mainPlayerCoins = document.querySelector(".cp_board").children[2]
    .children[1].textContent;
  return parseInt(mainPlayerCoins) + getValueFromLog("playerSpentCoins");
}

function visualizeCardsInDeck() {
  let whiteboard = document.querySelector("#complete_table > .whiteblock");
  let visualDeck = tagCreator("div", undefined, "deck-visualization");
  whiteboard.insertBefore(visualDeck, whiteboard.children[0]);
}

function updateDeckVisualization() {
  let visualDeck = document.querySelector("#deck-visualization");
  //sweeping old visualization
  visualDeck.innerHTML = "";
  //building visualization for cards storedin deck
  //---------
  let aboutDeck = tagCreator(
    "span",
    ...new Array(2),
    "font-weight:bold",
    "Remaining cards: "
  );

  visualDeck.appendChild(aboutDeck);
  //-obtain array with current deck
  let deck = [...new Array(30).keys()].map((i) => i + 1);
  let outOfDeck = getValueFromLog("cards").map((card) => parseInt(card));
  let cardsOnTheTable = gameui.tableCardsStock.items.map(
    (e) => parseInt(e["type"]) + 1
  );
  let diffrence = deck.filter(
    (crd) => !outOfDeck.includes(crd) && !cardsOnTheTable.includes(crd)
  );

  //-convert it to HTML tags
  diffrence.forEach((card) => {
    visualDeck.appendChild(colorizeCard(card));

    let separator = tagCreator("span", ...new Array(3), " ");
    visualDeck.appendChild(separator);
  });
  //---------
}

function visualizePlayersResources() {
  document.querySelectorAll(".player_board_inner").forEach((e) => {
    let player = e.querySelector(".player-name > a");
    const playerName = player ? player.text.replace(" ", "-") : "";
    let playerResources = tagCreator("div");

    let cards = tagCreator("div", undefined, `player-${playerName}-cards`);
    let balance = tagCreator("div", undefined, `player-${playerName}-balance`);

    playerResources.appendChild(cards);
    playerResources.appendChild(balance);

    e.appendChild(playerResources);
  });
}

function updateResourcesVisualization(players) {
  //this code visualizes gathered card for each player
  Object.entries(players).forEach((player) => {
    let playersCards = document.querySelector(`#player-${player[0]}-cards`);
    //sweeping old visualization
    playersCards.innerHTML = "";

    //building visualization for one of the player's gathered cards
    //---------
    let open = tagCreator("span", ...new Array(3), "cards:< ");
    playersCards.appendChild(open);

    player[1]["cards"]
      .sort((a, b) => a - b)
      .forEach((card) => {
        playersCards.appendChild(colorizeCard(card));

        let separator = tagCreator("span", ...new Array(3), " ");
        playersCards.appendChild(separator);
      });

    let close = tagCreator("span", ...new Array(3), ">");
    playersCards.appendChild(close);
    //---------

    let playersBalance = document.querySelector(`#player-${player[0]}-balance`);
    //sweeping old visualization
    playersBalance.innerHTML = "";

    //building visualization for one of the player's balance
    //---------
    let balanceLabel = tagCreator("span", ...new Array(3), "balance:");

    let highlightedBalance = tagCreator(
      "span",
      ...new Array(2),
      "background-color:white;font-weight:bold",
      `${player[1]["balance"]} k$`
    );
    //---------

    playersBalance.appendChild(balanceLabel);
    playersBalance.appendChild(highlightedBalance);
  });
}

function getValueFromLog(value = "playerSpentCoins") {
  let _switch = 0;
  let coins = 0;
  let cards = [];
  if (value == "cards") {
    _switch = 1;
  }

  // this code gets buying scenario logs from phase 1
  Array.from(document.querySelectorAll("#logs > div > div"))
    .reverse()
    .forEach((log) => {
      if (log.childNodes.length == 4) {
        let playerName = log.childNodes[1].textContent.replace(" ", "");
        //this Regex maches only phrase 1 logs
        if (log.childNodes[3].textContent.match(/\d+ k\$.+\d+$/g)) {
          let nums = log.childNodes[3].textContent.match(/\d+/g);

          if (!_switch) {
            //in the "playerSpentCoins" case we are gathering logs only for main player spend funds
            let mainPlayer = document.querySelector(
              ".player_board_inner > .player-name > a"
            );
            const mainPlayerName = mainPlayer
              ? mainPlayer.text.replace(" ", "")
              : "";
            if (playerName == mainPlayerName) {
              coins += parseInt(nums[0]);
            }
          } else if (_switch) {
            // for the "cards" case we're gathering all cards drawn from deck
            cards.push(nums[1]);
          }
        }
      }
    });
  return _switch ? cards : parseInt(coins);
}

function getPlayersStateFromLogs(players) {
  //this code is dedicated to gathering logs from phase 1 and 2
  Array.from(document.querySelectorAll("#logs > div > div"))
    .reverse()
    .forEach((log) => {
      if (log.childNodes.length == 4) {
        let playerName = log.childNodes[1].textContent.replace(" ", "-");
        if (log.childNodes[3].textContent.match(/\d+ k\$.+\d+$/g)) {
          //buying scenario
          let nums = log.childNodes[3].textContent.match(/\d+/g);

          players[playerName].balance -= parseInt(nums[0]);
          players[playerName].cards.push(nums[1]);
        } else if (
          log.childNodes[3].textContent.match(/\d+ [^k\$].+\d+ k\$/g)
        ) {
          //selling scenario
          let nums = log.childNodes[3].textContent.match(/\d+/g);

          players[playerName].balance += parseInt(nums[1]);
          players[playerName].cards = players[playerName].cards.filter(
            (card) => card != nums[0]
          );
        }
      }
    });
  return players;
}

function colorizeCard(card) {
  return tagCreator("span", ...new Array(2), getStyleForCard(card), card);
}

function tagCreator(tagType, _class, id, style, text) {
  let tag = document.createElement(tagType);
  if (_class) tag.classList.add(_class);
  if (id) tag.id = id;
  if (style) tag.style = style;
  if (text) tag.textContent = text;

  return tag;
}

function getStyleForCard(cardNumber) {
  let multiplier = cardNumber * 17;
  let red = cardNumber <= 15 ? 255 : 255 * 2 - multiplier;
  let green = cardNumber <= 15 ? multiplier : 255;
  return `background-color:rgb(${red},${green},0)`;
}
