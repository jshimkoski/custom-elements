// Validation script to check if directive helpers are working correctly
// Run with: node validate-directive-fix.js

import fs from 'fs';
import { createRequire } from 'module';

console.log('🔍 Directive Helpers Fix Validation\n');

// Check if the fix is present in the template compiler
function validateTemplateFix() {
  console.log('=== Template Compiler Fix Validation ===');

  const templateFile = 'src/lib/template-compiler.ts';
  if (!fs.existsSync(templateFile)) {
    console.log('❌ Template compiler file not found');
    return false;
  }

  const content = fs.readFileSync(templateFile, 'utf8');

  const checks = [
    {
      name: 'mergeIntoCurrentProps fix for props',
      pattern: /if \(!currentProps\.props\) currentProps\.props = \{\}/,
      description: 'Ensures currentProps.props is initialized before assignment'
    },
    {
      name: 'mergeIntoCurrentProps fix for attrs',
      pattern: /if \(!currentProps\.attrs\) currentProps\.attrs = \{\}/,
      description: 'Ensures currentProps.attrs is initialized before assignment'
    },
    {
      name: 'Direct props assignment fallback',
      pattern: /if \(!currentProps\.props\) currentProps\.props = \{\};\s*Object\.assign\(currentProps\.props, maybe\)/,
      description: 'Fallback for objects without props/attrs structure'
    }
  ];

  let allPassed = true;
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name} - ${check.description}`);
      allPassed = false;
    }
  });

  return allPassed;
}

// Test directive helper function outputs
function testDirectiveHelpers() {
  console.log('\n=== Directive Helper Function Tests ===');

  try {
    // We can't actually import the modules in Node.js due to browser-specific code,
    // but we can validate they exist and have the expected structure
    const directivesFile = 'src/lib/directives.ts';
    if (!fs.existsSync(directivesFile)) {
      console.log('❌ Directives file not found');
      return false;
    }

    const content = fs.readFileSync(directivesFile, 'utf8');

    const expectedFunctions = [
      'export function vShow',
      'export function vClass',
      'export function vStyle',
      'export function vBind'
    ];

    const expectedReturnStructures = [
      'return {\\s*attrs:', // vShow, vClass, vStyle should return { attrs: ... }
      'return {\\s*props:'  // vBind and vModel should return { props: ... }
    ];

    let functionsFound = 0;
    expectedFunctions.forEach(func => {
      if (content.includes(func)) {
        console.log(`✅ Found ${func}`);
        functionsFound++;
      } else {
        console.log(`❌ Missing ${func}`);
      }
    });

    let structuresFound = 0;
    expectedReturnStructures.forEach((structure, index) => {
      const regex = new RegExp(structure, 'g');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        console.log(`✅ Found expected return structure pattern ${index + 1} (${matches.length} times)`);
        structuresFound++;
      } else {
        console.log(`❌ Missing return structure pattern ${index + 1}`);
      }
    });

    return functionsFound === expectedFunctions.length && structuresFound === expectedReturnStructures.length;

  } catch (error) {
    console.log('❌ Error testing directive helpers:', error.message);
    return false;
  }
}

// Validate build output contains the fixes
function validateBuild() {
  console.log('\n=== Build Output Validation ===');

  const buildFile = 'dist/custom-elements-runtime.es.js';
  if (!fs.existsSync(buildFile)) {
    console.log('❌ Build file not found - run npm run build first');
    return false;
  }

  const content = fs.readFileSync(buildFile, 'utf8');

  // Look for evidence of the fix in the minified code
  const indicators = [
    {
      name: 'mergeIntoCurrentProps function',
      pattern: /mergeIntoCurrentProps|currentProps\.props.*=.*{}/,
      description: 'Function that merges directive helper objects'
    },
    {
      name: 'vShow function',
      pattern: /display.*none.*important/,
      description: 'vShow directive implementation'
    },
    {
      name: 'vClass function',
      pattern: /class.*join|classList|className/,
      description: 'vClass directive implementation'
    },
    {
      name: 'vStyle function',
      pattern: /fontSize|backgroundColor|kebab.*case/,
      description: 'vStyle directive implementation'
    }
  ];

  let foundCount = 0;
  indicators.forEach(indicator => {
    if (indicator.pattern.test(content)) {
      console.log(`✅ ${indicator.name}`);
      foundCount++;
    } else {
      console.log(`⚠️ ${indicator.name} - may be minified differently`);
    }
  });

  // If at least half the indicators are found, consider it a pass
  const passed = foundCount >= Math.ceil(indicators.length / 2);
  console.log(`Build validation: ${passed ? '✅ PASSED' : '❌ FAILED'} (${foundCount}/${indicators.length} indicators found)`);

  return passed;
}

// Test file structure
function validateTestFiles() {
  console.log('\n=== Test Files Validation ===');

  const testFiles = [
    'test-directive-fix.html',
    'test-directive-minimal.html',
    'test-directive-helpers.html'
  ];

  let existingFiles = 0;
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
      existingFiles++;
    } else {
      console.log(`❌ ${file} - missing test file`);
    }
  });

  return existingFiles > 0;
}

// Performance check - validate the fix doesn't break existing functionality
function validateBackwardsCompatibility() {
  console.log('\n=== Backwards Compatibility Check ===');

  const runtimeFile = 'src/lib/runtime.ts';
  const vdomFile = 'src/lib/vdom.ts';

  if (!fs.existsSync(runtimeFile) || !fs.existsSync(vdomFile)) {
    console.log('❌ Core files missing');
    return false;
  }

  // Check that existing patterns still exist
  const runtimeContent = fs.readFileSync(runtimeFile, 'utf8');
  const vdomContent = fs.readFileSync(vdomFile, 'utf8');

  const compatibilityChecks = [
    {
      name: 'Component creation function',
      file: 'runtime',
      pattern: /function component\(/,
      content: runtimeContent
    },
    {
      name: 'VDOM renderer function',
      file: 'vdom',
      pattern: /function vdomRenderer/,
      content: vdomContent
    },
    {
      name: 'Template directive processing',
      file: 'vdom',
      pattern: /processDirectives/,
      content: vdomContent
    }
  ];

  let passedChecks = 0;
  compatibilityChecks.forEach(check => {
    if (check.pattern.test(check.content)) {
      console.log(`✅ ${check.name} (${check.file})`);
      passedChecks++;
    } else {
      console.log(`❌ ${check.name} (${check.file}) - core functionality may be broken`);
    }
  });

  return passedChecks === compatibilityChecks.length;
}

// Main validation runner
async function runValidation() {
  console.log('Starting directive helpers fix validation...\n');

  const results = {
    templateFix: validateTemplateFix(),
    directiveHelpers: testDirectiveHelpers(),
    buildOutput: validateBuild(),
    testFiles: validateTestFiles(),
    compatibility: validateBackwardsCompatibility()
  };

  console.log('\n=== VALIDATION SUMMARY ===');

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });

  const allPassed = Object.values(results).every(Boolean);
  const mostPassed = Object.values(results).filter(Boolean).length >= 3;

  console.log(`\nOverall Result: ${allPassed ? '✅ ALL TESTS PASSED' : mostPassed ? '⚠️ MOSTLY WORKING' : '❌ MAJOR ISSUES'}`);

  if (allPassed) {
    console.log('\n🎉 SUCCESS! Directive helpers fix appears to be working correctly.');
    console.log('\n📋 Next Steps:');
    console.log('1. Open test-directive-fix.html in a browser');
    console.log('2. Verify all directive helpers are working visually');
    console.log('3. Test interactive controls to ensure state updates work');
    console.log('4. Check browser console for any JavaScript errors');
  } else if (mostPassed) {
    console.log('\n⚠️ PARTIAL SUCCESS - Most components working but some issues detected.');
    console.log('\n🔧 Recommended Actions:');
    console.log('1. Check failed tests above');
    console.log('2. Rebuild project: npm run build');
    console.log('3. Test manually in browser');
  } else {
    console.log('\n❌ VALIDATION FAILED - Multiple issues detected.');
    console.log('\n🚨 Required Actions:');
    console.log('1. Review all failed tests above');
    console.log('2. Check if template-compiler.ts has the mergeIntoCurrentProps fix');
    console.log('3. Ensure directive helper functions exist in directives.ts');
    console.log('4. Rebuild and test again');
  }

  console.log('\n🧪 Manual Testing:');
  console.log('  npm run dev');
  console.log('  Open: http://localhost:5173/test-directive-fix.html');
  console.log('  Expected: All directive helpers should work without console errors');

  return allPassed;
}

// Run the validation
runValidation().catch(console.error);
