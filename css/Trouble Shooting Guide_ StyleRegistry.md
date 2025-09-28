Style Registry Troubleshooting Guide
This guide addresses common issues when using the CSS Management Library, focusing on its design for collections of elements (e.g., multiple buttons or labels in a component). The library enforces centralized style management and is not for per-element styling or mapped name:value CSS properties. If your use case requires these, do not use the library or collaborate on projects using it, as they bypass its benefits (memory efficiency, maintainability, and centralized updates).
Common Issues and Solutions
1. INSUFFICIENT_CLASSES Error

Error: At least 2 cssclasses are required for collections-based styling
Cause: The library enforces a minimum of 2 cssclasses to ensure styling is applied to collections of elements, not individual elements or mapped properties.
Solution: Define at least 2 class names in cssclasses. Example:this.cssclasses = ['button-primary', 'button-secondary'];
this.cssvalues = ['blue,16px,10px', 'red,14px,8px'];


Prevention: Design components for collections (e.g., multiple buttons or labels). If you need per-element styling, use native CSS or another library.

2. INVALID_STYLE_CONFIG Error

Error: cssclasses (X) and cssvalues (Y) must have the same length
Cause: The cssclasses and cssvalues arrays must have equal lengths, as each class name corresponds to a comma-separated value string.
Solution: Ensure matching lengths. Example:this.cssclasses = ['primary', 'secondary'];
this.cssvalues = ['blue,16px,10px', 'red,14px,8px'];


Prevention: Validate array lengths before calling registerStyles().

3. INVALID_STYLE_VALUES Error

Error: cssvalues[X] length (Y) must match styles length (Z)
Cause: Each cssvalues string must split into the same number of values as styles.
Solution: Match the number of values in each cssvalues string to styles. Example:this.styles = ['background-color', 'font-size', 'padding'];
this.cssvalues = ['blue,16px,10px', 'red,14px,8px'];


Prevention: Use this.nl for non-applicable properties to maintain length. Example:this.cssvalues = [`${this.nl},16px,10px`, `${this.nl},14px,8px`];



4. INVALID_PREFIX Error

Error: Component prefix must be a valid alphanumeric string
Cause: The prefix or appPrefix does not match /^[a-zA-Z][a-zA-Z0-9-]*$/.
Solution: Use valid prefixes (e.g., 'myApp', 'form1').
Prevention: Validate prefixes during initialization.

5. Styles Not Applied

Symptoms: Elements render without expected styles.
Cause: Possible issues include:
registerStyles() not called in the constructor.
Incorrect class name used in getClassName.
StyleRegistry not initialized or misconfigured.


Solution:
Ensure registerStyles() is called after setting styles, cssclasses, and cssvalues.
Verify class names match cssclasses (e.g., 'button-primary').
Check StyleRegistry initialization:const registry = new StyleRegistry('myApp');




Prevention: Use the Card component as a reference for correct setup.

6. Incorrect Class Names in DOM

Symptoms: Generated class names don’t match expected format (e.g., .myApp-form1-button-primary).
Cause: Incorrect use of getClassName or prefix misconfiguration.
Solution: Use this.getClassName(className) to generate namespaced classes:DOMHandler.createElement('button', { class: this.getClassName('button-primary') });


Prevention: Always use getClassName for class names.

General Guidelines

Collections-Based Design: The library is for styling collections of elements (e.g., multiple buttons or labels). It enforces ≥2 cssclasses to prevent per-element styling. Example:class Card extends Component {
  constructor(registry) {
    super('form1', registry);
    this.cssclasses = ['button-primary', 'button-secondary', 'label-primary', 'label-secondary'];
    // ...
  }
}


Avoid Per-Element Styling: Do not apply unique styles to individual DOM elements (e.g., via inline styles or per-element classes). This bypasses centralized management and memory efficiency.
Avoid Mapped Properties: Do not use name:value objects (e.g., { backgroundColor: 'blue' }). The library uses array-based styles and cssvalues for centralized updates.
Non-Compatible Use Cases: If your project requires per-element styling or mapped properties, do not use this library or collaborate on projects using it, as these approaches defeat its purpose.

Contact
For issues not covered, consult the README.md or BenefitsVsRisk.md for further guidance.
