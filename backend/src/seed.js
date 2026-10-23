const { get, all, insert, run } = require("./db");
const { createUser } = require("./auth");
const { qrPayload, receiptNo } = require("./services");

function count(table) {
  return get(`SELECT COUNT(*) AS c FROM ${table}`).c;
}

function seedIfEmpty() {
  if (count("users") > 0) return { seeded: false };

  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["site_name", process.env.APP_NAME || "SevaSetu"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["domain", process.env.APP_DOMAIN || "abcyz.in"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["primary_color", "#0f6b4c"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["accent_color", "#e8a838"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["payment_provider", "offline"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["language", "en"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["logo", "/logo.svg"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["footer", "SevaSetu — bridging NGOs, donors and communities."]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["contact_email", "hello@abcyz.in"]);
  run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["contact_phone", "+91-80-4000-1200"]);

  const admin = createUser({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@abcyz.in",
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "ChangeMe_Admin_123",
    name: "Platform Super Admin",
    role: "super_admin",
  });

  const ngoDefs = [
    {
      slug: "gyan-jyoti",
      name: "Gyan Jyoti Foundation",
      cause: "education",
      ngo_type: "Education",
      city: "Bengaluru",
      state: "Karnataka",
      district: "Bengaluru Urban",
      pin_code: "560001",
      about: "After-school learning and scholarships for first-generation learners.",
      mission: "Every child in our city completes school with dignity.",
      contact_person: "Meera Rao",
      email: "ngo@gyanjyoti.org",
      phone: "08040001101",
      lat: 12.9716,
      lng: 77.5946,
    },
    {
      slug: "annapurna-seva",
      name: "Annapurna Seva Trust",
      cause: "food",
      ngo_type: "Food Security",
      city: "Pune",
      state: "Maharashtra",
      district: "Pune",
      pin_code: "411001",
      about: "Daily meals and dry ration kits for urban poor families.",
      mission: "No child in our neighbourhood sleeps hungry.",
      contact_person: "Rahul Deshmukh",
      email: "ngo@annapurna.org",
      phone: "02040001102",
      lat: 18.5204,
      lng: 73.8567,
    },
    {
      slug: "vastra-mitra",
      name: "Vastra Mitra",
      cause: "clothing",
      ngo_type: "Clothing",
      city: "Jaipur",
      state: "Rajasthan",
      district: "Jaipur",
      pin_code: "302001",
      about: "School uniforms, winter wear and dignity kits.",
      mission: "Warmth and school-ready clothing for every child.",
      contact_person: "Kavita Sharma",
      email: "ngo@vastramitra.org",
      phone: "014140001103",
      lat: 26.9124,
      lng: 75.7873,
    },
    {
      slug: "bal-kalyan",
      name: "Bal Kalyan Samiti",
      cause: "child welfare",
      ngo_type: "Child Welfare",
      city: "Lucknow",
      state: "Uttar Pradesh",
      district: "Lucknow",
      pin_code: "226001",
      about: "Case work, sponsorship and family support for vulnerable children.",
      mission: "Safe childhoods through community case management.",
      contact_person: "Imran Siddiqui",
      email: "ngo@balkalyan.org",
      phone: "052240001104",
      lat: 26.8467,
      lng: 80.9462,
    },
    {
      slug: "skill-setu",
      name: "Skill Setu",
      cause: "skill development",
      ngo_type: "Skill Development",
      city: "Hyderabad",
      state: "Telangana",
      district: "Hyderabad",
      pin_code: "500001",
      about: "Computer labs, English and vocational tracks for youth.",
      mission: "Employable skills for first-job seekers.",
      contact_person: "Priya Nair",
      email: "ngo@skillsetu.org",
      phone: "04040001105",
      lat: 17.385,
      lng: 78.4867,
    },
  ];

  const ngoLogos = {
    "gyan-jyoti": "/images/logo-gyan.svg",
    "annapurna-seva": "/images/logo-annapurna.svg",
    "vastra-mitra": "/images/logo-vastra.svg",
    "bal-kalyan": "/images/logo-bal.svg",
    "skill-setu": "/images/logo-skill.svg",
  };
  const ngos = ngoDefs.map((d, i) =>
    insert("ngos", {
      ...d,
      logo: ngoLogos[d.slug] || "/images/logo-gyan.svg",
      registration_number: `REG-KA-2020-${1000 + i}`,
      address: `${12 + i} Community Lane`,
      website: `https://${d.slug}.abcyz.in`,
      bank_name: "State Bank of India",
      bank_account: `XXXXXX${1200 + i}`,
      bank_ifsc: "SBIN0001234",
      pan: `AABCG${1000 + i}P`,
      info_12a: "12A-OK",
      info_80g: "80G-OK",
      fcra: i % 2 === 0 ? "FCRA-OK" : "",
      verification_status: "verified",
      approval_status: "approved",
      is_demo: 1,
    })
  );

  const password = "Seva@12345";
  const ngoAdmins = ngos.map((n, i) => {
    const u = createUser({
      email: `admin@${n.slug}.org`,
      password,
      name: `${n.contact_person} (NGO Admin)`,
      role: "ngo_admin",
      ngo_id: n.id,
    });
    insert("ngo_users", { ngo_id: n.id, user_id: u.id, role: "ngo_admin" });
    return u;
  });

  const staff = ngos.map((n, i) => {
    const u = createUser({
      email: `staff@${n.slug}.org`,
      password,
      name: `Field Staff ${i + 1}`,
      role: "ngo_staff",
      ngo_id: n.id,
    });
    insert("ngo_users", { ngo_id: n.id, user_id: u.id, role: "ngo_staff" });
    return u;
  });

  const teachers = ngos.map((n, i) => {
    const u = createUser({
      email: `teacher@${n.slug}.org`,
      password,
      name: `Teacher ${i + 1}`,
      role: "teacher",
      ngo_id: n.id,
    });
    return u;
  });

  const donorUsers = [];
  for (let i = 1; i <= 12; i++) {
    donorUsers.push(
      createUser({
        email: `donor${i}@abcyz.in`,
        password,
        name: `Donor ${i}`,
        role: "donor",
        ngo_id: ngos[(i - 1) % ngos.length].id,
      })
    );
  }

  const volunteerUsers = [];
  for (let i = 1; i <= 10; i++) {
    volunteerUsers.push(
      createUser({
        email: `volunteer${i}@abcyz.in`,
        password,
        name: `Volunteer ${i}`,
        role: "volunteer",
        ngo_id: ngos[(i - 1) % ngos.length].id,
      })
    );
  }

  const parentUsers = [];
  for (let i = 1; i <= 8; i++) {
    parentUsers.push(
      createUser({
        email: `parent${i}@abcyz.in`,
        password,
        name: `Guardian ${i}`,
        role: "beneficiary",
        ngo_id: ngos[(i - 1) % ngos.length].id,
      })
    );
  }

  const studentUsers = [];
  for (let i = 1; i <= 10; i++) {
    studentUsers.push(
      createUser({
        email: `student${i}@abcyz.in`,
        password,
        name: `Student ${i}`,
        role: "student",
        ngo_id: ngos[(i - 1) % ngos.length].id,
      })
    );
  }

  createUser({
    email: "public@abcyz.in",
    password,
    name: "Public Visitor",
    role: "public",
  });

  const categories = [
    "Books", "Notebooks", "Pens", "Pencils", "School bags", "Uniforms", "Shoes", "Clothes",
    "Computers", "Laptops", "Tablets", "Furniture", "Food", "Medical supplies", "Sports equipment",
    "Toys", "Blankets", "Hygiene products", "Other",
  ];
  categories.forEach((name) => insert("inventory_categories", { name, kind: "general" }));

  const cms = [
    ["home", "Home", "SevaSetu connects verified NGOs with donors, volunteers and families."],
    ["about", "About", "A multi-NGO education, donation and community support platform for on-premises datacenter deployment."],
    ["privacy", "Privacy Policy", "We follow privacy-by-design. Sensitive beneficiary data is never shown publicly."],
    ["terms", "Terms", "Use of SevaSetu is governed by organisational agreements and applicable law."],
    ["refund", "Refund Policy", "Donations are receipted. Refunds follow the NGO and payment-provider policy."],
    ["faq", "FAQ", "How do I donate? Create an account or donate as a guest on a campaign page."],
    ["contact", "Contact", "Email hello@abcyz.in or visit your nearest partner NGO."],
  ];
  cms.forEach(([slug, title, content]) =>
    insert("cms_pages", { slug, title, content, seo_title: `${title} | SevaSetu`, seo_description: content })
  );

  const firstNames = ["Aarav", "Diya", "Kabir", "Ananya", "Ishaan", "Meera", "Rohan", "Sana", "Vihaan", "Zara", "Arjun", "Kiara", "Dev", "Nisha", "Om", "Pia", "Reyansh", "Tara", "Yash", "Leela"];
  const lastNames = ["Sharma", "Patel", "Khan", "Reddy", "Nair", "Das", "Iyer", "Singh", "Joshi", "Mishra"];
  const cities = ["Bengaluru", "Pune", "Jaipur", "Lucknow", "Hyderabad"];

  const beneficiaries = [];
  for (let i = 1; i <= 100; i++) {
    const ngo = ngos[(i - 1) % ngos.length];
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const b = insert("beneficiaries", {
      ngo_id: ngo.id,
      code: `BEN-${String(i).padStart(5, "0")}`,
      name,
      dob: `201${i % 9}-0${(i % 9) + 1}-1${i % 9}`,
      gender: i % 2 ? "female" : "male",
      guardian_name: `Guardian of ${name.split(" ")[0]}`,
      phone: `98${String(10000000 + i).slice(0, 8)}`,
      address: "On file — restricted",
      state: ngo.state,
      district: ngo.district,
      city: ngo.city,
      family_income: 4000 + (i % 12) * 500,
      family_members: 3 + (i % 5),
      school: `${ngo.city} Municipal School ${(i % 4) + 1}`,
      class_name: `Class ${(i % 10) + 1}`,
      education_status: i % 7 === 0 ? "out_of_school" : "enrolled",
      special_requirements: i % 11 === 0 ? "nutrition support" : "",
      verification_status: i % 9 === 0 ? "pending" : "verified",
      case_worker_id: staff[(i - 1) % staff.length].id,
      qr_code: qrPayload("beneficiary", i),
      is_demo: 1,
    });
    beneficiaries.push(b);
  }

  const schools = ngos.map((n, i) =>
    insert("schools", {
      ngo_id: n.id,
      name: `${n.city} Learning Centre ${i + 1}`,
      address: n.address,
      city: n.city,
      state: n.state,
      type: "after-school",
    })
  );

  const classes = [];
  schools.forEach((s, i) => {
    for (let c = 1; c <= 3; c++) {
      classes.push(
        insert("classes", {
          ngo_id: s.ngo_id,
          school_id: s.id,
          name: `Class ${c + 4}`,
          section: ["A", "B", "C"][c - 1],
          academic_year: "2025-26",
          teacher_id: teachers[i].id,
        })
      );
    }
  });

  classes.forEach((cl) => {
    ["Maths", "English", "EVS", "Computer"].forEach((name) =>
      insert("subjects", { ngo_id: cl.ngo_id, name, class_id: cl.id })
    );
  });

  const students = [];
  for (let i = 1; i <= 50; i++) {
    const ngo = ngos[(i - 1) % ngos.length];
    const cls = classes[(i - 1) % classes.length];
    const ben = beneficiaries[i - 1];
    const st = insert("students", {
      ngo_id: ngo.id,
      user_id: i <= studentUsers.length ? studentUsers[i - 1].id : null,
      beneficiary_id: ben.id,
      school_id: cls.school_id,
      class_id: cls.id,
      roll_no: `R${100 + i}`,
      name: ben.name,
      status: "active",
      qr_code: qrPayload("student", i),
      is_demo: 1,
    });
    students.push(st);
  }

  students.forEach((st, i) => {
    for (let d = 1; d <= 8; d++) {
      insert("attendance", {
        ngo_id: st.ngo_id,
        student_id: st.id,
        class_id: st.class_id,
        date: `2026-03-${String(d).padStart(2, "0")}`,
        status: d % 6 === 0 ? "absent" : "present",
        marked_by: teachers[(i) % teachers.length].id,
        synced: 1,
      });
    }
  });

  classes.slice(0, 8).forEach((cl, i) => {
    insert("assignments", {
      ngo_id: cl.ngo_id,
      class_id: cl.id,
      teacher_id: cl.teacher_id,
      title: ["Reading log", "Math worksheet", "Computer lab", "English paragraph"][i % 4],
      description: "Complete and submit to the class teacher.",
      due_date: "2026-04-15",
    });
    const exam = insert("exams", {
      ngo_id: cl.ngo_id,
      class_id: cl.id,
      name: "Term 1 Assessment",
      exam_date: "2026-03-20",
      max_marks: 100,
    });
    students.filter((s) => s.class_id === cl.id).forEach((st) => {
      const marks = 55 + (st.id % 40);
      insert("results", {
        ngo_id: cl.ngo_id,
        exam_id: exam.id,
        student_id: st.id,
        marks,
        grade: marks >= 80 ? "A" : marks >= 65 ? "B" : "C",
      });
    });
  });

  const donors = donorUsers.map((u, i) =>
    insert("donors", {
      ngo_id: ngos[i % ngos.length].id,
      user_id: u.id,
      name: u.name,
      email: u.email,
      phone: `99${String(20000000 + i)}`.slice(0, 10),
      city: cities[i % cities.length],
      preferences: "education,food",
      is_demo: 1,
    })
  );
  for (let i = 13; i <= 30; i++) {
    donors.push(
      insert("donors", {
        ngo_id: ngos[i % ngos.length].id,
        name: `Community Donor ${i}`,
        email: `community${i}@mail.abcyz.in`,
        phone: `97${String(30000000 + i)}`.slice(0, 10),
        city: cities[i % cities.length],
        is_demo: 1,
      })
    );
  }

  const campaignImages = {
    "winter-warmth": "/images/campaign-winter.svg",
    "midday-meals": "/images/campaign-meals.svg",
    "school-kits": "/images/campaign-school.svg",
    "digital-lab": "/images/campaign-lab.svg",
    "scholarship-fund": "/images/campaign-scholarship.svg",
    "nutrition-pack": "/images/campaign-nutrition.svg",
    "uniform-drive": "/images/campaign-uniform.svg",
    "library-books": "/images/campaign-library.svg",
    "hygiene-kits": "/images/campaign-hygiene.svg",
    "sports-for-all": "/images/campaign-sports.svg",
  };
  const campaignDefs = [
    ["winter-warmth", "Winter Warmth Drive", 500000, "clothing"],
    ["midday-meals", "Midday Meals 2026", 800000, "food"],
    ["school-kits", "School Kit for 1000 Children", 350000, "education"],
    ["digital-lab", "Community Digital Lab", 1200000, "skill development"],
    ["scholarship-fund", "Merit Scholarship Fund", 900000, "education"],
    ["nutrition-pack", "Nutrition Packs", 400000, "food"],
    ["uniform-drive", "Uniform Drive", 250000, "clothing"],
    ["library-books", "Village Library Books", 180000, "education"],
    ["hygiene-kits", "Hygiene Kits", 150000, "child welfare"],
    ["sports-for-all", "Sports for All", 220000, "skill development"],
  ];
  const campaigns = campaignDefs.map((c, i) => {
    const ngo = ngos[i % ngos.length];
    const raised = Math.round(c[2] * (0.25 + (i % 5) * 0.1));
    return insert("campaigns", {
      ngo_id: ngo.id,
      slug: c[0],
      name: c[1],
      goal_amount: c[2],
      raised_amount: raised,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      description: `${c[1]} by ${ngo.name}. Transparent utilisation reports published monthly.`,
      images: campaignImages[c[0]],
      location: ngo.city,
      impact_target: "Measurable community outcomes this year.",
      status: "active",
      is_demo: 1,
    });
  });

  campaigns.forEach((c, i) => {
    const d = insert("donations", {
      ngo_id: c.ngo_id,
      donor_id: donors[i % donors.length].id,
      campaign_id: c.id,
      type: "money",
      amount: 5000 + i * 500,
      frequency: i % 3 === 0 ? "monthly" : "one-time",
      status: "successful",
      payment_provider: "offline",
      payment_ref: `OFF-${1000 + i}`,
      receipt_no: receiptNo(),
      is_demo: 1,
    });
    insert("donation_receipts", {
      donation_id: d.id,
      receipt_no: d.receipt_no,
      issued_on: new Date().toISOString().slice(0, 10),
    });
  });

  students.slice(0, 12).forEach((st, i) => {
    insert("sponsorships", {
      ngo_id: st.ngo_id,
      donor_id: donors[i % donors.length].id,
      beneficiary_id: st.beneficiary_id,
      student_id: st.id,
      type: ["education", "school fees", "books", "uniform", "meals"][i % 5],
      frequency: ["monthly", "quarterly", "yearly", "one-time"][i % 4],
      amount_committed: 12000,
      amount_received: 6000 + i * 200,
      amount_utilized: 3000 + i * 100,
      status: "active",
    });
  });

  const warehouses = [];
  ngos.forEach((n) => {
    ["Central Store", "Field Store"].forEach((name, i) => {
      warehouses.push(
        insert("warehouses", {
          ngo_id: n.id,
          name: `${n.name} ${name}`,
          address: n.address,
          manager: n.contact_person,
          contact: n.phone,
          capacity: 5000 + i * 1000,
          qr_code: qrPayload("warehouse", `${n.id}-${i}`),
        })
      );
    });
  });

  const clothingSizes = ["4-5 Years", "6-7 Years", "8-9 Years", "10-11 Years", "S", "M", "L"];
  const items = [];
  const itemNames = [
    ["Clothes", "School Shirt", "M"],
    ["Clothes", "School Pants", "M"],
    ["Uniforms", "School Uniform Set", "10-11 Years"],
    ["Shoes", "Canvas Shoes", "5"],
    ["Books", "Class 5 English Reader", ""],
    ["Notebooks", "Ruled Notebook 200pg", ""],
    ["Pens", "Ball Pen Pack", ""],
    ["School bags", "Canvas School Bag", ""],
    ["Food", "Rice 25kg", ""],
    ["Food", "Toor Dal 10kg", ""],
    ["Blankets", "Wool Blanket", ""],
    ["Hygiene products", "Hygiene Kit", ""],
    ["Laptops", "Refurbished Laptop", ""],
    ["Toys", "Learning Kit", ""],
  ];
  ngos.forEach((n) => {
    itemNames.forEach((it, i) => {
      const qty = 20 + ((n.id + i) % 40);
      const dist = Math.floor(qty * 0.2);
      const res = Math.floor(qty * 0.1);
      const avail = qty - dist - res;
      const item = insert("inventory_items", {
        ngo_id: n.id,
        category: it[0],
        item_name: it[1],
        size: it[2] || clothingSizes[i % clothingSizes.length],
        gender: i % 2 ? "unisex" : "boys",
        color: ["blue", "white", "grey", "green"][i % 4],
        quantity: qty,
        available: avail,
        reserved: res,
        distributed: dist,
        condition: "good",
        source: i % 2 ? "donated" : "purchased",
        warehouse_id: warehouses.find((w) => w.ngo_id === n.id).id,
        barcode: `BC${n.id}${String(i).padStart(4, "0")}`,
        unit: it[0] === "Food" ? "kg" : "pcs",
        low_stock_at: 8,
        isbn: it[0] === "Books" ? `978-81-${1000 + i}` : null,
        author: it[0] === "Books" ? "NCERT" : null,
        language: "en",
        class_name: it[0] === "Books" ? "Class 5" : null,
        is_demo: 1,
      });
      items.push(item);
      insert("warehouse_stock", {
        warehouse_id: item.warehouse_id,
        item_id: item.id,
        quantity: avail,
      });
    });
  });

  for (let i = 1; i <= 20; i++) {
    insert("item_requests", {
      ngo_id: beneficiaries[i].ngo_id,
      beneficiary_id: beneficiaries[i].id,
      item_type: ["Clothes", "Books", "School bag", "Shoes", "Uniform", "Food", "Stationery"][i % 7],
      details: "Requested via case worker",
      status: ["requested", "under_review", "approved", "distributed"][i % 4],
    });
  }

  const distEvents = [];
  ngos.forEach((n, i) => {
    distEvents.push(
      insert("distribution_events", {
        ngo_id: n.id,
        name: i % 2 ? "Winter Clothes Distribution" : "Ration Kit Distribution",
        date: "2026-03-15",
        location: n.city,
        lat: n.lat,
        lng: n.lng,
        status: "completed",
        is_demo: 1,
      })
    );
  });
  distEvents.forEach((ev, i) => {
    const ngoItems = items.filter((it) => it.ngo_id === ev.ngo_id);
    const item = ngoItems[0];
    insert("distribution_items", { event_id: ev.id, item_id: item.id, quantity: 25 });
    for (let k = 0; k < 8; k++) {
      const ben = beneficiaries.filter((b) => b.ngo_id === ev.ngo_id)[k];
      if (!ben) continue;
      insert("distribution_records", {
        ngo_id: ev.ngo_id,
        event_id: ev.id,
        beneficiary_id: ben.id,
        item_id: item.id,
        item_name: item.item_name,
        quantity: 1,
        size: item.size,
        location: ev.location,
        staff_id: staff[i].id,
        acknowledgement: "signed",
      });
    }
  });

  volunteerUsers.forEach((u, i) => {
    insert("volunteers", {
      ngo_id: ngos[i % ngos.length].id,
      user_id: u.id,
      name: u.name,
      email: u.email,
      phone: `96${String(40000000 + i)}`.slice(0, 10),
      city: cities[i % cities.length],
      skills: ["Teaching", "Logistics", "Fundraising", "IT", "Event management"][i % 5],
      education: "Graduate",
      profession: "Professional",
      languages: "en,hi",
      availability: "weekends",
      status: "active",
      is_demo: 1,
    });
  });
  for (let i = 11; i <= 20; i++) {
    insert("volunteers", {
      ngo_id: ngos[i % ngos.length].id,
      name: `Walk-in Volunteer ${i}`,
      email: `v${i}@mail.abcyz.in`,
      city: cities[i % cities.length],
      skills: "Logistics",
      status: i % 3 ? "active" : "applied",
      is_demo: 1,
    });
  }

  const eventTypes = ["Education camp", "Clothing distribution", "Food distribution", "Fundraising", "Computer training"];
  const eventPhotos = {
    "Education camp": "/images/event-camp.svg",
    "Clothing distribution": "/images/event-distribution.svg",
    "Food distribution": "/images/event-food.svg",
    Fundraising: "/images/event-fundraise.svg",
    "Computer training": "/images/event-computer.svg",
  };
  const events = [];
  for (let i = 0; i < 10; i++) {
    const n = ngos[i % ngos.length];
    const type = eventTypes[i % eventTypes.length];
    events.push(
      insert("events", {
        ngo_id: n.id,
        name: `${type} ${n.city}`,
        type,
        date: `2026-04-${String(10 + i).padStart(2, "0")}`,
        time: "10:00",
        location: n.city,
        lat: n.lat,
        lng: n.lng,
        capacity: 50,
        registered: 12 + i,
        description: "Community event. Registration required.",
        photos: eventPhotos[type],
        status: "upcoming",
        is_demo: 1,
      })
    );
  }

  ngos.forEach((n, i) => {
    const sch = insert("scholarships", {
      ngo_id: n.id,
      name: `${n.name} Merit Scholarship`,
      eligibility: "Enrolled student, family income below 1.5L",
      income_criteria: "< 150000",
      education_criteria: "Class 5-10",
      location: n.city,
      amount: 15000,
      frequency: "yearly",
      documents: "income,school",
      deadline: "2026-06-30",
      status: "open",
      is_demo: 1,
    });
    insert("scholarship_applications", {
      ngo_id: n.id,
      scholarship_id: sch.id,
      beneficiary_id: beneficiaries[i * 5].id,
      student_id: students[i * 5] ? students[i * 5].id : null,
      status: ["applied", "eligible", "approved"][i % 3],
    });
  });

  ngos.forEach((n) => {
    insert("vendors", {
      ngo_id: n.id,
      name: `${n.city} Supplies Co`,
      company: `${n.city} Supplies Pvt Ltd`,
      gst: "29AABCU9603R1ZX",
      phone: n.phone,
      email: `vendor@${n.slug}.org`,
      products: "stationery,food,clothing",
    });
    insert("expenses", {
      ngo_id: n.id,
      category: "Education",
      amount: 25000,
      date: "2026-03-01",
      payment_method: "bank",
      status: "paid",
      notes: "Learning centre rent and materials",
    });
    insert("assets", {
      ngo_id: n.id,
      asset_code: `AST-${n.id}-001`,
      name: "Field Laptop",
      category: "Laptop",
      purchase_date: "2025-06-01",
      cost: 35000,
      location: n.city,
      condition: "good",
      status: "active",
    });
  });

  insert("blog_posts", {
    type: "success",
    slug: "first-generation-graduate",
    title: "A first-generation learner completes Class 10",
    description: "With scholarship and tutoring support, Ananya completed board exams.",
    images: "/images/story-graduate.svg",
    author: "SevaSetu Editorial",
    category: "education",
    tags: "scholarship,education",
    publish_date: "2026-02-10",
    seo_title: "First-generation graduate | SevaSetu",
    seo_description: "Impact story from partner NGOs.",
    status: "published",
  });
  insert("blog_posts", {
    type: "news",
    slug: "winter-drive-opens",
    title: "Winter warmth drive opens across 5 cities",
    description: "Partner NGOs begin uniform and blanket distribution.",
    images: "/images/story-winter.svg",
    author: "SevaSetu Editorial",
    category: "campaigns",
    tags: "clothing,winter",
    publish_date: "2026-01-05",
    seo_title: "Winter drive | SevaSetu",
    seo_description: "Campaign announcement.",
    status: "published",
  });

  insert("audit_logs", {
    user_id: admin.id,
    action: "seed",
    object_type: "system",
    after_json: JSON.stringify({ demo: true }),
  });

  return { seeded: true, admin: admin.email, passwordDemo: "Seva@12345" };
}

if (require.main === module) {
  const r = seedIfEmpty();
  console.log(r);
}

module.exports = { seedIfEmpty };
