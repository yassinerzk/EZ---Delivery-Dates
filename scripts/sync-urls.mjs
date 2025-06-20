#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to sync the application_url from shopify.app.toml to the api_endpoint in shopify.extension.toml
 * This ensures the extension always uses the correct app domain during development
 */

const APP_TOML_PATH = path.join(__dirname, '..', 'shopify.app.toml');
const EXTENSION_TOML_PATH = path.join(__dirname, '..', 'extensions', 'delivery-estimate', 'shopify.extension.toml');

function readTomlValue(filePath, key) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`🔍 Looking for ${key} in ${path.basename(filePath)}`);
    
    // Split into lines and find the line with our key
    const lines = content.split('\n');
    const targetLine = lines.find(line => line.trim().startsWith(key + ' ='));
    
    if (targetLine) {
      // Extract the value between quotes
      const match = targetLine.match(/=\s*"([^"]+)"/);
      if (match) {
        console.log(`✅ Found ${key}: ${match[1]}`);
        return match[1];
      }
    }
    
    console.log(`❌ Could not find ${key} in file`);
    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function updateTomlValue(filePath, settingId, newValue) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let inTargetSetting = false;
    let updated = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if we're entering a new settings section
      if (line === '[[settings.sections.settings]]') {
        inTargetSetting = false;
      }
      
      // Check if this is our target setting
      if (line === `id = "${settingId}"`) {
        inTargetSetting = true;
      }
      
      // If we're in the target setting and find the default line, update it
      if (inTargetSetting && line.startsWith('default = "')) {
        const match = line.match(/^default = "(.*)"$/);
        if (match) {
          lines[i] = `default = "${newValue}"`;
          updated = true;
          console.log(`✏️  Updated ${settingId} default value in ${path.basename(filePath)}`);
          break;
        }
      }
    }
    
    if (!updated) {
      console.log(`⚠️  Could not find ${settingId} setting in ${path.basename(filePath)}`);
      return false;
    }
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return false;
  }
}

function syncUrls() {
  console.log('🔄 Syncing URLs between shopify.app.toml and shopify.extension.toml...');
  
  // Read the application_url from shopify.app.toml
  const appUrl = readTomlValue(APP_TOML_PATH, 'application_url');
  
  if (!appUrl) {
    console.error('❌ Could not find application_url in shopify.app.toml');
    process.exit(1);
  }
  
  console.log(`📍 Found app URL: ${appUrl}`);
  
  // Construct the API endpoint URL
  const apiEndpoint = `${appUrl}/data/api/delivery-estimate`;
  
  // Update the api_endpoint in shopify.extension.toml
  const success = updateTomlValue(EXTENSION_TOML_PATH, 'api_endpoint', apiEndpoint);
  
  if (success) {
    console.log(`✅ Successfully updated api_endpoint to: ${apiEndpoint}`);
    console.log('🎉 URL sync completed!');
  } else {
    console.error('❌ Failed to update shopify.extension.toml');
    process.exit(1);
  }
}

// Run the sync
syncUrls();