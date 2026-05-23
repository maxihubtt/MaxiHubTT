import { Link } from "wouter";
import { ArrowLeft, FileText } from "lucide-react";

const sections = [
  {
    title: "1. About MaxiHub",
    content: [
      "MaxiHub is an online platform that connects users with independent transport providers and drivers. MaxiHub does not directly provide transportation services and is not a transport operator.",
      "Drivers using the platform operate independently and are solely responsible for the services they provide.",
    ],
  },
  {
    title: "2. User Eligibility",
    content: ["By using MaxiHub, you confirm that:"],
    bullets: [
      "You are at least 18 years old or have permission from a parent/guardian.",
      "The information you provide is accurate and up to date.",
      "You will use the platform lawfully and respectfully.",
    ],
  },
  {
    title: "3. User Responsibilities",
    content: ["Users agree to:"],
    bullets: [
      "Provide accurate pickup and destination information.",
      "Treat drivers respectfully.",
      "Avoid illegal, abusive, threatening, or fraudulent behavior.",
      "Not misuse the platform or interfere with its operation.",
    ],
    footer: "MaxiHub reserves the right to suspend or terminate accounts that violate these terms.",
  },
  {
    title: "4. Bookings & Services",
    content: [
      "MaxiHub only facilitates connections between users and independent drivers.",
      "MaxiHub does not guarantee:",
    ],
    bullets: [
      "Driver availability",
      "Arrival times",
      "Specific vehicle conditions",
      "Continuous or uninterrupted service",
      "Specific transport outcomes",
    ],
    footer: "All transportation services are provided by independent drivers.",
  },
  {
    title: "5. Payments",
    content: ["Users agree to pay all applicable fees for booked services.", "Payment methods may include:"],
    bullets: [
      "Cash",
      "Bank transfer",
      "Approved digital payment methods",
      "Other methods supported by MaxiHub",
    ],
    footer: "Failure to complete payment may result in account suspension or restriction.",
  },
  {
    title: "6. Cancellations",
    content: [
      "Users should cancel bookings promptly if transportation is no longer required.",
      "Repeated false, abusive, or fraudulent bookings may result in suspension or permanent removal from the platform.",
    ],
  },
  {
    title: "7. Safety & Conduct",
    content: ["Users are responsible for their conduct during transportation services.", "Users must not:"],
    bullets: [
      "Carry illegal items",
      "Threaten or harass drivers",
      "Damage vehicles",
      "Engage in unsafe or unlawful behavior",
    ],
    footer: "Drivers may refuse service if they feel unsafe.",
  },
  {
    title: "8. Limitation of Liability",
    content: [
      "MaxiHub acts solely as a technology platform connecting users and drivers.",
      "To the maximum extent permitted by law, MaxiHub shall not be liable for:",
    ],
    bullets: [
      "Accidents",
      "Injuries",
      "Delays",
      "Property loss",
      "Theft",
      "Disputes",
      "Driver conduct",
      "Indirect or consequential damages arising from services provided by independent drivers",
    ],
    footer: "Users utilize the platform at their own risk.",
  },
  {
    title: "9. Privacy",
    content: [
      "By using MaxiHub, users consent to the collection and use of necessary information including:",
    ],
    bullets: [
      "Name",
      "Phone number",
      "Booking details",
      "Communication data",
      "Device and location information where applicable",
    ],
    footer: "For more information, please review our Privacy Policy.",
  },
  {
    title: "10. Account Suspension",
    content: ["MaxiHub may suspend or terminate accounts involved in:"],
    bullets: [
      "Fraud",
      "Abuse",
      "Illegal activity",
      "Fake bookings",
      "Harassment",
      "Violations of these Terms",
    ],
  },
  {
    title: "11. Changes to Terms",
    content: [
      "MaxiHub reserves the right to update these Terms & Conditions at any time. Continued use of the platform constitutes acceptance of any changes.",
    ],
  },
];

export default function TermsUsers() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-10 pb-16">

        <Link href="/" className="inline-flex items-center gap-1.5 text-teal-600 text-sm font-semibold hover:text-teal-800 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to booking site
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-full text-sm font-bold mb-5">
            <FileText className="w-4 h-4" />
            MaxiHub
          </div>
          <h1 className="text-4xl font-black text-teal-900 mb-2">Terms &amp; Conditions</h1>
          <p className="text-teal-600 text-sm">For Passengers &amp; Users</p>
          <p className="text-teal-400 text-xs mt-2">Last Updated: May 21, 2026</p>
          <div className="h-0.5 w-16 mx-auto mt-5 rounded-full bg-gradient-to-r from-red-600 via-black to-red-600" />
        </div>

        <div className="bg-teal-700 text-white rounded-2xl px-6 py-5 mb-8 text-sm leading-relaxed">
          Welcome to MaxiHub. By using this platform, website, mobile application, or related services, you agree to the following Terms &amp; Conditions.
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="bg-white rounded-2xl shadow-sm border border-teal-100 px-6 py-5">
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
              </div>
            </div>
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
            <Link href="/driver/terms" className="text-xs text-teal-500 hover:text-teal-700 underline underline-offset-2">
              View Driver Terms &amp; Conditions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
