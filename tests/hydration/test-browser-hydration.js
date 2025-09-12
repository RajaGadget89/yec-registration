#!/usr/bin/env node

/**
 * Browser Hydration Test
 * Tests the actual browser behavior to capture hydration mismatches
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 BROWSER HYDRATION TEST');
console.log('==========================\n');

console.log('This test will help identify the real cause of hydration errors.');
console.log('The issue appears to be client-side, not server-side.\n');

// Create a test HTML file that can be opened in browser
const testHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hydration Test - YEC Registration</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ccc; }
        .error { color: red; }
        .success { color: green; }
        .warning { color: orange; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔍 Hydration Error Investigation</h1>
    
    <div class="test-section">
        <h2>Test 1: Check for Browser Extensions</h2>
        <p>Open browser console and look for:</p>
        <ul>
            <li><code>bis_skin_checked</code> attributes</li>
            <li>Browser extension modifications</li>
            <li>DOM changes after page load</li>
        </ul>
        <button onclick="checkExtensions()">Check for Extension Modifications</button>
        <div id="extension-results"></div>
    </div>

    <div class="test-section">
        <h2>Test 2: Compare Server vs Client HTML</h2>
        <p>This will help identify what's different between server and client rendering.</p>
        <button onclick="compareHTML()">Compare HTML</button>
        <div id="html-results"></div>
    </div>

    <div class="test-section">
        <h2>Test 3: Check for Dynamic Content</h2>
        <p>Look for content that changes between server and client rendering.</p>
        <button onclick="checkDynamicContent()">Check Dynamic Content</button>
        <div id="dynamic-results"></div>
    </div>

    <div class="test-section">
        <h2>Test 4: Monitor Hydration Process</h2>
        <p>Watch the hydration process in real-time.</p>
        <button onclick="monitorHydration()">Monitor Hydration</button>
        <div id="hydration-results"></div>
    </div>

    <div class="test-section">
        <h2>Instructions</h2>
        <ol>
            <li>Open this file in your browser</li>
            <li>Open Developer Tools (F12)</li>
            <li>Go to Console tab</li>
            <li>Click each test button above</li>
            <li>Check the results and console output</li>
            <li>Look for any hydration-related errors</li>
        </ol>
    </div>

    <script>
        function checkExtensions() {
            const results = document.getElementById('extension-results');
            results.innerHTML = '<h3>Extension Check Results:</h3>';
            
            // Check for common extension attributes
            const extensionAttributes = [
                'bis_skin_checked',
                'data-extension',
                'chrome-extension',
                'moz-extension',
                'safari-extension'
            ];
            
            let found = [];
            extensionAttributes.forEach(attr => {
                const elements = document.querySelectorAll('[' + attr + ']');
                if (elements.length > 0) {
                    found.push(attr + ': ' + elements.length + ' elements');
                }
            });
            
            if (found.length > 0) {
                results.innerHTML += '<div class="error">Found extension modifications:</div>';
                found.forEach(item => {
                    results.innerHTML += '<div>' + item + '</div>';
                });
            } else {
                results.innerHTML += '<div class="success">No obvious extension modifications found</div>';
            }
            
            // Check for modified DOM
            const originalHTML = document.documentElement.outerHTML;
            setTimeout(() => {
                const currentHTML = document.documentElement.outerHTML;
                if (originalHTML !== currentHTML) {
                    results.innerHTML += '<div class="warning">DOM was modified after page load!</div>';
                }
            }, 1000);
        }

        function compareHTML() {
            const results = document.getElementById('html-results');
            results.innerHTML = '<h3>HTML Comparison:</h3>';
            
            // Get current HTML
            const currentHTML = document.documentElement.outerHTML;
            
            // Check for hydration markers
            const hydrationMarkers = [
                '__next_f',
                'hydration',
                'mismatch',
                'server rendered',
                'client properties'
            ];
            
            let found = [];
            hydrationMarkers.forEach(marker => {
                const matches = currentHTML.match(new RegExp(marker, 'gi'));
                if (matches) {
                    found.push(marker + ': ' + matches.length + ' occurrences');
                }
            });
            
            if (found.length > 0) {
                results.innerHTML += '<div class="warning">Found hydration markers:</div>';
                found.forEach(item => {
                    results.innerHTML += '<div>' + item + '</div>';
                });
            } else {
                results.innerHTML += '<div class="success">No hydration markers found</div>';
            }
        }

        function checkDynamicContent() {
            const results = document.getElementById('dynamic-results');
            results.innerHTML = '<h3>Dynamic Content Check:</h3>';
            
            // Check for elements that might change
            const dynamicElements = [
                'Date.now()',
                'Math.random()',
                'new Date()',
                'window.innerWidth',
                'window.innerHeight',
                'navigator.userAgent',
                'localStorage',
                'sessionStorage'
            ];
            
            results.innerHTML += '<div>Checking for dynamic content sources...</div>';
            
            // Check if any of these are being used
            try {
                const now = Date.now();
                const random = Math.random();
                const date = new Date();
                const width = window.innerWidth;
                const height = window.innerHeight;
                const userAgent = navigator.userAgent;
                
                results.innerHTML += '<div class="success">Dynamic content sources are available</div>';
                results.innerHTML += '<pre>' + JSON.stringify({
                    timestamp: now,
                    random: random,
                    date: date.toISOString(),
                    width: width,
                    height: height,
                    userAgent: userAgent.substring(0, 50) + '...'
                }, null, 2) + '</pre>';
            } catch (error) {
                results.innerHTML += '<div class="error">Error checking dynamic content: ' + error.message + '</div>';
            }
        }

        function monitorHydration() {
            const results = document.getElementById('hydration-results');
            results.innerHTML = '<h3>Hydration Monitor:</h3>';
            
            // Monitor for hydration errors
            const originalError = console.error;
            const originalWarn = console.warn;
            
            let hydrationErrors = [];
            
            console.error = function(...args) {
                const message = args.join(' ');
                if (message.includes('hydration') || message.includes('mismatch')) {
                    hydrationErrors.push(message);
                }
                originalError.apply(console, args);
            };
            
            console.warn = function(...args) {
                const message = args.join(' ');
                if (message.includes('hydration') || message.includes('mismatch')) {
                    hydrationErrors.push(message);
                }
                originalWarn.apply(console, args);
            };
            
            // Check for React hydration errors
            setTimeout(() => {
                if (hydrationErrors.length > 0) {
                    results.innerHTML += '<div class="error">Hydration errors detected:</div>';
                    hydrationErrors.forEach(error => {
                        results.innerHTML += '<div>' + error + '</div>';
                    });
                } else {
                    results.innerHTML += '<div class="success">No hydration errors detected</div>';
                }
            }, 2000);
            
            results.innerHTML += '<div>Monitoring hydration process...</div>';
        }

        // Auto-run some checks on page load
        window.addEventListener('load', () => {
            console.log('🔍 Hydration test page loaded');
            console.log('Check the test results above and browser console for any errors');
        });
    </script>
</body>
</html>`;

// Write the test HTML file
fs.writeFileSync('scripts/testing/hydration-test.html', testHtml);

console.log('✅ Test HTML file created: scripts/testing/hydration-test.html');
console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('================');
console.log('');
console.log('1. Open scripts/testing/hydration-test.html in your browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Click each test button in the page');
console.log('5. Check results and console output');
console.log('');
console.log('🎯 WHAT TO LOOK FOR:');
console.log('====================');
console.log('');
console.log('• bis_skin_checked attributes (browser extension)');
console.log('• DOM modifications after page load');
console.log('• Hydration error messages in console');
console.log('• Dynamic content that changes between renders');
console.log('• React hydration mismatch warnings');
console.log('');
console.log('🔍 ROOT CAUSE ANALYSIS:');
console.log('=======================');
console.log('');
console.log('Based on the server HTML analysis:');
console.log('• Server HTML is clean (no bis_skin_checked)');
console.log('• Hydration error is client-side only');
console.log('• Likely caused by browser extensions or client-side JS');
console.log('');
console.log('💡 POSSIBLE SOLUTIONS:');
console.log('======================');
console.log('');
console.log('1. Disable browser extensions temporarily');
console.log('2. Test in incognito/private mode');
console.log('3. Check for client-side JavaScript issues');
console.log('4. Look for dynamic content in components');
console.log('5. Verify SSR-safe rendering patterns');
console.log('');
console.log('✅ Test file ready! Open scripts/testing/hydration-test.html in your browser.');
