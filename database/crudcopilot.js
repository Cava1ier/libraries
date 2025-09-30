const CrudModule = (function () {
  function Crud(database) {
    this.db = database;
    this.metadata = {};
  }

  Crud.prototype.define = function (tableName, meta) {
    if (!tableName.startsWith('tbl')) tableName = 'tbl' + tableName;
    this.metadata[tableName] = meta;
  };

  Crud.prototype.create = function (tableName, obj) {
    tableName = this._normalize(tableName);
    const meta = this.metadata[tableName] || {};
    if (meta.foreignKeys) {
      for (let col in meta.foreignKeys) {
        const fkTable = meta.foreignKeys[col];
        const val = obj[col];
        if (val == null) continue;
        const rows = this.db.read(fkTable, { [this._pkOf(fkTable)]: val }).toArray();
        if (!rows.length) throw new Error(`Foreign key constraint failed: ${fkTable}.${col}=${val}`);
      }
    }
    return this.db.create(tableName, obj);
  };

  Crud.prototype.readAll = function (tableName, filter = {}) {
    tableName = this._normalize(tableName);
    const rs = this.db.read(tableName, filter);
    return rs.toArray().map(arr => this._rowToObject(tableName, arr));
  };

  Crud.prototype.get = function (tableName, id) {
    const pk = this._pkOf(tableName);
    return this.readAll(tableName, { [pk]: id })[0] || null;
  };

  Crud.prototype.update = function (tableName, id, updates) {
    tableName = this._normalize(tableName);
    const pk = this._pkOf(tableName);
    if (updates[pk]) delete updates[pk];
    this.db.update(tableName, id, updates);
  };

  Crud.prototype.delete = function (tableName, id) {
    tableName = this._normalize(tableName);
    const meta = this.metadata[tableName] || {};
    for (let t in this.metadata) {
      const childMeta = this.metadata[t];
      if (childMeta.foreignKeys) {
        for (let col in childMeta.foreignKeys) {
          if (childMeta.foreignKeys[col] === tableName) {
            const rows = this.db.read(t, { [col]: id }).toArray();
            for (let r of rows) this.delete(t, r[0]);
          }
        }
      }
    }
    this.db.delete(tableName, id);
  };

  Crud.prototype.resolveDisplay = function (tableName, rowObj) {
    tableName = this._normalize(tableName);
    const meta = this.metadata[tableName] || {};
    const out = { ...rowObj };
    if (meta.foreignKeys) {
      for (let col in meta.foreignKeys) {
        const fkTable = meta.foreignKeys[col];
        const fkVal = rowObj[col];
        if (fkVal == null) continue;
        const fkMeta = this.metadata[fkTable] || {};
        const displayField = fkMeta.displayField;
        if (displayField) {
          const fkRow = this.get(fkTable, fkVal);
          if (fkRow) out[col + '_display'] = fkRow[displayField];
        }
      }
    }
    if (meta.displayField) {
      out._display = meta.displayField.split('+').map(f => f.trim()).map(f => rowObj[f]).join(' ');
    }
    return out;
  };

  Crud.prototype._pkOf = function (tableName) {
    tableName = this._normalize(tableName);
    const meta = this.metadata[tableName] || {};
    return meta.primaryKey || 'id';
  };

  Crud.prototype._normalize = function (name) {
    return name.startsWith('tbl') ? name : 'tbl' + name;
  };

  Crud.prototype._rowToObject = function (tableName, arr) {
    tableName = this._normalize(tableName);
    const table = this.db.tables.getTable(tableName);
    const obj = {};
    for (let i = 0; i < table.columns.names.length; i++) {
      obj[table.columns.names[i]] = arr[i];
    }
    return obj;
  };

  return { Crud };
})();
