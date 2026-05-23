import { Link } from "wouter";
import { ArrowLeft, Car } from "lucide-react";

const sections = [
  {
    title: "1. Independent Contractor Relationship",
    content: [
      "Drivers using MaxiHub are independent contractors and not employees, agents, or representatives of MaxiHub.",
      "Drivers are solely responsible for:",
    ],
    bullets: [
      "Their conduct",
      "Vehicle operation",
      "Licenses and permits",
      "Insurance",
      "Taxes",
      "Compliance with transportation laws and regulations",
    ],
    footer: "Nothing in this agreement creates an employment relationship.",
  },
  {
    title: "2. Driver Eligibility",
    content: ["Drivers must:"],
    bullets: [
      "Possess a valid driver's permit/licence",
      "Operate legally registered vehicles",
      "Maintain valid insurance where required",
      "Provide accurate registration information",
      "Comply with all applicable laws and regulations",
    ],
    footer: "MaxiHub may request verification documents at any time.",
  },
  {
    title: "3. Driver Responsibilities",
    content: ["Drivers agree to:"],
    bullets: [
      "Provide safe and professional transportation services",
      "Behave respectfully toward passengers",
      "Maintain clean and roadworthy vehicles",
      "Arrive reasonably on time",
      "Complete accepted jobs honestly",
    ],
    footer2Title: "Drivers may not:",
    footer2Bullets: [
      "Engage in illegal activity",
      "Harass customers",
      "Provide false information",
      "Misuse the platform",
    ],
  },
  {
    title: "4. Platform Usage",
    content: [
      "MaxiHub provides drivers access to transportation opportunities through the platform.",
      "MaxiHub does not guarantee:",
    ],
    bullets: [
      "Minimum earnings",
      "Passenger volume",
      "Continuous work opportunities",
    ],
    footer: "Drivers are free to accept or decline available jobs unless otherwise specified.",
  },
  {
    title: "5. Payments & Fees",
    content: ["Drivers may be subject to:"],
    bullets: [
      "Service fees",
      "Commission deductions",
      "Subscription fees",
      "Other approved platform charges",
    ],
    footer: "Payment structures may be updated with notice. Drivers are responsible for tracking and reporting their own earnings and taxes where applicable.",
  },
  {
    title: "6. Off-Platform Transactions",
    content: [
      "Drivers agree not to intentionally redirect MaxiHub customers to off-platform arrangements for the purpose of avoiding platform fees.",
      "Repeated attempts to bypass the platform may result in suspension or termination.",
    ],
  },
  {
    title: "7. Ratings & Conduct",
    content: ["Drivers understand that the following may affect account standing and platform access:"],
    bullets: [
      "Customer feedback",
      "Ratings",
      "Complaints",
      "Reliability",
    ],
    footer: "MaxiHub reserves the right to suspend drivers for unsafe, abusive, fraudulent, or unprofessional behavior.",
  },
  {
    title: "8. Safety & Legal Compliance",
    content: ["Drivers are solely responsible for:"],
    bullets: [
      "Obeying traffic laws",
      "Maintaining vehicle safety",
      "Carrying proper documentation",
      "Operating legally",
    ],
    footer: "Drivers assume all risks associated with providing transportation services.",
  },
  {
    title: "9. Limitation of Liability",
    content: [
      "MaxiHub functions solely as a technology platform connecting drivers and customers.",
      "To the fullest extent permitted by law, MaxiHub shall not be liable for:",
    ],
    bullets: [
      "Loss of income",
      "Accidents",
      "Disputes",
      "Passenger conduct",
      "Vehicle damage",
      "Indirect or consequential losses arising from use of the platform",
    ],
  },
  {
    title: "10. Account Suspension & Termination",
    content: ["MaxiHub may suspend or terminate driver accounts for:"],
    bullets: [
      "Fraud",
      "Unsafe driving",
      "Repeated complaints",
      "Fake bookings",
      "Policy violations",
      "Illegal activity",
      "Conduct damaging to the platform's reputation",
    ],
  },
  {
    title: "11. Changes to Terms",
    content: [
      "MaxiHub reserves the right to modify these Terms at any time. Continued platform use constitutes acceptance of updated Terms.",
    ],
  },
];

type Section = {
  title: string;
  content: string[];
  bullets?: string[];
  footer?: string;
  footer2Title?: string;
  footer2Bullets?: string[];
};

function SectionCard({ section }: { section: Section }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-teal-100 px-6 py-5">
      <h2 className="text-base font-black text-teal-900 mb-3">{section.title}</h2>
      <div className="space-y-2 text-sm text-teal-800 leading-relaxed">
        {section.content.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        {section.bullets && (
          <ul className="mt-2 space-y-1.5 pl-2">
            {section.bullets.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {section.footer && <p className="pt-1 text-teal-600 italic">{section.footer}</p>}
        {section.footer2Title && (
          <>
            <p className="pt-1 font-semibold text-teal-800">{section.footer2Title}</p>
            <ul className="space-y-1.5 pl-2">
              {section.footer2Bullets?.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default function TermsDrivers() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-10 pb-16">

        <Link href="/driver/signup" className="inline-flex items-center gap-1.5 text-teal-600 text-sm font-semibold hover:text-teal-800 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to driver signup
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-full text-sm font-bold mb-5">
            <Car className="w-4 h-4" />
            MaxiHub
          </div>
          <h1 className="text-4xl font-black text-teal-900 mb-2">Driver Terms &amp; Conditions</h1>
          <p className="text-teal-600 text-sm">For Registered &amp; Prospective Drivers</p>
          <p className="text-teal-400 text-xs mt-2">Last Updated: May 21, 2026</p>
          <div className="h-0.5 w-16 mx-auto mt-5 rounded-full bg-gradient-to-r from-red-600 via-black to-red-600" />
        </div>

        <div className="bg-teal-700 text-white rounded-2xl px-6 py-5 mb-8 text-sm leading-relaxed">
          By registering as a driver on MaxiHub, you agree to the following Driver Terms &amp; Conditions.
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <SectionCard key={section.title} section={section} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-teal-400">
            Questions? Contact us via{" "}
            <a
              href="https://wa.me/18684818039"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 font-semibold hover:underline"
            >
              WhatsApp
            </a>
          </p>
          <div className="mt-4">
            <Link href="/terms" className="text-xs text-teal-500 hover:text-teal-700 underline underline-offset-2">
              View Passenger Terms &amp; Conditions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
