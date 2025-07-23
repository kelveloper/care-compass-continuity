import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lnjxrvcukzxhmtvnhsia.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuanhydmN1a3p4aG10dm5oc2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ0NDUsImV4cCI6MjA2ODY3MDQ0NX0.u7EgRjPxY74Tov_6ecHsmPQifMiABdNi3qO4sf1_yQo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sample patient data - designed to tell compelling stories
const samplePatients = [
  {
    name: "Margaret Thompson",
    date_of_birth: "1942-03-15",
    diagnosis: "Total Hip Replacement",
    discharge_date: "2025-01-18",
    required_followup: "Physical Therapy + Orthopedics",
    insurance: "Medicare",
    address: "45 Beacon Hill Ave, Boston, MA 02108",
    leakage_risk_score: 95,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Robert Chen",
    date_of_birth: "1958-07-22",
    diagnosis: "Cardiac Catheterization",
    discharge_date: "2025-01-19",
    required_followup: "Cardiology",
    insurance: "Blue Cross Blue Shield",
    address: "123 Cambridge St, Cambridge, MA 02139",
    leakage_risk_score: 88,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Jane Rodriguez",
    date_of_birth: "1965-11-08",
    diagnosis: "Total Knee Replacement",
    discharge_date: "2025-01-17",
    required_followup: "Physical Therapy",
    insurance: "United Healthcare",
    address: "789 Commonwealth Ave, Boston, MA 02215",
    leakage_risk_score: 92,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "William Foster",
    date_of_birth: "1951-09-12",
    diagnosis: "Spinal Fusion Surgery",
    discharge_date: "2025-01-16",
    required_followup: "Neurosurgery + Physical Therapy",
    insurance: "Aetna",
    address: "234 Newbury St, Boston, MA 02116",
    leakage_risk_score: 89,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Linda Washington",
    date_of_birth: "1972-04-30",
    diagnosis: "Gallbladder Surgery",
    discharge_date: "2025-01-19",
    required_followup: "General Surgery",
    insurance: "Cigna",
    address: "567 Tremont St, Boston, MA 02118",
    leakage_risk_score: 76,
    leakage_risk_level: "medium",
    referral_status: "sent"
  },
  {
    name: "David Kim",
    date_of_birth: "1963-12-03",
    diagnosis: "Coronary Artery Bypass",
    discharge_date: "2025-01-15",
    required_followup: "Cardiology + Cardiac Rehab",
    insurance: "Harvard Pilgrim",
    address: "890 Boylston St, Boston, MA 02199",
    leakage_risk_score: 91,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Patricia Miller",
    date_of_birth: "1978-08-17",
    diagnosis: "Appendectomy",
    discharge_date: "2025-01-20",
    required_followup: "General Surgery",
    insurance: "Tufts Health Plan",
    address: "345 Huntington Ave, Boston, MA 02115",
    leakage_risk_score: 32,
    leakage_risk_level: "low",
    referral_status: "scheduled"
  },
  {
    name: "James O'Connor",
    date_of_birth: "1955-06-25",
    diagnosis: "Prostate Surgery",
    discharge_date: "2025-01-18",
    required_followup: "Urology",
    insurance: "Medicare",
    address: "678 Mass Ave, Cambridge, MA 02139",
    leakage_risk_score: 84,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Maria Santos",
    date_of_birth: "1985-02-14",
    diagnosis: "Cesarean Section",
    discharge_date: "2025-01-21",
    required_followup: "Obstetrics",
    insurance: "Blue Cross Blue Shield",
    address: "123 South End Ave, Boston, MA 02118",
    leakage_risk_score: 28,
    leakage_risk_level: "low",
    referral_status: "completed"
  },
  {
    name: "Thomas Anderson",
    date_of_birth: "1947-10-11",
    diagnosis: "Cataract Surgery",
    discharge_date: "2025-01-20",
    required_followup: "Ophthalmology",
    insurance: "Medicare",
    address: "456 Beacon St, Brookline, MA 02446",
    leakage_risk_score: 67,
    leakage_risk_level: "medium",
    referral_status: "sent"
  },
  {
    name: "Sarah Johnson",
    date_of_birth: "1969-01-28",
    diagnosis: "Hernia Repair",
    discharge_date: "2025-01-19",
    required_followup: "General Surgery",
    insurance: "United Healthcare",
    address: "789 Harvard St, Cambridge, MA 02138",
    leakage_risk_score: 45,
    leakage_risk_level: "medium",
    referral_status: "scheduled"
  },
  {
    name: "Michael Brown",
    date_of_birth: "1960-05-07",
    diagnosis: "Shoulder Replacement",
    discharge_date: "2025-01-17",
    required_followup: "Orthopedics + Physical Therapy",
    insurance: "Aetna",
    address: "321 Charles St, Boston, MA 02114",
    leakage_risk_score: 86,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Jennifer Davis",
    date_of_birth: "1981-09-19",
    diagnosis: "Thyroid Surgery",
    discharge_date: "2025-01-21",
    required_followup: "Endocrinology",
    insurance: "Harvard Pilgrim",
    address: "654 Washington St, Boston, MA 02111",
    leakage_risk_score: 38,
    leakage_risk_level: "low",
    referral_status: "sent"
  },
  {
    name: "Charles Wilson",
    date_of_birth: "1953-12-31",
    diagnosis: "Lung Surgery",
    discharge_date: "2025-01-16",
    required_followup: "Pulmonology",
    insurance: "Cigna",
    address: "987 Atlantic Ave, Boston, MA 02110",
    leakage_risk_score: 93,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Lisa Garcia",
    date_of_birth: "1976-07-04",
    diagnosis: "Breast Surgery",
    discharge_date: "2025-01-20",
    required_followup: "Oncology",
    insurance: "Blue Cross Blue Shield",
    address: "147 Marlborough St, Boston, MA 02116",
    leakage_risk_score: 52,
    leakage_risk_level: "medium",
    referral_status: "scheduled"
  },
  {
    name: "Richard Taylor",
    date_of_birth: "1949-04-16",
    diagnosis: "Kidney Surgery",
    discharge_date: "2025-01-15",
    required_followup: "Nephrology",
    insurance: "Medicare",
    address: "258 Beacon St, Boston, MA 02116",
    leakage_risk_score: 87,
    leakage_risk_level: "high",
    referral_status: "needed"
  },
  {
    name: "Nancy Martinez",
    date_of_birth: "1983-11-23",
    diagnosis: "Spine Surgery",
    discharge_date: "2025-01-18",
    required_followup: "Neurosurgery + Physical Therapy",
    insurance: "Tufts Health Plan",
    address: "369 Commonwealth Ave, Boston, MA 02215",
    leakage_risk_score: 71,
    leakage_risk_level: "medium",
    referral_status: "sent"
  },
  {
    name: "Kevin Lee",
    date_of_birth: "1991-08-09",
    diagnosis: "ACL Repair",
    discharge_date: "2025-01-21",
    required_followup: "Orthopedics + Physical Therapy",
    insurance: "United Healthcare",
    address: "741 Huntington Ave, Boston, MA 02115",
    leakage_risk_score: 25,
    leakage_risk_level: "low",
    referral_status: "completed"
  }
];

// Sample provider data - comprehensive network across Boston area
const sampleProviders = [
  // Physical Therapy Providers
  {
    name: "Boston Sports & Spine Physical Therapy",
    type: "Physical Therapy",
    address: "125 Nashua St, Boston, MA 02114",
    phone: "(617) 555-0123",
    specialties: ["Orthopedic PT", "Post-Surgical Rehab", "Sports Medicine", "Spine Care"],
    accepted_insurance: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Harvard Pilgrim", "Medicare"],
    rating: 4.8,
    latitude: 42.3601,
    longitude: -71.0589,
    availability_next: "Tomorrow, Jan 22",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Harvard Pilgrim", "Medicare"]
  },
  {
    name: "Cambridge Physical Therapy Center",
    type: "Physical Therapy",
    address: "89 Cambridge St, Cambridge, MA 02141",
    phone: "(617) 555-0456",
    specialties: ["Geriatric Rehab", "Balance Training", "Fall Prevention", "Joint Replacement"],
    accepted_insurance: ["Medicare", "Blue Cross Blue Shield", "Cigna", "Tufts Health Plan"],
    rating: 4.6,
    latitude: 42.3736,
    longitude: -71.1097,
    availability_next: "Friday, Jan 24",
    in_network_plans: ["Medicare", "Blue Cross Blue Shield", "Cigna", "Tufts Health Plan"]
  },
  {
    name: "New England Rehabilitation Hospital",
    type: "Physical Therapy",
    address: "201 Washington St, Boston, MA 02108",
    phone: "(617) 555-0789",
    specialties: ["Neurological Rehab", "Cardiac Rehab", "Pulmonary Rehab", "Orthopedic PT"],
    accepted_insurance: ["All Major Insurance", "Medicare", "Medicaid"],
    rating: 4.9,
    latitude: 42.3584,
    longitude: -71.0598,
    availability_next: "Monday, Jan 27",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Harvard Pilgrim", "Medicare", "Cigna", "Tufts Health Plan"]
  },
  {
    name: "Back Bay Physical Therapy",
    type: "Physical Therapy",
    address: "567 Boylston St, Boston, MA 02116",
    phone: "(617) 555-0321",
    specialties: ["Manual Therapy", "Dry Needling", "Post-Surgical Rehab", "Pain Management"],
    accepted_insurance: ["Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim"],
    rating: 4.7,
    latitude: 42.3505,
    longitude: -71.0743,
    availability_next: "Wednesday, Jan 29",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim"]
  },

  // Cardiology Providers
  {
    name: "Massachusetts General Cardiology",
    type: "Cardiology",
    address: "55 Fruit St, Boston, MA 02114",
    phone: "(617) 555-1001",
    specialties: ["Interventional Cardiology", "Heart Failure", "Cardiac Catheterization", "Preventive Cardiology"],
    accepted_insurance: ["All Major Insurance", "Medicare"],
    rating: 4.9,
    latitude: 42.3635,
    longitude: -71.0685,
    availability_next: "Next Tuesday, Jan 28",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Harvard Pilgrim", "Medicare", "Cigna", "Tufts Health Plan"]
  },
  {
    name: "Brigham and Women's Heart Center",
    type: "Cardiology",
    address: "75 Francis St, Boston, MA 02115",
    phone: "(617) 555-1002",
    specialties: ["Cardiac Surgery", "Electrophysiology", "Heart Transplant", "Valve Repair"],
    accepted_insurance: ["Blue Cross Blue Shield", "United Healthcare", "Medicare", "Harvard Pilgrim"],
    rating: 4.8,
    latitude: 42.3355,
    longitude: -71.1065,
    availability_next: "Thursday, Jan 30",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Medicare", "Harvard Pilgrim"]
  },
  {
    name: "Boston Medical Center Cardiology",
    type: "Cardiology",
    address: "88 East Newton St, Boston, MA 02118",
    phone: "(617) 555-1003",
    specialties: ["General Cardiology", "Hypertension", "Lipid Management", "Cardiac Rehab"],
    accepted_insurance: ["Medicare", "Medicaid", "Blue Cross Blue Shield", "Tufts Health Plan"],
    rating: 4.5,
    latitude: 42.3364,
    longitude: -71.0723,
    availability_next: "Monday, Feb 3",
    in_network_plans: ["Medicare", "Medicaid", "Blue Cross Blue Shield", "Tufts Health Plan"]
  },

  // Orthopedics Providers
  {
    name: "Boston Orthopedic & Spine",
    type: "Orthopedics",
    address: "850 Boylston St, Chestnut Hill, MA 02467",
    phone: "(617) 555-2001",
    specialties: ["Joint Replacement", "Spine Surgery", "Sports Medicine", "Trauma Surgery"],
    accepted_insurance: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Medicare"],
    rating: 4.7,
    latitude: 42.3217,
    longitude: -71.1256,
    availability_next: "Friday, Jan 31",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Medicare"]
  },
  {
    name: "New England Baptist Hospital Orthopedics",
    type: "Orthopedics",
    address: "125 Parker Hill Ave, Boston, MA 02120",
    phone: "(617) 555-2002",
    specialties: ["Hip Replacement", "Knee Replacement", "Shoulder Surgery", "Hand Surgery"],
    accepted_insurance: ["All Major Insurance", "Medicare"],
    rating: 4.8,
    latitude: 42.3297,
    longitude: -71.1043,
    availability_next: "Wednesday, Feb 5",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Harvard Pilgrim", "Medicare", "Cigna", "Tufts Health Plan"]
  },

  // General Surgery Providers
  {
    name: "Boston General Surgery Associates",
    type: "General Surgery",
    address: "330 Brookline Ave, Boston, MA 02215",
    phone: "(617) 555-3001",
    specialties: ["Laparoscopic Surgery", "Hernia Repair", "Gallbladder Surgery", "Colorectal Surgery"],
    accepted_insurance: ["Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim", "Cigna"],
    rating: 4.6,
    latitude: 42.3378,
    longitude: -71.1017,
    availability_next: "Monday, Jan 27",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim", "Cigna"]
  },
  {
    name: "Cambridge Health Alliance Surgery",
    type: "General Surgery",
    address: "1493 Cambridge St, Cambridge, MA 02139",
    phone: "(617) 555-3002",
    specialties: ["General Surgery", "Trauma Surgery", "Emergency Surgery", "Minimally Invasive Surgery"],
    accepted_insurance: ["Medicare", "Medicaid", "Tufts Health Plan", "Blue Cross Blue Shield"],
    rating: 4.4,
    latitude: 42.3875,
    longitude: -71.1190,
    availability_next: "Thursday, Jan 30",
    in_network_plans: ["Medicare", "Medicaid", "Tufts Health Plan", "Blue Cross Blue Shield"]
  },

  // Neurosurgery Providers
  {
    name: "Boston Neurosurgical Associates",
    type: "Neurosurgery",
    address: "15 Parkman St, Boston, MA 02114",
    phone: "(617) 555-4001",
    specialties: ["Spine Surgery", "Brain Surgery", "Tumor Surgery", "Minimally Invasive Spine"],
    accepted_insurance: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Medicare"],
    rating: 4.9,
    latitude: 42.3601,
    longitude: -71.0689,
    availability_next: "Tuesday, Feb 4",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Medicare"]
  },

  // Urology Providers
  {
    name: "Boston Urology Associates",
    type: "Urology",
    address: "45 Francis St, Boston, MA 02115",
    phone: "(617) 555-5001",
    specialties: ["Prostate Surgery", "Kidney Surgery", "Bladder Surgery", "Robotic Surgery"],
    accepted_insurance: ["Medicare", "Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim"],
    rating: 4.7,
    latitude: 42.3355,
    longitude: -71.1065,
    availability_next: "Friday, Feb 7",
    in_network_plans: ["Medicare", "Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim"]
  },

  // Obstetrics Providers
  {
    name: "Boston Women's Health Associates",
    type: "Obstetrics",
    address: "1101 Beacon St, Brookline, MA 02446",
    phone: "(617) 555-6001",
    specialties: ["Obstetrics", "Gynecology", "High-Risk Pregnancy", "Postpartum Care"],
    accepted_insurance: ["Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim", "Tufts Health Plan"],
    rating: 4.8,
    latitude: 42.3467,
    longitude: -71.1206,
    availability_next: "Monday, Jan 27",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Harvard Pilgrim", "Tufts Health Plan"]
  },

  // Ophthalmology Providers
  {
    name: "Boston Eye Associates",
    type: "Ophthalmology",
    address: "800 Washington St, Boston, MA 02111",
    phone: "(617) 555-7001",
    specialties: ["Cataract Surgery", "Retinal Surgery", "Glaucoma Treatment", "LASIK"],
    accepted_insurance: ["Medicare", "Blue Cross Blue Shield", "United Healthcare", "Aetna"],
    rating: 4.6,
    latitude: 42.3398,
    longitude: -71.0621,
    availability_next: "Wednesday, Jan 29",
    in_network_plans: ["Medicare", "Blue Cross Blue Shield", "United Healthcare", "Aetna"]
  },

  // Endocrinology Providers
  {
    name: "Boston Endocrine Associates",
    type: "Endocrinology",
    address: "221 Longwood Ave, Boston, MA 02115",
    phone: "(617) 555-8001",
    specialties: ["Diabetes Management", "Thyroid Disorders", "Hormone Therapy", "Metabolic Disorders"],
    accepted_insurance: ["Harvard Pilgrim", "Blue Cross Blue Shield", "United Healthcare", "Tufts Health Plan"],
    rating: 4.7,
    latitude: 42.3378,
    longitude: -71.1017,
    availability_next: "Thursday, Feb 6",
    in_network_plans: ["Harvard Pilgrim", "Blue Cross Blue Shield", "United Healthcare", "Tufts Health Plan"]
  },

  // Pulmonology Providers
  {
    name: "Boston Pulmonary Associates",
    type: "Pulmonology",
    address: "736 Cambridge St, Brighton, MA 02135",
    phone: "(617) 555-9001",
    specialties: ["Lung Surgery Recovery", "COPD Management", "Sleep Disorders", "Pulmonary Rehab"],
    accepted_insurance: ["Cigna", "Blue Cross Blue Shield", "Medicare", "United Healthcare"],
    rating: 4.5,
    latitude: 42.3647,
    longitude: -71.1581,
    availability_next: "Monday, Feb 3",
    in_network_plans: ["Cigna", "Blue Cross Blue Shield", "Medicare", "United Healthcare"]
  },

  // Oncology Providers
  {
    name: "Dana-Farber Cancer Institute",
    type: "Oncology",
    address: "450 Brookline Ave, Boston, MA 02215",
    phone: "(617) 555-1001",
    specialties: ["Breast Cancer", "Surgical Oncology", "Medical Oncology", "Radiation Oncology"],
    accepted_insurance: ["All Major Insurance", "Medicare"],
    rating: 4.9,
    latitude: 42.3378,
    longitude: -71.1017,
    availability_next: "Tuesday, Feb 4",
    in_network_plans: ["Blue Cross Blue Shield", "United Healthcare", "Aetna", "Harvard Pilgrim", "Medicare", "Cigna", "Tufts Health Plan"]
  },

  // Nephrology Providers
  {
    name: "Boston Kidney Center",
    type: "Nephrology",
    address: "185 Pilgrim Rd, Boston, MA 02215",
    phone: "(617) 555-1101",
    specialties: ["Kidney Disease", "Dialysis", "Transplant Care", "Hypertension"],
    accepted_insurance: ["Medicare", "Blue Cross Blue Shield", "United Healthcare", "Aetna"],
    rating: 4.6,
    latitude: 42.3378,
    longitude: -71.1017,
    availability_next: "Friday, Feb 7",
    in_network_plans: ["Medicare", "Blue Cross Blue Shield", "United Healthcare", "Aetna"]
  }
];

async function populateDatabase() {
  try {
    console.log("🚀 Starting database population...");

    // Clear existing data first
    console.log("\n🧹 Clearing existing data...");
    await supabase.from("patients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("providers").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert patients
    console.log("\n👥 Inserting patient data...");
    const { data: patientsData, error: patientsError } = await supabase
      .from("patients")
      .insert(samplePatients)
      .select();

    if (patientsError) {
      console.error("❌ Error inserting patients:", patientsError);
      return;
    }

    console.log(`✅ Successfully inserted ${patientsData.length} patients`);

    // Insert providers
    console.log("\n🏥 Inserting provider data...");
    const { data: providersData, error: providersError } = await supabase
      .from("providers")
      .insert(sampleProviders)
      .select();

    if (providersError) {
      console.error("❌ Error inserting providers:", providersError);
      return;
    }

    console.log(`✅ Successfully inserted ${providersData.length} providers`);

    // Verify data
    console.log("\n📊 Data population summary:");
    console.log(`   Patients: ${patientsData.length}`);
    console.log(`   Providers: ${providersData.length}`);
    
    // Show risk distribution
    const highRisk = patientsData.filter(p => p.leakage_risk_level === 'high').length;
    const mediumRisk = patientsData.filter(p => p.leakage_risk_level === 'medium').length;
    const lowRisk = patientsData.filter(p => p.leakage_risk_level === 'low').length;
    
    console.log(`   Risk Distribution:`);
    console.log(`     High Risk: ${highRisk} patients`);
    console.log(`     Medium Risk: ${mediumRisk} patients`);
    console.log(`     Low Risk: ${lowRisk} patients`);

    // Show provider types
    const providerTypes = {};
    providersData.forEach(p => {
      providerTypes[p.type] = (providerTypes[p.type] || 0) + 1;
    });
    
    console.log(`   Provider Types:`);
    Object.entries(providerTypes).forEach(([type, count]) => {
      console.log(`     ${type}: ${count} providers`);
    });

    console.log("\n🎉 Database population completed successfully!");
    console.log("✅ Ready for frontend integration (Task 2.1)");

  } catch (error) {
    console.error("❌ Database population failed:", error);
  }
}

populateDatabase();