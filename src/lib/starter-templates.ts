import type { ContentBlock } from "@/lib/email-renderer";

export interface StarterTemplate {
  name: string;
  description: string;
  category: "announcement" | "course_highlight" | "monthly_digest" | "event_invitation" | "general";
  blocks: ContentBlock[];
}

export const starterTemplates: StarterTemplate[] = [
  {
    name: "Course Highlight",
    description: "Showcase a specific course with stats, salary data, and a strong CTA.",
    category: "course_highlight",
    blocks: [
      { type: "heading", text: "Discover {{courseName}}" },
      {
        type: "paragraph",
        text: "Hi {{firstName}}, we're excited to share the latest insights about this in-demand program. Here's why professionals are making the switch.",
      },
      {
        type: "section",
        title: "WHAT'S HAPPENING",
        body: "Industry demand for this skill is growing rapidly.\nCompanies are hiring at record pace.\nRemote work opportunities are expanding.",
        style: "info",
      },
      {
        type: "section",
        title: "SALARY INSIGHTS",
        body: "Average starting salary: Competitive and growing year-over-year.\nMid-career professionals see significant salary hikes.\nTop performers earn premium compensation.",
        style: "success",
      },
      {
        type: "section",
        title: "WHY THE DEMAND",
        body: "Digital transformation is driving need across industries.\nSkill shortage creates opportunity for trained professionals.\nCertification adds significant career value.",
        style: "warning",
      },
      {
        type: "cta",
        text: "Explore the Program",
        url: "https://intellee.com/programs",
      },
    ],
  },
  {
    name: "Announcement",
    description: "A clean announcement template for news, updates, or launches.",
    category: "announcement",
    blocks: [
      { type: "heading", text: "Big News from Intellee" },
      {
        type: "paragraph",
        text: "Hi {{firstName}}, we have an exciting update to share with you.",
      },
      {
        type: "paragraph",
        text: "Add your announcement details here. Describe what's new, why it matters, and what action the reader should take.",
      },
      { type: "divider" },
      {
        type: "paragraph",
        text: "This is a great opportunity you don't want to miss. Act now to be among the first to benefit.",
      },
      {
        type: "cta",
        text: "Learn More",
        url: "https://intellee.com",
      },
    ],
  },
  {
    name: "Monthly Digest",
    description: "A multi-section newsletter summarizing the month's highlights.",
    category: "monthly_digest",
    blocks: [
      { type: "heading", text: "Your Monthly Digest" },
      {
        type: "paragraph",
        text: "Hi {{firstName}}, here's your roundup of what happened this month at Intellee.",
      },
      {
        type: "section",
        title: "TOP STORIES",
        body: "New batch of graduates placed at top companies.\nPartnership with leading tech firms announced.\nScholarship program expanded for deserving students.",
        style: "info",
      },
      {
        type: "section",
        title: "UPCOMING EVENTS",
        body: "Webinar: Future of AI in Education — Register now.\nOpen House: Visit our campus this Saturday.\nWorkshop: Hands-on ML bootcamp for beginners.",
        style: "purple",
      },
      {
        type: "section",
        title: "BY THE NUMBERS",
        body: "500+ students enrolled this month.\n95% placement rate maintained.\n12 new industry partnerships signed.",
        style: "success",
      },
      {
        type: "cta",
        text: "View Full Updates",
        url: "https://intellee.com/updates",
      },
    ],
  },
  {
    name: "Event Invitation",
    description: "Invite subscribers to an event, webinar, or workshop.",
    category: "event_invitation",
    blocks: [
      { type: "heading", text: "You're Invited!" },
      {
        type: "paragraph",
        text: "Hi {{firstName}}, we'd love to have you join us for an upcoming event.",
      },
      {
        type: "section",
        title: "EVENT DETAILS",
        body: "Event: [Event Name]\nDate: [Date & Time]\nVenue: [Location or Online Link]\nSpeakers: [Speaker Names]",
        style: "info",
      },
      {
        type: "paragraph",
        text: "This event is perfect for professionals looking to upskill, network, and learn from industry experts. Limited seats available — reserve yours today.",
      },
      {
        type: "cta",
        text: "Register Now",
        url: "https://intellee.com/events",
      },
    ],
  },
  {
    name: "Real Estate Market Update",
    description: "Share market trends, new listings, and investment opportunities.",
    category: "general",
    blocks: [
      { type: "heading", text: "{{courseName}} — Your Market Update" },
      {
        type: "paragraph",
        text: "Hi {{firstName}}, here's your latest update on the real estate market and what it means for you.",
      },
      {
        type: "section",
        title: "MARKET TRENDS",
        body: "Current market conditions and pricing trends.\nInventory levels and days on market.\nInterest rate outlook and buyer activity.",
        style: "info",
      },
      {
        type: "section",
        title: "NEW OPPORTUNITIES",
        body: "Featured listings and investment properties.\nOpen house schedule and virtual tours.\nExclusive off-market opportunities.",
        style: "success",
      },
      {
        type: "cta",
        text: "View Listings",
        url: "https://example.com/listings",
      },
    ],
  },
  {
    name: "Product Launch",
    description: "Announce a new product or service with key benefits.",
    category: "announcement",
    blocks: [
      { type: "heading", text: "Introducing {{courseName}}" },
      {
        type: "paragraph",
        text: "Hi {{firstName}}, we're thrilled to announce something new we've been working on.",
      },
      {
        type: "section",
        title: "KEY FEATURES",
        body: "What makes it different.\nHow it helps you succeed.\nEasy to get started.",
        style: "purple",
      },
      {
        type: "cta",
        text: "Get Started",
        url: "https://example.com",
      },
    ],
  },
  {
    name: "Tips & Insights",
    description: "Share valuable tips and industry insights.",
    category: "general",
    blocks: [
      { type: "heading", text: "{{courseName}} — Tips You Can Use" },
      {
        type: "paragraph",
        text: "Hi {{firstName}}, here are our top tips and insights for this month.",
      },
      {
        type: "section",
        title: "TOP TIPS",
        body: "Practical advice you can apply today.\nIndustry best practices.\nCommon pitfalls to avoid.",
        style: "warning",
      },
      {
        type: "cta",
        text: "Read More",
        url: "https://example.com/blog",
      },
    ],
  },
];
