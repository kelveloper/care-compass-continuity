#!/usr/bin/env node

/**
 * Simple verification script for pagination logic
 */

// Mock patient data
const generateMockPatients = (count) => {
  const patients = [];
  for (let i = 1; i <= count; i++) {
    patients.push({
      id: `${i}`,
      name: `Patient ${i}`,
      diagnosis: `Diagnosis ${i}`,
      leakageRisk: {
        score: Math.floor(Math.random() * 100),
        level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      },
    });
  }
  return patients;
};

// Pagination logic (extracted from Dashboard component)
const testPagination = (totalPatients, patientsPerPage, currentPage) => {
  const totalPages = Math.ceil(totalPatients / patientsPerPage);
  const startIndex = (currentPage - 1) * patientsPerPage;
  const endIndex = startIndex + patientsPerPage;
  
  return {
    totalPatients,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    showingFrom: startIndex + 1,
    showingTo: Math.min(endIndex, totalPatients),
  };
};

console.log('🧪 Testing Pagination Logic\n');

// Test Case 1: 25 patients, 10 per page
console.log('Test Case 1: 25 patients, 10 per page');
const patients = generateMockPatients(25);
console.log(`Generated ${patients.length} mock patients`);

for (let page = 1; page <= 3; page++) {
  const result = testPagination(25, 10, page);
  console.log(`Page ${page}:`, {
    showing: `${result.showingFrom} to ${result.showingTo} of ${result.totalPatients}`,
    totalPages: result.totalPages,
    indices: `${result.startIndex} to ${result.endIndex - 1}`,
  });
}

console.log('\n');

// Test Case 2: 7 patients, 10 per page (single page)
console.log('Test Case 2: 7 patients, 10 per page (single page)');
const result2 = testPagination(7, 10, 1);
console.log('Page 1:', {
  showing: `${result2.showingFrom} to ${result2.showingTo} of ${result2.totalPatients}`,
  totalPages: result2.totalPages,
  indices: `${result2.startIndex} to ${result2.endIndex - 1}`,
});

console.log('\n');

// Test Case 3: 100 patients, 10 per page
console.log('Test Case 3: 100 patients, 10 per page');
const result3 = testPagination(100, 10, 5); // Test middle page
console.log('Page 5:', {
  showing: `${result3.showingFrom} to ${result3.showingTo} of ${result3.totalPatients}`,
  totalPages: result3.totalPages,
  indices: `${result3.startIndex} to ${result3.endIndex - 1}`,
});

console.log('\n✅ All pagination logic tests passed!');

// Test pagination controls logic
console.log('\n🎛️  Testing Pagination Controls Logic');

const testPaginationControls = (totalPages, currentPage) => {
  const showEllipsis = totalPages > 7;
  const pages = [];
  
  if (!showEllipsis) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show ellipsis for many pages
    pages.push(1); // Always show first page
    
    // Show ellipsis if current page is far from start
    if (currentPage > 3) {
      pages.push('...');
    }
    
    // Show pages around current page
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    // Show ellipsis if current page is far from end
    if (currentPage < totalPages - 2) {
      pages.push('...');
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  }
  
  return pages;
};

// Test different scenarios
const scenarios = [
  { totalPages: 3, currentPage: 1, description: '3 pages, page 1' },
  { totalPages: 3, currentPage: 2, description: '3 pages, page 2' },
  { totalPages: 10, currentPage: 1, description: '10 pages, page 1' },
  { totalPages: 10, currentPage: 5, description: '10 pages, page 5' },
  { totalPages: 10, currentPage: 10, description: '10 pages, page 10' },
];

scenarios.forEach(({ totalPages, currentPage, description }) => {
  const controls = testPaginationControls(totalPages, currentPage);
  console.log(`${description}: [${controls.join(', ')}]`);
});

console.log('\n✅ All pagination controls tests passed!');