import React from "react";
import { Route, Routes } from "react-router-dom";
import { Guard, Side, useSession } from "./components.jsx";
import {
  Shell, Home, NgoDirectory, NgoProfile, CampaignList, CampaignPage, DonatePage,
  VolunteerPage, SupportPage, EventsPage, ImpactPage, StoriesPage, StoryPage, CmsPage,
  ProgramsPage, ContactPage, TransparencyPage, MapPage, LoginPage, ResetPage, ErrorPage,
  DashboardHome, InventoryPage, RequestsPage, DistributionPage, AttendancePage, ReportsPage,
  ImportPage, SettingsPage, BackupPage, MessagesPage, SearchPage, ProfilePage, ScanPage,
} from "./pages.jsx";
import { CrudPage, Badge } from "./components.jsx";

function crud(title, name, columns, fields) {
  return () => <CrudPage title={title} resourceName={name} columns={columns} fields={fields} />;
}

const Beneficiaries = crud("Beneficiaries", "beneficiaries",
  [
    { key: "code", label: "ID" },
    { key: "name", label: "Name" },
    { key: "city", label: "City" },
    { key: "class_name", label: "Class" },
    { key: "verification_status", label: "Status", render: (r) => <Badge>{r.verification_status}</Badge> },
  ],
  [
    { key: "name", label: "Name", required: true },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "guardian_name", label: "Guardian" },
    { key: "class_name", label: "Class" },
    { key: "education_status", label: "Education status" },
  ]
);

const Students = crud("Students", "students",
  [{ key: "roll_no", label: "Roll" }, { key: "name", label: "Name" }, { key: "status", label: "Status" }],
  [{ key: "name", label: "Name", required: true }, { key: "roll_no", label: "Roll" }, { key: "status", label: "Status", type: "select", options: ["active", "inactive"] }]
);
const Schools = crud("Schools", "schools",
  [{ key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "type", label: "Type" }],
  [{ key: "name", label: "Name", required: true }, { key: "city", label: "City" }, { key: "type", label: "Type" }]
);
const Classes = crud("Classes", "classes",
  [{ key: "name", label: "Class" }, { key: "section", label: "Section" }, { key: "academic_year", label: "Year" }],
  [{ key: "name", label: "Name", required: true }, { key: "section", label: "Section" }, { key: "academic_year", label: "Year" }]
);
const Assignments = crud("Assignments", "assignments",
  [{ key: "title", label: "Title" }, { key: "due_date", label: "Due" }],
  [{ key: "title", label: "Title", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "due_date", label: "Due", type: "date" }]
);
const Exams = crud("Exams", "exams",
  [{ key: "name", label: "Exam" }, { key: "exam_date", label: "Date" }, { key: "max_marks", label: "Max" }],
  [{ key: "name", label: "Name", required: true }, { key: "exam_date", label: "Date", type: "date" }, { key: "max_marks", label: "Max marks", type: "number" }]
);
const Results = crud("Results", "results",
  [{ key: "student_id", label: "Student" }, { key: "marks", label: "Marks" }, { key: "grade", label: "Grade" }],
  [{ key: "student_id", label: "Student ID", required: true }, { key: "exam_id", label: "Exam ID", required: true }, { key: "marks", label: "Marks", type: "number" }, { key: "grade", label: "Grade" }]
);
const Donors = crud("Donors", "donors",
  [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "city", label: "City" }],
  [{ key: "name", label: "Name", required: true }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "city", label: "City" }]
);
const Donations = crud("Donations", "donations",
  [{ key: "amount", label: "Amount" }, { key: "type", label: "Type" }, { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> }, { key: "receipt_no", label: "Receipt" }],
  [{ key: "amount", label: "Amount", type: "number", required: true }, { key: "type", label: "Type", type: "select", options: ["money", "clothes", "books", "food", "other"] }, { key: "frequency", label: "Frequency", type: "select", options: ["one-time", "monthly", "quarterly", "annual"] }]
);
const Campaigns = () => (
  <CrudPage
    title="Campaigns"
    resourceName="campaigns"
    queryExtra={{ scope: "admin" }}
    columns={[{ key: "name", label: "Name" }, { key: "goal_amount", label: "Goal" }, { key: "raised_amount", label: "Raised" }, { key: "status", label: "Status" }]}
    fields={[{ key: "name", label: "Name", required: true }, { key: "goal_amount", label: "Goal", type: "number" }, { key: "description", label: "Description", type: "textarea" }, { key: "location", label: "Location" }]}
  />
);
const Sponsorships = crud("Sponsorships", "sponsorships",
  [{ key: "type", label: "Type" }, { key: "frequency", label: "Freq" }, { key: "amount_committed", label: "Committed" }, { key: "amount_received", label: "Received" }, { key: "status", label: "Status" }],
  [{ key: "donor_id", label: "Donor ID", required: true }, { key: "type", label: "Type", required: true }, { key: "frequency", label: "Frequency" }, { key: "amount_committed", label: "Amount", type: "number" }]
);
const Warehouses = crud("Warehouses", "warehouses",
  [{ key: "name", label: "Name" }, { key: "address", label: "Address" }, { key: "manager", label: "Manager" }],
  [{ key: "name", label: "Name", required: true }, { key: "address", label: "Address" }, { key: "manager", label: "Manager" }, { key: "capacity", label: "Capacity", type: "number" }]
);
const Volunteers = () => (
  <CrudPage
    title="Volunteers"
    resourceName="volunteers"
    columns={[{ key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "skills", label: "Skills" }, { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> }]}
    fields={[{ key: "name", label: "Name", required: true }, { key: "email", label: "Email" }, { key: "city", label: "City" }, { key: "skills", label: "Skills" }]}
    extra={(row) => (
      <select defaultValue={row.status} onChange={async (e) => {
        const { api } = await import("./api");
        await api(`/volunteers/${row.id}/status`, { method: "POST", body: { status: e.target.value } });
        location.reload();
      }}>
        {["applied", "verified", "approved", "active", "inactive"].map((s) => <option key={s}>{s}</option>)}
      </select>
    )}
  />
);
const EventsAdmin = crud("Events", "events",
  [{ key: "name", label: "Name" }, { key: "type", label: "Type" }, { key: "date", label: "Date" }, { key: "location", label: "Location" }],
  [{ key: "name", label: "Name", required: true }, { key: "type", label: "Type" }, { key: "date", label: "Date", type: "date" }, { key: "location", label: "Location" }, { key: "capacity", label: "Capacity", type: "number" }]
);
const Scholarships = crud("Scholarships", "scholarships",
  [{ key: "name", label: "Name" }, { key: "amount", label: "Amount" }, { key: "deadline", label: "Deadline" }, { key: "status", label: "Status" }],
  [{ key: "name", label: "Name", required: true }, { key: "amount", label: "Amount", type: "number" }, { key: "eligibility", label: "Eligibility" }, { key: "deadline", label: "Deadline", type: "date" }]
);
const ScholarshipApps = () => (
  <CrudPage
    title="Scholarship applications"
    resourceName="scholarship-applications"
    columns={[{ key: "id", label: "#" }, { key: "scholarship_id", label: "Program" }, { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> }]}
    fields={[{ key: "scholarship_id", label: "Scholarship ID", required: true }, { key: "beneficiary_id", label: "Beneficiary ID" }]}
    extra={(row) => (
      <select defaultValue={row.status} onChange={async (e) => {
        const { api } = await import("./api");
        await api(`/scholarships/${row.id}/workflow`, { method: "POST", body: { status: e.target.value } });
        location.reload();
      }}>
        {["applied", "document_verification", "eligible", "approved", "payment", "completed", "rejected"].map((s) => <option key={s}>{s}</option>)}
      </select>
    )}
  />
);
const Expenses = () => (
  <CrudPage
    title="Expenses"
    resourceName="expenses"
    columns={[{ key: "category", label: "Category" }, { key: "amount", label: "Amount" }, { key: "date", label: "Date" }, { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> }]}
    fields={[{ key: "category", label: "Category", type: "select", options: ["Education", "Food", "Clothing", "Transport", "Rent", "Salary", "Events", "Technology", "Utilities", "Medical", "Administration", "Other"] }, { key: "amount", label: "Amount", type: "number", required: true }, { key: "date", label: "Date", type: "date" }]}
    extra={(row) => (
      <select defaultValue={row.status} onChange={async (e) => {
        const { api } = await import("./api");
        await api(`/expenses/${row.id}/workflow`, { method: "POST", body: { status: e.target.value } });
        location.reload();
      }}>
        {["draft", "submitted", "approved", "paid"].map((s) => <option key={s}>{s}</option>)}
      </select>
    )}
  />
);
const Vendors = crud("Vendors", "vendors",
  [{ key: "name", label: "Name" }, { key: "company", label: "Company" }, { key: "gst", label: "GST" }],
  [{ key: "name", label: "Name", required: true }, { key: "company", label: "Company" }, { key: "gst", label: "GST" }, { key: "phone", label: "Phone" }]
);
const Assets = crud("Assets", "assets",
  [{ key: "asset_code", label: "Code" }, { key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "status", label: "Status" }],
  [{ key: "name", label: "Name", required: true }, { key: "asset_code", label: "Code" }, { key: "category", label: "Category" }, { key: "cost", label: "Cost", type: "number" }]
);
const Documents = crud("Documents", "documents",
  [{ key: "category", label: "Category" }, { key: "filename", label: "File" }, { key: "verified", label: "Verified" }],
  [{ key: "owner_type", label: "Owner type", required: true }, { key: "owner_id", label: "Owner ID", required: true }, { key: "category", label: "Category", required: true }, { key: "filename", label: "Filename", required: true }, { key: "path", label: "Path", required: true }]
);
const Users = crud("Users", "users",
  [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }],
  [{ key: "name", label: "Name", required: true }, { key: "email", label: "Email", required: true }, { key: "password", label: "Password" }, { key: "role", label: "Role", type: "select", options: ["super_admin", "ngo_admin", "ngo_staff", "teacher", "volunteer", "donor", "beneficiary", "student"] }]
);
const NgosAdmin = () => (
  <CrudPage
    title="NGOs"
    resourceName="ngos"
    queryExtra={{ scope: "admin" }}
    columns={[{ key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "cause", label: "Cause" }, { key: "approval_status", label: "Status", render: (r) => <Badge>{r.approval_status}</Badge> }]}
    fields={[{ key: "name", label: "Name", required: true }, { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "cause", label: "Cause" }, { key: "about", label: "About", type: "textarea" }]}
    extra={(row) => (
      <>
        <button className="btn ghost" onClick={async () => {
          const { api } = await import("./api");
          await api(`/ngos/${row.id}/approve`, { method: "POST", body: { status: "approved" } });
          location.reload();
        }}>Approve</button>
        <button className="btn danger" onClick={async () => {
          const { api } = await import("./api");
          await api(`/ngos/${row.id}/approve`, { method: "POST", body: { status: "rejected", reason: "Does not meet criteria" } });
          location.reload();
        }}>Reject</button>
      </>
    )}
  />
);
const CmsAdmin = crud("CMS pages", "cms-pages",
  [{ key: "slug", label: "Slug" }, { key: "title", label: "Title" }],
  [{ key: "slug", label: "Slug", required: true }, { key: "title", label: "Title", required: true }, { key: "content", label: "Content", type: "textarea" }]
);
const BlogAdmin = crud("Blog / stories", "blog-posts",
  [{ key: "title", label: "Title" }, { key: "type", label: "Type" }, { key: "status", label: "Status" }],
  [{ key: "title", label: "Title", required: true }, { key: "slug", label: "Slug" }, { key: "type", label: "Type", type: "select", options: ["blog", "success", "news"] }, { key: "description", label: "Description", type: "textarea" }]
);
const Audit = crud("Audit log", "audit-logs",
  [{ key: "created_at", label: "When" }, { key: "action", label: "Action" }, { key: "object_type", label: "Object" }, { key: "user_id", label: "User" }],
  [{ key: "action", label: "Action" }]
);

function Portal({ user, items, onUser }) {
  return (
    <div className="app-shell">
      <Side items={items} />
      <main className="main">
        <Routes>
          <Route index element={<DashboardHome user={user} />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="beneficiaries" element={<Beneficiaries />} />
          <Route path="students" element={<Students />} />
          <Route path="schools" element={<Schools />} />
          <Route path="classes" element={<Classes />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="exams" element={<Exams />} />
          <Route path="results" element={<Results />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="donors" element={<Donors />} />
          <Route path="donations" element={<Donations />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="sponsorships" element={<Sponsorships />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="distributions" element={<DistributionPage />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="events" element={<EventsAdmin />} />
          <Route path="scholarships" element={<Scholarships />} />
          <Route path="scholarship-apps" element={<ScholarshipApps />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="assets" element={<Assets />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="users" element={<Users />} />
          <Route path="ngos" element={<NgosAdmin />} />
          <Route path="cms" element={<CmsAdmin />} />
          <Route path="blog" element={<BlogAdmin />} />
          <Route path="audit" element={<Audit />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="profile" element={<ProfilePage user={user} onUser={onUser} />} />
        </Routes>
      </main>
    </div>
  );
}

const adminItems = [
  { to: "/admin", label: "Overview" },
  { group: "Governance" },
  { to: "/admin/ngos", label: "NGOs" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/audit", label: "Audit log" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/backup", label: "Backup" },
  { to: "/admin/cms", label: "CMS" },
  { to: "/admin/blog", label: "Stories" },
  { group: "Operations" },
  { to: "/admin/beneficiaries", label: "Beneficiaries" },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/donations", label: "Donations" },
  { to: "/admin/campaigns", label: "Campaigns" },
  { to: "/admin/inventory", label: "Inventory" },
  { to: "/admin/distributions", label: "Distribution" },
  { to: "/admin/volunteers", label: "Volunteers" },
  { to: "/admin/events", label: "Events" },
  { to: "/admin/scholarships", label: "Scholarships" },
  { to: "/admin/expenses", label: "Expenses" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/import", label: "Import" },
  { to: "/admin/search", label: "Search" },
  { to: "/admin/profile", label: "Profile" },
];

const ngoItems = [
  { to: "/ngo", label: "Overview" },
  { to: "/ngo/beneficiaries", label: "Beneficiaries" },
  { to: "/ngo/students", label: "Students" },
  { to: "/ngo/schools", label: "Schools" },
  { to: "/ngo/classes", label: "Classes" },
  { to: "/ngo/attendance", label: "Attendance" },
  { to: "/ngo/assignments", label: "Assignments" },
  { to: "/ngo/exams", label: "Exams" },
  { to: "/ngo/results", label: "Results" },
  { to: "/ngo/donors", label: "Donors" },
  { to: "/ngo/donations", label: "Donations" },
  { to: "/ngo/campaigns", label: "Campaigns" },
  { to: "/ngo/sponsorships", label: "Sponsorships" },
  { to: "/ngo/inventory", label: "Inventory" },
  { to: "/ngo/warehouses", label: "Warehouses" },
  { to: "/ngo/requests", label: "Requests" },
  { to: "/ngo/distributions", label: "Distribution" },
  { to: "/ngo/volunteers", label: "Volunteers" },
  { to: "/ngo/events", label: "Events" },
  { to: "/ngo/scholarships", label: "Scholarships" },
  { to: "/ngo/scholarship-apps", label: "Scholarship apps" },
  { to: "/ngo/expenses", label: "Expenses" },
  { to: "/ngo/vendors", label: "Vendors" },
  { to: "/ngo/assets", label: "Assets" },
  { to: "/ngo/documents", label: "Documents" },
  { to: "/ngo/reports", label: "Reports" },
  { to: "/ngo/import", label: "Import" },
  { to: "/ngo/scan", label: "Scan" },
  { to: "/ngo/messages", label: "Messages" },
  { to: "/ngo/search", label: "Search" },
  { to: "/ngo/profile", label: "Profile" },
];

const userItems = [
  { to: "/dashboard", label: "Overview" },
  { to: "/dashboard/donations", label: "My donations" },
  { to: "/dashboard/sponsorships", label: "Sponsorships" },
  { to: "/dashboard/campaigns", label: "Campaigns" },
  { to: "/dashboard/events", label: "Events" },
  { to: "/dashboard/attendance", label: "Attendance" },
  { to: "/dashboard/assignments", label: "Assignments" },
  { to: "/dashboard/results", label: "Results" },
  { to: "/dashboard/scholarships", label: "Scholarships" },
  { to: "/dashboard/requests", label: "Support requests" },
  { to: "/dashboard/messages", label: "Messages" },
  { to: "/dashboard/profile", label: "Profile" },
];

export default function App() {
  const session = useSession();
  if (!session.ready) return <p className="wrap">Loading SevaSetu…</p>;

  return (
    <Routes>
      <Route path="/" element={<Shell {...wrap(session)}><Home lang={session.lang} /></Shell>} />
      <Route path="/ngos" element={<Shell {...wrap(session)}><NgoDirectory /></Shell>} />
      <Route path="/ngos/:slug" element={<Shell {...wrap(session)}><NgoProfile /></Shell>} />
      <Route path="/campaigns" element={<Shell {...wrap(session)}><CampaignList /></Shell>} />
      <Route path="/campaigns/:slug" element={<Shell {...wrap(session)}><CampaignPage /></Shell>} />
      <Route path="/donate" element={<Shell {...wrap(session)}><DonatePage /></Shell>} />
      <Route path="/volunteer" element={<Shell {...wrap(session)}><VolunteerPage /></Shell>} />
      <Route path="/support" element={<Shell {...wrap(session)}><SupportPage /></Shell>} />
      <Route path="/events" element={<Shell {...wrap(session)}><EventsPage /></Shell>} />
      <Route path="/impact" element={<Shell {...wrap(session)}><ImpactPage /></Shell>} />
      <Route path="/stories" element={<Shell {...wrap(session)}><StoriesPage /></Shell>} />
      <Route path="/stories/:slug" element={<Shell {...wrap(session)}><StoryPage /></Shell>} />
      <Route path="/programs" element={<Shell {...wrap(session)}><ProgramsPage /></Shell>} />
      <Route path="/about" element={<Shell {...wrap(session)}><CmsPage slug="about" /></Shell>} />
      <Route path="/faq" element={<Shell {...wrap(session)}><CmsPage slug="faq" /></Shell>} />
      <Route path="/privacy" element={<Shell {...wrap(session)}><CmsPage slug="privacy" /></Shell>} />
      <Route path="/terms" element={<Shell {...wrap(session)}><CmsPage slug="terms" /></Shell>} />
      <Route path="/refund" element={<Shell {...wrap(session)}><CmsPage slug="refund" /></Shell>} />
      <Route path="/contact" element={<Shell {...wrap(session)}><ContactPage /></Shell>} />
      <Route path="/transparency" element={<Shell {...wrap(session)}><TransparencyPage /></Shell>} />
      <Route path="/map" element={<Shell {...wrap(session)}><MapPage /></Shell>} />
      <Route path="/login" element={<Shell {...wrap(session)}><LoginPage onLogin={session.setUser} /></Shell>} />
      <Route path="/register" element={<Shell {...wrap(session)}><LoginPage onLogin={session.setUser} /></Shell>} />
      <Route path="/reset" element={<Shell {...wrap(session)}><ResetPage /></Shell>} />
      <Route path="/403" element={<Shell {...wrap(session)}><ErrorPage code={403} /></Shell>} />
      <Route path="/500" element={<Shell {...wrap(session)}><ErrorPage code={500} /></Shell>} />

      <Route path="/admin/*" element={
        <Guard user={session.user} roles={["super_admin"]}>
          <Portal user={session.user} items={adminItems} prefix="/admin" onUser={session.setUser} />
        </Guard>
      } />
      <Route path="/ngo/*" element={
        <Guard user={session.user} roles={["ngo_admin", "ngo_staff", "teacher", "super_admin"]}>
          <Portal user={session.user} items={ngoItems} prefix="/ngo" onUser={session.setUser} />
        </Guard>
      } />
      <Route path="/dashboard/*" element={
        <Guard user={session.user} roles={["donor", "volunteer", "beneficiary", "student", "public", "super_admin", "ngo_admin"]}>
          <Portal user={session.user} items={userItems} prefix="/dashboard" onUser={session.setUser} />
        </Guard>
      } />
      <Route path="*" element={<Shell {...wrap(session)}><ErrorPage code={404} /></Shell>} />
    </Routes>
  );
}

function wrap(session) {
  return {
    user: session.user,
    lang: session.lang,
    onLang: session.toggleLang,
    onLogout: async () => {
      await session.logout();
    },
  };
}
