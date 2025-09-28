CSS Management Library
Overview
The CSS Management Library is a lightweight, modular TypeScript/JavaScript library for managing CSS styles for collections of elements (e.g., groups of buttons, labels, or other UI components). It uses a centralized StyleRegistry to maintain a single array of unique CSS property names, assigns indexes for efficient referencing, and generates namespaced class names (e.g., .myApp-form1-button-primary) using an application prefix and component prefix. The library is designed to:

Support Collections-Based Styling: Built for components managing multiple elements (e.g., multiple buttons or labels), enforcing at least 2 class names per component to ensure collections-based usage.
Enable Localized Testing: Components store style mappings in reindexedstyles, allowing isolated testing without StyleRegistry dependency.
Reduce Character Count: Uses comma-separated cssvalues (e.g., 'blue,16px,10px') and nl (null) to minimize code size for AI context processing.
Ensure Memory Efficiency: Centralizes CSS properties and uses interned nl/nullValue for non-applicable properties, minimizing memory overhead (e.g., single null reference for 10,000 elements).
Promote Maintainability: Centralizes CSS properties in one place, avoiding widespread updates (e.g., changing font-size to font in one array updates all components).
Support Extensibility: Modular design allows future extensions like theming or property abbreviations.

Important: This library is exclusively for styling collections of elements within components. Do not use for per-element styling (e.g., applying unique styles to individual DOM elements) or mapped name:value CSS properties (e.g., { backgroundColor: 'blue' }). Such approaches bypass the library’s benefits (centralized management, memory efficiency, maintainability) and are incompatible with its design. Collaborators requiring these methods should not use this library or participate in projects using it.
Installation

Copy cssManagementLibrary.ts into your project.
Ensure a TypeScript or modern JavaScript environment (ES2020+).
Import required classes:

import { StyleRegistry, DOMHandler, Component, Card } from './cssManagementLibrary.js';

No external dependencies are required.
Usage
Initialize StyleRegistry
const registry = new StyleRegistry('myApp', 'inherit');


appPrefix: Prefix for all class names (e.g., 'myApp').
nullValue: Value for non-applicable properties (default: 'inherit').

Create a Component
Extend Component for collections of elements (minimum 2 classes):
class MyComponent extends Component {
  constructor(registry) {
    super('myComponent', registry);
    this.styles = ['background-color', 'font-size', 'padding'];
    this.cssclasses = ['primary', 'secondary'];
    this.cssvalues = [
      'blue,16px,10px',  // primary
      'red,14px,8px'     // secondary
    ];
    this.registerStyles();
  }

  render() {
    const div = DOMHandler.createElement('div', { class: 'container' });
    const btn1 = DOMHandler.createElement('button', {
      class: this.getClassName('primary'),
      textContent: 'Primary'
    });
    const btn2 = DOMHandler.createElement('button', {
      class: this.getClassName('secondary'),
      textContent: 'Secondary'
    });
    DOMHandler.appendChild(div, btn1);
    DOMHandler.appendChild(div, btn2);
    return div;
  }
}


prefix: Component-specific prefix (e.g., 'myComponent').
registry: Shared StyleRegistry instance.
styles: CSS property names.
cssclasses: Class names for the collection (≥2 required).
cssvalues: Comma-separated value strings, using this.nl for non-applicable properties.
registerStyles(): Registers styles, enforcing collections-based usage.
render(): Returns an HTMLElement for the collection.

Example: Card Component
The Card component styles 4 labels and 3 buttons:
const registry = new StyleRegistry('myApp');
const card = new Card(registry);
const element = card.render();
document.body.appendChild(element);

Generated CSS:
.myApp-form1-button-primary {
  background-color: blue;
  border: 1px solid black;
  font-size: 16px;
  padding: 10px;
  font-family: Arial;
}
.myApp-form1-button-secondary {
  background-color: red;
  border: 1px solid gray;
  font-size: 14px;
  padding: 8px;
  font-family: Arial;
}
.myApp-form1-label-primary {
  color: black;
  margin: 5px;
  font-size: 16px;
  padding: 5px;
  font-family: Arial;
}
.myApp-form1-label-secondary {
  color: gray;
  margin: 3px;
  font-size: 14px;
  padding: 3px;
  font-family: Arial;
}

Key Features

Collections-Based Design: Enforces ≥2 classes per component for styling groups of elements, validated in StyleRegistry and Component.
Memory Efficiency: Single styles array and interned nl/nullValue minimize memory usage.
Character Count Reduction: Comma-separated cssvalues and nl reduce code size by ~60%.
Localized Testing: reindexedstyles enables isolated component testing.
Maintainability: Centralized styles array ensures single-point updates.
Extensibility: Supports theming or abbreviations via subclassing (e.g., ThemeStyleRegistry).

Warning
This library is not for:

Per-Element Styling: Applying unique styles to individual DOM elements bypasses centralized management and memory efficiency.
Mapped Name:Value Properties: Using objects like { backgroundColor: 'blue' } defeats the library’s array-based structure.If your project requires these approaches, do not use this library or collaborate on projects using it, as they undermine the library’s core benefits.
