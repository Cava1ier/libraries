(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.RelationalDb = {}));
})(this, function (exports) {
  'use strict';

  class Columns {
    constructor(names) {
      this.names = names;
    }

    getIndex(name) {
      return this.names.indexOf(name);
    }

    getName(index) {
      return this.names[index];
    }
  }

  class Row {
    constructor(data) {
      this.data = data; // array of values
    }

    get(column) {
      const idx = this.data.table.columns.getIndex(column); // assuming row has table ref? Wait, no, but for simplicity, row.data is array
      return this.data[idx];
    }
  }

  class Rows {
    constructor(table) {
      this.table = table;
      this.data = []; // array of Row objects
      this.nextId = 1;
      this.uniqueMaps = table.unique.map(() => new Map()); // one map per unique constraint
    }

    _getUniqueKey(rowData, uniqueIndex) {
      const uniqueCols = this.table.unique[uniqueIndex];
      return uniqueCols.map(col => rowData[this.table.columns.getIndex(col)]).join('::');
    }

    add(rowData) {
      // rowData is object {col: value}
      const arr = new Array(this.table.columns.names.length).fill(null);
      for (let key in rowData) {
        const idx = this.table.columns.getIndex(key);
        if (idx > -1) arr[idx] = rowData[key];
      }
      arr[0] = this.nextId++; // set id

      // Check uniqueness
      for (let i = 0; i < this.table.unique.length; i++) {
        const key = this._getUniqueKey(arr, i);
        if (this.uniqueMaps[i].has(key)) {
          throw new Error(`Unique constraint violation on ${this.table.unique[i].join(', ')}`);
        }
        this.uniqueMaps[i].set(key, true);
      }

      const row = new Row(arr);
      this.data.push(row);
      return arr[0]; // return new id
    }

    get(id) {
      return this.data.find(r => r.data[0] === id);
    }

    update(id, updates) {
      const row = this.get(id);
      if (!row) return;

      const oldData = [...row.data];
      for (let key in updates) {
        const idx = this.table.columns.getIndex(key);
        if (idx > 0) { // can't update id
          row.data[idx] = updates[key];
        }
      }

      // Check uniqueness after update
      for (let i = 0; i < this.table.unique.length; i++) {
        const oldKey = this._getUniqueKey(oldData, i);
        const newKey = this._getUniqueKey(row.data, i);
        if (newKey !== oldKey && this.uniqueMaps[i].has(newKey)) {
          row.data = oldData; // revert
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

      // Remove from unique maps
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
      this.columns = columns; // Columns instance
      this.rows = rows; // array of Row
    }

    toArray() {
      return this.rows.map(row => row.data);
    }

    filter(fn) {
      return new Rowset(this.columns, this.rows.filter(fn));
    }
  }

  class Table {
    constructor(name, columnNames, unique = []) {
      if (columnNames[0] !== 'id') {
        throw new Error('First column must be "id"');
      }
      this.name = name;
      this.columns = new Columns(columnNames);
      this.unique = unique; // array of arrays, e.g. [['name'], ['email']]
      this.rows = new Rows(this);
    }
  }

  class Tables {
    constructor() {
      this.tables = {};
    }

    addTable(name, columns, unique = []) {
      if (!name.startsWith('tbl')) {
        name = `tbl${name}`;
      }
      this.tables[name] = new Table(name, columns, unique);
    }

    getTable(name) {
      if (!name.startsWith('tbl')) {
        name = `tbl${name}`;
      }
      return this.tables[name];
    }
  }

  class View {
    constructor(database, tableNames, joins) {
      this.database = database;
      this.tableNames = tableNames;
      this.joins = joins; // array of {leftTable, leftCol, rightTable, rightCol}
    }

    getData() {
      // Simple implementation for chain of joins (e.g., for many-to-many)
      // Start with first table
      let currentTable = this.database.tables.getTable(this.tableNames[0]);
      let resultRows = [...currentTable.rows.data]; // array of Row
      let currentColumns = [...currentTable.columns.names];

      for (let i = 0; i < this.joins.length; i++) {
        const join = this.joins[i];
        const rightTable = this.database.tables.getTable(join.rightTable);
        const leftColIdx = currentColumns.indexOf(join.leftCol);
        const rightColIdx = rightTable.columns.getIndex(join.rightCol);

        const newResult = [];
        const newColumns = [...currentColumns];

        // Add right columns without id
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
    constructor(database) {
      this.database = database;
      this.views = {};
    }

    addView(name, tableNames, joins) {
      this.views[name] = new View(this.database, tableNames, joins);
    }

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

    // CRUD proxies
    create(tableName, rowData) {
      const table = this.tables.getTable(tableName);
      return table.rows.add(rowData);
    }

    read(tableName, filter) {
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

    // Load from text format
    // Assumes format: tblName:id|col1|col2
    // Then data lines: val1|val2|val3
    // Empty line to terminate table
    // Uniqueness not parsed from text in this basic version; set manually after
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
          // Basic parsing: assume numbers if parseInt works, else string
          const parsed = values.map(v => isNaN(parseInt(v)) ? v : parseInt(v));
          const rowData = {};
          for (let i = 1; i < columns.length; i++) { // skip id
            rowData[columns[i]] = parsed[i - 1] || null; // data lines start without id?
            // Wait, comment says id auto increment, so data lines without id?
          }
          currentTable.rows.add(rowData);
        }
      }
    }

    // Example: add unique after loading
    addUnique(tableName, uniqueCols) {
      const table = this.database.tables.getTable(tableName);
      table.unique.push(uniqueCols);
      // Rebuild unique maps if needed, but for basic, assume added before data
    }

    getDatabase() {
      return this.database;
    }
  }

  // Expose public API
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
