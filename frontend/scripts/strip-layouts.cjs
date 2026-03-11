/**
 * Script to strip layout wrappers from page components.
 * Removes AdminLayout and WorkerLayout imports and JSX wrappers.
 */
const fs = require('fs');
const path = require('path');

const adminPages = [
  'AdminDashboard', 'AdminWorkers', 'AdminPolicies', 'AdminClaims',
  'AdminEvents', 'AdminCron', 'AdminAnalytics', 'AdminFraud', 'AdminProfile',
  'AdminStaff', 'AdminCreateStaff', 'AdminPlatformStats', 'AdminGlobalSettings',
  'AdminCompanies', 'AdminCompanyDetail',
];

const workerPages = [
  'Dashboard', 'Policy', 'Claims', 'Payouts', 'Profile',
];

function stripLayout(filePath, layoutName) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Remove the import line for the layout
  const importRegex = new RegExp(`^import\\s*\\{\\s*${layoutName}\\s*\\}\\s*from\\s*["'][^"']+["'];?\\s*\\r?\\n`, 'gm');
  content = content.replace(importRegex, '');

  // Remove opening tag <AdminLayout> or <WorkerLayout> (with any whitespace/indentation)
  const openTagRegex = new RegExp(`(\\s*)<${layoutName}>\\s*\\r?\\n`, 'g');
  content = content.replace(openTagRegex, '');

  // Remove closing tag </AdminLayout> or </WorkerLayout> (with any whitespace/indentation)
  const closeTagRegex = new RegExp(`\\s*</${layoutName}>\\s*\\r?\\n`, 'g');
  content = content.replace(closeTagRegex, '\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Stripped ${layoutName} from ${path.basename(filePath)}`);
  } else {
    console.log(`⚠️  No changes made to ${path.basename(filePath)}`);
  }
}

// Process admin pages
for (const page of adminPages) {
  const filePath = path.join(__dirname, '..', 'src', 'pages', 'admin', `${page}.tsx`);
  if (fs.existsSync(filePath)) {
    stripLayout(filePath, 'AdminLayout');
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
}

// Process worker pages
for (const page of workerPages) {
  const filePath = path.join(__dirname, '..', 'src', 'pages', `${page}.tsx`);
  if (fs.existsSync(filePath)) {
    stripLayout(filePath, 'WorkerLayout');
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
}

console.log('\nDone! Remember to also remove RequireSuperAdmin wrapper from super-admin-only pages.');
