var page = require('webpage').create(); // Needed to Open Pages
var fs = require("fs"); // File System for reading and Writing Files
var scrapedURLs = []; // Used to House all Scraped URLS from the Nintendo Switch Main Page
var unwanted = []  // BotW Special Edition
                 // List of Games that should NOT be in the table
var startingCountOfUnwantedGames = unwanted.length;
var total = 0;
var wrote = 0;
var allGamesFromCurrentData = [];
var gamecount =0;
var settings = {
    javascriptEnabled: false,
    loadImages: false,
}

function changelogger(loggedEvent){
    try{
        gamecount++;
        //console.log("logged");
        //fs.write(baseURL + changelogFile, loggedEvent + "<br>\n" , 'a');
    } catch(e) {
        //console.log(e);
    }
}
function logger(loggedEvent){
    try{
        //console.log("Log: " + loggedEvent);
        //fs.write(baseURL + reportEmailFile, loggedEvent + "\r\n" , 'a');
    } catch(e) {
        //console.log(e);
    }
}

page.onConsoleMessage = function(msg) {
    if(msg.indexOf("Log: ") == 0){
        //console.log(msg);
    }
}

// This function will repeatedly test an event and wait for success // 
phantom.waitFor = function(callback) {
    do { // Clear the event queue while waiting.
        setTimeout(this.page.sendEvent('mousemove'), 1000);
    } while (!callback());
}

phantom.webpageClick = function() {
    phantom.waitFor(function() { // Open Nintendo Switch All Games and Wait for Them to Load 
        return page.evaluate(function() {return $("#btn-load-more").is(":visible");})
    });
    page.evaluate(function() { $("#btn-load-more").click(); }); //Click to Generate More Games
    console.log("Click.");
}

function get_urls(){
    page.open("http://www.nintendo.com/games/game-guide/?pv=true#filter/switch|-|-|-|-|-|-|-|-|-|-|-|-|-|featured|des|-|-",settings, function(){
        phantom.waitFor(function() { // Wait until we can see the number of switch games available
            return page.evaluate(function() {return $("#result-count").is(":visible");})
        });
        var num = page.evaluate(function() { // Read the number of games and filter out the word "results"
            return document.querySelector("#result-count").innerText.replace(/[^0-9]/g, '');
        });
        var TotalClicks = Math.floor(parseInt(num, 10)/40); // 40 Games Per Page (No Rounding Needed)
        console.log("There are " + num + " games on Nintendo's Website.");
        console.log("I will click " + TotalClicks + " times.");

        for (i = 0; i < TotalClicks; i++){ // Click the Page Depending on Number of Titles
            phantom.webpageClick();
        }

        phantom.waitFor(function() { // Wait for the New Games to Populate
            return page.evaluate(function() {
                return (document.querySelectorAll('.main-link').length.toString() == document.querySelector("#result-count").innerText.replace(/[^0-9]/g, ''))
            }); //This function counts the total instances of read games and compares it to the number of games that the site shows available at the top.
        });

        var links = page.evaluate(function() {
            return [].map.call(document.querySelectorAll('.main-link'), function(link) {
                var obj = {};
                obj["URL"] = "http:" + link.getAttribute('href');
                obj["Title"] = link.getAttribute('data-game-title');
                return obj;
            });
        });
        logger("Successfully opened Nintendo's Website and found " + links.length + " links.");
        var newData = [];

        for (i = 0; i < links.length; i++){ // For Each New Link
            if (unwanted.indexOf(links[i].URL) > -1){ // Data is on the unwanted list 
                //(Pre-defined Duplicate Title as well as Previously Released Titles)
                //logger("Rejected " + links[i].Title + " from data as requested.");
                }
            else{ // New Game or Unreleased Game
                 scrapedURLs.push(links[i]);
            }
        }
        total = scrapedURLs.length;
        next_page();
    }) // End Page Open
}; // end get_urls()

function updateGame(game){
    var TitleIsNew = true;
    for (i = 0; i < allGamesFromCurrentData.length; i++){ // loop over all existing titles
        if (game.URL == allGamesFromCurrentData[i].URL){ // Only Update if Match if Found
            if (game.Title !== allGamesFromCurrentData[i].Title){
                changelogger(allGamesFromCurrentData[i].Title + " - Title changed from " + allGamesFromCurrentData[i].Title + " to " + game.Title);
                allGamesFromCurrentData[i].Title = game.Title;
            }
            if (game.ReleaseDate !== allGamesFromCurrentData[i].ReleaseDate){
                changelogger(allGamesFromCurrentData[i].Title + " - Release Date changed from " + allGamesFromCurrentData[i].ReleaseDate + " to " + game.ReleaseDate);
                allGamesFromCurrentData[i].ReleaseDate = game.ReleaseDate;
            }
            if (game.SortDate !== allGamesFromCurrentData[i].SortDate){
                logger(allGamesFromCurrentData[i].Title + " - Sorting Date changed from " + allGamesFromCurrentData[i].SortDate + " to " + game.SortDate);
                allGamesFromCurrentData[i].SortDate = game.SortDate;
            }
            if (game.Publisher !== allGamesFromCurrentData[i].Publisher){
                changelogger(allGamesFromCurrentData[i].Title + " - Publisher changed from " + allGamesFromCurrentData[i].Publisher + " to " + game.Publisher);
                allGamesFromCurrentData[i].Publisher = game.Publisher;
            }
            if (game.Developer !== allGamesFromCurrentData[i].Developer){
                changelogger(allGamesFromCurrentData[i].Title + " - Developer changed from " + allGamesFromCurrentData[i].Developer + " to " + game.Developer);
                allGamesFromCurrentData[i].Developer = game.Developer;
            }
            if (game.Rating !== allGamesFromCurrentData[i].Rating){
                changelogger(allGamesFromCurrentData[i].Title + " - Rating changed from " + allGamesFromCurrentData[i].Rating + " to " + game.Rating);
                allGamesFromCurrentData[i].Rating = game.Rating;
            }
            TitleIsNew = false;
            break;
        }
    }
    if (TitleIsNew){
        allGamesFromCurrentData.push(game);
        logger("Got all data for new game " + game.Title);
        changelogger("Got all data for new game " + game.Title);
    }
    wrote++;
}

function handle_page(url){
    var results = page.open(url.URL,settings, function(){
        console.log("Opened " + url.URL);
        phantom.waitFor(function() {return page.evaluate(function() {return $(".global-footer-bottom").is(":visible");})});
        var restricted = page.evaluate(function() {
            return document.getElementsByTagName('fieldset').length; // Test for any Forms (aka Age Restrictions)
        })
        if (restricted){
            console.log("This page is restricted by Age.");
            var selections = page.evaluate(function() { 
                //console.log(document.title);
                var sel = document.querySelector('[name="year"]'); // Find Year Dropdown
                //console.log("Preset Value for Option is: " + sel.options[sel.selectedIndex].text);
                sel.selectedIndex = 25; // Select the 25th Entry in the Dropdown (2017 - 25)
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent("change", false, true);
                sel.dispatchEvent(evt); // Actually Cause the Page to Update this selection
                //console.log("Changed data value");
                //var selNew = document.querySelector('[name="year"]');
                //console.log("New Value for Option is: " + selNew.options[selNew.selectedIndex].text);
                var btn = document.querySelector('[name="submit"]');
                btn.setAttribute('name', 'submit2'); // Change name of Submit to Submit2.
                var form1 = document.forms[0];      // This is needed to allow form to fire ("bug").
                form1.submit(); // Submit the form.
                //console.log("click");
                //console.log(document.title);
            });
        }
        phantom.waitFor(function() {return page.evaluate(function() {return $("#release_date").is(":visible");})});
        var gameData = page.evaluate(function() {
            function createDate(dateString){
                var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                var results;
                if (dateString.length == 12){ // Mon DD, YYYY OR Holiday 2017
                    if (dateString.slice(0,7) == "Holiday"){
                        results = "30/12/" + dateString.slice(8,12);
                    }
                    else{ // Mon DD, YYYY
                        var month = (months.indexOf(dateString.slice(0,3)) + 1);
                        if (month < 10){
                            var monthString = "0" + month.toString();
                        }
                        else{
                            var monthString = month.toString();
                        }
                        results = dateString.slice(4,6) + "/" + monthString + "/" + dateString.slice(8,12);
                    }
                }
                else if (dateString.length == 3){ // TBD
                    results = "01/01/2030";
                }	
                else if (dateString.length == 4){ // YYYY
                    results = "31/12/" + dateString.slice(0,4);
                }
                else { // Summer, Fall, Winter, Spring, Late Summer,September
                    var start = "";
                    if (dateString.indexOf("Late Summer") > -1){ // Late Summer
                        start = "31/08/";
                    }
                    else if (dateString.indexOf("Summer") > -1){ // Summer
                        start = "30/08/"
                    }
                    else if (dateString.indexOf("Fall") > -1){ // Fall
                        start = "31/10/"
                    }
                    else if (dateString.indexOf("September") > -1){ // September
                        start = "30/09/"
                    }
                    else if (dateString.indexOf("Winter") > -1){ // Winter
                        start = "29/12/"
                    }
                    else if (dateString.indexOf("Spring") > -1){ // Spring
                        start = "31/03/"
                    }
                    else {
                        start = "31/12/";
                    }
                    results = start + dateString.slice(dateString.length - 4, dateString.length);
                }
                return results;
            }
            console.log("Fetching data...");
            var obj={};
            obj["Verified"] = false;
            obj["ReleaseDate"] = document.getElementById('release_date').innerText;
            obj["SortDate"] = createDate(obj.ReleaseDate);
            obj["Docked"] = "?";
            obj["Handheld"] = "?";
            obj["SingleJoycon"] = "?";
            obj["DoubleJoycon"] = "?";
            obj["ProController"] = "?";
            obj["Local"] = "?";
            obj["Wireless"] = "?";
            obj["Multiplayer"] = document.getElementById('num_players').innerText;
            // Publisher and Developer can be Non-Existent. If so, write that in the data.
            var brand = document.querySelector('[itemprop="brand"]');
            brand===null ? obj["Publisher"] = "Not Listed" : obj["Publisher"] = brand.innerText;
            var manufacturer = document.querySelector('[itemprop="manufacturer"]');
            manufacturer===null ? obj["Developer"] = "Not Listed" : obj["Developer"] = manufacturer.innerText;
            obj["Rating"] = document.getElementsByClassName('esrb-rating')[0].alt.slice(5, document.getElementsByClassName('esrb-rating')[0].alt.length);
            // Get the Alt Text of "ESRB-Rating" and only take the Rating. Ex: E 10+
            return obj;
        });
        gameData["URL"] = url.URL;
        gameData["Title"] = url.Title        
        updateGame(gameData);
        next_page();
    }); // end open page
}; // End handle_page();

function saveResults(){
    var saving = {};
    saving["data"] = allGamesFromCurrentData;
    fs.write(baseURL + resultsDataFile, JSON.stringify(saving), 'w');
}


function next_page(){
    var url = scrapedURLs.shift();
    if(!url){
        console.log("FINAL:" + gamecount);
        phantom.exit(0); // End Program
    }
    handle_page(url); // Opening Next Page
}

//starting functions
get_urls();
