(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.CssManagement = {}));
})(this, function (exports) {
  'use strict';

  /**
   * Custom error for style-related issues
   */
  class StyleError extends Error {
    constructor(message, code) {
      super(message);
      this.name = 'StyleError';
      this.code = code;
    }
  }

  /**
   * Style Registry for managing CSS styles for collections of elements
   */
  class StyleRegistry {
    constructor(appPrefix, nullValue = 'inherit') {
      if (!appPrefix || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(appPrefix)) {
        throw new StyleError('Application prefix must be a valid alphanumeric string', 'INVALID_APP_PREFIX');
      }
      this.appPrefix = appPrefix;
      this.nullValue = nullValue;
      this.styles = [];
      this.styleMap = new Map();
      this.styleElementId = `${appPrefix}-styles`;
    }

    register(styles, cssclasses, cssvalues, prefix) {
      if (!prefix || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(prefix)) {
        throw new StyleError('Component prefix must be a valid alphanumeric string', 'INVALID_PREFIX');
      }
      if (cssclasses.length < 2) {
        throw new StyleError(
          'At least 2 cssclasses are required for collections-based styling',
          'INSUFFICIENT_CLASSES'
        );
      }
      if (cssclasses.length !== cssvalues.length) {
        throw new StyleError(
          `cssclasses (${cssclasses.length}) and cssvalues (${cssvalues.length}) must have the same length`,
          'INVALID_STYLE_CONFIG'
        );
      }
      cssvalues.forEach((valueStr, index) => {
        const values = valueStr.split(',');
        if (values.length !== styles.length) {
          throw new StyleError(
            `cssvalues[${index}] length (${values.length}) must match styles length (${styles.length})`,
            'INVALID_STYLE_VALUES'
          );
        }
      });

      const indexes = styles.map(prop => {
        const index = this.styles.indexOf(prop);
        if (index === -1) {
          this.styles.push(prop);
          return this.styles.length - 1;
        }
        return index;
      });

      const classMap = new Map();
      cssclasses.forEach((className, index) => {
        const values = cssvalues[index].split(',').map(value => value || this.nullValue);
        classMap.set(className, values);
      });
      this.styleMap.set(prefix, classMap);

      this.#injectStyles();
      return indexes;
    }

    getStyles() {
      return [...this.styles];
    }

    getClassName(prefix, className) {
      if (!this.styleMap.has(prefix)) {
        throw new StyleError(`Prefix '${prefix}' not registered`, 'PREFIX_NOT_FOUND');
      }
      if (!this.styleMap.get(prefix).has(className)) {
        throw new StyleError(`Class name '${className}' not found for prefix '${prefix}'`, 'CLASS_NOT_FOUND');
      }
      return `${this.appPrefix}-${prefix}-${className}`;
    }

    removeStyles(prefix) {
      this.styleMap.delete(prefix);
      this.#injectStyles();
    }

    clearAll() {
      this.styleMap.clear();
      this.styles.length = 0;
      const styleElement = DOMHandler.getElementById(this.styleElementId);
      if (styleElement) {
        DOMHandler.removeElement(styleElement);
      }
    }

    #injectStyles() {
      let cssRules = '';
      for (const [prefix, classMap] of this.styleMap) {
        for (const [className, values] of classMap) {
          const fullClass = `.${this.appPrefix}-${prefix}-${className}`;
          cssRules += `${fullClass} {\n`;
          values.forEach((value, index) => {
            if (value !== this.nullValue) {
              const property = this.styles[index];
              cssRules += `  ${property}: ${value};\n`;
            }
          });
          cssRules += '}\n';
        }
      }

      const styleElement = DOMHandler.createElement('style', {
        id: this.styleElementId,
        textContent: cssRules
      });
      DOMHandler.appendChild(document.head, styleElement);
    }
  }

  /**
   * DOM manipulation utilities
   */
  class DOMHandler {
    static createElement(tag, attributes = {}) {
      const element = document.createElement(tag);
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'textContent') {
          element.textContent = value;
        } else {
          element.setAttribute(key, value);
        }
      });
      return element;
    }

    static appendChild(parent, child) {
      if (typeof child === 'string') {
        parent.appendChild(document.createTextNode(child));
      } else {
        parent.appendChild(child);
      }
      return parent;
    }

    static getElementById(id) {
      return document.getElementById(id);
    }

    static removeElement(element) {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  }

  /**
   * Base Component class for style registration
   */
  class Component {
    constructor(prefix, registry) {
      if (!prefix || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(prefix)) {
        throw new StyleError('Component prefix must be a valid alphanumeric string', 'INVALID_PREFIX');
      }
      if (!registry) {
        throw new StyleError('StyleRegistry is required', 'INVALID_REGISTRY');
      }
      this.styles = [];
      this.cssclasses = [];
      this.cssvalues = [];
      this.reindexedstyles = [];
      this.prefix = prefix;
      this.registry = registry;
      this.nl = null;
    }

    registerStyles() {
      if (this.cssclasses.length < 2) {
        throw new StyleError(
          'At least 2 cssclasses are required for collections-based styling',
          'INSUFFICIENT_CLASSES'
        );
      }
      this.validateStyles();
      this.reindexedstyles = this.registry.register(this.styles, this.cssclasses, this.cssvalues, this.prefix);
    }

    validateStyles() {
      if (this.cssclasses.length !== this.cssvalues.length) {
        throw new StyleError(
          `cssclasses (${this.cssclasses.length}) and cssvalues (${this.cssvalues.length}) must have the same length`,
          'INVALID_STYLE_CONFIG'
        );
      }
      this.cssvalues.forEach((valueStr, index) => {
        const values = valueStr.split(',');
        if (values.length !== this.styles.length) {
          throw new StyleError(
            `cssvalues[${index}] length (${values.length}) must match styles length (${this.styles.length})`,
            'INVALID_STYLE_VALUES'
          );
        }
      });
    }

    getClassName(className) {
      const index = this.cssclasses.indexOf(className);
      if (index === -1) {
        throw new StyleError(`Class name '${className}' not found`, 'CLASS_NOT_FOUND');
      }
      return this.registry.getClassName(this.prefix, className);
    }

    render() {
      throw new Error('render() method must be implemented by subclasses');
    }
  }

  /**
   * Card component with 4 labels and 3 buttons
   */
  class Card extends Component {
    constructor(registry) {
      super('form1', registry);
      this.styles = [
        'background-color',
        'border',
        'color',
        'margin',
        'font-size',
        'padding',
        'font-family'
      ];
      this.cssclasses = ['button-primary', 'button-secondary', 'label-primary', 'label-secondary'];
      this.cssvalues = [
        `blue,1px solid black,${this.nl},${this.nl},16px,10px,Arial`,
        `red,1px solid gray,${this.nl},${this.nl},14px,8px,Arial`,
        `${this.nl},${this.nl},black,5px,16px,5px,Arial`,
        `${this.nl},${this.nl},gray,3px,14px,3px,Arial`
      ];
      this.registerStyles();
    }

    render() {
      const card = DOMHandler.createElement('div', { class: 'card' });
      for (let i = 0; i < 4; i++) {
        const className = i % 2 === 0 ? 'label-primary' : 'label-secondary';
        const label = DOMHandler.createElement('label', {
          class: this.getClassName(className),
          textContent: `Label ${i + 1}`
        });
        DOMHandler.appendChild(card, label);
      }
      for (let i = 0; i < 3; i++) {
        const className = i % 2 === 0 ? 'button-primary' : 'button-secondary';
        const button = DOMHandler.createElement('button', {
          class: this.getClassName(className),
          textContent: `Button ${i + 1}`
        });
        DOMHandler.appendChild(card, button);
      }
      return card;
    }
  }

  // Expose public API
  exports.StyleError = StyleError;
  exports.StyleRegistry = StyleRegistry;
  exports.DOMHandler = DOMHandler;
  exports.Component = Component;
  exports.Card = Card;
});
