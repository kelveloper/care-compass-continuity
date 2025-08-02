#!/usr/bin/env node

/**
 * Hero Patient Verification Script
 * Verifies that Maria Rodriguez (our hero patient) is properly set up in the database
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyHeroPatient() {
  console.log("🔍 Verifying Hero Patient Setup...\n");

  try {
    // Check if Maria Rodriguez exists
    const { data: maria, error: mariaError } = await supabase
      .from("patients")
      .select("*")
      .eq("name", "Maria Rodriguez")
      .single();

    if (mariaError || !maria) {
      console.log("❌ Maria Rodriguez not found in database");
      console.log("   Run 'node scripts/populate-sample-data.js' to add her");
      return false;
    }

    console.log("✅ Maria Rodriguez found in database");
    console.log(`   Age: ${new Date().getFullYear() - new Date(maria.date_of_birth).getFullYear()} years old`);
    console.log(`   Diagnosis: ${maria.diagnosis}`);
    console.log(`   Risk Score: ${maria.leakage_risk_score}`);
    console.log(`   Risk Level: ${maria.leakage_risk_level}`);
    console.log(`   Insurance: ${maria.insurance}`);
    console.log(`   Status: ${maria.referral_status}`);

    // Check if Dr. Sarah Chen exists
    const { data: drChen, error: chenError } = await supabase
      .from("providers")
      .select("*")
      .ilike("name", "%Sarah Chen%")
      .single();

    if (chenError || !drChen) {
      console.log("\n❌ Dr. Sarah Chen not found in database");
      console.log("   Run 'node scripts/populate-sample-data.js' to add her");
      return false;
    }

    console.log("\n✅ Dr. Sarah Chen found in database");
    console.log(`   Specialty: ${drChen.type}`);
    console.log(`   Rating: ${drChen.rating}/5.0`);
    console.log(`   Insurance: ${drChen.accepted_insurance.includes('Medicare') ? 'Accepts Medicare ✅' : 'No Medicare ❌'}`);
    console.log(`   Next Available: ${drChen.availability_next}`);

    // Calculate distance between Maria and Dr. Chen
    const mariaCoords = [42.3297, -71.1043]; // Mission Hill area
    const chenCoords = [drChen.latitude, drChen.longitude];
    
    const distance = calculateDistance(mariaCoords[0], mariaCoords[1], chenCoords[0], chenCoords[1]);
    console.log(`   Distance from Maria: ${distance.toFixed(1)} miles`);

    // Verify demo readiness
    console.log("\n🎯 Demo Readiness Check:");
    
    const checks = [
      { name: "Maria Rodriguez exists", passed: !!maria },
      { name: "High risk score (>80)", passed: maria.leakage_risk_score >= 80 },
      { name: "Needs referral", passed: maria.referral_status === "needed" },
      { name: "Dr. Sarah Chen exists", passed: !!drChen },
      { name: "Dr. Chen accepts Medicare", passed: drChen.accepted_insurance.includes('Medicare') },
      { name: "Endocrinology specialty", passed: drChen.type === "Endocrinology" },
      { name: "Close proximity (<5 miles)", passed: distance < 5 }
    ];

    checks.forEach(check => {
      console.log(`   ${check.passed ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(check => check.passed);
    
    if (allPassed) {
      console.log("\n🎉 Hero Patient Demo is ready!");
      console.log("   Maria Rodriguez will appear at the top of the dashboard");
      console.log("   Dr. Sarah Chen will be the top provider match");
      console.log("   Demo flow should work perfectly");
    } else {
      console.log("\n⚠️ Some issues found - please fix before demo");
    }

    return allPassed;

  } catch (error) {
    console.error("❌ Error verifying hero patient:", error);
    return false;
  }
}

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Run verification
verifyHeroPatient().then(success => {
  process.exit(success ? 0 : 1);
});