(function(global){'use strict';
const StyleRegistryUtil={
 parseStyles(styles){
  if(!styles||typeof styles!=='string'){
   return[];
  }
  return styles.split(';').map(style=>style.trim()).filter(style=>style.length>0);
 },
 parseCssValues(cssValues){
  if(!cssValues||typeof cssValues!=='string'){
   return[];
  }
  return cssValues.split(',').map(value=>value.trim());
 },
 isValidClassName(className){
  const classNameRegex=/^[a-zA-Z_-][a-zA-Z0-9_-]*$/;
  return classNameRegex.test(className);
 },
 generateCssRule(className,properties,values){
  let cssRule=`.${className}{\n`;
  for(let i=0;i<properties.length&&i<values.length;i++){
   if(values[i]&&values[i]!=='null'){
    cssRule+=` ${properties[i]}: ${values[i]};\n`;
   }
  }
  cssRule+='}\n';
  return cssRule;
 },
 camelToKebab(str){
  return str.replace(/([A-Z])/g,'-$1').toLowerCase();
 }
};
class StyleRegistry{
 constructor(app_prefix){
  this.styles=[];
  this.app_prefix=app_prefix||null;
  this.group_prefix=null;
  this.registeredClasses=new Set();
  this.cssRules=[];
 }
 #registerStyle(className,properties,values){
  let fullClassName='';
  if(this.app_prefix){
   fullClassName+=this.app_prefix+'-';
  }
  if(this.group_prefix){
   fullClassName+=this.group_prefix+'-';
  }
  fullClassName+=className;
  if(!StyleRegistryUtil.isValidClassName(fullClassName)){
   throw new Error(`Invalid class name: ${fullClassName}`);
  }
  properties.forEach(prop=>{
   if(!this.styles.includes(prop)){
    this.styles.push(prop);
   }
  });
  const cssRule=StyleRegistryUtil.generateCssRule(fullClassName,properties,values);
  this.cssRules.push(cssRule);
  this.registeredClasses.add(fullClassName);
  return fullClassName;
 }
 registerStyles(group_prefix,styles,classNames,cssValues){
  if(!Array.isArray(classNames)||classNames.length===0){
   throw new Error('Class names must be a non-empty array');
  }
  if(!Array.isArray(cssValues)||cssValues.length===0){
   throw new Error('CSS values must be a non-empty array');
  }
  if(classNames.length>5){
   console.warn(`Warning: Class names array has ${classNames.length} elements. Consider grouping for better organization.`);
  }
  this.group_prefix=group_prefix;
  const styleProperties=StyleRegistryUtil.parseStyles(styles);
  if(styleProperties.length===0){
   throw new Error('No valid CSS properties found in styles string');
  }
  if(classNames.length!==cssValues.length){
   throw new Error('Class names and CSS values arrays must have the same length');
  }
  const registeredClasses=[];
  classNames.forEach((className,index)=>{
   const values=StyleRegistryUtil.parseCssValues(cssValues[index]);
   const fullClassName=this.#registerStyle(className,styleProperties,values);
   registeredClasses.push(fullClassName);
  });
  return registeredClasses;
 }
 getStylesheet(){
  return this.cssRules.join('\n');
 }
 getStyles(){
  return[...this.styles];
 }
 isClassRegistered(className){
  return this.registeredClasses.has(className);
 }
 clear(){
  this.styles=[];
  this.registeredClasses.clear();
  this.cssRules=[];
  this.group_prefix=null;
 }
 getRegisteredClassesCount(){
  return this.registeredClasses.size;
 }
 getRegisteredClasses(){
  return Array.from(this.registeredClasses);
 }
}
class DomHandler{
 constructor(){
  this.styleSheet=null;
  this.dynamicStyleElement=null;
  this.registryStyleElement=null;
  this.initStyleSheet();
 }
 initStyleSheet(){
  this.dynamicStyleElement=document.getElementById('dynamic-styles');
  if(!this.dynamicStyleElement){
   this.dynamicStyleElement=document.createElement('style');
   this.dynamicStyleElement.id='dynamic-styles';
   this.dynamicStyleElement.type='text/css';
   document.head.appendChild(this.dynamicStyleElement);
  }
  this.styleSheet=this.dynamicStyleElement.sheet;
 }
 #setStyle(className,styleProps){
  if(!className||typeof className!=='string'){
   throw new Error('Invalid class name provided');
  }
  if(!styleProps||typeof styleProps!=='object'){
   throw new Error('Style properties must be an object');
  }
  let cssText=`.${className}{`;
  Object.entries(styleProps).forEach(([property,value])=>{
   if(value&&value!=='null'){
    const cssProperty=StyleRegistryUtil.camelToKebab(property);
    cssText+=` ${cssProperty}: ${value};`;
   }
  });
  cssText+='}';
  try{
   this.styleSheet.insertRule(cssText,this.styleSheet.cssRules.length);
  }catch(error){
   console.error(`Error adding CSS rule for ${className}:`,error);
  }
 }
 setStyles(stylesMap){
  if(!stylesMap||typeof stylesMap!=='object'){
   throw new Error('Styles map must be an object');
  }
  Object.entries(stylesMap).forEach(([className,styleProps])=>{
   this.#setStyle(className,styleProps);
  });
 }
 appendChildren(parent,...children){
  if(!parent||!(parent instanceof HTMLElement)){
   throw new Error('Parent must be a valid HTML element');
  }
  children.forEach(child=>{
   if(child instanceof HTMLElement){
    parent.appendChild(child);
   }else if(child instanceof DocumentFragment){
    parent.appendChild(child);
   }else if(typeof child==='string'){
    parent.appendChild(document.createTextNode(child));
   }else if(child!==null&&child!==undefined){
    console.warn('Skipping invalid child element:',child);
   }
  });
  return parent;
 }
 createElement(tagName,classNames=[],styles={},attributes={}){
  if(!tagName||typeof tagName!=='string'){
   throw new Error('Tag name must be a valid string');
  }
  const element=document.createElement(tagName);
  if(typeof classNames==='string'){
   if(classNames.trim()){
    element.className=classNames;
   }
  }else if(Array.isArray(classNames)){
   const validClasses=classNames.filter(cls=>cls&&typeof cls==='string');
   if(validClasses.length>0){
    element.classList.add(...validClasses);
   }
  }
  Object.entries(styles).forEach(([property,value])=>{
   if(value!==null&&value!==undefined){
    element.style[property]=value;
   }
  });
  Object.entries(attributes).forEach(([attr,value])=>{
   if(value!==null&&value!==undefined){
    element.setAttribute(attr,value);
   }
  });
  return element;
 }
 createElements(elementConfigs){
  if(!Array.isArray(elementConfigs)){
   throw new Error('Element configs must be an array');
  }
  return elementConfigs.map(config=>{
   const {tagName,classNames,styles,attributes,textContent,innerHTML}=config;
   const element=this.createElement(tagName,classNames,styles,attributes);
   if(textContent){
    element.textContent=textContent;
   }
   if(innerHTML){
    element.innerHTML=innerHTML;
   }
   return element;
  });
 }
 injectStylesheet(styleRegistry){
  if(!(styleRegistry instanceof StyleRegistry)){
   throw new Error('Must provide a valid StyleRegistry instance');
  }
  const css=styleRegistry.getStylesheet();
  if(!this.registryStyleElement){
   this.registryStyleElement=document.createElement('style');
   this.registryStyleElement.id='registry-styles';
   this.registryStyleElement.type='text/css';
   document.head.appendChild(this.registryStyleElement);
  }
  this.registryStyleElement.textContent=css;
 }
 removeElements(...elements){
  elements.forEach(element=>{
   if(element&&element.parentNode){
    element.parentNode.removeChild(element);
   }
  });
 }
 clearChildren(element){
  if(!element||!(element instanceof HTMLElement)){
   throw new Error('Element must be a valid HTML element');
  }
  while(element.firstChild){
   element.removeChild(element.firstChild);
  }
 }
 addEventListeners(elements,eventType,handler,options={}){
  if(!Array.isArray(elements)){
   elements=[elements];
  }
  elements.forEach(element=>{
   if(element&&element.addEventListener){
    element.addEventListener(eventType,handler,options);
   }
  });
 }
 findByClass(className){
  return document.querySelectorAll(`.${className}`);
 }
 toggleClass(elements,className){
  if(!Array.isArray(elements)){
   elements=[elements];
  }
  elements.forEach(element=>{
   if(element&&element.classList){
    element.classList.toggle(className);
   }
  });
 }
}


/*
class DemoApp{
 constructor(){
  this.app_prefix="demo";
  this.styleRegistry=new StyleRegistry(this.app_prefix);
  this.domHandler=new DomHandler();
  if(document.readyState==='loading'){
   document.addEventListener('DOMContentLoaded',()=>this.init());
  }else{
   this.init();
  }
 }
 init(){
  console.log('Initializing StyleRegistry Demo...');
  const styles="background-color;margin;font-family;padding;color;border;border-radius;text-align;display;box-sizing;width;resize";
  const cssNames=["btnSubmit","btnClear","lblName","txtName","lblAddress","lblPhone","formWrapper","formLabel","formInput","formCenter"];
  const cssValues=[
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
  try{
   const registeredClasses=this.styleRegistry.registerStyles('container1',styles,cssNames,cssValues);
   console.log('Registered classes:',registeredClasses);
   console.log('Unique styles:',this.styleRegistry.getStyles());
   console.log('Total registered classes:',this.styleRegistry.getRegisteredClassesCount());
   this.domHandler.injectStylesheet(this.styleRegistry);
   this.createDemoElements(registeredClasses);
   console.log('Demo initialized successfully!');
  }catch(error){
   console.error('Error in demo app:',error);
  }
 }
 createDemoElements(registeredClasses){
  const [btnSubmit,btnClear,lblName,txtName,lblAddress,lblPhone,formWrapper,formLabel,formInput,formCenter]=registeredClasses;
  const container=this.domHandler.createElement('div',['demo-container',formWrapper],{
   boxShadow:'0 2px 10px rgba(0,0,0,0.1)'
  });
  const title=this.domHandler.createElement('h2',[],{
   marginBottom:'20px',
   color:'#333'
  });
  title.textContent='StyleRegistry Demo Form';
  const infoPanelClass=this.domHandler.createElement('div',[],{
   position:'fixed',
   top:'10px',
   right:'10px',
   backgroundColor:'#f8f9fa',
   border:'1px solid #dee2e6',
   borderRadius:'4px',
   padding:'15px',
   maxWidth:'300px',
   fontSize:'12px',
   boxShadow:'0 2px 5px rgba(0,0,0,0.1)'
  });
  const formElements=this.domHandler.createElements([
   {
    tagName:'div',
    classNames:[formLabel]
   },
   {
    tagName:'label',
    classNames:[lblName],
    textContent:'Name:',
   },
   {
    tagName:'input',
    classNames:[txtName,formInput],
    attributes:{type:'text',placeholder:'Enter your name'},
   },
   {
    tagName:'div',
    classNames:[formLabel]
   },
   {
    tagName:'label',
    classNames:[lblAddress],
    textContent:'Address:',
   },
   {
    tagName:'textarea',
    classNames:[lblAddress,formInput],
    attributes:{placeholder:'Enter your address',rows:'3'},
   },
   {
    tagName:'div',
    classNames:[formLabel]
   },
   {
    tagName:'label',
    classNames:[lblPhone],
    textContent:'Phone:',
   },
   {
    tagName:'input',
    classNames:[txtName,formInput],
    attributes:{type:'tel',placeholder:'Enter your phone number'},
   },
   {
    tagName:'div',
    classNames:[formCenter],
    styles:{marginTop:'20px'}
   },
   {
    tagName:'button',
    classNames:[btnSubmit],
    textContent:'Submit',
    attributes:{type:'button'},
    styles:{marginRight:'10px',cursor:'pointer'}
   },
   {
    tagName:'button',
    classNames:[btnClear],
    textContent:'Clear',
    attributes:{type:'button'},
    styles:{cursor:'pointer'}
   }
  ]);
  const [nameDiv,nameLabel,nameInput,addressDiv,addressLabel,addressTextarea,
         phoneDiv,phoneLabel,phoneInput,buttonDiv,submitBtn,clearBtn]=formElements;
  this.domHandler.appendChildren(nameDiv,nameLabel,nameInput);
  this.domHandler.appendChildren(addressDiv,addressLabel,addressTextarea);
  this.domHandler.appendChildren(phoneDiv,phoneLabel,phoneInput);
  this.domHandler.appendChildren(buttonDiv,submitBtn,clearBtn);
  this.domHandler.appendChildren(
   container,
   title,
   nameDiv,
   addressDiv,
   phoneDiv,
   buttonDiv
  );
  this.domHandler.addEventListeners([submitBtn],'click',(e)=>{
   alert('Form submitted! (Demo only)');
  });
  this.domHandler.addEventListeners([clearBtn],'click',(e)=>{
   nameInput.value='';
   addressTextarea.value='';
   phoneInput.value='';
  });
  document.body.appendChild(container);
  this.createInfoPanel();
 }
 createInfoPanel(){
  const infoPanel=this.domHandler.createElement('div',[],{
   position:'fixed',
   top:'10px',
   right:'10px',
   backgroundColor:'#f8f9fa',
   border:'1px solid #dee2e6',
   borderRadius:'4px',
   padding:'15px',
   maxWidth:'300px',
   fontSize:'12px',
   boxShadow:'0 2px 5px rgba(0,0,0,0.1)'
  });
  const infoTitle=this.domHandler.createElement('h4',[],{
   margin:'0 0 10px 0',
   color:'#495057'
  });
  infoTitle.textContent='StyleRegistry Info';
  const infoContent=this.domHandler.createElement('div');
  infoContent.innerHTML=`
   <p><strong>App Prefix:</strong> ${this.styleRegistry.app_prefix}</p>
   <p><strong>Registered Classes:</strong> ${this.styleRegistry.getRegisteredClassesCount()}</p>
   <p><strong>Unique CSS Properties:</strong> ${this.styleRegistry.getStyles().length}</p>
   <p><strong>CSS Properties:</strong><br>${this.styleRegistry.getStyles().join(', ')}</p>
   <p><strong>Generated Classes:</strong><br>${this.styleRegistry.getRegisteredClasses().join('<br>')}</p>
  `;
  this.domHandler.appendChildren(infoPanel,infoTitle,infoContent);
  document.body.appendChild(infoPanel);
 }
}
 */
global.StyleRegistry=StyleRegistry;
global.DomHandler=DomHandler;
global.StyleRegistryUtil=StyleRegistryUtil;
/*global.DemoApp=DemoApp;
if(typeof window!=='undefined'&&window.document){
 //global.styleRegistryDemo=new DemoApp();
}*/
})(typeof window!=='undefined'?window:this);
