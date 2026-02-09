// ==UserScript==
// @name         Galaxy Flight Duration Ninja (CellMaster's Patcher)
// @namespace    https://openuserjs.org/users/LukaNebo
// @version      1.5.2
// @description  Script to display flight duration inside Galaxy.
// @author       LukaNebo
// @license      MIT
// @copyright    2024, LukaNebo (https://openuserjs.org/users/LukaNebo)
// @match        *://*/bots/*/browser/html/*?page=*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

	const urlMatch = /browser\/html\/s(\d+)-(\w+)/.exec(window.location.href);
	if(!urlMatch) { console.error('[GFD Ninja] Invalid URL - expected format: browser/html/sXXX-xx'); throw new Error('Invalid OGame Ninja URL format'); }
	const universeNum = urlMatch[1];
	const langNinja = urlMatch[2];
	const UNIVERSE = "s" + universeNum + "-" + langNinja;
	const PROTOCOL = window.location.protocol;
	const HOST = window.location.host;
	const PLAYER_ID = document.querySelector("meta[name=ogame-player-id]").content;






// *** FETCH SERVER DATA ***

// Local storage for saved server data
const SERVER_DATA_LOCAL_STORAGE_KEY = UNIVERSE + "-GFD_serverData";
let serverData;

if (!localStorage.getItem(SERVER_DATA_LOCAL_STORAGE_KEY)) {

    // Assign server ID from OGame meta tag
    let serverId = document.querySelector("meta[name=ogame-universe]").content;

    // Fetch data from .../api.serverData.xml
    GM_xmlhttpRequest({
        method: "GET",
        url: PROTOCOL + "//" + HOST + "/api/s" + universeNum + "/" + langNinja + "/serverData.xml",
        onload: function(response) {

            // Parse the XML response
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(response.responseText, "application/xml");

            // Extract the values
            let galaxyNum = parseInt(xmlDoc.querySelector("galaxies").textContent, 10);
            let fleetIgnoreEmptySystems = parseInt(xmlDoc.querySelector("fleetIgnoreEmptySystems").textContent, 10) == 1 ? 1 : 0;
            let fleetIgnoreInactiveSystems = parseInt(xmlDoc.querySelector("fleetIgnoreInactiveSystems").textContent, 10) == 1 ? 1 : 0;

            // Log variables that are fetched from .../api.serverData.xml
            console.log("*** Galaxy Flight Duration ***\n\nNumber of galaxies:      ", galaxyNum, "\nIgnore Empty Sistems:    ", fleetIgnoreEmptySystems, "\nIgnore Inactive Systems: ", fleetIgnoreInactiveSystems);

            serverData = {
                galaxyNum: galaxyNum,
                fleetIgnoreEmptySystems: fleetIgnoreEmptySystems,
                fleetIgnoreInactiveSystems: fleetIgnoreInactiveSystems,
            };

            // Save "serverData" to localStorage
            localStorage.setItem(SERVER_DATA_LOCAL_STORAGE_KEY, JSON.stringify(serverData));

        },
        onerror: function(error) {
            console.error("*** Galaxy Flight Duration ***\n\nError fetching data from .../api/serverData.xml site:", error);
        }
    });

} else {
    serverData = JSON.parse(localStorage.getItem(SERVER_DATA_LOCAL_STORAGE_KEY));
}

let ignoreSystemsCheck = (serverData.fleetIgnoreEmptySystems == 0 || serverData.fleetIgnoreInactiveSystems == 0) ? false : true;












// *** CONFIG ***

const COLORS = {
    gray: "#848484",
    red: "#D43635",
    yellow: "#FFD700",
    green: "#99CC00",
    blue: "#6F9FC8",

    fleetSpeedType: [/* peaceful */"#36B588", /* war */"#D43635", /* holding */"#D57936"],
    briefingSelector: [/* one way */"#315c81", /* two way */"#595959", /* arrival */"#99CC00", /* return */"#595959"],
    speedModifier: [/* 100% */"#1E8f00", /* 90% */"#72B900", /* 80% */"#C2E100", /* 70% */"#FFFA00", /* 60% */"#FFDF00", /* 50% */"#FFC400", /* 40% */"#FFA900", /* 30% */"#FF7A00", /* 20% */"#FF4900", /* 10% */"#FF1700"],
    speedModifierGeneral: [/* 100% */"#068300", /* 95% */"#399c00", /* 90% */"#60b000", /* 85% */"#86c300", /* 80% */"#acd600", /* 75% */"#d2e900", /* 70% */"#fafd00", /* 65% */"#fff400", /* 60% */"#ffe600", /* 55% */"#ffd900", /* 50% */"#ffcb00", /* 45% */"#ffbe00", /* 40% */"#ffb100", /* 35% */"#ffa100", /* 30% */"#ff8800", /* 25% */"#ff6f00", /* 20% */"#ff5600", /* 15% */"#ff3e00", /* 10% */"#ff2500", /* 5% */"#ff0c00"],
};

const LOCALES = {
    en: {
        ships: {
            fighterLight: ["Light Fighter", "LF"],
            fighterHeavy: ["Heavy Fighter", "HF"],
            cruiser: ["Cruiser", "Cruiser"],
            battleship: ["Battleship", "BS"],
            interceptor: ["Battlecruiser", "BC"],
            bomber: ["Bomber", "Bomber"],
            destroyer: ["Destroyer", "Destro."],
            deathstar: ["Deathstar", "RIP"],
            reaper: ["Reaper", "Reaper"],
            explorer: ["Pathfinder", "PF"],
            transporterSmall: ["Small Cargo", "SC"],
            transporterLarge: ["Large Cargo", "LC"],
            colonyShip: ["Colony Ship", "Colony S."],
            recycler: ["Recycler", "Recycler"],
            espionageProbe: ["Espionage Probe", "Probe"],
        },
        shipTypes: { first: "first", second: "second", third: "third", },
        title: {
            distance: { distance: "Distance", coordsDifference: "Difference in position", galaxy: ["galaxy", "galaxies"], system: ["system", "systems"], positionSetTo16: "Position co-ordinates are always set to 16!", ignoreSystems: "Ignore systems (empty/inactive)" },
            fleetSpeed: { selectedSpeed: "Selected speed", types: { peaceful: "Peaceful", war: "War", holding: "Holding" }, fleetSpeed: "fleet speed.", missionTypesStr: "Missions affected by this fleet speed", missionTypes: { peaceful: "Expedition, Colonisation, Transport, Deployment", war: "Recycle Debris Field, Espionage, Attack, ACS Attack, Moon Destruction", holding: "ACS Defend" }, clickStr: "Click to cycle through peaceful/war/holding fleet speed" },
            briefingSelector: { oneWay: "One way flight duration selected", twoWay: "Two way flight duration selected", arrival: "Arrival time selected", return: "Return time selected", clickStr: "Click to toggle between One or Two way flight duration and Arrival or Return time" },
            speedModifier: "Speed modifier",
            ship: { selected: "Selected", ship: " ship:", speed: "Speed", clickStr: "Click to change to a different ship", warningStr: "WARNING: Ship's speed is not updated!\nGo to Fleet page to update speed values." },
            infoBtn: { savedSpeedValues: "Saved speed values", uniSettings: "Universe Settings", fleetSpeed: "Peaceful/War/Holding Fleet Speed", donut: "Donut Galaxy/System", galaxyNum: "Number of galaxies", ignoreSystems: "Ignore Empty/Inactive Systems" },
        },
    },



    de: {
        ships: {
            fighterLight: ["Leichter Jäger", "L. Jäger"],
            fighterHeavy: ["Schwerer Jäger", "S. Jäger"],
            cruiser: ["Kreuzer", "Kreuzer"],
            battleship: ["Schlachtschiff", "SS"],
            interceptor: ["Schlachtkreuzer", "SK"],
            bomber: ["Bomber", "Bomber"],
            destroyer: ["Zerstörer", "Zerstörer"],
            deathstar: ["Todesstern", "RIP"],
            reaper: ["Reaper", "Reaper"],
            explorer: ["Pathfinder", "PF"],
            transporterSmall: ["Kleiner Transporter", "KT"],
            transporterLarge: ["Großer Transporter", "GT"],
            colonyShip: ["Kolonieschiff", "Kolonies."],
            recycler: ["Recycler", "Recycler"],
            espionageProbe: ["Spionagesonde", "Sonde"],
        },
        shipTypes: { first: "erste", second: "zweite", third: "dritte", },
        title: {
            distance: { distance: "Entfernung", coordsDifference: "Unterschied in der Position", galaxy: ["Galaxie", "Galaxien"], system: ["System", "Systeme"], positionSetTo16: "Positionskoordinaten sind immer auf 16 gesetzt!", ignoreSystems: "Ignoriere Systeme (leer/inaktiv)" },
            fleetSpeed: { selectedSpeed: "Ausgewählte Geschwindigkeit", types: { peaceful: "friedlich", war: "krieg", holding: "halten" }, fleetSpeed: "Flottengeschwindigkeit.", missionTypesStr: "Missionen betroffen durch diese Fluggeschwindigkeit", missionTypes: { peaceful: "Expedition, Kolonisieren, Transport, Stationieren", war: "Trümmerfeld abbauen, Spionage, Angreifen, Verbandsangriff, Zerstören", holding: "Halten" }, clickStr: "Drücken Sie hier, um die Geschwindigkeit der friedlichen/kriegerischen/halten Flotte zu wechseln" },
            briefingSelector: { oneWay: "OEinweg-Flug ausgewählt", twoWay: "Zweiweg-Flugdauer ausgewählt", arrival: "Ankunftszeit ausgewählt", return: "Rückflugzeit ausgewählt", clickStr: "Drücken Sie hier, um zwischen der Dauer eines Hin- oder Rückflugs und der Ankunfts- oder Rückflugzeit zu wechseln" },
            speedModifier: "Geschwindigkeitsmodifikator",
            ship: { selected: "Ausgewählt", ship: " Schiff:", speed: "Geschwindigkeit", clickStr: "Drücken Sie, um zu einem anderen Schiff zu wechseln", warningStr: "WARNUNG: Die Geschwindigkeit des Schiffs wird nicht aktualisiert!\nGehen Sie zur Flotten-Seite, um die Geschwindigkeitswerte zu aktualisieren." },
            infoBtn: { savedSpeedValues: "Gespeicherte Geschwindigkeitswerte", uniSettings: "Universumseinstellungen", fleetSpeed: "Friedliche/Kriegerische/Halten Flottengeschwindigkeit", donut: "Donut-Galaxie/System", galaxyNum: "Anzahl der Galaxien", ignoreSystems: "Leere/Inaktive Systeme ignorieren" },
        },
    },



    fr: {
        ships: {
            fighterLight: ["Chasseur léger", "C. léger"],
            fighterHeavy: ["Chasseur lourd", "C. lourd"],
            cruiser: ["Croiseur", "Croiseur"],
            battleship: ["Vaisseau de bataille", "VB"],
            interceptor: ["Traqueur", "Traqueur"],
            bomber: ["Bombardier", "Bombar."],
            destroyer: ["Destructeur", "Destru."],
            deathstar: ["Étoile de la mort", "RIP"],
            reaper: ["Faucheur", "Faucheur"],
            explorer: ["Éclaireur", "Éclaireur"],
            transporterSmall: ["Petit transporteur", "PT"],
            transporterLarge: ["Grand transporteur", "GT"],
            colonyShip: ["Vaisseau de colonisation", "V. de colo."],
            recycler: ["Recycleur", "Recycleur"],
            espionageProbe: ["Sonde d`espionnage", "Sonde"],
        },
        shipTypes: { first: "premier", second: "deuxième", third: "troisième", },
        title: {
            distance: { distance: "Distance", coordsDifference: "Différence de position", galaxy: ["galaxie", "galaxies"], system: ["système", "systèmes"], positionSetTo16: "Les coordonnées de position sont toujours réglées sur 16 !", ignoreSystems: "Ignorer les systèmes (vides/inactifs)" },
            fleetSpeed: { selectedSpeed: "Vitesse sélectionnée", types: { peaceful: "pacifique", war: "guerre", holding: "attente" }, fleetSpeed: "vitesse de la flotte.", missionTypesStr: "Missions affectées par cette vitesse de la flotte", missionTypes: { peaceful: "Expédition, Coloniser, Transporter, Stationner", war: "Recycler le champ de débris, Espionner, Attaquer, Attaque groupée, Détruire", holding: "Stationner (ACS)" }, clickStr: "Cliquez pour basculer entre les vitesses pacifiques/guerrières/d'attente de la flotte" },
            briefingSelector: { oneWay: "Durée de vol à sens unique sélectionnée", twoWay: "Durée de vol aller-retour sélectionnée", arrival: "Heure d'arrivée sélectionnée", return: "Heure de retour sélectionnée", clickStr: "Cliquez pour alterner entre la durée du vol aller simple ou aller-retour et l'heure d'arrivée ou de retour" },
            speedModifier: "Modificateur de vitesse",
            ship: { selected: "Sélectionné", ship: " vaisseau:", speed: "vitesse", clickStr: "Cliquez pour changer de vaisseau", warningStr: "ATTENTION : La vitesse du vaisseau n'est pas mise à jour !\nAllez à la page de la flotte pour mettre à jour les valeurs de vitesse." },
            infoBtn: { savedSpeedValues: "Valeurs de vitesse enregistrées", uniSettings: "Paramètres de l'univers", fleetSpeed: "Vitesse de la flotte pacifique/guerrière/d'attente", donut: "Galaxie/système Donut", galaxyNum: "Nombre de galaxies", ignoreSystems: "Ignorer les systèmes vides/inactifs" },
        },
    },



    it: {
        ships: {
            fighterLight: ["Caccia Leggero", "Caccia L"],
            fighterHeavy: ["Caccia Pesante", "Caccia P"],
            cruiser: ["Incrociatore", "Incroc."],
            battleship: ["Nave da battaglia", "Nave Batt"],
            interceptor: ["Incrociatore da Battaglia", "Incr Batt"],
            bomber: ["Bombardiere", "Bomb"],
            destroyer: ["Corazzata", "Corazzata"],
            deathstar: ["Morte Nera", "RIP"],
            reaper: ["Reaper", "Reaper"],
            explorer: ["Pathfinder", "PF"],
            transporterSmall: ["Cargo leggero", "Cargo L"],
            transporterLarge: ["Cargo Pesante", "Cargo P"],
            colonyShip: ["Colonizzatrice", "Colonizz."],
            recycler: ["Riciclatrici", "Ricicl"],
            espionageProbe: ["Sonda spia", "Sonda"],
        },
        shipTypes: { first: "primo", second: "secondo", third: "terzo" },
        title: {
            distance: { distance: "Distanza", coordsDifference: "Differenza di posizione", galaxy: ["galassia", "galassie"], system: ["sistema", "sistemi"], positionSetTo16: "Le coordinate di posizione sono sempre impostate su 16!", ignoreSystems: "Ignora sistemi (vuoti/inattivi)" },
            fleetSpeed: { selectedSpeed: "Velocità di flotta selezionata", types: { peaceful: "Pacifica", war: "Guerra", holding: "Stazionamento" }, fleetSpeed: "", missionTypesStr: "Missioni influenzate da questa velocità di flotta", missionTypes: { peaceful: "Spedizione, Colonizzazione, Trasporto, Schieramento", war: "Ricicla campo detriti, Spionaggio, Attacco, Attacco federale, Distruzione Luna", holding: "Stazionamento" }, clickStr: "Clicca per passare alla velocità di flotta Pacifica/Guerra/Stazionamento" },
            briefingSelector: { oneWay: "Durata selezionata del volo in andata", twoWay: "Durata selezionata del volo andata e ritorno", arrival: "Orario di arrivo selezionato", return: "Orario di ritorno selezionato", clickStr: "Clicca per passare tra la durata del volo in andata o andata e ritorno e orario di arrivo o di ritorno" },
            speedModifier: "Modificatore di velocità",
            ship: { selected: "Nave selezionata", ship: ":", speed: "Velocità", clickStr: "Clicca per cambiare con un'altra nave", warningStr: "ATTENZIONE: La velocità della nave non è aggiornata!\nVai alla pagina Flotta per aggiornare i valori di velocità." },
            infoBtn: { savedSpeedValues: "Valori di velocità salvati", uniSettings: "Impostazioni universo", fleetSpeed: "Velocità della flotta Pacifica/Guerra/Stazionamento", donut: "Galassia/Sistema circolare", galaxyNum: "Numero di galassie", ignoreSystems: "Ignora Sistemi Vuoti/Inattivi" },
        },
    },



    br: {
        ships: {
            fighterLight: ["Caça Ligeiro", "CL"],
            fighterHeavy: ["Caça Pesado", "CP"],
            cruiser: ["Cruzador", "Cruzador"],
            battleship: ["Nave de Batalha", "NB"],
            interceptor: ["Interceptador", "Inter"],
            bomber: ["Bombardeiro", "BB"],
            destroyer: ["Destruidor", "DD"],
            deathstar: ["Estrela da Morte", "EdM"],
            reaper: ["Ceifeira", "Ceifeira"],
            explorer: ["Explorador", "Explor"],
            transporterSmall: ["Cargueiro Pequeno", "Cargo P"],
            transporterLarge: ["Cargueiro Grande", "Cargo G"],
            colonyShip: ["Nave Colonizadora", "Nave Colo"],
            recycler: ["Reciclador", "Reciclador"],
            espionageProbe: ["Sonda de Espionagem", "Sonda"],
        },
        shipTypes: { first: "primeira", second: "segunda", third: "terceira", },
        title: {
            distance: { distance: "Distância", coordsDifference: "Diferença de posição", galaxy: ["galáxia", "galáxias"], system: ["sistema", "sistemas"], positionSetTo16: "As coordenadas da posição são sempre definidas como 16!", ignoreSystems: "Ignorar sistemas (vazios/inativos)" },
            fleetSpeed: { selectedSpeed: "Velocidade selecionada", types: { peaceful: "pacífica", war: "agressiva", holding: "manter" }, fleetSpeed: "", missionTypesStr: "Missões afetadas por essa velocidade de frota", missionTypes: { peaceful: "Expedição, Colonizar, Transportar, Transferir", war: "Reciclar campo de destroços, Espionar, Atacar, Ataque de aliança, Destruir", holding: "Guardar Posições" }, clickStr: "Clique para alternar entre a velocidade da frota pacífica/agressiva/manter" },
            briefingSelector: { oneWay: "Duração do voo só de ida selecionada", twoWay: "Duração do voo ida e volta selecionada", arrival: "Hora de chegada selecionada", return: "Tempo de retorno selecionado", clickStr: "Clique para alternar entre a duração do voo de ida ou de volta e o tempo de chegada ou de retorno" },
            speedModifier: "Modificador de velocidade",
            ship: { selected: "Selecionado", ship: " nave:", speed: "Velocidade", clickStr: "Clique para mudar para uma nave diferente", warningStr: "AVISO: A velocidade da nave não é atualizada! Vá para a página Fleet (Frota) para atualizar os valores de velocidade." },
            infoBtn: { savedSpeedValues: "Valores de velocidade salvos", uniSettings: "Configurações do universo", fleetSpeed: "Velocidade da frota pacífica/agressiva/manter", donut: "Galáxia/sistema circular", galaxyNum: "Número de galáxias", ignoreSystems: "Ignorar sistemas vazios/inativos" },
        },
    },




    si: {
        ships: {
            fighterLight: ["Lahek lovec", "L. lovec"],
            fighterHeavy: ["Težki lovec", "T. lovec"],
            cruiser: ["Križarka", "Križarka"],
            battleship: ["Bojna ladja", "BL"],
            interceptor: ["Bojna križarka", "BK"],
            bomber: ["Bombnik", "Bombnik"],
            destroyer: ["Uničevalec", "Unič."],
            deathstar: ["Zvezda smrti", "RIP"],
            reaper: ["Kombajn", "Kombajn"],
            explorer: ["Iskalec sledi", "IS"],
            transporterSmall: ["Majhna tovorna ladja", "MTL"],
            transporterLarge: ["Velika tovorna ladja", "VTL"],
            colonyShip: ["Kolonizacijska ladja", "Koloni. l."],
            recycler: ["Recikler", "Recikler"],
            espionageProbe: ["Vohunska sonda", "Sonda"],
        },
        shipTypes: { first: "prva", second: "druga", third: "tretja", },
        title: {
            distance: { distance: "Razdalja", coordsDifference: "Razlika v poziciji", galaxy: ["galaksija", "galaksije"], system: ["osončje", "osončij"], positionSetTo16: "Koordinate za pozicijo so vedno nastavljene na 16!", ignoreSystems: "Ignoriraj osončja (prazna/neaktivna)" },
            fleetSpeed: { selectedSpeed: "Izbrana hitrost", types: { peaceful: "miroljubna", war: "vojna", holding: "obrambna", }, fleetSpeed: "hitrost.", missionTypesStr: "Misije, ki spadajo pod izbrano hitrost flote", missionTypes: { peaceful: "Ekspedicija, Kolonizacija, Transport, Premik", war: "Recikliraj ruševine, Vohuni, Napad, ACS napad, Uničenje lune", holding: "ACS obramba" }, clickStr: "Kliknite tukaj za preklapljanje med miroljubno/vojno/obrambno hitrostjo" },
            briefingSelector: { oneWay: "Izbrano je trajanje leta v eno smer", twoWay: "Izbrano je trajanje leta v obe smeri", arrival: "Izbran je čas prihoda", return: "Izbran je čas vrnitve", clickStr: "Kliknite za preklop med enosmernim ali dvosmernim trajanjem leta in časom prihoda ali vrnitve" },
            speedModifier: "Modifikator hitrosti",
            ship: { selected: "Izbrana", ship: " ladja:", speed: "Hitrost", clickStr: "Kliknite tukaj za spremembo izbrane ladje", warningStr: "POZOR: Hitrost ladje ni posodobljena!\nPojdite na stran Flote, da posodobite vrednosti hitrosti." },
            infoBtn: { savedSpeedValues: "Shranjene vrednosti hitrosti", uniSettings: "Nastavitve vesolja", fleetSpeed: "Miroljubna/vojna/obrambna hitrost flote", donut: "Krožna galaksija/osončja", galaxyNum: "Števijo galaksij", ignoreSystems: "Ignoriraj prazna/neaktivna osončja" },
        },
    },
};












// Add style sheets
GM_addStyle(`
    #GFD_table {
        width: 100%;
        height: 24px;
    }

    #GFD_distance {
        cursor: default;
        padding: 0px 6px;
        color: ${COLORS.gray}
    }

    .GFD_btn {
        cursor: pointer;
        height: 16px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 3px;
        background-color: transparent;
        font-family: Verdana, Arial, SunSans-Regular, sans-serif;
        font-size: 12px;
        font-weight: bold;
        color: white;
    }
    .GFD_btn:hover {
        border: 1px solid white;
    }

    .GFD_ship {
        cursor: pointer;
        width: 142px;
        height: 16px;
        padding: 0 6px;
        border-radius: 3px;
        background-color: transparent;
        font-family: Verdana, Arial, SunSans-Regular, sans-serif;
        font-size: 12px;
    }
    .GFD_ship:hover {
        background-color: #767F8833;
    }

    .GFD_shipName {
        color: ${COLORS.blue};
    }

    #GFD_infoBtn {
        cursor: default;
        height: 16px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 3px;
        font-family: Verdana, Arial, SunSans-Regular, sans-serif;
        font-size: 12px;
        font-weight: normal;
        color: white;
    }
`);












// Assign "pageId"
let bodyId = document.getElementsByTagName("body")[0].id;
let pageId;

if (bodyId == "ingamepage") {
    pageId = document.getElementsByClassName("maincontent")[0].id;
} else {
    pageId = bodyId;
}












// Local storage object for speed of all ships
const PLAYER_INFO_LOCAL_STORAGE_KEY = UNIVERSE + "-" + PLAYER_ID + "-GFD_playerInfo";
const PLAYER_INFO_VERSION = 1;
let playerInfo;

if (!localStorage.getItem(PLAYER_INFO_LOCAL_STORAGE_KEY)) {

    // Set and save default "playerInfo"
    setPlayerInfo();

} else {
    playerInfo = JSON.parse(localStorage.getItem(PLAYER_INFO_LOCAL_STORAGE_KEY));

    // Overwrite "playerInfo" to (new) default structure if a new version is avaiable
    if (playerInfo.version !== PLAYER_INFO_VERSION) {
        setPlayerInfo();
    }
}

// Funcitons to set "playerInfo"
function setPlayerInfo () {

    playerInfo = {
        version: PLAYER_INFO_VERSION,
        lastUpdate: "",
        ships: {
            fighterLight: createShip("204", 12500),
            fighterHeavy: createShip("205", 10000),
            cruiser: createShip("206", 15000),
            battleship: createShip("207", 10000),
            interceptor: createShip("215", 10000),
            bomber: createShip("211",5000),
            destroyer: createShip("213", 5000),
            deathstar: createShip("214", 100),
            reaper: createShip("218", 7000),
            explorer: createShip("219", 12000),
            transporterSmall: createShip("202", 10000),
            transporterLarge: createShip("203", 7500),
            colonyShip: createShip("208", 2500),
            recycler: createShip("209", 6000),
            espionageProbe: createShip("210", 100000000),
        },
    }

    // Log the newly created "playerInfo" object
    console.log("*** Galaxy Flight Duration ***\n\nplayerInfo (newly created):", playerInfo);

    // Save "playerInfo" to localStorage
    localStorage.setItem(PLAYER_INFO_LOCAL_STORAGE_KEY, JSON.stringify(playerInfo));

}

// Function to create properties for each ship (inside playerInfo.ships)
function createShip (id, speed) {
    return { id, speed };
}







// *** FLEETDISPATCH ***

if (pageId == "fleetdispatchcomponent") {


    // Assign current date from "OGameClock"
    let ogClock = document.getElementsByClassName("OGameClock")[0].textContent;

    // Fetch fleet API only once per day
    if (playerInfo.lastUpdate !== ogClock) {
        fetchFleetApi(ogClock);
    }


}

// Function to fetch fleet API data from window object ("fleetDispatcher.fleetHelper.shipsData")
function fetchFleetApi (clock) {

    // Assign "ogFleetApi" from window object
    let ogFleetApi = shipsData; // OGame window object. OLD: fleetDispatcher.fleetHelper.shipsData;
    if (ogFleetApi) {

        // Save fleet speed from "ogFleetApi" to "playerInfo"
        saveFleetApi(ogFleetApi);

        // Assign current date for "lastUpdate"
        playerInfo.lastUpdate = clock;

        // Log results
        let shipsSpeedStr = "";
        for (let shipSelector in playerInfo.ships) {
            let ship = playerInfo.ships[shipSelector];
            shipsSpeedStr += "\n        " + ship.nameFull + ":  " + ship.speed;
        }
        console.log("*** Galaxy Flight Duration ***\n\nFLEET API succesfully saved! ("+playerInfo.lastUpdate+")\n\nplayerInfo:", playerInfo);

        // Save "playerInfo" to localStorage
        localStorage.setItem(PLAYER_INFO_LOCAL_STORAGE_KEY, JSON.stringify(playerInfo));

    } else {
        console.error("*** Galaxy Flight Duration ***\n\nERROR: fleet API was not fetched!");
    }


}

// Function to save fleet speed from "ogFleetApi" to "playerInfo"
function saveFleetApi (ogFleetApi) {

    for (let shipSelector in playerInfo.ships) {
        let ship = playerInfo.ships[shipSelector];
        ship.speed = ogFleetApi[ship.id].speed;
    }

}












// Possible setitngs that a player can choose
const settings = {
    fleetSpeedType: ["peaceful", "war", "holding"],
    briefingSelector: ["oneWay", "twoWay", "arrival", "return"],
    speedModifier: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
    speedModifierGeneral: [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05],
    firstShip: ["fighterLight", "fighterHeavy", "cruiser", "battleship", "interceptor", "bomber", "destroyer", "deathstar", "reaper", "explorer", "transporterSmall", "transporterLarge", "colonyShip", "recycler", "espionageProbe"],
    secondShip: ["fighterLight", "fighterHeavy", "cruiser", "battleship", "interceptor", "bomber", "destroyer", "deathstar", "reaper", "explorer", "transporterSmall", "transporterLarge", "colonyShip", "recycler", "espionageProbe"],
    thirdShip: ["fighterLight", "fighterHeavy", "cruiser", "battleship", "interceptor", "bomber", "destroyer", "deathstar", "reaper", "explorer", "transporterSmall", "transporterLarge", "colonyShip", "recycler", "espionageProbe"],
};



// Local storage object for player settings (if it does not exist, create one)
const PLAYER_SETTINGS_LOCAL_STORAGE_KEY = UNIVERSE + "-" + PLAYER_ID + "-GFD_playerSettings";
const PLAYER_SETTINGS_VERSION = 1.5;
let playerSettings;

if (!localStorage.getItem(PLAYER_SETTINGS_LOCAL_STORAGE_KEY)) {

    // Set and save default "playerSettings"
    setPlayerSettings();

} else {
    playerSettings = JSON.parse(localStorage.getItem(PLAYER_SETTINGS_LOCAL_STORAGE_KEY));

    // OverWrite "playerSettings" to (new) default structure if a new version is avaiable
    if (playerSettings.version !== PLAYER_SETTINGS_VERSION) {
        setPlayerSettings();
    }
}

// Function to set "playerSettings"
function setPlayerSettings () {

    playerSettings = {
        version: PLAYER_SETTINGS_VERSION,
        indexOf: {
            fleetSpeedType: 1, // Index of "settings.fleetSpeedType".
            briefingSelector: 0, // Index of "settings.briefingSelector".
            speedModifier: 0, // Index of "settings.speedModifier".
            firstShip: 0, // Index of "settings.firstShip".
            secondShip: 0, // Index of "settings.secondShip".
            thirdShip: 0, // Index of "settings.thirdShip".
        },
    };

    // Log newly crated "playerSettings" object
    console.log("*** Galaxy Flight Duration ***\n\nsettings:", settings, "\n\nplayerSettings (newly created):", playerSettings);

    savePlayerSettings();

}

// Function to save "playerSettings to localStorage
function savePlayerSettings () {

    localStorage.setItem(PLAYER_SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(playerSettings));

}







// *** GALAXY ***

if (pageId == "galaxycomponent") {


    // Assign meta information from OGame meta tag
    const metaInfo = {
        fleetSpeed: {
            peaceful: parseInt(document.querySelector("meta[name=ogame-universe-speed-fleet-peaceful]").content, 10),
            war: parseInt(document.querySelector("meta[name=ogame-universe-speed-fleet-war]").content, 10),
            holding: parseInt(document.querySelector("meta[name=ogame-universe-speed-fleet-holding]").content, 10),
        },
        donut: {
            galaxy: parseInt(document.querySelector("meta[name=ogame-donut-galaxy]").content, 10),
            system: parseInt(document.querySelector("meta[name=ogame-donut-system]").content, 10),
        },
        planetCoords: document.querySelector("meta[name=ogame-planet-coordinates]").content,
    };

    // Assign player classs
    const playerClass = document.getElementById("characterclass").getElementsByClassName("sprite characterclass")[0].className.split(" ").pop(); // General class = "warrior".



    // Assign (user selected) language from cookies
    let lang = langNinja;

    // Set language to english ("en") if (user selected) language is not supported (not in "LOCALES")
    if (!LOCALES[lang]) {
        lang = "en";
    }

    //console.log("*** Galaxy Flight Duration ***\n\nSelected language: \"" + lang + "\"");







    // Function to calculate DIFFERENCE IN POSITION
    function calcCoordsDifference (takeOffGalaxy, takeOffSystem, takeOffPosition, destinationGalaxy, destinationSystem, destinationPosition, maxNumberOfGalaxies, donutSystem, donutGalaxy) {

        // If destination is on the SAME LOCATION as take-off location
        if (takeOffGalaxy == destinationGalaxy && takeOffSystem == destinationSystem && takeOffPosition == destinationPosition) {

            return { g: 0, s: 0, p: 0 };

        }
        // ... else, if destination is in the SAME SYSTEM as take-off location
        else if (takeOffGalaxy == destinationGalaxy && takeOffSystem == destinationSystem) {

            let positionX = Math.abs(destinationPosition - takeOffPosition);

            return { g: 0, s: 0, p: positionX };

        }
        // ... else, if destination is in the SAME GALAXY as take-off location
        else if (takeOffGalaxy == destinationGalaxy) {

            let systemX = Math.abs(destinationSystem - takeOffSystem);
            let system499minusX = 499 - systemX;
            let minSystemX = Math.min(systemX, system499minusX);

            if (donutSystem == 1) {
                return { g: 0, s: minSystemX, p: 0 };
            } else if (donutSystem == 0) {
                return { g: 0, s: systemX, p: 0 };
            }

        }
        // else, destination is NOT in the same galaxy as take-off location
        else {

            let galaxyX = Math.abs(destinationGalaxy - takeOffGalaxy);
            let galaxyMaxMinusX = maxNumberOfGalaxies - galaxyX;
            let minGalaxyX = Math.min(galaxyX, galaxyMaxMinusX);

            if (donutGalaxy == 1) {
                return { g: minGalaxyX, s: 0, p: 0 };
            } else if (donutGalaxy == 0) {
                return { g: galaxyX, s: 0, p: 0 };
            }

        }

    }

    // Function to calculate DISTANCE
    function calcDistance (coordsDifference) {

        // If difference in position is [0:0:0]
        if (coordsDifference.g == 0 && coordsDifference.s == 0 && coordsDifference.p == 0) {

            return 5;

        }
        // ... else, if difference in position is [0:0:x]
        else if (coordsDifference.g == 0 && coordsDifference.s == 0) {

            return 1000 + 5 * coordsDifference.p;

        }
        // ... else, if difference in position [0:x:y]
        else if (coordsDifference.g == 0) {

            return 2700 + 95 * coordsDifference.s;

        }
        // else, if difference in position is [x:y:z]
        else {

            return 20000 * coordsDifference.g;

        }

    }



    // Function to calculate FLIGHT DURATION in seconds, i.e. "toSeconds"
    function calcFlightDuration (oneOrTwoWay, distance, speedShip, speedModifier, serverFleetSpeed) {

        return Math.round(((10 + (3500 / speedModifier) * Math.sqrt((10 * distance) / speedShip)) / serverFleetSpeed) * oneOrTwoWay);

    }



    // Function to format time duration into a string (e.g. "2:09:09h")
    function formatFlightDurationTime (flightDurationToSeconds) {

        // Calculate "seconds", "minutes", and "hours" from "toSeconds"
        let hours = Math.floor(flightDurationToSeconds / 3600);
        let minutes = (Math.floor(flightDurationToSeconds / 60)) % 60;
        let seconds = flightDurationToSeconds % 60;

        // Format "hours", "minutes", and "seconds" into one string
        let formatedFlightDuration = `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}h`;

        return formatedFlightDuration;

    }



    // Function to calculate and format ARRIVAL or RETURN time
    function formatArrivalReturnTime (flightDurationToSeconds) {

        // Get the current time from "OGameClock"
        const ogClockTimeStr = document.getElementsByClassName("OGameClock")[0].getElementsByTagName("span")[0].textContent;

        // Parse the time string to extract hours, minutes, and seconds
        const ogClockTime = ogClockTimeStr.split(":");
        let hours = parseInt(ogClockTime[0], 10);
        let minutes = parseInt(ogClockTime[1], 10);
        let seconds = parseInt(ogClockTime[2], 10);

        // Add flight duration [seconds]
        seconds += flightDurationToSeconds;

        // Ensure that SECONDS do not spill over 60 and add extra minutes (from seconds)
        minutes += Math.floor(seconds / 60);
        seconds %= 60;
        // Ensure that MINUTES do not spill over 60 and add extra hours (from minutes)
        hours += Math.floor(minutes / 60);
        minutes %= 60;
        // Ensure that HOURS do not spill over 24 (this is not the case for flightDuration that can potentially be over 24h, see: "formatFlightDurationTime")
        hours %= 24;

        // Format "hours", "minutes", and "seconds" into one string
        const formattedArrivalReturnTimeStr = `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

        return formattedArrivalReturnTimeStr;

    }







    // Assign co-ordinates for ACTIVE planet
    let coordsPlanetSplit = metaInfo.planetCoords.split(":");
    const coordsPlanet = {
        g: parseInt(coordsPlanetSplit[0], 10),
        s: parseInt(coordsPlanetSplit[1], 10),
        p: parseInt(coordsPlanetSplit[2], 10),
    };



    // Assign co-ordinates selected inside galaxy view
    const galaxyView = {
        g: 0,
        s: 0,
        p: 16, // Position is always set to 16.
    };

    // Function to assign "galaxyView"
    function assignGalaxyView () {

        galaxyView.g = parseInt(document.getElementById("galaxy_input").value, 10);
        galaxyView.s = parseInt(document.getElementById("system_input").value, 10);

    }







    // Function to display new div element
    function displayDiv () {

        // Query selector for OGame parent element
        let ogParent = document.querySelector("#galaxyContent > div");


        // Create new div element and append it to parent (OGame) element
        let div = document.createElement("div");
        div.id = "GFD";
        div.className = "galaxyRow ctGalaxyFooter";
        ogParent.appendChild(div);


        // InnerHTML of new div element:
        div.innerHTML = `
            <table id="GFD_table">
                <tbody><tr>

                    <td width="64px">
                        <span id="GFD_distance"></span>
                    </td>

                    <td width="32px">
                        <button id="GFD_fleetSpeedType" class="GFD_btn" style="width: 28px"></button>
                    </td>

                    <td width="32px">
                        <button id="GFD_briefingSelector" class="GFD_btn" style="width: 28px; font-size: 10px"></button>
                    </td>

                    <td width="54px">
                        <button id="GFD_speedModifier" class="GFD_btn" style="width: 50px; height: 18px; background-color: transparent"></button>
                    </td>

                    <td>
                        <button id="GFD_firstShip" class="GFD_ship">
                            <span id="GFD_firstShip_name" class="GFD_shipName"></span>
                            <span id="GFD_firstShip_flightBriefing"></span>
                        </button>
                    </td>

                    <td>
                        <button id="GFD_secondShip" class="GFD_ship">
                            <span id="GFD_secondShip_name" class="GFD_shipName"></span>
                            <span id="GFD_secondShip_flightBriefing"></span>
                        </button>
                    </td>

                    <td>
                        <button id="GFD_thirdShip" class="GFD_ship">
                            <span id="GFD_thirdShip_name" class="GFD_shipName"></span>
                            <span id="GFD_thirdShip_flightBriefing"></span>
                        </button>
                    </td>

                    <td width="26px">
                        <button id="GFD_infoBtn" class="GFD_btn" style="width: 16px; background-color: ${COLORS.blue}"></button>
                    </td>

                </tr></tbody>
            </table>
        `;

    }





    // Master function to update elements in div
    function updateDiv () {

        if (ignoreSystemsCheck == true) {
            updateDivIgnoreSystems();
        } else {
            updateDivDefault();
        }

    }



    // Declare "checkTargetData" (so it is undefined for "updateDistance(checkTargetData)" inside "updateDivDefault()")
    let checkTargetData;

    // Function to update elements in div
    function updateDivDefault () {


        // DISTANCE (and DIFFERENCE IN POSITION)
        let distance = updateDistance(checkTargetData);

        // FLEET SPEED TYPE (peaceful/war/holding)
        let fleetSpeed = updateFleetSpeedType();

        // Fleet BRIEFING (ONE/TWO WAY flight duration or ARRIVAL/RETURN time)
        let briefingSelector = updateBriefingSelector();

        // SPEED MODIFIER
        let speedModifier = updateSpeedModifier();

        // SHIPS
        updateShip("first", briefingSelector, distance, speedModifier, fleetSpeed);
        updateShip("second", briefingSelector, distance, speedModifier, fleetSpeed);
        updateShip("third", briefingSelector, distance, speedModifier, fleetSpeed);

        // INFO BUTTON
        updateInfoBtn();


    }



    // Function to update elements in div only on servers with "Ignore systems" settings
    async function updateDivIgnoreSystems () {


        // Function to call "checkTarget"
        async function callCheckTarget(g, s, p) {

            const response = await fetch(window.location.pathname + "?page=ingame&component=fleetdispatch&action=checkTarget&ajax=1&asJson=1", {
                "headers": {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "x-requested-with": "XMLHttpRequest"
                },
                "body": `am208=1&galaxy=${g}&system=${s}&position=${p}&type=1&token=${token}&union=0`, // OGame window object.
                "method": "POST",
            });

            checkTargetData = await response.json();

            // Assign new token
            let newToken = checkTargetData.newAjaxToken;
            window.token = newToken;
            updateOverlayToken("phalanxDialog", newToken); // To update the token for the phalanx of a single planet.
            updateOverlayToken("phalanxSystemDialog", newToken); // To update the token for the system phalanx (Warriors alliance class feature).

            //console.log("*** Galaxy Flight Duration ***\n\ncheckTargetData:", checkTargetData, "\n\ncheckTargetData.status: \""+checkTargetData.status+"\"\n\ncheckTargetData.emptySystems:", checkTargetData.emptySystems, "\ncheckTargetData.inactiveSystems", checkTargetData.inactiveSystems, "\n\nNew token:", checkTargetData.newAjaxToken);

            return checkTargetData;

        }


        // Call function
        callCheckTarget(galaxyView.g, galaxyView.s, galaxyView.p)
            .then(checkTargetData => {


            // DISTANCE (and DIFFERENCE IN POSITION)
            let distance = updateDistance(checkTargetData);

            // FLEET SPEED TYPE (peaceful/war/holding)
            let fleetSpeed = updateFleetSpeedType();

            // Fleet BRIEFING (ONE/TWO WAY flight duration or ARRIVAL/RETURN time)
            let briefingSelector = updateBriefingSelector();

            // SPEED MODIFIER
            let speedModifier = updateSpeedModifier();

            // SHIPS
            updateShip("first", briefingSelector, distance, speedModifier, fleetSpeed);
            updateShip("second", briefingSelector, distance, speedModifier, fleetSpeed);
            updateShip("third", briefingSelector, distance, speedModifier, fleetSpeed);

            // INFO BUTTON
            updateInfoBtn();


        }).catch(error => {
            console.error("*** Galaxy Flight Duration ***\n\nError in updateDivIgnoreSystems():", error);
        });


    }







    // Function for DISTANCE (and DIFFERENCE IN POSITION)
    function updateDistance (checkTargetData) {


        // Distance calculation for universes with "Ignore Systems" settings
        if (checkTargetData && ignoreSystemsCheck == true) {


            // Assign "ignoreSystems"
            let ignoreSystems = {
                empty: checkTargetData.emptySystems ? checkTargetData.emptySystems : 0,
                inactive: checkTargetData.inactiveSystems ? checkTargetData.inactiveSystems : 0,
                sum: 0,
            };

            // Calculate sum of "empty" and "inactive" systems
            ignoreSystems.sum = ignoreSystems.empty + ignoreSystems.inactive;

            // Calculate new DIFFERENCE IN POSITION and DISTANCE
            let coordsDifference = calcCoordsDifference (coordsPlanet.g, coordsPlanet.s, coordsPlanet.p, galaxyView.g, galaxyView.s, galaxyView.p, serverData.galaxyNum, metaInfo.donut.system, metaInfo.donut.galaxy);
            let newCoordsDifference = Object.assign({}, coordsDifference); // Create deep copy.
            newCoordsDifference.s = coordsDifference.s - ignoreSystems.sum;
            let distance = calcDistance (newCoordsDifference);


            let distanceSpan = document.getElementById("GFD_distance");

            distanceSpan.innerHTML = distance;
            if (distance >= 20000) {
                distanceSpan.style.color = COLORS.red;
            } else if (ignoreSystems.sum > 0) {
                distanceSpan.style.color = COLORS.green;
            } else {
                distanceSpan.style.color = COLORS.gray;
            }

            // Title
            let coordsDifferenceTitleStr;
            if (newCoordsDifference.g > 0) {
                coordsDifferenceTitleStr = newCoordsDifference.g == 1 ? newCoordsDifference.g+" "+LOCALES[lang].title.distance.galaxy[0] : newCoordsDifference.g+" "+LOCALES[lang].title.distance.galaxy[1];
            } else if (newCoordsDifference.s == 0) {
                coordsDifferenceTitleStr = newCoordsDifference.s+" "+LOCALES[lang].title.distance.system[1] + "\n\n" + LOCALES[lang].title.distance.positionSetTo16;
            } else {
                coordsDifferenceTitleStr = newCoordsDifference.s == 1 ? newCoordsDifference.s+" ("+coordsDifference.s+") "+LOCALES[lang].title.distance.system[0] : newCoordsDifference.s+" ("+coordsDifference.s+") "+LOCALES[lang].title.distance.system[1];
            }
            distanceSpan.title = LOCALES[lang].title.distance.distance+":  "+distance + "\n" + LOCALES[lang].title.distance.coordsDifference+":  "+coordsDifferenceTitleStr + "\n\n" + LOCALES[lang].title.distance.ignoreSystems+":  "+ignoreSystems.sum+"  ("+ignoreSystems.empty+" / "+ignoreSystems.inactive+")";


            return distance;


        }
        // ... distance calculation for default universes
        else {


            let coordsDifference = calcCoordsDifference (coordsPlanet.g, coordsPlanet.s, coordsPlanet.p, galaxyView.g, galaxyView.s, galaxyView.p, serverData.galaxyNum, metaInfo.donut.system, metaInfo.donut.galaxy);
            let distance = calcDistance (coordsDifference);

            let distanceSpan = document.getElementById("GFD_distance");
            distanceSpan.innerHTML = distance;
            distanceSpan.style.color = distance >= 20000 ? COLORS.red : COLORS.gray;

            // Title
            let coordsDifferenceTitleStr;
            if (coordsDifference.g > 0) {
                coordsDifferenceTitleStr = coordsDifference.g == 1 ? coordsDifference.g+" "+LOCALES[lang].title.distance.galaxy[0] : coordsDifference.g+" "+LOCALES[lang].title.distance.galaxy[1];
            } else if (coordsDifference.s == 0) {
                coordsDifferenceTitleStr = coordsDifference.s+" "+LOCALES[lang].title.distance.system[1] + "\n\n" + LOCALES[lang].title.distance.positionSetTo16;
            } else {
                coordsDifferenceTitleStr = coordsDifference.s == 1 ? coordsDifference.s+" "+LOCALES[lang].title.distance.system[0] : coordsDifference.s+" "+LOCALES[lang].title.distance.system[1];
            }
            distanceSpan.title = LOCALES[lang].title.distance.distance+":  "+distance + "\n" + LOCALES[lang].title.distance.coordsDifference+":  "+coordsDifferenceTitleStr;


            return distance;


        }


    }



    // Funciton for FLEET SPEED TYPE (peaceful/war/holding)
    function updateFleetSpeedType () {

        let fleetSpeedType = settings.fleetSpeedType[playerSettings.indexOf.fleetSpeedType];
        let fleetSpeed = metaInfo.fleetSpeed[fleetSpeedType];

        let fleetSpeedTypeSpan = document.getElementById("GFD_fleetSpeedType");
        fleetSpeedTypeSpan.innerHTML = "x" + fleetSpeed;
        fleetSpeedTypeSpan.title = LOCALES[lang].title.fleetSpeed.selectedSpeed+": "+LOCALES[lang].title.fleetSpeed.types[fleetSpeedType]+" "+LOCALES[lang].title.fleetSpeed.fleetSpeed+"\n\n" + LOCALES[lang].title.fleetSpeed.missionTypesStr+":\n" + LOCALES[lang].title.fleetSpeed.missionTypes[fleetSpeedType] + "\n\n("+LOCALES[lang].title.fleetSpeed.clickStr+".)";
        fleetSpeedTypeSpan.style.backgroundColor = COLORS.fleetSpeedType[playerSettings.indexOf.fleetSpeedType];

        // Right click
        fleetSpeedTypeSpan.onclick = function () {
            playerSettings.indexOf.fleetSpeedType = (playerSettings.indexOf.fleetSpeedType + 1) % settings.fleetSpeedType.length;
            updateDivDefault();
            savePlayerSettings();
        };

        // Left click
        fleetSpeedTypeSpan.oncontextmenu = (event) => {
            event.preventDefault(); // Prevents the default context menu from showing up.

            playerSettings.indexOf.fleetSpeedType = (playerSettings.indexOf.fleetSpeedType - 1 + settings.fleetSpeedType.length) % settings.fleetSpeedType.length;
            updateDivDefault();
            savePlayerSettings();
        }

        // Return selected "fleetSpeed" value for "updateShip" function
        return fleetSpeed;

    }



    // Function for fleet BRIEFING (ONE/TWO WAY flight duration or ARRIVAL/RETURN time)
    function updateBriefingSelector () {

        let briefingSelector = settings.briefingSelector[playerSettings.indexOf.briefingSelector];

        let briefingSelectorSpan = document.getElementById("GFD_briefingSelector");

        // Determine ICON of the button based on the "playerSettings"
        const briefingSelectorIcons = { oneWay: ">", twoWay: "<", arrival: ">|", return: "|<" };
        let briefingSelectorInnerHTML = briefingSelectorIcons[briefingSelector];
        briefingSelectorSpan.innerHTML = briefingSelectorInnerHTML;

        // Deterine TITLE of the button
        const briefingSelectorTitles = {
            oneWay: LOCALES[lang].title.briefingSelector.oneWay + ".\n\n(" + LOCALES[lang].title.briefingSelector.clickStr + ".)",
            twoWay: LOCALES[lang].title.briefingSelector.twoWay + ".\n\n(" + LOCALES[lang].title.briefingSelector.clickStr + ".)",
            arrival: LOCALES[lang].title.briefingSelector.arrival + ".\n\n(" + LOCALES[lang].title.briefingSelector.clickStr + ".)",
            return: LOCALES[lang].title.briefingSelector.return + ".\n\n(" + LOCALES[lang].title.briefingSelector.clickStr + ".)",
        };
        briefingSelectorSpan.title = briefingSelectorTitles[briefingSelector];

        // Determine BACKGROUND COLOR of the button
        briefingSelectorSpan.style.backgroundColor = COLORS.briefingSelector[playerSettings.indexOf.briefingSelector];

        // Right click
        briefingSelectorSpan.onclick = function () {
            playerSettings.indexOf.briefingSelector = (playerSettings.indexOf.briefingSelector + 1) % settings.briefingSelector.length;
            updateDivDefault();
            savePlayerSettings();
        }

        // Left click
        briefingSelectorSpan.oncontextmenu = (event) => {
            event.preventDefault(); // Prevents the default context menu from showing up.

            playerSettings.indexOf.briefingSelector = (playerSettings.indexOf.briefingSelector - 1 + settings.briefingSelector.length) % settings.briefingSelector.length;
            updateDivDefault();
            savePlayerSettings();
        }

        // Return selected "briefingSelector" for "updateShip" function
        return briefingSelector;

    }



    // Function for SPEED MODIFIER
    function updateSpeedModifier () {

        let speedModifierSpan = document.getElementById("GFD_speedModifier");
        speedModifierSpan.title = LOCALES[lang].title.speedModifier;

        let speedModifier;
        // If General class is active
        if (playerClass == "warrior") {

            speedModifier = settings.speedModifierGeneral[playerSettings.indexOf.speedModifier];

            speedModifierSpan.innerHTML = Math.round(speedModifier * 100) + "%";
            speedModifierSpan.style.color = COLORS.speedModifierGeneral[playerSettings.indexOf.speedModifier];

            // Right click (-5%)
            speedModifierSpan.onclick = function () {
                playerSettings.indexOf.speedModifier = (playerSettings.indexOf.speedModifier + 1) % settings.speedModifierGeneral.length;
                updateDivDefault();
                savePlayerSettings
            }

            // Left-click (+5%)
            speedModifierSpan.oncontextmenu = (event) => {
                event.preventDefault(); // Prevents the default context menu from showing up.

                playerSettings.indexOf.speedModifier = (playerSettings.indexOf.speedModifier - 1 + settings.speedModifierGeneral.length) % settings.speedModifierGeneral.length;
                updateDivDefault();
                savePlayerSettings();
            }

        }
        // ... else, if every other class is active
        else {

            // In case a player deactivates General class and leaves "playerSettings.indexOf.speedModifier" saved to value that is bigger than 9 (i.e. saved speed modifier from 50% to 5%) set "playerSettings.indexOf.speedModifier" back to default value, 0 (i.e. 100% speed modifier)
            playerSettings.indexOf.speedModifier = playerSettings.indexOf.speedModifier > 9 ? playerSettings.indexOf.speedModifier = 0 : playerSettings.indexOf.speedModifier;

            speedModifier = settings.speedModifier[playerSettings.indexOf.speedModifier];

            speedModifierSpan.innerHTML = Math.round(speedModifier * 100) + "%";
            speedModifierSpan.style.color = COLORS.speedModifier[playerSettings.indexOf.speedModifier];

            // Right click (-10%)
            speedModifierSpan.onclick = function () {
                playerSettings.indexOf.speedModifier = (playerSettings.indexOf.speedModifier + 1) % settings.speedModifier.length;
                updateDivDefault();
                savePlayerSettings();
            }

            // Left-click (+10%)
            speedModifierSpan.oncontextmenu = (event) => {
                event.preventDefault(); // Prevents the default context menu from showing up.

                playerSettings.indexOf.speedModifier = (playerSettings.indexOf.speedModifier - 1 + settings.speedModifier.length) % settings.speedModifier.length;
                updateDivDefault();
                savePlayerSettings();
            }

        }

        // Return selected "speedModifier" value for "updateShip" function
        return speedModifier;

    }



    // Function for SHIPS
    function updateShip (shipType, briefingSelector, distance, speedModifier, fleetSpeed) {

        // Assign selectors for other variables
        let settingsSelector = `${shipType}Ship`;
        let shipSelector = settings[settingsSelector][playerSettings.indexOf[settingsSelector]];

        // Calculate flight duration [seconds]
        let speed = playerInfo.ships[shipSelector].speed;
        const oneOrTwoWay = { oneWay: 1, twoWay: 2, arrival: 1, return: 2 };
        let flightDurationToSeconds = calcFlightDuration(oneOrTwoWay[briefingSelector], distance, speed, speedModifier, fleetSpeed);

        // Assign ship name and formated flight duration
        let shipInfo = {
            name: LOCALES[lang].ships[shipSelector][1],
            flightBriefing: ( briefingSelector == "oneWay" || briefingSelector == "twoWay" ) ? formatFlightDurationTime(flightDurationToSeconds) : formatArrivalReturnTime(flightDurationToSeconds),
        };

        // Assign variables from div element and updete its values
        let shipDiv = document.getElementById(`GFD_${shipType}Ship`);
        let shipSpan = {
            name: document.getElementById(`GFD_${shipType}Ship_name`),
            flightBriefing: document.getElementById(`GFD_${shipType}Ship_flightBriefing`),
        };
        shipSpan.name.innerHTML = shipInfo.name+": ";
        shipSpan.flightBriefing.innerHTML = shipInfo.flightBriefing;

        // Assign title
        let shipTitle = `${LOCALES[lang].title.ship.selected} ${LOCALES[lang].shipTypes[shipType]}${LOCALES[lang].title.ship.ship}  ${LOCALES[lang].ships[shipSelector][0]}\n${LOCALES[lang].title.ship.speed}:  ${speed}\n\n(${LOCALES[lang].title.ship.clickStr}.)`;

        if (playerInfo.lastUpdate == "") {
            shipDiv.title = LOCALES[lang].title.ship.warningStr;
            shipSpan.flightBriefing.style.color = COLORS.red;
        } else {
            shipDiv.title = shipTitle;
            shipSpan.flightBriefing.style.color = oneOrTwoWay[briefingSelector] == 1 ? "white" : COLORS.gray;
        }

        // Left-click (next ship)
        shipDiv.onclick = function () {
            playerSettings.indexOf[settingsSelector] = (playerSettings.indexOf[settingsSelector] + 1) % settings[settingsSelector].length;
            updateDivDefault();
            savePlayerSettings();
        };

        // Right click (previous ship)
        shipDiv.oncontextmenu = (event) => {
            event.preventDefault(); // Prevents the default context menu from showing up.

            playerSettings.indexOf[settingsSelector] = (playerSettings.indexOf[settingsSelector] - 1 + settings[settingsSelector].length) % settings[settingsSelector].length;
            updateDivDefault();
            savePlayerSettings();
        }

        // Activate mutation observer for OGame clock if "briefingSelector" is set to "arrival" or "return" and deactivate this observer if "briefingSelector" is set to "oneWay" or "twoWay"
        if (briefingSelector == "arrival" || briefingSelector == "return") {
            startObserver_ogClock();
        } else {
            stopObserver_ogClock();
        }

    }



    // Function for INFO BUTTON
    function updateInfoBtn () {

        let infoBtnSpan = document.getElementById("GFD_infoBtn");
        infoBtnSpan.innerHTML = "i";

        // Title that contains all saved speeds from all ships (with date they were last updated) and universe/server meta data
        let titleStr = LOCALES[lang].title.infoBtn.savedSpeedValues+" ("+playerInfo.lastUpdate+"):\n\n";
        for (let shipSelector in playerInfo.ships) {
            if (playerInfo.ships.hasOwnProperty(shipSelector)) {
                titleStr += LOCALES[lang].ships[shipSelector][0]+":  "+playerInfo.ships[shipSelector].speed+"\n";
            }
        }
        titleStr += "\n\n" + LOCALES[lang].title.infoBtn.uniSettings+":\n\n" + LOCALES[lang].title.infoBtn.fleetSpeed+":  x"+metaInfo.fleetSpeed.peaceful+" / x"+metaInfo.fleetSpeed.war+" / x"+metaInfo.fleetSpeed.holding + "\n" + LOCALES[lang].title.infoBtn.donut+":  "+metaInfo.donut.galaxy+" / "+metaInfo.donut.system + "\n" + LOCALES[lang].title.infoBtn.galaxyNum+":  "+serverData.galaxyNum + "\n" + LOCALES[lang].title.infoBtn.ignoreSystems+":  "+serverData.fleetIgnoreEmptySystems+" / "+serverData.fleetIgnoreInactiveSystems;
        infoBtnSpan.title = titleStr;

    }












    // *** OGAME CLOCK MUTATION OBSERVER ***

    // Boolean variable to track the observer state
    let observe_ogClockIsActive = true;

    // Callback function to execute when mutations are observed
    function handleMutation_ogClock (mutationsList, observer) {

        // Check if the observer is active
        if (observe_ogClockIsActive) {

            // Call functions
            updateDiv();

        }

    };

    // Create a MutationObserver instance
    const observe_ogClock = new MutationObserver(handleMutation_ogClock);

    // Select the target node
    const ogClock = document.getElementsByClassName("OGameClock")[0];

    // Function to toggle the observer state
    function toggleObserver_ogClock () {
        observe_ogClockIsActive = !observe_ogClockIsActive;
    }

    // Function to start observing the target node for configured mutations
    function startObserver_ogClock () {
        observe_ogClock.observe(ogClock, { childList: true, subtree: true });
    }

    // Function to stop observing mutations
    function stopObserver_ogClock () {
        observe_ogClock.disconnect();
    }





    // *** GALAXY VIEW MUTATION OBSERVER ***

    // Variable to store the previous state of "galaxyLoading"
    let prevGalaxyLoading = "";

    // Function to handle the mutation event
    function handleMutation_galaxyView (mutationsList, observer) {

        for (let mutation of mutationsList) {
            if (mutation.type === "attributes" && mutation.attributeName === "style") {

                // Assign display state of OGame loading GIF
                let galaxyLoading = document.querySelector("#galaxyLoading").style.display;

                // Check for change from "" to "none" in "galaxyLoading" (".style.display")
                if (prevGalaxyLoading === "" && galaxyLoading === "none") {

                    // Call functions
                    assignGalaxyView();
                    updateDiv();

                }

                // Update the previous state
                prevGalaxyLoading = galaxyLoading;
            }
        }

    }

    // Create a MutationObserver with the handleMutation callback
    const observer_galaxyView = new MutationObserver(handleMutation_galaxyView);

    // Observe changes in the target node
    const galaxyLoadingDiv = document.querySelector("#galaxyLoading");
    observer_galaxyView.observe(galaxyLoadingDiv, { attributes: true });





    // Call functions
    assignGalaxyView();
    displayDiv();
    updateDiv();



}