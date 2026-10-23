const CAUSE = {
  education: "/images/cause-education.svg",
  food: "/images/cause-food.svg",
  clothing: "/images/cause-clothing.svg",
  healthcare: "/images/cause-healthcare.svg",
  "women empowerment": "/images/cause-women.svg",
  "child welfare": "/images/cause-child.svg",
  "skill development": "/images/cause-skill.svg",
  "rural development": "/images/cause-rural.svg",
};

const CAMPAIGN = {
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

const EVENT = {
  "Education camp": "/images/event-camp.svg",
  "Clothing distribution": "/images/event-distribution.svg",
  "Food distribution": "/images/event-food.svg",
  Fundraising: "/images/event-fundraise.svg",
  "Computer training": "/images/event-computer.svg",
  "Blood donation": "/images/cause-healthcare.svg",
  "Career workshop": "/images/cause-skill.svg",
  Sports: "/images/campaign-sports.svg",
  "Community event": "/images/gallery-1.svg",
};

const STORY = {
  "first-generation-graduate": "/images/story-graduate.svg",
  "winter-drive-opens": "/images/story-winter.svg",
};

export const GALLERY = [
  { src: "/images/gallery-1.svg", alt: "Children in a learning circle" },
  { src: "/images/gallery-2.svg", alt: "Volunteers packing relief kits" },
  { src: "/images/gallery-3.svg", alt: "Village distribution day" },
  { src: "/images/gallery-4.svg", alt: "Learning centre visit" },
];

export function causeImage(cause) {
  return CAUSE[String(cause || "").toLowerCase()] || "/images/cause-education.svg";
}

export function campaignImage(c) {
  if (c && c.images) {
    const first = String(c.images).split(",")[0].trim();
    if (first) return first;
  }
  return CAMPAIGN[c && c.slug] || "/images/campaign-school.svg";
}

export function eventImage(e) {
  if (e && e.photos) {
    const first = String(e.photos).split(",")[0].trim();
    if (first) return first;
  }
  return EVENT[e && e.type] || "/images/event-camp.svg";
}

export function storyImage(p) {
  if (p && p.images) {
    const first = String(p.images).split(",")[0].trim();
    if (first) return first;
  }
  return STORY[p && p.slug] || "/images/story-graduate.svg";
}

export function ngoImage(n) {
  if (n && n.logo) return n.logo;
  return causeImage(n && n.cause);
}

export const PROGRAMS = [
  { name: "School education", img: "/images/cause-education.svg" },
  { name: "After-school classes", img: "/images/gallery-1.svg" },
  { name: "Tuition", img: "/images/campaign-school.svg" },
  { name: "Digital education", img: "/images/cause-skill.svg" },
  { name: "Computer education", img: "/images/campaign-lab.svg" },
  { name: "English learning", img: "/images/cause-education.svg" },
  { name: "Vocational education", img: "/images/cause-skill.svg" },
  { name: "Skill development", img: "/images/cause-skill.svg" },
  { name: "Career guidance", img: "/images/campaign-scholarship.svg" },
  { name: "Clothing distribution", img: "/images/cause-clothing.svg" },
  { name: "Food distribution", img: "/images/cause-food.svg" },
  { name: "Scholarships", img: "/images/campaign-scholarship.svg" },
];
