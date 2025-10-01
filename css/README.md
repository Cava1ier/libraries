StyleRegistry Library

A dynamic CSS class management system that provides type-safe style management, DOM manipulation utilities, and automatic stylesheet injection for modern web applications.


Features
• **Dynamic CSS Generation**: Create CSS classes programmatically with app and group prefixes
• **Collision Prevention**: Namespace your styles to avoid conflicts between different components
• **DOM Utilities**: Comprehensive DOM manipulation helpers
• **Automatic Injection**: Seamlessly inject generated styles into your document
• **Factory Pattern**: Centralized management of forms and their associated styles


Installation

Include the StyleRegistry library in your HTML:


<script src="js/styleregistry.js"></script>


Basic Usage

1. Create a StyleRegistry

const styleRegistry = new StyleRegistry("myapp");


2. Define Your Styles

// CSS properties (semicolon-separated)
const styles = "background-color;color;padding;margin;border;border-radius";

// Class names for your components
const cssClasses = ["button", "input", "label"];

// CSS values (comma-separated, one string per class)
// Each string must have the same number of values as properties in 'styles'
const cssValues = [
    "blue,white,10px,5px,1px solid #ccc,4px",     // button styles
    "white,black,8px,3px,1px solid #ddd,2px",     // input styles  
    "transparent,#333,5px,2px,none,0"             // label styles
];


3. Register Styles

// Register with group name "form" 
// Results in classes: myappformbutton, myappforminput, myappformlabel
const registeredClasses = styleRegistry.setStyles("form", styles, cssClasses, cssValues);


4. Inject CSS and Use DOM Handler

const domHandler = new DomHandler();
domHandler.injectStylesheet(styleRegistry);

// Create elements using the registered classes
const button = domHandler.createElement('button', [registeredClasses[0]], {}, {
    type: 'button'
});
button.textContent = 'Click Me';


API Reference

StyleRegistry

Constructor
• `new StyleRegistry(app_prefix)` - Create a new registry with an app prefix


Methods
• `setStyles(group_name, styles, cssclasses, cssValues)` - Register multiple CSS classes
• `getStylesheet()` - Get complete CSS as string
• `getRegisteredClasses()` - Get array of all registered class names
• `clear()` - Clear all registered styles


DomHandler

Methods
• `createElement(tagName, classNames, styles, attributes)` - Create HTML element
• `createElements(elementConfigs)` - Create multiple elements from config
• `appendChildren(parent, ...children)` - Append multiple children to parent
• `injectStylesheet(styleRegistry)` - Inject StyleRegistry CSS into document
• `addEventListeners(elements, eventType, handler, options)` - Add event listeners


Multi-File Example Project

Here's a complete example showing how to structure a multi-form application:


Project Structure

project/
├── index.html
├── js/
│   ├── styleregistry.js
│   ├── cssFactory.js
│   ├── cssForm1.js
│   ├── cssForm2.js
│   ├── cssForm3.js
│   ├── cssForm4.js
│   ├── form1.js
│   ├── form2.js
│   ├── form3.js
│   └── form4.js


index.html

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StyleRegistry Multi-Form Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        #app {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .form-container {
            background: white;
            margin: 20px 0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .form-title {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .navigation {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .nav-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 0 5px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .nav-button:hover {
            background: #0056b3;
        }
        
        .nav-button.active {
            background: #28a745;
        }
    </style>
</head>
<body>
    <div id="app">
        <h1>StyleRegistry Multi-Form Demo</h1>
        <div class="navigation">
            <button class="nav-button active" onclick="showForm('form1')">User Registration</button>
            <button class="nav-button" onclick="showForm('form2')">Contact Form</button>
            <button class="nav-button" onclick="showForm('form3')">Survey Form</button>
            <button class="nav-button" onclick="showForm('form4')">Login Form</button>
        </div>
        <!-- Single root element where all forms will be rendered -->
        <div id="root"></div>
    </div>

    <!-- Load StyleRegistry Library -->
    <script src="js/styleregistry.js"></script>
    
    <!-- Load CSS Definitions -->
    <script src="js/cssForm1.js"></script>
    <script src="js/cssForm2.js"></script>
    <script src="js/cssForm3.js"></script>
    <script src="js/cssForm4.js"></script>
    
    <!-- Load Form Classes -->
    <script src="js/form1.js"></script>
    <script src="js/form2.js"></script>
    <script src="js/form3.js"></script>
    <script src="js/form4.js"></script>
    
    <!-- Load Factory -->
    <script src="js/cssFactory.js"></script>

    <script>
        // Initialize the factory and show first form
        const factory = new CSSFactory();
        let currentForm = null;

        function showForm(formName) {
            // Update navigation
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Show the requested form
            factory.showForm(formName);
        }

        // Initialize with first form
        factory.showForm('form1');
    </script>
</body>
</html>


js/cssFactory.js

/**
 * CSSFactory - Centralized management of forms and their CSS styles
 */
class CSSFactory {
    constructor() {
        this.app_prefix = "demo";
        this.styleRegistry = new StyleRegistry(this.app_prefix);
        this.domHandler = new DomHandler();
        this.cssDefinitions = new Map();
        this.forms = new Map();
        this.rootElement = document.getElementById('root');
        
        this.initializeCSSDefinitions();
        this.initializeForms();
        this.injectAllStyles();
    }

    /**
     * Initialize all CSS definitions
     */
    initializeCSSDefinitions() {
        this.cssDefinitions.set('form1', new CSSForm1());
        this.cssDefinitions.set('form2', new CSSForm2());
        this.cssDefinitions.set('form3', new CSSForm3());
        this.cssDefinitions.set('form4', new CSSForm4());
    }

    /**
     * Initialize all form instances
     */
    initializeForms() {
        // Register all CSS styles first
        this.cssDefinitions.forEach((cssForm, formName) => {
            const registeredClasses = this.styleRegistry.setStyles(
                formName,
                cssForm.getStyles(),
                cssForm.getClassNames(),
                cssForm.getCSSValues()
            );
            cssForm.setRegisteredClasses(registeredClasses);
        });

        // Create form instances with their registered classes
        this.forms.set('form1', new Form1(this.domHandler, this.cssDefinitions.get('form1')));
        this.forms.set('form2', new Form2(this.domHandler, this.cssDefinitions.get('form2')));
        this.forms.set('form3', new Form3(this.domHandler, this.cssDefinitions.get('form3')));
        this.forms.set('form4', new Form4(this.domHandler, this.cssDefinitions.get('form4')));
    }

    /**
     * Inject all registered styles into the document
     */
    injectAllStyles() {
        this.domHandler.injectStylesheet(this.styleRegistry);
        console.log('Injected CSS:', this.styleRegistry.getStylesheet());
    }

    /**
     * Show a specific form
     * @param {string} formName - Name of the form to show
     */
    showForm(formName) {
        if (!this.forms.has(formName)) {
            console.error(`Form ${formName} not found`);
            return;
        }

        // Clear current content
        this.domHandler.clearChildren(this.rootElement);

        // Render the requested form
        const form = this.forms.get(formName);
        const formElement = form.render();
        this.rootElement.appendChild(formElement);

        console.log(`Showing ${formName}`);
    }

    /**
     * Get registered classes for a form
     * @param {string} formName - Name of the form
     * @returns {string[]} Array of registered class names
     */
    getFormClasses(formName) {
        const cssForm = this.cssDefinitions.get(formName);
        return cssForm ? cssForm.getRegisteredClasses() : [];
    }

    /**
     * Get all registered classes
     * @returns {string[]} Array of all registered class names
     */
    getAllRegisteredClasses() {
        return this.styleRegistry.getRegisteredClasses();
    }
}


js/cssForm1.js

/**
 * CSSForm1 - User Registration Form Styles
 */
class CSSForm1 {
    constructor() {
        this.styles = "background-color;color;padding;margin;border;border-radius;font-size;width;display;box-sizing;text-align;cursor";
        
        this.classNames = [
            "container",
            "title", 
            "formGroup",
            "label",
            "input",
            "textarea",
            "button",
            "buttonSecondary",
            "row",
            "col"
        ];
        
        this.cssValues = [
            "white,#333,30px,20px auto,1px solid #ddd,8px,null,800px,block,border-box,null,null",           // container
            "#007bff,white,15px 25px,0 0 25px 0,none,6px,24px,null,block,null,center,null",                // title
            "null,null,null,0 0 20px 0,null,null,null,null,block,null,null,null",                          // formGroup
            "#555,#555,null,0 0 8px 0,null,null,14px,null,block,null,null,null",                           // label
            "white,#333,12px 15px,null,1px solid #ddd,4px,16px,100%,block,border-box,null,null",           // input
            "white,#333,12px 15px,null,1px solid #ddd,4px,16px,100%,block,border-box,null,null",           // textarea
            "#007bff,white,12px 30px,10px 10px 0 0,none,4px,16px,null,inline-block,null,null,pointer",     // button
            "#6c757d,white,12px 30px,10px 0 0 10px,none,4px,16px,null,inline-block,null,null,pointer",     // buttonSecondary
            "null,null,null,null,null,null,null,null,flex,null,null,null",                                 // row
            "null,null,null,0 10px 0 0,null,null,null,null,block,null,null,null"                           // col
        ];
        
        this.registeredClasses = [];
    }

    getStyles() { return this.styles; }
    getClassNames() { return this.classNames; }
    getCSSValues() { return this.cssValues; }
    
    setRegisteredClasses(classes) {
        this.registeredClasses = classes;
    }
    
    getRegisteredClasses() {
        return this.registeredClasses;
    }

    // Helper methods to get specific classes
    getContainer() { return this.registeredClasses[0]; }
    getTitle() { return this.registeredClasses[1]; }
    getFormGroup() { return this.registeredClasses[2]; }
    getLabel() { return this.registeredClasses[3]; }
    getInput() { return this.registeredClasses[4]; }
    getTextarea() { return this.registeredClasses[5]; }
    getButton() { return this.registeredClasses[6]; }
    getButtonSecondary() { return this.registeredClasses[7]; }
    getRow() { return this.registeredClasses[8]; }
    getCol() { return this.registeredClasses[9]; }
}


js/cssForm2.js

/**
 * CSSForm2 - Contact Form Styles (Different color scheme)
 */
class CSSForm2 {
    constructor() {
        this.styles = "background-color;color;padding;margin;border;border-radius;font-size;width;display;box-sizing;text-align;cursor";
        
        this.classNames = [
            "container",
            "title",
            "formGroup", 
            "label",
            "input",
            "textarea",
            "button",
            "buttonSecondary",
            "row",
            "col"
        ];
        
        this.cssValues = [
            "#f8f9fa,#333,30px,20px auto,1px solid #28a745,8px,null,800px,block,border-box,null,null",     // container - green theme
            "#28a745,white,15px 25px,0 0 25px 0,none,6px,24px,null,block,null,center,null",                // title - green
            "null,null,null,0 0 20px 0,null,null,null,null,block,null,null,null",                          // formGroup
            "#28a745,#28a745,null,0 0 8px 0,null,null,14px,null,block,null,null,null",                     // label - green
            "white,#333,12px 15px,null,1px solid #28a745,4px,16px,100%,block,border-box,null,null",        // input - green border
            "white,#333,12px 15px,null,1px solid #28a745,4px,16px,100%,block,border-box,null,null",        // textarea - green border
            "#28a745,white,12px 30px,10px 10px 0 0,none,4px,16px,null,inline-block,null,null,pointer",     // button - green
            "#dc3545,white,12px 30px,10px 0 0 10px,none,4px,16px,null,inline-block,null,null,pointer",     // buttonSecondary - red
            "null,null,null,null,null,null,null,null,flex,null,null,null",                                 // row
            "null,null,null,0 10px 0 0,null,null,null,null,block,null,null,null"                           // col
        ];
        
        this.registeredClasses = [];
    }

    getStyles() { return this.styles; }
    getClassNames() { return this.classNames; }
    getCSSValues() { return this.cssValues; }
    
    setRegisteredClasses(classes) {
        this.registeredClasses = classes;
    }
    
    getRegisteredClasses() {
        return this.registeredClasses;
    }

    // Helper methods
    getContainer() { return this.registeredClasses[0]; }
    getTitle() { return this.registeredClasses[1]; }
    getFormGroup() { return this.registeredClasses[2]; }
    getLabel() { return this.registeredClasses[3]; }
    getInput() { return this.registeredClasses[4]; }
    getTextarea() { return this.registeredClasses[5]; }
    getButton() { return this.registeredClasses[6]; }
    getButtonSecondary() { return this.registeredClasses[7]; }
    getRow() { return this.registeredClasses[8]; }
    getCol() { return this.registeredClasses[9]; }
}


js/cssForm3.js

/**
 * CSSForm3 - Survey Form Styles (Purple theme)
 */
class CSSForm3 {
    constructor() {
        this.styles = "background-color;color;padding;margin;border;border-radius;font-size;width;display;box-sizing;text-align;cursor";
        
        this.classNames = [
            "container",
            "title",
            "formGroup",
            "label", 
            "input",
            "select",
            "checkbox",
            "button",
            "buttonSecondary",
            "radioGroup"
        ];
        
        this.cssValues = [
            "#fff3cd,#333,30px,20px auto,1px solid #6f42c1,8px,null,800px,block,border-box,null,null",     // container - purple theme
            "#6f42c1,white,15px 25px,0 0 25px 0,none,6px,24px,null,block,null,center,null",                // title - purple
            "null,null,null,0 0 20px 0,null,null,null,null,block,null,null,null",                          // formGroup
            "#6f42c1,#6f42c1,null,0 0 8px 0,null,null,14px,null,block,null,null,null",                     // label - purple
            "white,#333,12px 15px,null,1px solid #6f42c1,4px,16px,100%,block,border-box,null,null",        // input - purple border
            "white,#333,12px 15px,null,1px solid #6f42c1,4px,16px,100%,block,border-box,null,null",        // select - purple border
            "null,null,null,0 5px 0 0,null,null,null,null,inline-block,null,null,pointer",                 // checkbox
            "#6f42c1,white,12px 30px,10px 10px 0 0,none,4px,16px,null,inline-block,null,null,pointer",     // button - purple
            "#fd7e14,white,12px 30px,10px 0 0 10px,none,4px,16px,null,inline-block,null,null,pointer",     // buttonSecondary - orange
            "null,null,10px,10px 0,1px solid #e9ecef,4px,null,null,block,null,null,null"                   // radioGroup
        ];
        
        this.registeredClasses = [];
    }

    getStyles() { return this.styles; }
    getClassNames() { return this.classNames; }
    getCSSValues() { return this.cssValues; }
    
    setRegisteredClasses(classes) {
        this.registeredClasses = classes;
    }
    
    getRegisteredClasses() {
        return this.registeredClasses;
    }

    // Helper methods
    getContainer() { return this.registeredClasses[0]; }
    getTitle() { return this.registeredClasses[1]; }
    getFormGroup() { return this.registeredClasses[2]; }
    getLabel() { return this.registeredClasses[3]; }
    getInput() { return this.registeredClasses[4]; }
    getSelect() { return this.registeredClasses[5]; }
    getCheckbox() { return this.registeredClasses[6]; }
    getButton() { return this.registeredClasses[7]; }
    getButtonSecondary() { return this.registeredClasses[8]; }
    getRadioGroup() { return this.registeredClasses[9]; }
}


js/cssForm4.js

/**
 * CSSForm4 - Login Form Styles (Dark theme)
 */
class CSSForm4 {
    constructor() {
        this.styles = "background-color;color;padding;margin;border;border-radius;font-size;width;display;box-sizing;text-align;cursor";
        
        this.classNames = [
            "container",
            "title",
            "formGroup",
            "label",
            "input", 
            "button",
            "buttonSecondary",
            "link",
            "divider",
            "socialButton"
        ];
        
        this.cssValues = [
            "#343a40,white,40px,20px auto,1px solid #495057,8px,null,400px,block,border-box,null,null",    // container - dark theme
            "#17a2b8,white,15px 25px,0 0 30px 0,none,6px,28px,null,block,null,center,null",               // title - cyan
            "null,null,null,0 0 25px 0,null,null,null,null,block,null,null,null",                         // formGroup
            "#adb5bd,#adb5bd,null,0 0 8px 0,null,null,14px,null,block,null,null,null",                    // label - light gray
            "#495057,white,15px,null,1px solid #6c757d,4px,16px,100%,block,border-box,null,null",         // input - dark with light border
            "#17a2b8,white,15px 0,15px 0 0 0,none,4px,16px,100%,block,null,null,pointer",                 // button - cyan
            "#6c757d,white,15px 0,10px 0 0 0,none,4px,16px,100%,block,null,null,pointer",                 // buttonSecondary - gray
            "null,#17a2b8,null,null,null,null,14px,null,inline,null,center,pointer",                      // link - cyan
            "#495057,null,1px,20px 0,null,null,null,100%,block,null,null,null",                           // divider
            "#dc3545,white,12px 20px,10px 0 0 0,none,4px,14px,100%,block,null,center,pointer"             // socialButton - red
        ];
        
        this.registeredClasses = [];
    }

    getStyles() { return this.styles; }
    getClassNames() { return this.classNames; }
    getCSSValues() { return this.cssValues; }
    
    setRegisteredClasses(classes) {
        this.registeredClasses = classes;
    }
    
    getRegisteredClasses() {
        return this.registeredClasses;
    }

    // Helper methods
    getContainer() { return this.registeredClasses[0]; }
    getTitle() { return this.registeredClasses[1]; }
    getFormGroup() { return this.registeredClasses[2]; }
    getLabel() { return this.registeredClasses[3]; }
    getInput() { return this.registeredClasses[4]; }
    getButton() { return this.registeredClasses[5]; }
    getButtonSecondary() { return this.registeredClasses[6]; }
    getLink() { return this.registeredClasses[7]; }
    getDivider() { return this.registeredClasses[8]; }
    getSocialButton() { return this.registeredClasses[9]; }
}


js/form1.js

/**
 * Form1 - User Registration Form
 */
class Form1 {
    constructor(domHandler, cssForm) {
        this.domHandler = domHandler;
        this.css = cssForm;
    }

    render() {
        const container = this.domHandler.createElement('div', [this.css.getContainer()]);
        
        const title = this.domHandler.createElement('h2', [this.css.getTitle()]);
        title.textContent = 'User Registration';

        const form = this.domHandler.createElement('form');

        // Name fields row
        const nameRow = this.domHandler.createElement('div', [this.css.getRow()]);
        
        const firstNameGroup = this.createFormGroup('First Name', 'text', 'firstName', true);
        const lastNameGroup = this.createFormGroup('Last Name', 'text', 'lastName', true);
        
        this.domHandler.appendChildren(nameRow, firstNameGroup, lastNameGroup);

        // Email field
        const emailGroup = this.createFormGroup('Email Address', 'email', 'email', true);
        
        // Password fields row
        const passwordRow = this.domHandler.createElement('div', [this.css.getRow()]);
        
        const passwordGroup = this.createFormGroup('Password', 'password', 'password', true);
        const confirmPasswordGroup = this.createFormGroup('Confirm Password', 'password', 'confirmPassword', true);
        
        this.domHandler.appendChildren(passwordRow, passwordGroup, confirmPasswordGroup);

        // Bio field
        const bioGroup = this.domHandler.createElement('div', [this.css.getFormGroup()]);
        const bioLabel = this.domHandler.createElement('label', [this.css.getLabel()]);
        bioLabel.textContent = 'Bio (Optional)';
        const bioTextarea = this.domHandler.createElement('textarea', [this.css.getTextarea()], {}, {
            name: 'bio',
            rows: '4',
            placeholder: 'Tell us about yourself...'
        });
        this.domHandler.appendChildren(bioGroup, bioLabel, bioTextarea);

        // Buttons
        const buttonGroup = this.domHandler.createElement('div', [this.css.getFormGroup()]);
        const submitButton = this.domHandler.createElement('button', [this.css.getButton()], {}, {
            type: 'submit'
        });
        submitButton.textContent = 'Register';
        
        const resetButton = this.domHandler.createElement('button', [this.css.getButtonSecondary()], {}, {
            type: 'reset'
        });
        resetButton.textContent = 'Clear Form';

        this.domHandler.appendChildren(buttonGroup, submitButton, resetButton);

        // Assemble form
        this.domHandler.appendChildren(form, nameRow, emailGroup, passwordRow, bioGroup, buttonGroup);
        this.domHandler.appendChildren(container, title, form);

        // Add event listeners
        this.domHandler.addEventListeners([submitButton], 'click', (e) => {
            e.preventDefault();
            alert('Registration form submitted! (Demo only)');
        });

        return container;
    }

    createFormGroup(labelText, inputType, inputName, required = false) {
        const group = this.domHandler.createElement('div', [this.css.getFormGroup(), this.css.getCol()]);
        
        const label = this.domHandler.createElement('label', [this.css.getLabel()]);
        label.textContent = labelText + (required ? ' *' : '');
        
        const input = this.domHandler.createElement('input', [this.css.getInput()], {}, {
            type: inputType,
            name: inputName,
            required: required
        });

        this.domHandler.appendChildren(group, label, input);
        return group;
    }
}


js/form2.js

/**
 * Form2 - Contact Form
 */
class Form2 {
    constructor(domHandler, cssForm) {
        this.domHandler = domHandler;
        this.css = cssForm;
    }

    render() {
        const container = this.domHandler.createElement('div', [this.css.getContainer()]);
        
        const title = this.domHandler.createElement('h2', [this.css.getTitle()]);
        title.textContent = 'Contact Us';

        const form = this.domHandler.createElement('form');

        // Contact info row
        const contactRow = this.domHandler.createElement('div', [this.css.getRow()]);
        
        const nameGroup = this.createFormGroup('Full Name', 'text', 'fullName', true);
        const emailGroup = this.createFormGroup('Email', 'email', 'email', true);
        
        this.domHandler.appendChildren(contactRow, nameGroup, emailGroup);

        // Subject field
        const subjectGroup = this.createFormGroup('Subject', 'text', 'subject', true);

        // Message field
        const messageGroup = this.domHandler.createElement('div', [this.css.getFormGroup()]);
        const messageLabel = this.domHandler.createElement('label', [this.css.getLabel()]);
        messageLabel.textContent = 'Message *';
        const messageTextarea = this.domHandler.createElement('textarea', [this.css.getTextarea()], {}, {
            name: 'message',
            rows: '6',
            placeholder: 'Your message here...',
            required: true
        });
        this.domHandler.appendChildren(messageGroup, messageLabel, messageTextarea);

        // Priority field
        const priorityGroup = this.domHandler.createElement('div', [this.css.getFormGroup()]);
        const priorityLabel = this.domHandler.createElement('label', [this.css.getLabel()]);
        priorityLabel.textContent = 'Priority';
        const prioritySelect = this.domHandler.createElement('select', [this.css.getInput()], {}, {
            name: 'priority'
        });
        
        const priorities = [
            { value: 'low', text: 'Low' },
            { value: 'medium', text: 'Medium' },
            { value: 'high', text: 'High' },
            { value: 'urgent', text: 'Urgent' }
        ];
        
        priorities.forEach(priority => {
            const option = this.domHandler.createElement('option', [], {}, {
                value: priority.value
            });
            option.textContent = priority.text;
            prioritySelect.appendChild(option);
        });
        
        this.domHandler.appendChildren(priorityGroup, priorityLabel, prioritySelect);

        // Buttons
        const buttonGroup = this.domHandler.createElement('div', [this.css.getFormGroup()]);
        const submitButton = this.domHandler.createElement('button', [this.css.getButton()], {}, {
            type: 'submit'
        });
        submitButton.textContent = 'Send Message';
        
        const resetButton = this.domHandler.createElement('button', [this.css.getButtonSecondary()], {}, {
            type: 'reset'
        });
        resetButton.textContent = 'Clear';

        this.domHandler
