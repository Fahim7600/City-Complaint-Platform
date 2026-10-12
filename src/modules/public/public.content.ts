import { config } from "../../config/env";

export interface PlatformInfo {
  name: string;
  tagline: string;
  summary: string;
}

export interface HighlightItem {
  title: string;
  description: string;
}

export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
}

export interface RolesInfo {
  citizen: string[];
  technician: string[];
  manager: string[];
  admin: string[];
}

export interface PlanDetails {
  monthlyComplaintLimit: number;
  priority: string;
  price:
    | number
    | { amount: number; currency: string; interval: string | null }
    | null;
  benefits: string[];
}

export interface PlanComparisonRow {
  feature: string;
  free: string;
  premium: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CallsToAction {
  register: string;
  login: string;
  upgrade: string;
}

export const PLATFORM_INFO: PlatformInfo = {
  name: "City Complaint & Service Request Platform",
  tagline:
    "Connecting citizens with municipal services for faster civic resolution",
  summary:
    "A unified municipal complaint platform that routes citizen reports to the correct municipal departments, tracks resolution deadlines under transparent Service Level Agreements, and keeps citizens updated every step of the way.",
};

export const PLATFORM_HIGHLIGHTS: HighlightItem[] = [
  {
    title: "Report Issues with Photo Evidence",
    description:
      "Submit detailed civic complaints with location information and upload initial, before-work, and after-work photographs to document the issue clearly.",
  },
  {
    title: "Automatic Department & Category Routing",
    description:
      "Every complaint is automatically categorized and routed directly to the responsible municipal department, eliminating bureaucratic delays.",
  },
  {
    title: "Target Resolution Deadlines & SLA Tracking",
    description:
      "Service Level Agreements (SLAs) define target completion hours for each category, with automated hourly checks notifying managers if a deadline is at risk.",
  },
  {
    title: "Live Status Tracking & In-App Alerts",
    description:
      "Stay informed as your complaint progresses from Pending to Assigned, In Progress, and Resolved with instant in-app notification alerts.",
  },
  {
    title: "Verified Technician Reviews",
    description:
      "Rate and review assigned municipal technicians upon resolution with immutable 1-to-5 star ratings to help maintain high service standards.",
  },
  {
    title: "Citizen Reopening Guarantee",
    description: `If a problem reoccurs or was not fixed satisfactorily, citizens can reopen resolved complaints within ${config.REOPEN_WINDOW_DAYS} days with an explanation.`,
  },
];

export const getHowItWorksSteps = (
  reopenWindowDays = config.REOPEN_WINDOW_DAYS,
): HowItWorksStep[] => [
  {
    step: 1,
    title: "Register Your Account",
    description:
      "Sign up in seconds using your email and password or securely authenticate with Google Sign-In.",
  },
  {
    step: 2,
    title: "File a Complaint with Evidence",
    description:
      "Select a service category, describe the issue, provide the civic location, and upload supporting photos.",
  },
  {
    step: 3,
    title: "Automatic Department Routing & SLA Countdown",
    description:
      "The system routes the request to the appropriate department and establishes a countdown deadline based on category SLA hours.",
  },
  {
    step: 4,
    title: "Technician Assignment & Field Work",
    description:
      "A department manager assigns an active, available technician who updates the complaint status and uploads work evidence.",
  },
  {
    step: 5,
    title: "Real-Time Status & Notifications",
    description:
      "Receive real-time notifications as your complaint moves from Pending to Assigned, In Progress, and Resolved.",
  },
  {
    step: 6,
    title: "Resolution, Ratings & Reopening",
    description: `Once marked resolved, leave a 1-to-5 star rating for your technician, or reopen the complaint within ${reopenWindowDays} days if further attention is needed.`,
  },
];

export const ROLES_INFO: RolesInfo = {
  citizen: [
    "File and track complaints across municipal departments with photo attachments",
    `Submit up to ${config.MONTHLY_COMPLAINT_LIMIT_FREE} complaints per month (or ${config.MONTHLY_COMPLAINT_LIMIT_PREMIUM} with Premium)`,
    "Cancel pending complaints or reopen resolved complaints within the reopen window",
    "Rate and review technicians with 1-to-5 stars upon issue resolution",
    "Track monthly quota usage and manage in-app notifications",
  ],
  technician: [
    "Access dedicated queue of assigned municipal complaints",
    "Toggle availability for new incoming complaint assignments",
    "Upload before-work and after-work evidence attachments",
    "Progress complaints through Assigned, In Progress, and Resolved states with mandatory notes",
    "Monitor live personal performance metrics, average ratings, and reopen counts",
  ],
  manager: [
    "Triage and manage incoming complaints within their designated department",
    "Assign and reassign available department technicians to work orders",
    "Close resolved complaints or reopen them to In Progress when required",
    "Escalate critical unresolvable complaints directly to the central administrator queue",
    "Review and approve or reject department technician staff applications",
  ],
  admin: [
    "Full platform oversight across all municipal departments, categories, and users",
    "Manage and clear escalated complaints across any department",
    "Directly reassign technicians or resolve escalated complaints",
    "Manage departments, categories, SLA durations, user roles, and account statuses",
    "Trigger manual overdue SLA sweeps and view platform-wide payment and subscription history",
  ],
};

export const PREMIUM_BENEFITS: string[] = [
  "Automatic HIGH priority on every new complaint",
  `Higher monthly complaint limit (${config.MONTHLY_COMPLAINT_LIMIT_PREMIUM} complaints/month instead of ${config.MONTHLY_COMPLAINT_LIMIT_FREE})`,
  "Staff complaint queues sorted with high priority first",
  "Cancel any time (access continues until the period end)",
];

export const FREE_BENEFITS: string[] = [
  `Up to ${config.MONTHLY_COMPLAINT_LIMIT_FREE} complaints per calendar month`,
  "Standard priority triage and routing",
  "Real-time in-app status updates and notifications",
  `Ability to rate technicians and reopen complaints within ${config.REOPEN_WINDOW_DAYS} days`,
  "Full access to photo attachments and public department directories",
];

export const PLAN_COMPARISON: PlanComparisonRow[] = [
  {
    feature: "Monthly complaint limit",
    free: `${config.MONTHLY_COMPLAINT_LIMIT_FREE} complaints/month`,
    premium: `${config.MONTHLY_COMPLAINT_LIMIT_PREMIUM} complaints/month`,
  },
  {
    feature: "Initial complaint priority",
    free: "Standard (Medium)",
    premium: "Automatic HIGH priority",
  },
  {
    feature: "Staff queue sorting",
    free: "Standard order",
    premium: "Sorted with high priority first",
  },
  {
    feature: "Real-time notifications",
    free: "Included",
    premium: "Included",
  },
  {
    feature: "Reopen window",
    free: `${config.REOPEN_WINDOW_DAYS} days from resolution`,
    premium: `${config.REOPEN_WINDOW_DAYS} days from resolution`,
  },
  {
    feature: "Technician ratings & reviews",
    free: "Included",
    premium: "Included",
  },
  {
    feature: "Subscription flexibility",
    free: "Free forever",
    premium: "Cancel any time with access kept through billing period",
  },
];

export const FAQS: FAQItem[] = [
  {
    question: "Who can file a complaint on the platform?",
    answer:
      "Any registered citizen can file complaints. Registration is free and open to everyone via standard email sign-up or Google OAuth.",
  },
  {
    question: "How does the Premium subscription work and how is it billed?",
    answer:
      "Premium is a recurring monthly subscription processed securely through Stripe. Subscribed citizens receive automatic HIGH priority on all new complaints and an elevated monthly allowance of 20 complaints. You can cancel at any time, and your premium benefits remain active until the end of your current billing period.",
  },
  {
    question: "What happens if a subscription payment fails?",
    answer:
      "If a monthly recurring renewal fails, your subscription status enters a grace period (past due). Your premium privileges are maintained while Stripe automatically retries the payment method before any cancellation occurs.",
  },
  {
    question: "How long should a complaint take to be resolved?",
    answer:
      "Each service category specifies a target SLA (Service Level Agreement) in hours. Once submitted, an SLA countdown begins. If an issue is not resolved within the target timeframe, automated monitoring triggers overdue alerts to department managers.",
  },
  {
    question: "How can I reopen a complaint if the fix is unsatisfactory?",
    answer: `If a complaint was resolved but the problem persists, the citizen who reported it can reopen it within ${config.REOPEN_WINDOW_DAYS} days of resolution directly from the complaint page. Reopening resets the SLA and returns the issue to the technician or department manager.`,
  },
  {
    question: "How do technician ratings and reviews work?",
    answer:
      "After a complaint reaches the Resolved status, the reporting citizen can submit an immutable 1-to-5 star rating and an optional feedback comment. Aggregated technician ratings are displayed publicly to help maintain accountability.",
  },
  {
    question: "How is citizen and staff data protected?",
    answer:
      "Public endpoints never expose personal citizen information, email addresses, phone numbers, or review comments. Only sanitized technician ratings, category descriptions, and high-level platform statistics are made public.",
  },
];

export const CALLS_TO_ACTION: CallsToAction = {
  register: "/register",
  login: "/login",
  upgrade: "/premium",
};
