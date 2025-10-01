/*
StyleRegistry Library - A dynamic CSS class management system

Features:
- Dynamic CSS class generation with app and group prefixes
- Type-safe style management
- DOM manipulation utilities
- Automatic stylesheet injection
*/

(function(global) {
    'use strict';

    // Utility functions for style processing and validation
    const StyleRegistryUtil = {
        /**
         * Parse semicolon-separated CSS properties
         * @param {string} styles - CSS properties separated by semicolons
         * @returns {string[]} Array of CSS property names
         */
        parseStyles(styles) {
            if (!styles || typeof styles !== 'string') {
                return [];
            }
            return styles.split(';')
                .map(style => style.trim())
                .filter(style => style.length > 0);
        },

        /**
         * Parse comma-separated CSS values
         * @param {string} cssValues - CSS values separated by commas
         * @returns {string[]} Array of CSS values
         */
        parseCssValues(cssValues) {
            if (!cssValues || typeof cssValues !== 'string') {
                return [];
            }
            return cssValues.split(',').map(value => value.trim());
        },

        /**
         * Validate CSS class name format
         * @param {string} className - Class name to validate
         * @returns {boolean} True if valid class name
         */
        isValidClassName(className) {
            const classNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
            return classNameRegex.test(className);
        },

        /**
         * Generate CSS rule string from class name, properties, and values
         * @param {string} className - CSS class name
         * @param {string[]} properties - CSS property names
         * @param {string[]} values - CSS property values
         * @returns {string} Complete CSS rule
         */
        generateCssRule(className, properties, values) {
            let cssRule = `.${className} {\n`;
            
            for (let i = 0; i < properties.length && i < values.length; i++) {
                if (values[i] && values[i] !== 'null') {
                    cssRule += `  ${properties[i]}: ${values[i]};\n`;
                }
            }
            
            cssRule += '}\n';
            return cssRule;
        },

        /**
         * Convert camelCase to kebab-case
         * @param {string} str - camelCase string
         * @returns {string} kebab-case string
         */
        camelToKebab(str) {
            return str.replace(/([A-Z])/g, '-$1').toLowerCase();
        },

        /**
         * Validate that styles and values arrays are properly formatted
         * @param {string} styles - Semicolon-separated CSS properties
         * @param {string[]} cssClasses - Array of class names
         * @param {string[]} cssValues - Array of comma-separated CSS values
         * @throws {Error} If validation fails
         */
        validateStylesAndValues(styles, cssClasses, cssValues) {
            const styleProperties = this.parseStyles(styles);
            
            if (styleProperties.length === 0) {
                throw new Error('No valid CSS properties found in styles string');
            }

            if (cssClasses.length !== cssValues.length) {
                throw new Error(`CSS classes array length (${cssClasses.length}) must match CSS values array length (${cssValues.length})`);
            }

            // Validate that each cssValue has the correct number of comma-separated values
            cssValues.forEach((valueString, index) => {
                const values = this.parseCssValues(valueString);
                if (values.length !== styleProperties.length) {
                    throw new Error(
                        `CSS values for class "${cssClasses[index]}" has ${values.length} values, ` +
                        `but styles string has ${styleProperties.length} properties. ` +
                        `Expected format: value1,value2,...,value${styleProperties.length} (use 'null' for unused properties)`
                    );
                }
            });
        }
    };

    /**
     * StyleRegistry - Main class for managing dynamic CSS styles
     */
    class StyleRegistry {
        /**
         * Create a new StyleRegistry instance
         * @param {string} app_prefix - Application prefix for all generated class names
         */
        constructor(app_prefix) {
            if (!app_prefix || typeof app_prefix !== 'string') {
                throw new Error('App prefix must be a non-empty string');
            }
            
            this.app_prefix = app_prefix;
            this.styles = []; // Collection of unique CSS properties used
            this.registeredClasses = new Set(); // Set of all registered class names
            this.cssRules = []; // Array of generated CSS rules
        }

        /**
         * Private method to register a single style
         * @param {string} className - Full class name (with prefixes)
         * @param {string[]} properties - CSS property names
         * @param {string[]} values - CSS property values
         * @returns {string} The registered class name
         * @private
         */
        #setStyle(className, properties, values) {
            if (!StyleRegistryUtil.isValidClassName(className)) {
                throw new Error(`Invalid class name: ${className}`);
            }

            // Add new properties to our styles collection
            properties.forEach(prop => {
                if (!this.styles.includes(prop)) {
                    this.styles.push(prop);
                }
            });

            const cssText = StyleRegistryUtil.generateCssRule(className, properties, values);
            
            const cssRule = {
                className,
                properties: [...properties],
                values: [...values],
                cssText
            };

            this.cssRules.push(cssRule);
            this.registeredClasses.add(className);
            
            return className;
        }

        /**
         * Register multiple CSS styles with a group prefix
         * @param {string} group_name - Group prefix for organizing related styles
         * @param {string} styles - Semicolon-separated CSS property names
         * @param {string[]} cssclasses - Array of base class names
         * @param {string[]} cssValues - Array of comma-separated CSS values (one per class)
         * @returns {string[]} Array of fully qualified registered class names
         * 
         * @example
         * const registry = new StyleRegistry('myapp');
         * const styles = 'background-color;color;padding';
         * const classes = ['button', 'input'];
         * const values = [
         *   'blue,white,10px',      // for button class
         *   'white,black,5px'       // for input class
         * ];
         * const registered = registry.setStyles('form', styles, classes, values);
         * // Results in: ['myappformbutton', 'myappforminput']
         */
        setStyles(group_name, styles, cssclasses, cssValues) {
            // Input validation
            if (!group_name || typeof group_name !== 'string') {
                throw new Error('Group name must be a non-empty string');
            }

            if (!Array.isArray(cssclasses) || cssclasses.length === 0) {
                throw new Error('CSS classes must be a non-empty array');
            }

            if (!Array.isArray(cssValues) || cssValues.length === 0) {
                throw new Error('CSS values must be a non-empty array');
            }

            // Validate the relationship between styles and values
            StyleRegistryUtil.validateStylesAndValues(styles, cssclasses, cssValues);

            const styleProperties = StyleRegistryUtil.parseStyles(styles);
            const registeredClasses = [];

            cssclasses.forEach((className, index) => {
                // Generate full class name: app_prefix + group_name + class_name
                const fullClassName = `${this.app_prefix}${group_name}${className}`;
                
                const values = StyleRegistryUtil.parseCssValues(cssValues[index]);
                const registeredClassName = this.#setStyle(fullClassName, styleProperties, values);
                registeredClasses.push(registeredClassName);
            });

            return registeredClasses;
        }

        /**
         * Get the complete CSS stylesheet as a string
         * @returns {string} Complete CSS stylesheet
         */
        getStylesheet() {
            return this.cssRules.map(rule => rule.cssText).join('\n');
        }

        /**
         * Get array of unique CSS properties used
         * @returns {string[]} Array of CSS property names
         */
        getStyles() {
            return [...this.styles];
        }

        /**
         * Check if a class name is registered
         * @param {string} className - Class name to check
         * @returns {boolean} True if class is registered
         */
        isClassRegistered(className) {
            return this.registeredClasses.has(className);
        }

        /**
         * Clear all registered styles and classes
         */
        clear() {
            this.styles = [];
            this.registeredClasses.clear();
            this.cssRules = [];
        }

        /**
         * Get count of registered classes
         * @returns {number} Number of registered classes
         */
        getRegisteredClassesCount() {
            return this.registeredClasses.size;
        }

        /**
         * Get array of all registered class names
         * @returns {string[]} Array of registered class names
         */
        getRegisteredClasses() {
            return Array.from(this.registeredClasses);
        }

        /**
         * Get array of all CSS rules with metadata
         * @returns {Object[]} Array of CSS rule objects
         */
        getCssRules() {
            return [...this.cssRules];
        }

        /**
         * Get the app prefix
         * @returns {string} App prefix
         */
        getAppPrefix() {
            return this.app_prefix;
        }
    }

    /**
     * DomHandler - Utility class for DOM manipulation and style injection
     */
    class DomHandler {
        constructor() {
            this.styleSheet = null;
            this.dynamicStyleElement = null;
            this.registryStyleElement = null;
            this.initStyleSheet();
        }

        /**
         * Initialize the dynamic stylesheet
         * @private
         */
        initStyleSheet() {
            this.dynamicStyleElement = document.getElementById('dynamic-styles');
            if (!this.dynamicStyleElement) {
                this.dynamicStyleElement = document.createElement('style');
                this.dynamicStyleElement.id = 'dynamic-styles';
                this.dynamicStyleElement.type = 'text/css';
                document.head.appendChild(this.dynamicStyleElement);
            }
            this.styleSheet = this.dynamicStyleElement.sheet;
        }

        /**
         * Add a single CSS rule dynamically
         * @param {string} className - CSS class name
         * @param {Object} styleProps - Object with CSS properties and values
         * @private
         */
        #setStyle(className, styleProps) {
            if (!className || typeof className !== 'string') {
                throw new Error('Invalid class name provided');
            }

            if (!styleProps || typeof styleProps !== 'object') {
                throw new Error('Style properties must be an object');
            }

            let cssText = `.${className} {`;
            Object.entries(styleProps).forEach(([property, value]) => {
                if (value && value !== 'null') {
                    const cssProperty = StyleRegistryUtil.camelToKebab(property);
                    cssText += ` ${cssProperty}: ${value};`;
                }
            });
            cssText += '}';

            try {
                if (this.styleSheet) {
                    this.styleSheet.insertRule(cssText, this.styleSheet.cssRules.length);
                }
            } catch (error) {
                console.error(`Error adding CSS rule for ${className}:`, error);
                throw error;
            }
        }

        /**
         * Add multiple CSS rules dynamically
         * @param {Object} stylesMap - Map of class names to style objects
         * 
         * @example
         * domHandler.setStyles({
         *   'myClass': { backgroundColor: 'red', color: 'white' },
         *   'otherClass': { fontSize: '14px', margin: '10px' }
         * });
         */
        setStyles(stylesMap) {
            if (!stylesMap || typeof stylesMap !== 'object') {
                throw new Error('Styles map must be an object');
            }

            Object.entries(stylesMap).forEach(([className, styleProps]) => {
                this.#setStyle(className, styleProps);
            });
        }

        /**
         * Append multiple children to a parent element
         * @param {HTMLElement} parent - Parent element
         * @param {...(HTMLElement|DocumentFragment|string|null|undefined)} children - Child elements to append
         * @returns {HTMLElement} The parent element
         */
        appendChildren(parent, ...children) {
            if (!parent || !(parent instanceof HTMLElement)) {
                throw new Error('Parent must be a valid HTML element');
            }

            children.forEach(child => {
                if (child instanceof HTMLElement) {
                    parent.appendChild(child);
                } else if (child instanceof DocumentFragment) {
                    parent.appendChild(child);
                } else if (typeof child === 'string') {
                    parent.appendChild(document.createTextNode(child));
                } else if (child !== null && child !== undefined) {
                    console.warn('Skipping invalid child element:', child);
                }
            });

            return parent;
        }

        /**
         * Create an HTML element with classes, styles, and attributes
         * @param {string} tagName - HTML tag name
         * @param {string|string[]} classNames - CSS class names
         * @param {Object} styles - Inline styles object
         * @param {Object} attributes - HTML attributes object
         * @returns {HTMLElement} Created element
         */
        createElement(tagName, classNames = [], styles = {}, attributes = {}) {
            if (!tagName || typeof tagName !== 'string') {
                throw new Error('Tag name must be a valid string');
            }

            const element = document.createElement(tagName);

            // Handle class names
            if (typeof classNames === 'string') {
                if (classNames.trim()) {
                    element.className = classNames;
                }
            } else if (Array.isArray(classNames)) {
                const validClasses = classNames.filter(cls => cls && typeof cls === 'string');
                if (validClasses.length > 0) {
                    element.classList.add(...validClasses);
                }
            }

            // Apply inline styles
            Object.entries(styles).forEach(([property, value]) => {
                if (value !== null && value !== undefined) {
                    element.style[property] = value;
                }
            });

            // Set attributes
            Object.entries(attributes).forEach(([attr, value]) => {
                if (value !== null && value !== undefined) {
                    element.setAttribute(attr, value);
                }
            });

            return element;
        }

        /**
         * Create multiple elements from configuration objects
         * @param {Object[]} elementConfigs - Array of element configuration objects
         * @returns {HTMLElement[]} Array of created elements
         * 
         * @example
         * const elements = domHandler.createElements([
         *   {
         *     tagName: 'div',
         *     classNames: ['container'],
         *     textContent: 'Hello World'
         *   },
         *   {
         *     tagName: 'button',
         *     classNames: ['btn', 'btn-primary'],
         *     attributes: { type: 'button' },
         *     textContent: 'Click me'
         *   }
         * ]);
         */
        createElements(elementConfigs) {
            if (!Array.isArray(elementConfigs)) {
                throw new Error('Element configs must be an array');
            }

            return elementConfigs.map(config => {
                const { tagName, classNames, styles, attributes, textContent, innerHTML } = config;
                const element = this.createElement(tagName, classNames, styles, attributes);

                if (textContent) {
                    element.textContent = textContent;
                }

                if (innerHTML) {
                    element.innerHTML = innerHTML;
                }

                return element;
            });
        }

        /**
         * Inject StyleRegistry CSS into the document
         * @param {StyleRegistry} styleRegistry - StyleRegistry instance
         */
        injectStylesheet(styleRegistry) {
            if (!(styleRegistry instanceof StyleRegistry)) {
                throw new Error('Must provide a valid StyleRegistry instance');
            }

            const css = styleRegistry.getStylesheet();

            if (!this.registryStyleElement) {
                this.registryStyleElement = document.createElement('style');
                this.registryStyleElement.id = 'registry-styles';
                this.registryStyleElement.type = 'text/css';
                document.head.appendChild(this.registryStyleElement);
            }

            this.registryStyleElement.textContent = css;
        }

        /**
         * Remove elements from the DOM
         * @param {...HTMLElement} elements - Elements to remove
         */
        removeElements(...elements) {
            elements.forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        }

        /**
         * Clear all children from an element
         * @param {HTMLElement} element - Element to clear
         */
        clearChildren(element) {
            if (!element || !(element instanceof HTMLElement)) {
                throw new Error('Element must be a valid HTML element');
            }

            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }

        /**
         * Add event listeners to elements
         * @param {HTMLElement|HTMLElement[]} elements - Element(s) to add listeners to
         * @param {string} eventType - Event type (e.g., 'click', 'change')
         * @param {Function} handler - Event handler function
         * @param {Object} options - Event listener options
         */
        addEventListeners(elements, eventType, handler, options = {}) {
            const elementsArray = Array.isArray(elements) ? elements : [elements];

            elementsArray.forEach(element => {
                if (element && element.addEventListener) {
                    element.addEventListener(eventType, handler, options);
                }
            });
        }

        /**
         * Find elements by class name
         * @param {string} className - Class name to search for
         * @returns {NodeListOf<Element>} Found elements
         */
        findByClass(className) {
            return document.querySelectorAll(`.${className}`);
        }

        /**
         * Toggle class on elements
         * @param {HTMLElement|HTMLElement[]} elements - Element(s) to toggle class on
         * @param {string} className - Class name to toggle
         */
        toggleClass(elements, className) {
            const elementsArray = Array.isArray(elements) ? elements : [elements];

            elementsArray.forEach(element => {
                if (element && element.classList) {
                    element.classList.toggle(className);
                }
            });
        }
    }

    /**
     * Demo application showing StyleRegistry usage
     */
    class DemoApp {
        constructor() {
            this.app_prefix = "demo";
            this.styleRegistry = new StyleRegistry(this.app_prefix);
            this.domHandler = new DomHandler();

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }

        init() {
            console.log('Initializing StyleRegistry Demo...');

            // Define CSS properties (semicolon-separated)
            const styles = "background-color;margin;font-family;padding;color;border;border-radius;text-align;display;box-sizing;width;resize";
            
            // Define class names
            const cssNames = ["btnSubmit", "btnClear", "lblName", "txtName", "lblAddress", "lblPhone", "formWrapper", "formLabel", "formInput", "formCenter"];
            
            // Define CSS values for each class (comma-separated, matching the number of properties in 'styles')
            const cssValues = [
                "#007bff,10px,Arial,12px,white,none,4px,null,null,null,null,null",           // btnSubmit
                "#6c757d,10px,Arial,12px,white,none,4px,null,null,null,null,null",           // btnClear
                "#333333,5px,Arial,8px,#333,none,0,null,block,null,null,null",               // lblName
                "white,5px,Arial,8px,#333,1px solid #ccc,4px,null,null,border-box,100%,vertical", // txtName
                "#333333,5px,Arial,8px,#333,none,0,null,block,null,null,null",               // lblAddress
                "#333333,5px,Arial,8px,#333,none,0,null,block,null,null,null",               // lblPhone
                "white,20px auto,Arial,20px,#333,none,8px,center,null,null,600px,null",      // formWrapper
                "null,5px,null,null,null,null,null,null,block,null,null,null",               // formLabel
                "null,null,null,null,null,null,null,null,null,border-box,100%,null",         // formInput
                "null,null,null,null,null,null,null,center,null,null,null,null"              // formCenter
            ];

            try {
                // Register styles with group name 'container1'
                const registeredClasses = this.styleRegistry.setStyles('container1', styles, cssNames, cssValues);
                
                console.log('Registered classes:', registeredClasses);
                console.log('Unique styles:', this.styleRegistry.getStyles());
                console.log('Total registered classes:', this.styleRegistry.getRegisteredClassesCount());

                // Inject the generated CSS into the document
                this.domHandler.injectStylesheet(this.styleRegistry);
                
                // Create demo form elements
                this.createDemoElements(registeredClasses);

                console.log('Demo initialized successfully!');
                console.log('Generated CSS:\n', this.styleRegistry.getStylesheet());
            } catch (error) {
                console.error('Error in demo app:', error);
            }
        }

        createDemoElements(registeredClasses) {
            // Destructure registered class names for easier use
            const [btnSubmit, btnClear, lblName, txtName, lblAddress, lblPhone, 
                   formWrapper, formLabel, formInput, formCenter] = registeredClasses;

            // Create main container
            const container = this.domHandler.createElement('div', [formWrapper], {
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            });

            // Create title
            const title = this.domHandler.createElement('h2', [], {
                marginBottom: '20px',
                color: '#333'
            });
            title.textContent = 'StyleRegistry Demo Form';

            // Create form elements using the registered classes
            const formElements = this.domHandler.createElements([
                { tagName: 'div', classNames: [formLabel] },
                { tagName: 'label', classNames: [lblName], textContent: 'Name:' },
                { tagName: 'input', classNames: [txtName, formInput], attributes: { type: 'text', placeholder: 'Enter your name' } },
                
                { tagName: 'div', classNames: [formLabel] },
                { tagName: 'label', classNames: [lblAddress], textContent: 'Address:' },
                { tagName: 'textarea', classNames: [lblAddress, formInput], attributes: { placeholder: 'Enter your address', rows: '3' } },
                
                { tagName: 'div', classNames: [formLabel] },
                { tagName: 'label', classNames: [lblPhone], textContent: 'Phone:' },
                { tagName: 'input', classNames: [txtName, formInput], attributes: { type: 'tel', placeholder: 'Enter your phone number' } },
                
                { tagName: 'div', classNames: [formCenter], styles: { marginTop: '20px' } },
                { tagName: 'button', classNames: [btnSubmit], textContent: 'Submit', attributes: { type: 'button' }, styles: { marginRight: '10px', cursor: 'pointer' } },
                { tagName: 'button', classNames: [btnClear], textContent: 'Clear', attributes: { type: 'button' }, styles: { cursor: 'pointer' } }
            ]);

            // Organize form elements
            const [nameDiv, nameLabel, nameInput, addressDiv, addressLabel, addressTextarea,
                   phoneDiv, phoneLabel, phoneInput, buttonDiv, submitBtn, clearBtn] = formElements;

            // Append elements to their containers
            this.domHandler.appendChildren(nameDiv, nameLabel, nameInput);
            this.domHandler.appendChildren(addressDiv, addressLabel, addressTextarea);
            this.domHandler.appendChildren(phoneDiv, phoneLabel, phoneInput);
            this.domHandler.appendChildren(buttonDiv, submitBtn, clearBtn);

            // Append all to main container
            this.domHandler.appendChildren(container, title, nameDiv, addressDiv, phoneDiv, buttonDiv);

            // Add event listeners
            this.domHandler.addEventListeners([submitBtn], 'click', () => {
                alert('Form submitted! (Demo only)');
            });

            this.domHandler.addEventListeners([clearBtn], 'click', () => {
                nameInput.value = '';
                addressTextarea.value = '';
                phoneInput.value = '';
            });

            // Add to document
            document.body.appendChild(container);
            
            // Create info panel
            this.createInfoPanel();
        }

        createInfoPanel() {
            const infoPanel = this.domHandler.createElement('div', [], {
                position: 'fixed',
                top: '10px',
                right: '10px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                padding: '15px',
                maxWidth: '300px',
                fontSize: '12px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                zIndex: '1000'
            });

            const infoTitle = this.domHandler.createElement('h4', [], {
                margin: '0 0 10px 0',
                color: '#495057'
            });
            infoTitle.textContent = 'StyleRegistry Info';

            const infoContent = this.domHandler.createElement('div');
            infoContent.innerHTML = `
                <p><strong>App Prefix:</strong> ${this.styleRegistry.getAppPrefix()}</p>
                <p><strong>Registered Classes:</strong> ${this.styleRegistry.getRegisteredClassesCount()}</p>
                <p><strong>Unique CSS Properties:</strong> ${this.styleRegistry.getStyles().length}</p>
                <p><strong>CSS Properties:</strong><br>${this.styleRegistry.getStyles().join(', ')}</p>
                <p><strong>Generated Classes:</strong><br>${this.styleRegistry.getRegisteredClasses().join('<br>')}</p>
            `;

            this.domHandler.appendChildren(infoPanel, infoTitle, infoContent);
            document.body.appendChild(infoPanel);
        }
    }

    // Export to global scope
    global.StyleRegistry = StyleRegistry;
    global.DomHandler = DomHandler;
    global.StyleRegistryUtil = StyleRegistryUtil;
    global.DemoApp = DemoApp;

    // Auto-initialize demo if in browser environment
    if (typeof window !== 'undefined' && window.document) {
        // Uncomment the next line to auto-run the demo
        // global.styleRegistryDemo = new DemoApp();
    }

})(typeof window !== 'undefined' ? window : this);

// Create a StyleRegistry with app prefix
const styleRegistry = new StyleRegistry("myapp");

// Define CSS properties (semicolon-separated)
const styles = "background-color;color;padding;margin";

// Define class names
const cssClasses = ["button", "input", "label"];

// Define CSS values (comma-separated, one string per class)
// Each string must have the same number of values as properties in 'styles'
const cssValues = [
    "blue,white,10px,5px",      // button: blue background, white text, 10px padding, 5px margin
    "white,black,8px,3px",      // input: white background, black text, 8px padding, 3px margin
    "null,red,null,2px"         // label: no background, red text, no padding, 2px margin
];

// Register the styles with group name "form"
const registeredClasses = styleRegistry.setStyles("form", styles, cssClasses, cssValues);

// Result: ["myappformbutton", "myappforminput", "myappformlabel"]

// Inject CSS into document
const domHandler = new DomHandler();
domHandler.injectStylesheet(styleRegistry);
