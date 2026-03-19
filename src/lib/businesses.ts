export interface BusinessConfig {
  id: string;
  name: string;
  slug: string;
  fieldLabel1: string;
  fieldLabel2: string;
  placeholder1: string;
  placeholder2: string;
  defaultAddress: string;
  defaultPhone: string;
  defaultWebsiteUrl: string;
  defaultContactEmail: string;
  generatePromptContext: string;
}

export const DEFAULT_BUSINESSES: BusinessConfig[] = [
  {
    id: "intellee-college",
    name: "Intellee College",
    slug: "intellee_college",
    fieldLabel1: "Course Name",
    fieldLabel2: "College Name",
    placeholder1: "e.g. Business Analyst AI, Data Science, Cloud Computing...",
    placeholder2: "e.g. Intellee College",
    defaultAddress: "Tech Park, Bangalore, India",
    defaultPhone: "+91 98765 43210",
    defaultWebsiteUrl: "https://intellee.com",
    defaultContactEmail: "admissions@intellee.com",
    generatePromptContext: "education, courses, career training, placement",
  },
  {
    id: "north-emerald-realty",
    name: "North Emerald Realty Inc.",
    slug: "north_emerald_realty",
    fieldLabel1: "Topic Name",
    fieldLabel2: "Business Name",
    placeholder1: "e.g. Market Update, New Listings, Investment Opportunities...",
    placeholder2: "e.g. North Emerald Realty Inc.",
    defaultAddress: "",
    defaultPhone: "",
    defaultWebsiteUrl: "",
    defaultContactEmail: "",
    generatePromptContext: "real estate, property listings, market trends, investment",
  },
];

export function getBusinessBySlug(slug: string): BusinessConfig | undefined {
  return DEFAULT_BUSINESSES.find((b) => b.slug === slug);
}

export function getBusinessById(id: string): BusinessConfig | undefined {
  return DEFAULT_BUSINESSES.find((b) => b.id === id);
}
