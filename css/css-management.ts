// types.ts
export interface StyleRegistryConfig {
  app_prefix: string;
}

export interface CSSRule {
  className: string;
  properties: string[];
  values: string[];
  cssText: string;
}

export interface ElementConfig {
  tagName: string;
  classNames?: string | string[];
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
  textContent?: string;
  innerHTML?: string;
}

// StyleRegistryUtil.ts
export class StyleRegistryUtil {
  static parseStyles(styles: string): string[] {
    if (!styles || typeof styles !== 'string') {
      return [];
    }
    return styles.split(';').map(style => style.trim()).filter(style => style.length > 0);
  }

  static parseCssValues(cssValues: string): string[] {
    if (!cssValues || typeof cssValues !== 'string') {
      return [];
    }
    return cssValues.split(',').map(value => value.trim());
  }

  static isValidClassName(className: string): boolean {
    const classNameRegex = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
    return classNameRegex.test(className);
  }

  static generateCssRule(className: string, properties: string[], values: string[]): string {
    let cssRule = `.${className} {\n`;
    for (let i = 0; i < properties.length && i < values.length; i++) {
      if (values[i] && values[i] !== 'null') {
        cssRule += `  ${properties[i]}: ${values[i]};\n`;
      }
    }
    cssRule += '}\n';
    return cssRule;
  }

  static camelToKebab(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  static validateStylesAndValues(styles: string, cssClasses: string[], cssValues: string[]): void {
    const styleProperties = this.parseStyles(styles);
    
    if (styleProperties.length === 0) {
      throw new Error('No valid CSS properties found in styles string');
    }

    if (cssClasses.length !== cssValues.length) {
      throw new Error('CSS classes and CSS values arrays must have the same length');
    }

    // Validate that each cssValue has the correct number of comma-separated values
    cssValues.forEach((valueString, index) => {
      const values = this.parseCssValues(valueString);
      if (values.length !== styleProperties.length) {
        throw new Error(
          `CSS values for class "${cssClasses[index]}" has ${values.length} values, ` +
          `but styles string has ${styleProperties.length} properties`
        );
      }
    });
  }
}

// StyleRegistry.ts
export class StyleRegistry {
  private styles: string[] = [];
  private app_prefix: string;
  private registeredClasses: Set<string> = new Set();
  private cssRules: CSSRule[] = [];

  constructor(app_prefix: string) {
    if (!app_prefix || typeof app_prefix !== 'string') {
      throw new Error('App prefix must be a non-empty string');
    }
    this.app_prefix = app_prefix;
  }

  private setStyle(className: string, properties: string[], values: string[]): string {
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
    
    const cssRule: CSSRule = {
      className,
      properties: [...properties],
      values: [...values],
      cssText
    };

    this.cssRules.push(cssRule);
    this.registeredClasses.add(className);
    
    return className;
  }

  public setStyles(group_name: string, styles: string, cssclasses: string[], cssValues: string[]): string[] {
    // Validate inputs
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
    const registeredClasses: string[] = [];

    cssclasses.forEach((className, index) => {
      // Generate full class name: app_prefix + group_name + class_name
      const fullClassName = `${this.app_prefix}${group_name}${className}`;
      
      const values = StyleRegistryUtil.parseCssValues(cssValues[index]);
      const registeredClassName = this.setStyle(fullClassName, styleProperties, values);
      registeredClasses.push(registeredClassName);
    });

    return registeredClasses;
  }

  public getStylesheet(): string {
    return this.cssRules.map(rule => rule.cssText).join('\n');
  }

  public getStyles(): string[] {
    return [...this.styles];
  }

  public isClassRegistered(className: string): boolean {
    return this.registeredClasses.has(className);
  }

  public clear(): void {
    this.styles = [];
    this.registeredClasses.clear();
    this.cssRules = [];
  }

  public getRegisteredClassesCount(): number {
    return this.registeredClasses.size;
  }

  public getRegisteredClasses(): string[] {
    return Array.from(this.registeredClasses);
  }

  public getCssRules(): CSSRule[] {
    return [...this.cssRules];
  }

  public getAppPrefix(): string {
    return this.app_prefix;
  }
}

// DomHandler.ts
export class DomHandler {
  private styleSheet: CSSStyleSheet | null = null;
  private dynamicStyleElement: HTMLStyleElement | null = null;
  private registryStyleElement: HTMLStyleElement | null = null;

  constructor() {
    this.initStyleSheet();
  }

  private initStyleSheet(): void {
    this.dynamicStyleElement = document.getElementById('dynamic-styles') as HTMLStyleElement;
    if (!this.dynamicStyleElement) {
      this.dynamicStyleElement = document.createElement('style');
      this.dynamicStyleElement.id = 'dynamic-styles';
      this.dynamicStyleElement.type = 'text/css';
      document.head.appendChild(this.dynamicStyleElement);
    }
    this.styleSheet = this.dynamicStyleElement.sheet;
  }

  private setStyle(className: string, styleProps: Record<string, string>): void {
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
    }
  }

  public setStyles(stylesMap: Record<string, Record<string, string>>): void {
    if (!stylesMap || typeof stylesMap !== 'object') {
      throw new Error('Styles map must be an object');
    }

    Object.entries(stylesMap).forEach(([className, styleProps]) => {
      this.setStyle(className, styleProps);
    });
  }

  public appendChildren(parent: HTMLElement, ...children: (HTMLElement | DocumentFragment | string | null | undefined)[]): HTMLElement {
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

  public createElement(
    tagName: string,
    classNames: string | string[] = [],
    styles: Record<string, string> = {},
    attributes: Record<string, string> = {}
  ): HTMLElement {
    if (!tagName || typeof tagName !== 'string') {
      throw new Error('Tag name must be a valid string');
    }

    const element = document.createElement(tagName);

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

    Object.entries(styles).forEach(([property, value]) => {
      if (value !== null && value !== undefined) {
        (element.style as any)[property] = value;
      }
    });

    Object.entries(attributes).forEach(([attr, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(attr, value);
      }
    });

    return element;
  }

  public createElements(elementConfigs: ElementConfig[]): HTMLElement[] {
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

  public injectStylesheet(styleRegistry: StyleRegistry): void {
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

  public removeElements(...elements: (HTMLElement | null | undefined)[]): void {
    elements.forEach(element => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }

  public clearChildren(element: HTMLElement): void {
    if (!element || !(element instanceof HTMLElement)) {
      throw new Error('Element must be a valid HTML element');
    }

    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  public addEventListeners(
    elements: HTMLElement | HTMLElement[],
    eventType: string,
    handler: EventListener,
    options: AddEventListenerOptions = {}
  ): void {
    const elementsArray = Array.isArray(elements) ? elements : [elements];

    elementsArray.forEach(element => {
      if (element && element.addEventListener) {
        element.addEventListener(eventType, handler, options);
      }
    });
  }

  public findByClass(className: string): NodeListOf<Element> {
    return document.querySelectorAll(`.${className}`);
  }

  public toggleClass(elements: HTMLElement | HTMLElement[], className: string): void {
    const elementsArray = Array.isArray(elements) ? elements : [elements];

    elementsArray.forEach(element => {
      if (element && element.classList) {
        element.classList.toggle(className);
      }
    });
  }
}
/*
// Example usage and demo
export class DemoApp {
  private app_prefix = "demo";
  private styleRegistry: StyleRegistry;
  private domHandler: DomHandler;

  constructor() {
    this.styleRegistry = new StyleRegistry(this.app_prefix);
    this.domHandler = new DomHandler();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  private init(): void {
    console.log('Initializing StyleRegistry Demo...');

    const styles = "background-color;margin;font-family;padding;color;border;border-radius;text-align;display;box-sizing;width;resize";
    const cssNames = ["btnSubmit", "btnClear", "lblName", "txtName", "lblAddress", "lblPhone", "formWrapper", "formLabel", "formInput", "formCenter"];
    const cssValues = [
      "#007bff,10px,Arial,12px,white,none,4px,null,null,null,null,null",
      "#6c757d,10px,Arial,12px,white,none,4px,null,null,null,null,null",
      "#333333,5px,Arial,8px,#333,none,0,null,block,null,null,null",
      "white,5px,Arial,8px,#333,1px solid #ccc,4px,null,null,border-box,100%,vertical",
      "#333333,5px,Arial,8px,#333,none,0,null,block,null,null,null",
      "#333333,5px,Arial,8px,#333,none,0,null,block,null,null,null",
      "white,20px auto,Arial,20px,#333,none,8px,center,null,null,600px,null",
      "null,5px,null,null,null,null,null,null,block,null,null,null",
      "null,null,null,null,null,null,null,null,null,border-box,100%,null",
      "null,null,null,null,null,null,null,center,null,null,null,null"
    ];

    try {
      // Using the correct method name as per specification
      const registeredClasses = this.styleRegistry.setStyles('container1', styles, cssNames, cssValues);
      
      console.log('Registered classes:', registeredClasses);
      console.log('Unique styles:', this.styleRegistry.getStyles());
      console.log('Total registered classes:', this.styleRegistry.getRegisteredClassesCount());

      this.domHandler.injectStylesheet(this.styleRegistry);
      this.createDemoElements(registeredClasses);

      console.log('Demo initialized successfully!');
    } catch (error) {
      console.error('Error in demo app:', error);
    }
  }

  private createDemoElements(registeredClasses: string[]): void {
    const [btnSubmit, btnClear, lblName, txtName, lblAddress, lblPhone, formWrapper, formLabel, formInput, formCenter] = registeredClasses;

    const container = this.domHandler.createElement('div', [formWrapper], {
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    });

    const title = this.domHandler.createElement('h2', [], {
      marginBottom: '20px',
      color: '#333'
    });
    title.textContent = 'StyleRegistry Demo Form';

    const formElements = this.domHandler.createElements([
      {
        tagName: 'div',
        classNames: [formLabel]
      },
      {
        tagName: 'label',
        classNames: [lblName],
        textContent: 'Name:'
      },
      {
        tagName: 'input',
        classNames: [txtName, formInput],
        attributes: { type: 'text', placeholder: 'Enter your name' }
      },
      {
        tagName: 'div',
        classNames: [formLabel]
      },
      {
        tagName: 'label',
        classNames: [lblAddress],
        textContent: 'Address:'
      },
      {
        tagName: 'textarea',
        classNames: [lblAddress, formInput],
        attributes: { placeholder: 'Enter your address', rows: '3' }
      },
      {
        tagName: 'div',
        classNames: [formLabel]
      },
      {
        tagName: 'label',
        classNames: [lblPhone],
        textContent: 'Phone:'
      },
      {
        tagName: 'input',
        classNames: [txtName, formInput],
        attributes: { type: 'tel', placeholder: 'Enter your phone number' }
      },
      {
        tagName: 'div',
        classNames: [formCenter],
        styles: { marginTop: '20px' }
      },
      {
        tagName: 'button',
        classNames: [btnSubmit],
        textContent: 'Submit',
        attributes: { type: 'button' },
        styles: { marginRight: '10px', cursor: 'pointer' }
      },
      {
        tagName: 'button',
        classNames: [btnClear],
        textContent: 'Clear',
        attributes: { type: 'button' },
        styles: { cursor: 'pointer' }
      }
    ]);

    const [nameDiv, nameLabel, nameInput, addressDiv, addressLabel, addressTextarea,
           phoneDiv, phoneLabel, phoneInput, buttonDiv, submitBtn, clearBtn] = formElements;

    this.domHandler.appendChildren(nameDiv, nameLabel, nameInput);
    this.domHandler.appendChildren(addressDiv, addressLabel, addressTextarea);
    this.domHandler.appendChildren(phoneDiv, phoneLabel, phoneInput);
    this.domHandler.appendChildren(buttonDiv, submitBtn, clearBtn);

    this.domHandler.appendChildren(
      container,
      title,
      nameDiv,
      addressDiv,
      phoneDiv,
      buttonDiv
    );

    this.domHandler.addEventListeners([submitBtn], 'click', () => {
      alert('Form submitted! (Demo only)');
    });

    this.domHandler.addEventListeners([clearBtn], 'click', () => {
      (nameInput as HTMLInputElement).value = '';
      (addressTextarea as HTMLTextAreaElement).value = '';
      (phoneInput as HTMLInputElement).value = '';
    });

    document.body.appendChild(container);
    this.createInfoPanel();
  }

  private createInfoPanel(): void {
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
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
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

// Export everything for use
export { StyleRegistry, DomHandler, StyleRegistryUtil };

const styleRegistry = new StyleRegistry("demo");
const styles = "background-color;margin;font-family;padding;color;border;border-radius;text-align;display;box-sizing;width;resize";
const cssNames = ["btnSubmit", "btnClear", "lblName"];
const cssValues = [
  "#007bff,10px,Arial,12px,white,none,4px,null,null,null,null,null",
  "#6c757d,10px,Arial,12px,white,none,4px,null,null,null,null,null",
  "#333333,5px,Arial,8px,#333,none,0,null,block,null,null,null"
];

const registeredClasses = styleRegistry.setStyles('container1', styles, cssNames, cssValues);
// Results in classes: ["democontainer1btnSubmit", "democontainer1btnClear", "democontainer1lblName"]
*/
