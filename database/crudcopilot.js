<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Dice CRUD Tree View</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; margin: 16px; }
  h1 { margin: 0 0 12px 0; }
  #app { display:flex; gap:20px; align-items:flex-start; }
  #tree { width: 720px; border:1px solid #ddd; padding:12px; border-radius:8px; }
  .node { margin:6px 0; }
  .node > .label { cursor:pointer; display:flex; gap:8px; align-items:center; }
  .children { margin-left:20px; border-left:1px dashed #eee; padding-left:12px; }
  input, select, button { font-size:14px; padding:6px; }
  .controls { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; }
  table { border-collapse:collapse; width:100%; max-width:900px; }
  th, td { border:1px solid #eee; padding:6px; text-align:left; }
  .small { font-size:13px; color:#555; }
  .inline-edit { display:inline-flex; gap:6px; align-items:center; }
  .muted { color:#666; font-size:13px; }
  .btn { padding:6px 8px; }
  .danger { background:#ffdede; border:1px solid #ffbdbd; }
  .success { background:#e6ffed; border:1px solid #bde8c9; }
</style>
</head>
<body>
  <h1>Dice CRUD Tree View (single-file demo)</h1>
  <div id="app">
    <div id="tree"></div>
    <div id="panel">
      <div><strong>Selected:</strong> <span id="selectedInfo" class="muted">none</span></div>
      <div class="controls" id="actions"></div>
      <hr/>
      <div id="log" class="small muted"></div>
    </div>
  </div>

<script>
/* ========= databasegrok library (as provided) ========= */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.RelationalDb = {}));
})(this, function (exports) {
  'use strict';

  class Columns {
    constructor(names) { this.names = names; }
    getIndex(name) { return this.names.indexOf(name); }
    getName(index) { return this.names[index]; }
  }

  class Row {
    constructor(data) { this.data = data; }
    get(column) {
      const idx = this.data.table ? this.data.table.columns.getIndex(column) : -1;
      return idx >= 0 ? this.data[idx] : undefined;
    }
  }

  class Rows {
    constructor(table) {
      this.table = table;
      this.data = [];
      this.nextId = 1;
      this.uniqueMaps = table.unique.map(() => new Map());
    }

    _getUniqueKey(rowData, uniqueIndex) {
      const uniqueCols = this.table.unique[uniqueIndex];
      return uniqueCols.map(col => rowData[this.table.columns.getIndex(col)]).join('::');
    }

    add(rowData) {
      const arr = new Array(this.table.columns.names.length).fill(null);
      for (let key in rowData) {
        const idx = this.table.columns.getIndex(key);
        if (idx > -1) arr[idx] = rowData[key];
      }
      arr[0] = this.nextId++;

      for (let i = 0; i < this.table.unique.length; i++) {
        const key = this._getUniqueKey(arr, i);
        if (this.uniqueMaps[i].has(key)) {
          throw new Error(`Unique constraint violation on ${this.table.unique[i].join(', ')}`);
        }
        this.uniqueMaps[i].set(key, true);
      }

      const row = new Row(arr);
      this.data.push(row);
      return arr[0];
    }

    get(id) { return this.data.find(r => r.data[0] === id); }

    update(id, updates) {
      const row = this.get(id);
      if (!row) return;
      const oldData = [...row.data];
      for (let key in updates) {
        const idx = this.table.columns.getIndex(key);
        if (idx > 0) row.data[idx] = updates[key];
      }
      for (let i = 0; i < this.table.unique.length; i++) {
        const oldKey = this._getUniqueKey(oldData, i);
        const newKey = this._getUniqueKey(row.data, i);
        if (newKey !== oldKey && this.uniqueMaps[i].has(newKey)) {
          row.data = oldData;
          throw new Error(`Unique constraint violation on ${this.table.unique[i].join(', ')}`);
        }
        if (newKey !== oldKey) {
          this.uniqueMaps[i].delete(oldKey);
          this.uniqueMaps[i].set(newKey, true);
        }
      }
    }

    delete(id) {
      const row = this.get(id);
      if (!row) return;
      for (let i = 0; i < this.table.unique.length; i++) {
        const key = this._getUniqueKey(row.data, i);
        this.uniqueMaps[i].delete(key);
      }
      this.data = this.data.filter(r => r.data[0] !== id);
    }

    find(filter) {
      return this.data.filter(r => {
        for (let key in filter) {
          const idx = this.table.columns.getIndex(key);
          if (idx > -1 && r.data[idx] !== filter[key]) return false;
        }
        return true;
      });
    }
  }

  class Rowset {
    constructor(columns, rows) {
      this.columns = columns;
      this.rows = rows;
    }
    toArray() { return this.rows.map(row => row.data); }
    filter(fn) { return new Rowset(this.columns, this.rows.filter(fn)); }
  }

  class Table {
    constructor(name, columnNames, unique = []) {
      if (columnNames[0] !== 'id') {
        throw new Error('First column must be "id"');
      }
      this.name = name;
      this.columns = new Columns(columnNames);
      this.unique = unique;
      this.rows = new Rows(this);
    }
  }

  class Tables {
    constructor() { this.tables = {}; }
    addTable(name, columns, unique = []) {
      if (!name.startsWith('tbl')) name = `tbl${name}`;
      this.tables[name] = new Table(name, columns, unique);
    }
    getTable(name) {
      if (!name.startsWith('tbl')) name = `tbl${name}`;
      return this.tables[name];
    }
  }

  class View {
    constructor(database, tableNames, joins) {
      this.database = database;
      this.tableNames = tableNames;
      this.joins = joins;
    }

    getData() {
      let currentTable = this.database.tables.getTable(this.tableNames[0]);
      let resultRows = [...currentTable.rows.data];
      let currentColumns = [...currentTable.columns.names];

      for (let i = 0; i < this.joins.length; i++) {
        const join = this.joins[i];
        const rightTable = this.database.tables.getTable(join.rightTable);
        const leftColIdx = currentColumns.indexOf(join.leftCol);
        const rightColIdx = rightTable.columns.getIndex(join.rightCol);

        const newResult = [];
        const newColumns = [...currentColumns];

        for (let col of rightTable.columns.names.slice(1)) {
          newColumns.push(`${join.rightTable}.${col}`);
        }

        for (let leftRow of resultRows) {
          for (let rightRow of rightTable.rows.data) {
            if (leftRow.data[leftColIdx] === rightRow.data[rightColIdx]) {
              const combined = [...leftRow.data, ...rightRow.data.slice(1)];
              newResult.push(new Row(combined));
            }
          }
        }

        resultRows = newResult;
        currentColumns = newColumns;
      }

      return new Rowset(new Columns(currentColumns), resultRows);
    }
  }

  class Views {
    constructor(database) { this.database = database; this.views = {}; }
    addView(name, tableNames, joins) { this.views[name] = new View(this.database, tableNames, joins); }
    getView(name) {
      const view = this.views[name];
      if (!view) return null;
      return view.getData();
    }
  }

  class Database {
    constructor() {
      this.tables = new Tables();
      this.views = new Views(this);
    }

    create(tableName, rowData) {
      const table = this.tables.getTable(tableName);
      return table.rows.add(rowData);
    }

    read(tableName, filter = {}) {
      const table = this.tables.getTable(tableName);
      const rows = table.rows.find(filter);
      return new Rowset(table.columns, rows);
    }

    update(tableName, id, updates) {
      const table = this.tables.getTable(tableName);
      table.rows.update(id, updates);
    }

    delete(tableName, id) {
      const table = this.tables.getTable(tableName);
      table.rows.delete(id);
    }
  }

  class DatabaseDriver {
    constructor(tableNames = []) {
      this.database = new Database();
      for (let name of tableNames) {
        this.database.tables.addTable(name, ['id']);
      }
    }

    loadFromText(text) {
      const lines = text.split('\n');
      let currentTable = null;
      let columns = null;

      for (let line of lines) {
        line = line.trim();
        if (line === '' || line.startsWith('//')) {
          currentTable = null;
          continue;
        }

        if (line.startsWith('tbl') && line.includes(':')) {
          const parts = line.split(':');
          const tableName = parts[0];
          columns = parts[1].split('|').map(c => c.trim());
          this.database.tables.addTable(tableName, columns);
          currentTable = this.database.tables.getTable(tableName);
          continue;
        }

        if (currentTable) {
          const values = line.split('|').map(v => v.trim());
          const parsed = values.map(v => isNaN(parseInt(v)) ? v : parseInt(v));
          const rowData = {};
          for (let i = 1; i < columns.length; i++) {
            rowData[columns[i]] = parsed[i - 1] || null;
          }
          currentTable.rows.add(rowData);
        }
      }
    }

    addUnique(tableName, uniqueCols) {
      const table = this.database.tables.getTable(tableName);
      table.unique.push(uniqueCols);
    }

    getDatabase() { return this.database; }
  }

  exports.Columns = Columns;
  exports.Row = Row;
  exports.Rows = Rows;
  exports.Rowset = Rowset;
  exports.Table = Table;
  exports.Tables = Tables;
  exports.View = View;
  exports.Views = Views;
  exports.Database = Database;
  exports.DatabaseDriver = DatabaseDriver;
});

/* ========= CUD library built on top of DatabaseDriver (IIFE-style, UI-independent) ========= */
const CrudModule = (function () {
  // Metadata-driven CRUD layer
  // metadata: tableName -> { primaryKey, fields, displayField, foreignKeys: {col: table}, children: [tableNames] }
  function Crud(database) {
    this.db = database; // Database instance (RelationalDb.Database)
    this.metadata = {};
  }

  Crud.prototype.define = function (tableName, meta) {
    if (!tableName.startsWith('tbl')) tableName = 'tbl' + tableName;
    this.metadata[tableName] = meta;
  };

  Crud.prototype.create = function (tableName, obj) {
    if (!tableName.startsWith('tbl')) tableName = 'tbl' + tableName;
    // validate FK existence
    const meta = this.metadata[tableName] || {};
    if (meta.foreignKeys) {
      for (let col in meta.foreignKeys) {
        const foreignTable = meta.foreignKeys[col];
        const val = obj[col];
        if (val == null) continue;
        const rows = this.db.read(foreignTable, { [this._pkOf(foreignTable)]: val }).toArray();
        if (!rows.length) throw new Error(`Foreign key constraint: no ${foreignTable} row with ${this._pkOf(foreignTable)}=${val}`);
      }
    }
    return this.db.create(tableName, obj);
  };

  Crud.prototype.readAll = function (tableName, filter = {}) {
    if (!tableName.startsWith('tbl')) tableName = 'tbl' + tableName;
    const rs = this.db.read(tableName, filter);
    return rs.toArray().map(arr => this._rowArrayToObject(tableName, arr));
  };

  Crud.prototype.get = function (tableName, id) {
    const pk = this._pkOf(tableName);
    const results = this.readAll(tableName, { [pk]: id });
    return results[0] || null;
  };

  Crud.prototype.update = function (tableName, id, updates) {
    const pk = this._pkOf(tableName);
    if (updates[pk]) delete updates[pk];
    this.db.update(tableName, id, updates);
  };

  Crud.prototype.delete = function (tableName, id) {
    // cascade delete following metadata children
    if (!tableName.startsWith('tbl')) tableName = 'tbl' + tableName;
    const meta = this.metadata[tableName] || {};
    // 1) delete downstream children that reference this table
    for (let tname in this.metadata) {
      const m = this.metadata[tname];
      if (m && m.foreignKeys) {
        for (let col in m.foreignKeys) {
          if (m.foreignKeys[col] === tableName) {
            // find rows in tname referencing this id
            const rows = this.db.read(tname, { [col]: id }).toArray();
            for (let rowArr of rows) {
              const childId = rowArr[0];
              this.delete(tname, childId); // recursive
            }
          }
        }
      }
    }
    // 2) delete row itself
    this.db.delete(tableName, id);
    // 3) optional: cleanup orphaned combos (if any combo no longer referenced by any DiceRollsByPlayer or Games)
    if (tableName === 'tblPlayers' || tableName === 'tblDiceRollsByPlayer' || tableName === 'tblGames') {
      this._cleanupOrphanedCombinations();
    }
  };

  Crud.prototype.resolveDisplay = function (tableName, rowObj) {
    const meta = this.metadata[tableName] || {};
    if (!meta) return rowObj;
    const out = Object.assign({}, rowObj);
    // replace foreign key ids with display names where possible
    if (meta.foreignKeys) {
      for (let col in meta.foreignKeys) {
        const fkTab = meta.foreignKeys[col];
        const fkVal = rowObj[col];
        if (fkVal == null) continue;
        const fkMeta = this.metadata[fkTab] || {};
        const displayField = fkMeta.displayField || null;
        if (displayField) {
          const fkRow = this.get(fkTab, fkVal);
          if (fkRow) out[col + "_display"] = fkRow[displayField];
        }
      }
    }
    // if table has displayField for itself, add it
    if (meta.displayField) out._display = meta.displayField.split('+').map(s => s.trim()).map(p => {
      if (p.includes(',')) return p;
      if (p.startsWith("'") && p.endsWith("'")) return p.slice(1,-1);
      if (p.indexOf('+')>-1) return p;
      if (p.indexOf(' ')>-1) return p;
      // field name
      return ('' + rowObj[p]) || '';
    }).join(' ');
    return out;
  };

  Crud.prototype._pkOf = function (tableName) {
    if (!tableName.startsWith('tbl')) tableName = 'tbl' + tableName;
    const meta = this.metadata[tableName] || {};
    return meta.primaryKey || 'id';
  };

  Crud.prototype._rowArrayToObject = function (tableName, arr) {
    const table = this.db.tables.getTable(tableName);
    const obj = {};
    for (let i = 0; i < table.columns.names.length; i++) {
      obj[table.columns.names[i]] = arr[i];
    }
    return obj;
  };

  Crud.prototype._cleanupOrphanedCombinations = function () {
    // remove combos not referenced by any dice roll or game
    const combos = this.readAll('tblCombination');
    const used = new Set();
    const rolls = this.readAll('tblDiceRollsByPlayer');
    for (let r of rolls) {
      used.add(r.Combo_id);
    }
    const games = this.readAll('tblGames');
    for (let g of games) {
      if (g.comb1_id) used.add(g.comb1_id);
      if (g.comb2_id) used.add(g.comb2_id);
    }
    for (let c of combos) {
      if (!used.has(c.id)) {
        // delete combo
        this.db.delete('tblCombination', c.id);
      }
    }
  };

  return {
    Crud
  };
})();

/* ========= Application scaffold + UI ========= */

(function () {
  const Driver = RelationalDb.DatabaseDriver;
  const driver = new Driver();
  const db = driver.getDatabase();
  const crud = new CrudModule.Crud(db);

  // Define tables with columns
  // We'll follow user base: tblCombination:id|diceH|diceL
  // tblPlayers:id|Name|desc
  // tblDiceRollsByPlayer:id|Player_id|Combo_id
  // tblGames:id|player1_id|player2_id|comb1_id|comb2_id
  db.tables.addTable('tblCombination', ['id','diceH','diceL'], []);
  db.tables.addTable('tblPlayers', ['id','Name','desc'], []);
  db.tables.addTable('tblDiceRollsByPlayer', ['id','Player_id','Combo_id'], []);
  db.tables.addTable('tblGames', ['id','player1_id','player2_id','comb1_id','comb2_id'], []);

  // Define metadata for CUD layer
  crud.define('tblCombination', {
    primaryKey: 'id',
    fields: ['id','diceH','diceL'],
    displayField: "diceH + ',' + diceL"
  });

  crud.define('tblPlayers', {
    primaryKey: 'id',
    fields: ['id','Name','desc'],
    displayField: 'Name'
  });

  crud.define('tblDiceRollsByPlayer', {
    primaryKey: 'id',
    fields: ['id','Player_id','Combo_id'],
    foreignKeys: { 'Player_id': 'tblPlayers', 'Combo_id': 'tblCombination' },
    displayField: 'Player_id'
  });

  crud.define('tblGames', {
    primaryKey: 'id',
    fields: ['id','player1_id','player2_id','comb1_id','comb2_id'],
    foreignKeys: { 'player1_id': 'tblPlayers', 'player2_id': 'tblPlayers', 'comb1_id': 'tblCombination', 'comb2_id': 'tblCombination' }
  });

  // helper to create 2d6 combos (36 combos)
  function seedCombinations() {
    for (let h=1; h<=6; h++) {
      for (let l=1; l<=6; l++) {
        db.create('tblCombination', { diceH: h, diceL: l });
      }
    }
  }

  // create 6 players
  function seedPlayers() {
    const names = ['Roger','Alan','Pat','Sam','Alex','Jamie'];
    for (let n of names) db.create('tblPlayers', { Name: n, desc: `${n} description`});
  }

  // simple random roll: pick a combo id uniformly from combos
  function randomComboId() {
    const combos = db.read('tblCombination').toArray();
    if (!combos.length) return null;
    const idx = Math.floor(Math.random() * combos.length);
    return combos[idx][0];
  }

  // Build schedule: everyone plays everyone once (6 players -> 15 matches).
  // Then top two (we'll pick first two created) play two more games.
  function seedGamesAndRolls() {
    const players = db.read('tblPlayers').toArray().map(a=>a[0]); // ids
    // pair all i<j
    for (let i=0;i<players.length;i++) {
      for (let j=i+1;j<players.length;j++) {
        // make dice rolls for each player in this game
        const comb1 = randomComboId();
        const comb2 = randomComboId();
        // create dice rolls by player
        const roll1 = db.create('tblDiceRollsByPlayer', { Player_id: players[i], Combo_id: comb1 });
        const roll2 = db.create('tblDiceRollsByPlayer', { Player_id: players[j], Combo_id: comb2 });
        // create game with both players and combos
        db.create('tblGames', { player1_id: players[i], player2_id: players[j], comb1_id: comb1, comb2_id: comb2 });
      }
    }
    // top two play two more times (take first two)
    const top2 = players.slice(0,2);
    for (let k=0;k<2;k++) {
      const comb1 = randomComboId();
      const comb2 = randomComboId();
      db.create('tblDiceRollsByPlayer', { Player_id: top2[0], Combo_id: comb1 });
      db.create('tblDiceRollsByPlayer', { Player_id: top2[1], Combo_id: comb2 });
      db.create('tblGames', { player1_id: top2[0], player2_id: top2[1], comb1_id: comb1, comb2_id: comb2 });
    }
  }

  // Seed database
  seedCombinations();
  seedPlayers();
  seedGamesAndRolls();

  /* ===== UI: interactive tree view with CRUD ===== */
  const root = document.getElementById('tree');
  const selectedInfo = document.getElementById('selectedInfo');
  const actions = document.getElementById('actions');
  const log = document.getElementById('log');

  function logMsg(...args) {
    log.textContent = args.join(' | ');
    console.debug(...args);
  }

  // Utility: create element with attrs
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (let k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    for (let c of children) {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    }
    return node;
  }

  // Render top-level tree: Games -> each Game node expands to show players, combos, and related dice roll entries
  function renderTree() {
    root.innerHTML = '';
    const title = el('div', { class: 'muted' }, [ `Tables: tblGames (${db.read('tblGames').toArray().length}) | tblPlayers (${db.read('tblPlayers').toArray().length}) | tblDiceRollsByPlayer (${db.read('tblDiceRollsByPlayer').toArray().length}) | tblCombination (${db.read('tblCombination').toArray().length})` ]);
    root.appendChild(title);
    const addGameBtn = el('button', { class: 'btn success' }, ['Create New Random Game']);
    addGameBtn.addEventListener('click', () => {
      try {
        const players = db.read('tblPlayers').toArray().map(a=>a[0]);
        if (players.length < 2) { logMsg('Need at least 2 players'); return; }
        const p1 = players[Math.floor(Math.random()*players.length)];
        let p2 = players[Math.floor(Math.random()*players.length)];
        while (p2 === p1) p2 = players[Math.floor(Math.random()*players.length)];
        const c1 = randomComboId(); const c2 = randomComboId();
        db.create('tblDiceRollsByPlayer', { Player_id: p1, Combo_id: c1 });
        db.create('tblDiceRollsByPlayer', { Player_id: p2, Combo_id: c2 });
        db.create('tblGames', { player1_id: p1, player2_id: p2, comb1_id: c1, comb2_id: c2 });
        renderTree();
        logMsg('Added game', p1, p2);
      } catch (e) { logMsg('Error:', e.message); }
    });
    root.appendChild(addGameBtn);

    const games = db.read('tblGames').toArray();
    const gamesRoot = el('div', {}, []);
    root.appendChild(gamesRoot);

    // helper: readable combo text
    function comboTextById(id) {
      const r = db.read('tblCombination', { id }).toArray()[0];
      if (!r) return `combo:${id}`;
      return `${r[1]},${r[2]} (id:${r[0]})`;
    }
    function playerNameById(id) {
      const r = db.read('tblPlayers', { id }).toArray()[0];
      if (!r) return `player:${id}`;
      return `${r[1]} (id:${r[0]})`;
    }

    for (let g of games) {
      const gid = g[0], p1 = g[1], p2 = g[2], c1 = g[3], c2 = g[4];
      const node = el('div', { class: 'node' });
      const label = el('div', { class: 'label' }, []);
      const expandBtn = el('button', { class: 'btn' }, ['▶']);
      let expanded = false;
      const titleText = el('span', { text: `Game ${gid}: ${playerNameById(p1)} vs ${playerNameById(p2)} — combos ${c1}/${c2}` });
      label.appendChild(expandBtn);
      label.appendChild(titleText);

      // inline edit controls
      const inline = el('span', { class: 'inline-edit' });
      const editBtn = el('button', { class: 'btn' }, ['Edit']);
      const delBtn = el('button', { class: 'btn danger' }, ['Delete']);
      inline.appendChild(editBtn);
      inline.appendChild(delBtn);
      label.appendChild(inline);

      node.appendChild(label);
      const children = el('div', { class: 'children', style: 'display:none' });

      expandBtn.addEventListener('click', () => {
        expanded = !expanded;
        children.style.display = expanded ? 'block' : 'none';
        expandBtn.textContent = expanded ? '▼' : '▶';
        selectedInfo.textContent = `Game ${gid}`;
        actions.innerHTML = '';
        const btns = [
          { txt:'Add DiceRoll for P1', cls:'btn', fn:()=> {
            const comb = randomComboId();
            db.create('tblDiceRollsByPlayer', { Player_id: p1, Combo_id: comb });
            renderTree(); logMsg('Added roll for player', p1);
          }},
          { txt:'Add DiceRoll for P2', cls:'btn', fn:()=> {
            const comb = randomComboId();
            db.create('tblDiceRollsByPlayer', { Player_id: p2, Combo_id: comb });
            renderTree(); logMsg('Added roll for player', p2);
          }},
          { txt:'Re-roll both combos', cls:'btn', fn:()=> {
            const newc1 = randomComboId(), newc2 = randomComboId();
            db.update('tblGames', gid, { comb1_id: newc1, comb2_id: newc2 });
            renderTree(); logMsg('Re-rolled game', gid);
          }}
        ];
        actions.appendChild(el('div', {}, btns.map(b => {
          const btn = el('button', { class: b.cls }, [b.txt]);
          btn.addEventListener('click', b.fn);
          return btn;
        })));
      });

      // Edit flow
      editBtn.addEventListener('click', () => {
        // show a small edit form inline inside children
        children.innerHTML = '';
        children.style.display = 'block';
        expandBtn.textContent = '▼';
        const form = el('div', {}, []);
        // player selects
        const p1Select = el('select', {});
        const p2Select = el('select', {});
        const players = db.read('tblPlayers').toArray();
        for (let pr of players) {
          const opt1 = el('option', { value: pr[0] }, [pr[1]]);
          const opt2 = el('option', { value: pr[0] }, [pr[1]]);
          if (pr[0] === p1) opt1.selected = true;
          if (pr[0] === p2) opt2.selected = true;
          p1Select.appendChild(opt1); p2Select.appendChild(opt2);
        }
        // combos selects
        const combos = db.read('tblCombination').toArray();
        const c1Select = el('select', {});
        const c2Select = el('select', {});
        for (let co of combos) {
          const text = `${co[1]},${co[2]}`;
          const o1 = el('option', { value: co[0] }, [text]);
          const o2 = el('option', { value: co[0] }, [text]);
          if (co[0] === c1) o1.selected = true;
          if (co[0] === c2) o2.selected = true;
          c1Select.appendChild(o1); c2Select.appendChild(o2);
        }
        form.appendChild(el('div', {}, ['Player 1: ', p1Select]));
        form.appendChild(el('div', {}, ['Player 2: ', p2Select]));
        form.appendChild(el('div', {}, ['Combo 1: ', c1Select]));
        form.appendChild(el('div', {}, ['Combo 2: ', c2Select]));
        const saveBtn = el('button', { class: 'btn success' }, ['Save']);
        const cancelBtn = el('button', { class: 'btn' }, ['Cancel']);
        form.appendChild(saveBtn); form.appendChild(cancelBtn);
        children.appendChild(form);

        saveBtn.addEventListener('click', () => {
          try {
            db.update('tblGames', gid, {
              player1_id: parseInt(p1Select.value),
              player2_id: parseInt(p2Select.value),
              comb1_id: parseInt(c1Select.value),
              comb2_id: parseInt(c2Select.value)
            });
            renderTree(); logMsg('Game updated', gid);
          } catch (e) { logMsg('Error updating game', e.message); }
        });
        cancelBtn.addEventListener('click', () => { children.innerHTML = ''; children.style.display='none'; expandBtn.textContent='▶';});
      });

      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete game ${gid} ? This will also remove associated dice rolls if left orphaned.`)) return;
        // We must locate associated dice rolls referencing the game's combos & players and delete them
        // For simplicity we will delete only the game; cleanup will remove orphan combos, but we keep dice rolls intact (they could be historical)
        db.delete('tblGames', gid);
        // cleanup combos and orphans via crud layer:
        crud._cleanupOrphanedCombinations();
        renderTree(); logMsg('Deleted game', gid);
      });

      // children content: show players, combos, and dice rolls that reference this game's combos or players
      // find dice rolls for p1 and p2 or that reference combos
      const rolls = db.read('tblDiceRollsByPlayer').toArray();
      const list = el('div', {}, []);
      list.appendChild(el('div', { class: 'small muted' }, ['Dice Rolls related to this game:']));
      const table = el('table', {}, []);
      const header = el('tr', {}, [el('th',{},['id']),el('th',{},['Player']),el('th',{},['Combo']),el('th',{},['Actions'])]);
      table.appendChild(header);
      for (let r of rolls) {
        const rid = r[0], rPlayer = r[1], rCombo = r[2];
        if (rPlayer === p1 || rPlayer === p2 || rCombo === c1 || rCombo === c2) {
          const tr = el('tr', {}, []);
          tr.appendChild(el('td', {}, [String(rid)]));
          tr.appendChild(el('td', {}, [playerNameById(rPlayer)]));
          tr.appendChild(el('td', {}, [comboTextById(rCombo)]));
          const act = el('td', {}, []);
          const editRoll = el('button', { class: 'btn' }, ['Edit']);
          const delRoll = el('button', { class: 'btn danger' }, ['Delete']);
          act.appendChild(editRoll); act.appendChild(delRoll);
          tr.appendChild(act);
          table.appendChild(tr);

          editRoll.addEventListener('click', () => {
            const m = el('div', {}, []);
            const ps = db.read('tblPlayers').toArray();
            const selP = el('select', {});
            for (let pr of ps) {
              const o = el('option', { value: pr[0] }, [pr[1]]);
              if (pr[0] === rPlayer) o.selected = true;
              selP.appendChild(o);
            }
            const cs = db.read('tblCombination').toArray();
            const selC = el('select', {});
            for (let co of cs) {
              const o = el('option', { value: co[0] }, [`${co[1]},${co[2]}`]);
              if (co[0] === rCombo) o.selected = true;
              selC.appendChild(o);
            }
            const save = el('button', { class: 'btn success' }, ['Save']);
            const cancel = el('button', { class: 'btn' }, ['Cancel']);
            m.appendChild(el('div', {}, ['Player: ', selP]));
            m.appendChild(el('div', {}, ['Combo: ', selC]));
            m.appendChild(save); m.appendChild(cancel);
            children.appendChild(m);
            save.addEventListener('click', () => {
              db.update('tblDiceRollsByPlayer', rid, { Player_id: parseInt(selP.value), Combo_id: parseInt(selC.value) });
              renderTree(); logMsg('Updated roll', rid);
            });
            cancel.addEventListener('click', () => { m.remove(); });
          });

          delRoll.addEventListener('click', () => {
            if (!confirm('Delete this dice roll?')) return;
            db.delete('tblDiceRollsByPlayer', rid);
            crud._cleanupOrphanedCombinations();
            renderTree(); logMsg('Deleted roll', rid);
          });
        }
      }
      if (table.rows.length === 0) {} // noop
      children.appendChild(list);
      children.appendChild(table);

      node.appendChild(children);
      gamesRoot.appendChild(node);
    }

    // Also show players list with create/update/delete controls
    const playersBox = el('div', { style: 'margin-top:14px;' }, []);
    playersBox.appendChild(el('h3', {}, ['Players']));
    const playersTable = el('table', {}, []);
    playersTable.appendChild(el('tr', {}, [el('th',{},['id']),el('th',{},['Name']),el('th',{},['desc']),el('th',{},['Actions'])]));
    const players = db.read('tblPlayers').toArray();
    for (let p of players) {
      const tr = el('tr', {}, []);
      const pid = p[0];
      tr.appendChild(el('td', {}, [String(pid)]));
      tr.appendChild(el('td', {}, [p[1]]));
      tr.appendChild(el('td', {}, [p[2] || '']));
      const act = el('td', {}, []);
      const edit = el('button', { class: 'btn' }, ['Edit']);
      const del = el('button', { class: 'btn danger' }, ['Delete']);
      act.appendChild(edit); act.appendChild(del);
      tr.appendChild(act);
      playersTable.appendChild(tr);

      edit.addEventListener('click', () => {
        const form = el('div', {}, []);
        const nameIn = el('input', { value: p[1] });
        const descIn = el('input', { value: p[2] || '' });
        const save = el('button', { class: 'btn success' }, ['Save']);
        const cancel = el('button', { class: 'btn' }, ['Cancel']);
        form.appendChild(el('div', {}, ['Name: ', nameIn]));
        form.appendChild(el('div', {}, ['Desc: ', descIn]));
        form.appendChild(save); form.appendChild(cancel);
        root.appendChild(form);
        save.addEventListener('click', () => {
          db.update('tblPlayers', pid, { Name: nameIn.value, desc: descIn.value });
          renderTree(); form.remove(); logMsg('Player updated', pid);
        });
        cancel.addEventListener('click', () => { form.remove(); });
      });

      del.addEventListener('click', () => {
        if (!confirm(`Delete player ${p[1]} and cascade remove their dice rolls and games?`)) return;
        // use crud.delete to cascade
        crud.delete('tblPlayers', pid);
        renderTree(); logMsg('Deleted player', pid);
      });
    }
    // add new player control
    const newPlayerBtn = el('button', { class: 'btn' }, ['Add Player']);
    newPlayerBtn.addEventListener('click', () => {
      const name = prompt('Player name:');
      if (!name) return;
      const desc = prompt('Player desc:', '');
      db.create('tblPlayers', { Name: name, desc: desc });
      renderTree(); logMsg('Player added', name);
    });

    playersBox.appendChild(playersTable);
    playersBox.appendChild(newPlayerBtn);
    root.appendChild(playersBox);

    // combos summary (small)
    const combosBox = el('div', { style: 'margin-top:12px' }, []);
    combosBox.appendChild(el('h3', {}, ['Combinations (sample 10)']));
    const combos = db.read('tblCombination').toArray().slice(0,10);
    combosBox.appendChild(el('div', {}, [ combos.map(c => `${c[0]}:${c[1]},${c[2]}`).join(' | ') ]));
    root.appendChild(combosBox);

    // dice rolls full listing button
    const rollsBox = el('div', { style: 'margin-top:12px' }, []);
    const showRolls = el('button', { class: 'btn' }, ['Show all dice rolls']);
    rollsBox.appendChild(showRolls);
    showRolls.addEventListener('click', ()=> {
      const r = db.read('tblDiceRollsByPlayer').toArray();
      alert(r.map(a=>`id:${a[0]}, player:${playerNameById(a[1])}, combo:${comboTextById(a[2])}`).join('\n'));
    });
    root.appendChild(rollsBox);
  }

  // Initial render
  renderTree();

  // expose small API to console for testing
  window.__db = db;
  window.__crud = crud;
})();
</script>
</body>
</html>
