// Constants
var LOOTTB_COLUMN = {
    NAME: 0,
    QUANTITY: 1,
    PRICE: 2,
    DELETE: 3
};

var PLAYERS_PANEL = {
    HEADER: 0,
    RUNESTABLE: 2
};

var mediviadb;

// Templates
var playerpanel_template;

// HTML Elements
var players_grid;
var loottable;
var loottable_body;
var huntinfo;
var addcreature_panel;
var addcreature_name;

var autocomplete_lastsize = 0;
var addcreature_autocomplete_lastindex = -1;

function init() {
    // Fetch is async
    fetch("./db.json")
    .then((resp) => resp.json())
    .then(function(data) {
        mediviadb = data;
        players_add_player();
        loottable_add_row();
        player(1).querySelector(".playername").focus();
        player(1).querySelector(".playername").setSelectionRange(0, 100);
    });

    playerpanel_template = document.getElementById("playerpanel-template");

    players_grid = document.getElementById("playersgrid");

    loottable = document.getElementById("loottb");
    loottable_body = loottable.getElementsByTagName("tbody")[0];

    addcreature_panel = document.getElementById("loottb_addcreatureitems");
    addcreature_name = document.getElementById("loottb_creaturename");
    huntinfo = document.getElementById("huntinfo");

    document.body.addEventListener("keydown", onkeydown_global);
}

function stoi(str) {
    if (str == "") return 0;
    else return parseInt(str);
}

function gtos(amount) {
    if (amount < 1000) return amount + " gp";
    else if (amount >= 1000 && amount < 1000000) return (amount / 1000).toFixed(1) + " K";
    else return (amount / 1000000).toFixed(3) + " KK";
}

// @Speed: We can keep track of the last used db index so that we start to search for a suggestion at that index instead of index 0 (since the db is ordered alphabetically anyways), and clear it once the user backspaces, which should be the first if block.
// Takes an array of objects with a 'name' field to be searched and returns the index that was found, or -1 on failure.
function autocomplete_generic(item_array, input_field) {
    if (autocomplete_lastsize >= input_field.value.length) {
        autocomplete_lastsize = input_field.value.length;
        return -1;
    }

    autocomplete_lastsize = input_field.value.length;
    let inputlen = input_field.value.length;
    let suggestion_index = -1;
    for (let i = 0; i < item_array.length; i++) {
        if (inputlen > item_array[i].name.length) continue;
        if (input_field.value.toLowerCase() == item_array[i].name.substr(0, inputlen).toLowerCase()) {
            input_field.value = item_array[i].name;
            input_field.setSelectionRange(inputlen, item_array[i].name.length);
            suggestion_index = i;
            break;
        }
    }
    return suggestion_index;
}

// ------------------------------------------
// Functions pertaining to the players panel
// ------------------------------------------

function players() { return players_grid.children; }
function player(index) { return players_grid.children[index]; }

function players_add_player() {
    let newpanel = document.importNode(playerpanel_template.content, true);
    let runestable = newpanel.querySelector(".runestable");
    let ammotable = newpanel.querySelector(".ammotable");

    let runerow, runelbl, runequant, runeprice;
    for (let i = 0; i < mediviadb.runes.length; i++) {
        runerow = runestable.insertRow();
        runelbl = document.createElement("label");
        runelbl.innerText = mediviadb.runes[i].name + "'s";
        runerow.insertCell().appendChild(runelbl);

        runequant = document.createElement("input");
        runequant.setAttribute("type", "text");
        runerow.insertCell().appendChild(runequant);

        runeprice = document.createElement("input");
        runeprice.setAttribute("type", "text");
        runeprice.value = mediviadb.runes[i].price;
        runerow.insertCell().appendChild(runeprice);
    }
    let ammorow, ammolbl, ammoquant, ammoprice;
    for (let i = 0; i < mediviadb.ammo.length; i++) {
        ammorow = ammotable.insertRow();
        ammolbl = document.createElement("label");
        ammolbl.innerText = mediviadb.ammo[i].name + "s";
        ammorow.insertCell().appendChild(ammolbl);

        ammoquant = document.createElement("input");
        ammoquant.setAttribute("type", "text");
        ammorow.insertCell().appendChild(ammoquant);

        ammoprice = document.createElement("input");
        ammoprice.setAttribute("type", "text");
        ammoprice.value = mediviadb.ammo[i].price;
        ammorow.insertCell().appendChild(ammoprice);
    }
    
    players_grid.appendChild(newpanel);
}

function player_delete(callerpanel) {
    callerpanel.remove();
    if (players().length <= 1) players_add_player();
}

function players_clear() {
    while(players().length > 1)
        players_grid.lastChild.remove();
}

// --------------------------------------
// Functions pertaining to the loottable
// --------------------------------------

function loottable_add_row() {
    let row_index = loottable_body.rows.length;
    let row = loottable_body.insertRow();

    let itemname = document.createElement("input");
    itemname.type = "text";
    itemname.setAttribute("oninput", "autocomplete_itemname(parentElement.parentElement)");
    itemname.setAttribute("onfocusin", "loottable_check_add_row(parentElement.parentElement)");
    itemname.setAttribute("onfocusout", "autocomplete_lastsize = 0;");
    if (row_index > 0)
        loottable_body.rows[row_index - 1].cells[LOOTTB_COLUMN.NAME].firstChild.removeAttribute("onfocusin");
    row.insertCell().appendChild(itemname);

    let itemquantity = document.createElement("input");
    itemquantity.type = "text";
    row.insertCell().appendChild(itemquantity);

    let itemprice = document.createElement("input");
    itemprice.type = "text";
    row.insertCell().appendChild(itemprice);

    // Add a delete button if it's not the first row
    if (row_index > 0) {
        let deletebutton = document.createElement("button");
        deletebutton.className = "delete_row_button";
        deletebutton.setAttribute("onclick", "loottable_delete_row(parentElement.parentElement)");
        deletebutton.innerText = "X";
        deletebutton.tabIndex = -1;
        row.insertCell().appendChild(deletebutton);
    }
    return row;
}

function loottable_check_add_row(callerrow) {
    if (loottable.rows[callerrow.rowIndex - 1].cells[LOOTTB_COLUMN.NAME].firstChild.value != "")
        loottable_add_row();
}

// @Improvement: We can keep track of the selected row index so we can select the same index or the previous one if that doesn't exist.
function loottable_delete_row(callerrow) {
    if (callerrow.rowIndex == loottable.rows.length - 1) {
        if (loottable.rows[callerrow.rowIndex - 1].cells[LOOTTB_COLUMN.NAME].firstChild.value == "")
            loottable.rows[callerrow.rowIndex - 1].cells[LOOTTB_COLUMN.NAME].firstChild.setAttribute("onfocusin", "loottable_check_add_row(parentElement.parentElement)");
        else return;
    }
    loottable_body.deleteRow(callerrow.sectionRowIndex);
}

function loottable_clear() {
    while (loottable_body.firstChild)
        loottable_body.firstChild.remove();
    loottable_add_row();

    let gold_quant = document.getElementById("loottb_gold_itemquantity");
    gold_quant.value = "";
    gold_quant.focus();
}

function autocomplete_itemname(callerrow) {
    let callerrow_itemname = callerrow.cells[LOOTTB_COLUMN.NAME].firstChild;
    let callerrow_itemprice = callerrow.cells[LOOTTB_COLUMN.PRICE].firstChild;

    suggestion_index = autocomplete_generic(mediviadb.items, callerrow_itemname);
    if (suggestion_index == -1) callerrow_itemprice.value = "";
    else callerrow_itemprice.value = mediviadb.items[suggestion_index].price;
}

function autocomplete_creature_items() {
    addcreature_autocomplete_lastindex = autocomplete_generic(mediviadb.creatures, addcreature_name);
}

function loottable_show_creature_items() {
    addcreature_panel.style.display = "grid";
    addcreature_name.focus();
}

function loottable_hide_creature_items() {
    addcreature_name.value = "";
    addcreature_panel.style.display = "none";

    // Select first row which has an empty quantity value
    for (let i = 0; i < loottable_body.rows.length; i++) {
        cur_quant = loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild;
        if (cur_quant.value == "") {
            cur_quant.scrollIntoView(false);
            cur_quant.focus();
            break;
        }
    }
}

function loottable_add_creature_items() {
    // @Improvement: We should display an error message to the user saying that the creature name doesn't exist.
    if (addcreature_autocomplete_lastindex == -1) return;
    let i = 0;
    let creature = mediviadb.creatures[addcreature_autocomplete_lastindex];

    // @Improvement: Instead of only checking the last row, keep adding items on empty rows until we reach the last one
    let first_row = loottable_body.rows[loottable_body.rows.length - 1];
    if (first_row.cells[LOOTTB_COLUMN.NAME].firstChild.value == "") {
        first_row.cells[LOOTTB_COLUMN.NAME].firstChild.value = creature.items[0];
        autocomplete_itemname(first_row);
        i = 1;
    }
    for (; i < creature.items.length; i++) {
        autocomplete_lastsize = 0;
        let row = loottable_add_row();
        row.cells[LOOTTB_COLUMN.NAME].firstChild.value = creature.items[i];
        autocomplete_itemname(row);
    }

    loottable_add_row();
    addcreature_panel.scrollIntoView();
    addcreature_name.value = "";
    autocomplete_creature_items();
}

// ----------------------------------
// Functions pertaining to hunt info
// ----------------------------------

function huntinfo_calculate_loot() {
    // Calculate waste
    let totalwaste = 0;
    for (let i = 1; i < players().length; i++) {
        
    }

    // Calculate profit
    let totalearnings = 0;
    totalearnings += stoi(document.getElementById("loottb_gold_itemquantity").value);

    let cur_row;
    for (let i = 0; i < loottable_body.rows.length - 1; i++) {
        cur_row = loottable_body.rows[i];
        totalearnings += stoi(cur_row.cells[LOOTTB_COLUMN.PRICE].firstChild.value * stoi(cur_row.cells[LOOTTB_COLUMN.QUANTITY].firstChild.value));
    }

    document.getElementById("huntinfo_totalearnings").innerText = gtos(totalearnings);
    document.getElementById("huntinfo_profit").innerText = gtos(totalearnings);
    document.getElementById("huntinfo_splitprofit").innerText = gtos(totalearnings);
}

// ---------------
// Input handling
// ---------------

function onkeydown_global(event) {
    // Block keys used with the control modifier
    if (!event.ctrlKey) return;
    let dig = -1;
    let handled = true;

    switch (event.code) {
        case "Digit1":  dig = 1;    break;
        case "Digit2":  dig = 2;    break;
        case "Digit3":  dig = 3;    break;
        case "Digit4":  dig = 4;    break;
        case "Digit5":  dig = 5;    break;
        case "Digit6":  dig = 6;    break;
        case "Digit7":  dig = 7;    break;
        case "Digit8":  dig = 8;    break;
        case "Digit9":  dig = 9;    break;

        case "KeyM":
            loottable_show_creature_items();
            break;

        default:
            // keyCode handling for keys without a string id
            switch (event.keyCode) {
                case 192: // Tilde
                    players_add_player();
                    break;

                default:  handled = false;
            }
    }

    if (dig != -1) {
        players_grid.scrollIntoView(false);
        if (players().length >= dig + 1) {
            player(dig).querySelector(".playername").focus();
            player(dig).querySelector(".playername").setSelectionRange(0, 100);
        }
    }
    if (handled) event.preventDefault();
}

// Make pageup and pagedown change rows
function onkeyup_loottable(event) {
    switch (event.code) {
        case "Enter":
            huntinfo_calculate_loot();
            break;

        case "Escape":
            loottable_clear();
            break;
    }
}

function onkeyup_creature_items(event) {
    if (event.code == "Escape")
        loottable_hide_creature_items();
    event.cancelBubble = true;
}
