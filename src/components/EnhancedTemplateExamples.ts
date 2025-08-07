import { 
  quickComponent,
  css
} from '../lib/runtime.js';

// ============================================================================
// ENHANCED TEMPLATE STRING INTERPOLATION EXAMPLES
// ============================================================================

// 1. Complex Expression Support
const ExpressionDemo = quickComponent(
  { 
    firstName: 'John', 
    lastName: 'Doe', 
    age: 25, 
    isActive: true,
    score: 85,
    items: ['apple', 'banana', 'orange']
  },
  `
    <div class="demo">
      <!-- Basic property access -->
      <h1>{{firstName}} {{lastName}}</h1>
      
      <!-- Conditional expressions -->
      <p class="{{age >= 18 ? 'adult' : 'minor'}}">
        Age: {{age}} ({{age >= 18 ? 'Adult' : 'Minor'}})
      </p>
      
      <!-- Boolean expressions -->
      <div class="{{isActive ? 'active' : 'inactive'}}">
        Status: {{isActive ? 'Active User' : 'Inactive User'}}
      </div>
      
      <!-- Mathematical expressions -->
      <div class="progress">
        <div class="bar" style="width: {{score}}%">{{score}}%</div>
      </div>
      
      <!-- String operations -->
      <p>Initials: {{firstName[0] + lastName[0]}}</p>
      <p>Full Name: {{firstName + ' ' + lastName}}</p>
      <p>Name Length: {{(firstName + lastName).length}} characters</p>
      
      <!-- Array operations -->
      <p>Items: {{items.length}} ({{items.join(', ')}})</p>
      <p>First Item: {{items[0]}}</p>
      
      <!-- Complex conditions -->
      <div class="grade {{score >= 90 ? 'excellent' : score >= 80 ? 'good' : score >= 70 ? 'average' : 'poor'}}">
        Grade: {{score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D'}}
      </div>
    </div>
  `,
  {
    updateAge: (state) => state.age++,
    toggleActive: (state) => state.isActive = !state.isActive,
    updateScore: (state) => state.score = Math.min(100, state.score + 5)
  }
);

// 2. Template Helpers in Expressions
const HelperDemo = quickComponent(
  {
    theme: 'dark',
    fontSize: 16,
    showAdvanced: true,
    warnings: ['Error 1', 'Error 2'],
    user: { name: 'Alice', role: 'admin' }
  },
  `
    <div class="{{classes({ 
      'theme-dark': theme === 'dark', 
      'theme-light': theme === 'light',
      'large-text': fontSize > 18,
      'has-warnings': warnings.length > 0
    })}}">
      <h2 style="{{styles({ 
        fontSize: fontSize + 'px',
        color: theme === 'dark' ? '#fff' : '#000',
        fontWeight: user.role === 'admin' ? 'bold' : 'normal'
      })}}">
        {{user.name}} ({{user.role}})
      </h2>
      
      <div class="content">
        {{showAdvanced ? 'Advanced Mode' : 'Basic Mode'}}
      </div>
      
      {{warnings.length > 0 ? '<div class="warnings">Warnings: ' + warnings.join(', ') + '</div>' : ''}}
    </div>
  `
);

// ============================================================================
// ENHANCED INLINE EVENT HANDLERS EXAMPLES  
// ============================================================================

// Style for all demos
const demoStyles = css`
  .demo, .event-demo, .form-demo {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }
  
  .adult { color: green; }
  .minor { color: orange; }
  .active { background: lightgreen; }
  .inactive { background: lightcoral; }
  .excellent { background: gold; }
  .good { background: lightgreen; }
  .average { background: lightyellow; }
  .poor { background: lightcoral; }
  
  .theme-dark { background: #333; color: white; }
  .theme-light { background: white; color: black; }
  .large-text { font-size: 1.2em; }
  .has-warnings { border-left: 4px solid red; }
  
  .warnings { color: red; margin: 1rem 0; }
`;

// Add demo styles to document
const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(demoStyles);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];

export {
  ExpressionDemo,
  HelperDemo
};
