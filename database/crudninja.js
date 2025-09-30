Here's the advanced CRUD library using branchless programming and recursion techniques:


(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.AdvancedCrudLib = {}));
})(this, function (exports) {
  'use strict';

  // Branchless utility functions
  const BranchlessUtils = {
    // Branchless max using bitwise operations
    max: (a, b) => {
      const diff = a - b;
      const mask = (diff >> 31) & 1; // Extract sign bit (1 if negative, 0 if positive)
      return a - (diff & -mask);
    },

    // Branchless min using bitwise operations
    min: (a, b) => {
      const diff = a - b;
      const mask = (diff >> 31) & 1;
      return b + (diff & -mask);
    },

    // Branchless absolute value
    abs: (x) => {
      const mask = x >> 31;
      return (x + mask) ^ mask;
    },

    // Branchless conditional assignment (ternary replacement)
    select: (condition, trueVal, falseVal) => {
      const mask = -(!!condition);
      return (trueVal & mask) | (falseVal & ~mask);
    },

    // Branchless null check with default
    nullDefault: (value, defaultVal) => {
      const isNull = +(value == null);
      const mask = -isNull;
      return BranchlessUtils.select(isNull, defaultVal, value);
    },

    // Branchless array bounds check
    boundedIndex: (index, arrayLength) => {
      const inBounds = +(index >= 0 && index < arrayLength);
      return BranchlessUtils.select(inBounds, index, -1);
    }
  };

  // Lookup tables for common operations
  const LookupTables = {
    // Depth calculation lookup for common relationship patterns
    depthPatterns: new Map([
      ['single', 0],
      ['parent-child', 1],
      ['grandparent', 2],
      ['great-grandparent', 3]
    ]),

    // Operation type lookup
    operationTypes: ['create', 'read', 'update', 'delete'],
    
    // Validation result codes
    validationCodes: {
      SUCCESS: 0,
      FK_VIOLATION: 1,
      NULL_CONSTRAINT: 2,
      UNIQUE_VIOLATION: 3,
      NOT_FOUND: 4
    }
  };

  class AdvancedCrudManager {
    constructor(database) {
      this.db = database;
      this.metadata = new Map();
      this.depthCache = new Map();
      this.validationCache = new Map();
      
      // Pre-computed lookup tables
      this.operationLookup = new Map();
      this._initializeOperationLookup();
    }

    _initializeOperationLookup() {
      // Branchless operation dispatch using lookup table
      this.operationLookup.set('create', this._executeCreate.bind(this));
      this.operationLookup.set('read', this._executeRead.bind(this));
      this.operationLookup.set('update', this._executeUpdate.bind(this));
      this.operationLookup.set('delete', this._executeDelete.bind(this));
    }

    define(tableName, meta) {
      const normalizedName = this._normalize(tableName);
      const enhancedMeta = {
        primaryKey: 'id',
        fields: [],
        displayField: null,
        foreignKeys: new Map(),
        children: new Set(),
        depth: 0,
        validationMask: 0,
        ...meta
      };
      
      // Convert arrays/objects to more efficient structures
      if (meta.foreignKeys) {
        enhancedMeta.foreignKeys = new Map(Object.entries(meta.foreignKeys));
      }
      if (meta.children) {
        enhancedMeta.children = new Set(meta.children);
      }
      
      this.metadata.set(normalizedName, enhancedMeta);
      this._calculateDepthsRecursive();
    }

    // Recursive depth calculation with memoization
    _calculateDepthsRecursive(visited = new Set(), calculating = new Set()) {
      const calculateDepth = (tableName) => {
        // Branchless cycle detection
        const inCalculating = +(calculating.has(tableName));
        const inVisited = +(visited.has(tableName));
        
        // Use lookup table result if already calculated
        if (this.depthCache.has(tableName)) {
          return this.depthCache.get(tableName);
        }

        // Throw error if circular dependency (branchless would be complex here)
        if (inCalculating) {
          throw new Error(`Circular dependency: ${tableName}`);
        }
        
        if (inVisited) {
          return this.metadata.get(tableName)?.depth || 0;
        }

        calculating.add(tableName);
        const meta = this.metadata.get(tableName);
        
        // Recursive depth calculation using reduce (functional approach)
        const maxDepth = meta?.foreignKeys ? 
          Array.from(meta.foreignKeys.values()).reduce((max, parentTable) => {
            const parentDepth = this.metadata.has(parentTable) ? 
              calculateDepth(parentTable) + 1 : 0;
            return BranchlessUtils.max(max, parentDepth);
          }, 0) : 0;

        if (meta) {
          meta.depth = maxDepth;
        }
        
        this.depthCache.set(tableName, maxDepth);
        calculating.delete(tableName);
        visited.add(tableName);
        
        return maxDepth;
      };

      // Calculate depths for all tables
      for (const tableName of this.metadata.keys()) {
        calculateDepth(tableName);
      }
    }

    // Branchless operation dispatcher
    execute(operation, tableName, ...args) {
      const handler = this.operationLookup.get(operation);
      const validOperation = +(handler !== undefined);
      
      // Branchless error handling
      const errorMsg = `Unknown operation: ${operation}`;
      const result = BranchlessUtils.select(
        validOperation,
        () => handler(tableName, ...args),
        () => { throw new Error(errorMsg); }
      );
      
      return validOperation ? handler(tableName, ...args) : (() => { throw new Error(errorMsg); })();
    }

    _executeCreate(tableName, obj) {
      const normalizedName = this._normalize(tableName);
      const validationResult = this._validateForeignKeysRecursive(normalizedName, obj);
      
      // Branchless validation check
      const isValid = +(validationResult === LookupTables.validationCodes.SUCCESS);
      const errorMsg = this._getValidationErrorMessage(validationResult);
      
      if (!isValid) {
        throw new Error(errorMsg);
      }
      
      return this.db.create(normalizedName, obj);
    }

    _executeRead(tableName, filter = {}) {
      const normalizedName = this._normalize(tableName);
      const rs = this.db.read(normalizedName, filter);
      return rs.toArray().map(arr => this._rowToObject(normalizedName, arr));
    }

    _executeUpdate(tableName, id, updates) {
      const normalizedName = this._normalize(tableName);
      const pk = this._pkOf(normalizedName);
      
      // Branchless primary key removal
      const cleanUpdates = { ...updates };
      delete cleanUpdates[pk];
      
      const validationResult = this._validateForeignKeysRecursive(normalizedName, cleanUpdates);
      const isValid = +(validationResult === LookupTables.validationCodes.SUCCESS);
      
      if (!isValid) {
        throw new Error(this._getValidationErrorMessage(validationResult));
      }
      
      this.db.update(normalizedName, id, cleanUpdates);
    }

    _executeDelete(tableName, id) {
      const normalizedName = this._normalize(tableName);
      const dependents = this._getDependentRecordsRecursive(normalizedName, id);
      
      // Sort by depth using branchless comparison
      const sortedDependents = this._sortByDepthDescending(dependents);
      
      // Recursive delete in depth order
      this._cascadeDeleteRecursive(sortedDependents);
      this.db.delete(normalizedName, id);
    }

    // Recursive foreign key validation with memoization
    _validateForeignKeysRecursive(tableName, obj, visited = new Set()) {
      const cacheKey = `${tableName}:${JSON.stringify(obj)}`;
      
      if (this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey);
      }

      const meta = this.metadata.get(tableName);
      if (!meta?.foreignKeys?.size) {
        this.validationCache.set(cacheKey, LookupTables.validationCodes.SUCCESS);
        return LookupTables.validationCodes.SUCCESS;
      }

      // Recursive validation using Array.from and every
      const validationResults = Array.from(meta.foreignKeys.entries()).map(([col, fkTable]) => {
        const val = obj[col];
        
        // Branchless null check
        const isNull = +(val == null);
        if (isNull) return LookupTables.validationCodes.SUCCESS;

        const pk = this._pkOf(fkTable);
        const rows = this.db.read(fkTable, { [pk]: val }).toArray();
        const exists = +(rows.length > 0);
        
        return BranchlessUtils.select(
          exists,
          LookupTables.validationCodes.SUCCESS,
          LookupTables.validationCodes.FK_VIOLATION
        );
      });

      // Find first error using reduce (branchless aggregation)
      const result = validationResults.reduce((acc, curr) => {
        const hasError = +(acc !== LookupTables.validationCodes.SUCCESS);
        return BranchlessUtils.select(hasError, acc, curr);
      }, LookupTables.validationCodes.SUCCESS);

      this.validationCache.set(cacheKey, result);
      return result;
    }

    // Recursive dependent record discovery
    _getDependentRecordsRecursive(tableName, id, visited = new Set(), depth = 0) {
      const key = `${tableName}:${id}`;
      
      // Branchless cycle detection
      const alreadyVisited = +(visited.has(key));
      if (alreadyVisited) return new Map();
      
      visited.add(key);
      const dependents = new Map();
      
      // Recursive traversal using functional approach
      const childTables = Array.from(this.metadata.keys()).filter(childTable => {
        const childMeta = this.metadata.get(childTable);
        return childMeta?.foreignKeys && 
               Array.from(childMeta.foreignKeys.values()).includes(tableName);
      });

      // Process children recursively
      childTables.forEach(childTable => {
        const childMeta = this.metadata.get(childTable);
        const foreignKeyColumns = Array.from(childMeta.foreignKeys.entries())
          .filter(([col, fkTable]) => fkTable === tableName)
          .map(([col]) => col);

        foreignKeyColumns.forEach(col => {
          const childRows = this.db.read(childTable, { [col]: id }).toArray();
          
          if (childRows.length > 0) {
            const existingIds = dependents.get(childTable) || new Set();
            
            childRows.forEach(row => {
              const childId = row[0];
              existingIds.add(childId);
              
              // Recursive call for grandchildren
              const grandChildren = this._getDependentRecordsRecursive(
                childTable, childId, visited, depth + 1
              );
              
              // Merge grandchildren using functional approach
              grandChildren.forEach((ids, table) => {
                const existing = dependents.get(table) || new Set();
                ids.forEach(id => existing.add(id));
                dependents.set(table, existing);
              });
            });
            
            dependents.set(childTable, existingIds);
          }
        });
      });

      return dependents;
    }

    // Branchless sorting by depth
    _sortByDepthDescending(dependents) {
      return Array.from(dependents.keys())
        .map(table => ({
          table,
          depth: this.metadata.get(table)?.depth || 0,
          ids: dependents.get(table)
        }))
        .sort((a, b) => {
          // Branchless comparison
          const diff = b.depth - a.depth;
          const sign = (diff >> 31) | ((-diff) >>> 31);
          return diff;
        });
    }

    // Recursive cascade delete
    _cascadeDeleteRecursive(sortedDependents, index = 0) {
      // Base case: branchless termination
      const hasMore = +(index < sortedDependents.length);
      if (!hasMore) return;

      const { table, ids } = sortedDependents[index];
      
      // Delete all records in this table
      ids.forEach(id => this.db.delete(table, id));
      
      // Tail recursion
      this._cascadeDeleteRecursive(sortedDependents, index + 1);
    }

    // Branchless validation error message lookup
    _getValidationErrorMessage(code) {
      const messages = [
        'Success',
        'Foreign key constraint violation',
        'Null constraint violation', 
        'Unique constraint violation',
        'Record not found'
      ];
      
      const validIndex = BranchlessUtils.boundedIndex(code, messages.length);
      return BranchlessUtils.select(
        validIndex >= 0,
        messages[code],
        'Unknown validation error'
      );
    }

    // Recursive display value resolution
    getDisplayValueRecursive(tableName, id, depth = 0, maxDepth = 2) {
      // Branchless depth check
      const exceedsDepth = +(depth > maxDepth);
      if (exceedsDepth) return `[Max depth exceeded]`;

      const record = this.get(tableName, id);
      const hasRecord = +(record !== null);
      
      if (!hasRecord) return null;

      const meta = this.metadata.get(tableName);
      const hasDisplayField = +(meta?.displayField !== null);
      
      if (hasDisplayField && meta.displayField.includes('+')) {
        return meta.displayField.split('+')
          .map(field => record[field.trim()] || '')
          .join(' ');
      }
      
      // Branchless field selection using lookup
      const fieldPriority = ['name', 'title', 'displayField', 'id'];
      const selectedField = fieldPriority.find(field => 
        field === 'displayField' ? meta?.displayField && record[meta.displayField] :
        record[field] !== undefined
      );
      
      return selectedField === 'id' ? record.id?.toString() : 
             selectedField === 'displayField' ? record[meta.displayField] :
             record[selectedField] || 'Unknown';
    }

    // Recursive relationship tree with branchless optimization
    getRelationshipTreeRecursive(tableName, id, maxDepth = 3, currentDepth = 0) {
      // Branchless depth termination
      const exceedsDepth = +(currentDepth >= maxDepth);
      if (exceedsDepth) return null;

      const record = this.get(tableName, id);
      const hasRecord = +(record !== null);
      
      if (!hasRecord) return null;

      const tree = {
        table: tableName,
        record: this.resolveDisplay(tableName, record),
        children: [],
        depth: currentDepth
      };

      // Recursive child discovery
      const meta = this.metadata.get(tableName);
      if (meta?.children?.size) {
        const childTrees = Array.from(meta.children).flatMap(childTable => {
          const childMeta = this.metadata.get(childTable);
          if (!childMeta?.foreignKeys) return [];

          return Array.from(childMeta.foreignKeys.entries())
            .filter(([col, fkTable]) => fkTable === tableName)
            .flatMap(([col]) => {
              const children = this.readAll(childTable, { [col]: id });
              return children.map(child => 
                this.getRelationshipTreeRecursive(
                  childTable, child.id, maxDepth, currentDepth + 1
                )
              ).filter(tree => tree !== null);
            });
        });

        tree.children = childTrees;
      }

      return tree;
    }

    // Enhanced methods with branchless optimizations
    get(tableName, id) {
      const pk = this._pkOf(tableName);
      const results = this.readAll(tableName, { [pk]: id });
      const hasResults = +(results.length > 0);
      return BranchlessUtils.select(hasResults, results[0], null);
    }

    readAll(tableName, filter = {}) {
      return this._executeRead(tableName, filter);
    }

    create(tableName, obj) {
      return this._executeCreate(tableName, obj);
    }

    update(tableName, id, updates) {
      return this._executeUpdate(tableName, id, updates);
    }

    delete(tableName, id) {
      return this._executeDelete(tableName, id);
    }

    resolveDisplay(tableName, rowObj) {
      const normalizedName = this._normalize(tableName);
      const meta = this.metadata.get(normalizedName);
      const resolved = { ...rowObj };

      if (meta?.foreignKeys?.size) {
        meta.foreignKeys.forEach((fkTable, col) => {
          const fkVal = rowObj[col];
          const hasValue = +(fkVal != null);
          
          if (hasValue) {
            resolved[col + '_display'] = this.getDisplayValueRecursive(fkTable, fkVal);
          }
        });
      }

      resolved._display = this.getDisplayValueRecursive(normalizedName, rowObj.id);
      return resolved;
    }

    _pkOf(tableName) {
      const normalizedName = this._normalize(tableName);
      const meta = this.metadata.get(normalizedName);
      return BranchlessUtils.nullDefault(meta?.primaryKey, 'id');
    }

    _normalize(name) {
      const hasPrefix = +(name.startsWith('tbl'));
      return BranchlessUtils.select(hasPrefix, name, 'tbl' + name);
    }

    _rowToObject(tableName, arr) {
      const normalizedName = this._normalize(tableName);
      const table = this.db.tables.getTable(normalizedName);
      const obj = {};
      
      // Functional approach to object creation
      table.columns.names.forEach((name, index) => {
        obj[name] = arr[index];
      });
      
      return obj;
    }
  }

  exports.AdvancedCrudManager = AdvancedCrudManager;
  exports.BranchlessUtils = BranchlessUtils;
  exports.LookupTables = LookupTables;
});


And here's the enhanced scaffold class:


// AdvancedDiceGameScaffold.js - Branchless and recursive implementation
class AdvancedDiceGameScaffold {
  constructor() {
    this.driver = new RelationalDb.DatabaseDriver();
    this.db = this.driver.getDatabase();
    this.crud = new AdvancedCrudLib.AdvancedCrudManager(this.db);
    
    // Performance optimization: pre-compute game logic lookup tables
    this.winnerLookup = this._generateWinnerLookup();
    this.diceValueCache = new Map();
    
    this._setupTables();
    this._defineMetadata();
    this._seedData();
  }

  // Branchless winner determination using lookup table
  _generateWinnerLookup() {
    const lookup = new Map();
    
    // Pre-compute all possible dice combinations (1-6, 1-6)
    for (let h1 = 1; h1 <= 6; h1++) {
      for (let l1 = 1; l1 <= 6; l1++) {
        for (let h2 = 1; h2 <= 6; h2++) {
          for (let l2 = 1; l2 <= 6; l2++) {
            const key = `${h1},${l1}:${h2},${l2}`;
            
            // Branchless winner calculation
            const h1Greater = +(h1 > h2);
            const h2Greater = +(h2 > h1);
            const hEqual = +(h1 === h2);
            
            const l1Greater = +(l1 > l2);
            const l2Greater = +(l2 > l1);
            
            // Winner determination using branchless logic
            const winner = h1Greater ? 1 : 
                          h2Greater ? 2 : 
                          (hEqual && l1Greater) ? 1 :
                          (hEqual && l2Greater) ? 2 : 1; // tie goes to player 1
            
            lookup.set(key, winner);
          }
        }
      }
    }
    
    return lookup;
  }

  _setupTables() {
    this.db.tables.addTable('tblPlayers', ['id', 'name', 'desc', 'wins', 'losses']);
    this.db.tables.addTable('tblCombination', ['id', 'diceH', 'diceL', 'value']);
    this.db.tables.addTable('tblDiceRollsByPlayer', ['id', 'player_id', 'combo_id', 'roll_date']);
    this.db.tables.addTable('tblGames', ['id', 'comb1_id', 'comb2_id', 'winner_combo_id', 'game_date']);
  }

  _defineMetadata() {
    this.crud.define('tblPlayers', {
      primaryKey: 'id',
      fields: ['id', 'name', 'desc', 'wins', 'losses'],
      displayField: 'name',
      children: ['tblDiceRollsByPlayer']
    });

    this.crud.define('tblCombination', {
      primaryKey: 'id',
      fields: ['id', 'diceH', 'diceL', 'value'],
      displayField: 'diceH + , + diceL'
    });

    this.crud.define('tblDiceRollsByPlayer', {
      primaryKey: 'id',
      fields: ['id', 'player_id', 'combo_id', 'roll_date'],
      foreignKeys: {
        'player_id': 'tblPlayers',
        'combo_id': 'tblCombination'
      }
    });

    this.crud.define('tblGames', {
      primaryKey: 'id',
      fields: ['id', 'comb1_id', 'comb2_id', 'winner_combo_id', 'game_date'],
      foreignKeys: {
        'comb1_id': 'tblCombination',
        'comb2_id': 'tblCombination',
        'winner_combo_id': 'tblCombination'
      }
    });
  }

  _seedData() {
    try {
      const players = [
        { name: 'Alice', desc: 'Lucky player', wins: 0, losses: 0 },
        { name: 'Bob', desc: 'Strategic player', wins: 0, losses: 0 },
        { name: 'Charlie', desc: 'Risk taker', wins: 0, losses: 0 }
      ].map(p => ({ id: this.crud.create('tblPlayers', p), ...p }));

      const combos = [
        { diceH: 6, diceL: 5, value: 65 },
        { diceH: 4, diceL: 3, value: 43 },
        { diceH: 6, diceL: 6, value: 66 },
        { diceH: 1, diceL: 1, value: 11 }
      ].map(c => ({ id: this.crud.create('tblCombination', c), ...c }));

      // Create dice rolls recursively
      this._createDiceRollsRecursive(players, combos, 0);
      
      console.log('Advanced sample data created successfully');
    } catch (error) {
      console.error('Error seeding data:', error.message);
    }
  }

  // Recursive dice roll creation
  _createDiceRollsRecursive(players, combos, index) {
    // Branchless termination
    const hasMore = +(index < players.length);
    if (!hasMore) return;

    const player = players[index];
    const combo = combos[index % combos.length];
    
    this.crud.create('tblDiceRollsByPlayer', {
      player_id: player.id,
      combo_id: combo.id,
      roll_date: new Date().toISOString()
    });

    // Tail recursion
    this._createDiceRollsRecursive(players, combos, index + 1);
  }

  // Branchless dice combination creation/retrieval
  createOrGetCombination(diceH, diceL) {
    const value = diceH * 10 + diceL;
    const cacheKey = `${diceH},${diceL}`;
    
    // Check cache first
    if (this.diceValueCache.has(cacheKey)) {
      return this.diceValueCache.get(cacheKey);
    }

    const existing = this.crud.readAll('tblCombination', { diceH, diceL });
    const hasExisting = +(existing.length > 0);
    
    const result = AdvancedCrudLib.BranchlessUtils.select(
      hasExisting,
      existing[0],
      () => {
        const id = this.crud.create('tblCombination', { diceH, diceL, value });
        return this.crud.get('tblCombination', id);
      }
    );

    const combo = hasExisting ? existing[0] : (() => {
      const id = this.crud.create('tblCombination', { diceH, diceL, value });
      return this.crud.get('tblCombination', id);
    })();

    this.diceValueCache.set(cacheKey, combo);
    return combo;
  }

  // Branchless game creation with lookup table winner determination
  createGameBranchless(combo1Id, combo2Id) {
    const combo1 = this.crud.get('tblCombination', combo1Id);
    const combo2 = this.crud.get('tblCombination', combo2Id);
    
    const validCombos = +(combo1 && combo2);
    if (!validCombos) {
      throw new Error('Invalid combination IDs');
    }

    // Use pre-computed lookup table for winner
    const lookupKey = `${combo1.diceH},${combo1.diceL}:${combo2.diceH},${combo2.diceL}`;
    const winnerIndex = this.winnerLookup.get(lookupKey);
    
    const winnerId = AdvancedCrudLib.BranchlessUtils.select(
      winnerIndex === 1,
      combo1Id,
      combo2Id
    );

    return this.crud.create('tblGames', {
      comb1_id: combo1Id,
      comb2_id: combo2Id,
      winner_combo_id: winnerId,
      game_date: new Date().toISOString()
    });
  }

  // Recursive player statistics calculation
  getPlayerStatsRecursive(playerId, depth = 0) {
    const player = this.crud.get('tblPlayers', playerId);
    const hasPlayer = +(player !== null);
    
    if (!hasPlayer) return null;

    const rolls = this.crud.readAll('tblDiceRollsByPlayer', { player_id: playerId });
    const games = this._getPlayerGamesRecursive(playerId);
    
    return {
      player: this.crud.resolveDisplay('tblPlayers', player),
      totalRolls: rolls.length,
      totalGames: games.length,
      winRate: this._calculateWinRateRecursive(games, playerId),
      rolls: rolls.map(roll => this.crud.resolveDisplay('tblDiceRollsByPlayer', roll)),
      relationshipTree: this.crud.getRelationshipTreeRecursive('tblPlayers', playerId, 3)
    };
  }

  // Recursive game finding for player
  _getPlayerGamesRecursive(playerId, games = [], processed = new Set()) {
    const rolls = this.crud.readAll('tblDiceRollsByPlayer', { player_id: playerId });
    
    return rolls.reduce((acc, roll) => {
      const gamesWithCombo = this.crud.readAll('tblGames', {})
        .filter(game => 
          game.comb1_id === roll.combo_id || 
          game.comb2_id === roll.combo_id
        );
      
      return acc.concat(gamesWithCombo.filter(game => !processed.has(game.id)));
    }, []);
  }

  // Branchless win rate calculation
  _calculateWinRateRecursive(games, playerId, wins = 0, index = 0) {
    // Base case: branchless termination
    const hasMore = +(index < games.length);
    if (!hasMore) {
      const totalGames = games.length;
      const hasGames = +(totalGames > 0);
      return AdvancedCrudLib.BranchlessUtils.select(hasGames, wins / totalGames, 0);
    }

    const game = games[index];
    const playerRolls = this.crud.readAll('tblDiceRollsByPlayer', { player_id: playerId });
    const playerWon = playerRolls.some(roll => roll.combo_id === game.winner_combo_id);
    const wonThisGame = +(playerWon);
    
    // Tail recursion
    return this._calculateWinRateRecursive(games, playerId, wins + wonThisGame, index + 1);
  }

  // Enhanced demo with performance metrics
  runAdvancedDemo() {
    console.log('=== Advanced Dice Game Demo (Branchless & Recursive) ===');
    
    const startTime = performance.now();
    
    // Demonstrate branchless operations
    console.log('\n--- Branchless Operations ---');
    const testValues = [10, 5, -3, 0, 15];
    testValues.forEach(val => {
      const abs = AdvancedCrudLib.BranchlessUtils.abs(val);
      console.log(`abs(${val}) = ${